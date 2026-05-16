import { readFileSync } from 'fs'
import { join } from 'path'
import { getStructuredModel, responseText } from './vertex'
import { store, docToPartnerRecord, docToInitiative, docToLinkage } from './store'

export interface AgentStep {
  tool: string
  args: Record<string, unknown>
  result: unknown
}

export interface MatchEntry {
  actorId: string
  actorName: string
  actorType: 'startup' | 'mentor' | 'partner' | 'initiative'
  partnerType: string | null
  matchScore: number
  matchReason: string
}

export interface AgentMatchResult {
  steps: AgentStep[]
  modelCalls: number
  mentors: MatchEntry[]
  corporatePartners: MatchEntry[]
  investors: MatchEntry[]
  serviceProviders: MatchEntry[]
  initiatives: MatchEntry[]
  startups: MatchEntry[]
  direction: 'from-startup' | 'from-actor'
}

type GeminiResult = {
  response: unknown
}

function preview(value: string, limit = 700): string {
  return value.length > limit ? `${value.slice(0, limit)}...` : value
}

function logAgent(requestId: string, event: string, data: Record<string, unknown> = {}) {
  console.info('[matching-agent]', { requestId, event, ...data })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableGeminiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return (
    message.includes('[429 Too Many Requests]') ||
    message.includes('Quota exceeded') ||
    message.includes('[503 Service Unavailable]') ||
    message.includes('experiencing high demand')
  )
}

function retryDelayMs(err: unknown, attempt: number): number {
  const message = err instanceof Error ? err.message : String(err)
  const retryInfo = message.match(/"retryDelay":"(\d+(?:\.\d+)?)s"/)
  const retryText = message.match(/retry in (\d+(?:\.\d+)?)s/i)
  const seconds = Number(retryInfo?.[1] ?? retryText?.[1])
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(30_000, Math.ceil(seconds * 1000))
  }
  const jitterMs = Math.floor(Math.random() * 500)
  return Math.min(30_000, 1500 * 2 ** attempt + jitterMs)
}

async function withGeminiRetry<T>(
  requestId: string,
  label: string,
  call: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await call()
    } catch (err) {
      if (!isRetryableGeminiError(err) || attempt === maxAttempts - 1) throw err
      const delayMs = retryDelayMs(err, attempt)
      logAgent(requestId, 'model-retry', {
        label,
        attempt: attempt + 1,
        nextAttempt: attempt + 2,
        delayMs,
      })
      await sleep(delayMs)
    }
  }
  return call()
}

async function relevantLinkageRecords(actorId: string): Promise<Array<Record<string, unknown>>> {
  const linkages = await store.getAllLinkages()
  return linkages
    .map(docToLinkage)
    .filter(linkage =>
      linkage.sourceId === actorId ||
      linkage.actorId === actorId ||
      linkage.startupId === actorId
    )
    .map(linkage => ({
      linkage_id: linkage.linkageId,
      source_id: linkage.sourceId,
      source_name: linkage.sourceName,
      source_type: linkage.sourceType,
      source_partner_type: linkage.sourcePartnerType,
      target_id: linkage.actorId,
      target_name: linkage.actorName,
      target_type: linkage.actorType,
      target_partner_type: linkage.partnerType,
      match_score: linkage.matchScore,
      match_reason: linkage.matchReason,
      status: linkage.status,
      created_at: linkage.createdAt,
      outcome: linkage.outcome,
    }))
}

async function executeTool(name: string, args: Record<string, string>): Promise<unknown> {
  if (name === 'get_startup_profile') {
    const doc = await store.getStartup(args.startup_id)
    return doc
      ? { startup: doc, existing_linkages: await relevantLinkageRecords(args.startup_id) }
      : { error: `Startup '${args.startup_id}' not found` }
  }

  if (name === 'search_partners') {
    const all = (await store.getAllPartners()).filter(p => p.partner_type !== 'mentor')
    const filtered = all.filter(p => {
      if (args.partner_type && p.partner_type !== args.partner_type) return false
      if (args.industry && !p.industry.toLowerCase().includes(args.industry.toLowerCase())) return false
      return true
    })
    return { partners: (filtered.length > 0 ? filtered : all).map(p => docToPartnerRecord(p)) }
  }

  if (name === 'search_mentors') {
    const all = (await store.getAllPartners()).filter(p => p.partner_type === 'mentor')
    const filtered = all.filter(p =>
      !args.industry || p.industry.toLowerCase().includes(args.industry.toLowerCase())
    )
    return { mentors: (filtered.length > 0 ? filtered : all).map(p => docToPartnerRecord(p)) }
  }

  if (name === 'search_initiatives') {
    const all = await store.getAllInitiatives()
    const filtered = all.filter(i => {
      if (args.type && i.type !== args.type) return false
      if (args.industry && !i.focus_industries.some(f => f.toLowerCase().includes(args.industry.toLowerCase()))) return false
      return true
    })
    return { initiatives: (filtered.length > 0 ? filtered : all).map(i => docToInitiative(i)) }
  }

  return { error: `Unknown tool: ${name}` }
}

function toEntry(
  item: Record<string, unknown>,
  actorType: MatchEntry['actorType'],
  partnerType: string | null,
): MatchEntry {
  return {
    actorId:     String(item.actor_id ?? ''),
    actorName:   String(item.actor_name ?? ''),
    actorType,
    partnerType,
    matchScore:  Number(item.match_score ?? 0),
    matchReason: String(item.match_reason ?? ''),
  }
}

function fallbackReason(startup: Record<string, unknown>, candidate: Record<string, unknown>): string {
  const startupName = String(startup.startup_name ?? 'the startup')
  const actorName = String(candidate.actor_name ?? 'This actor')
  const category = String(candidate.industry ?? candidate.type ?? candidate.partner_type ?? 'ecosystem')
  return `${actorName} is a relevant ${category} ecosystem candidate for ${startupName}'s current stage and needs. ${startupName} offers a practical opportunity to validate fit through a targeted partnership conversation.`
}

function fillEntries(
  parsedItems: unknown,
  candidates: Array<Record<string, unknown>>,
  startup: Record<string, unknown>,
  actorType: MatchEntry['actorType'],
  partnerType: string | null,
): MatchEntry[] {
  const wanted = Math.min(3, candidates.length)
  const entries = (Array.isArray(parsedItems) ? parsedItems : [])
    .map(item => toEntry(item as Record<string, unknown>, actorType, partnerType))
    .filter(item => item.actorId)
  const seen = new Set(entries.map(item => item.actorId))

  for (const candidate of candidates) {
    if (entries.length >= wanted) break
    const actorId = String(candidate.actor_id ?? '')
    if (!actorId || seen.has(actorId)) continue
    entries.push({
      actorId,
      actorName: String(candidate.actor_name ?? actorId),
      actorType,
      partnerType,
      matchScore: 70,
      matchReason: fallbackReason(startup, candidate),
    })
    seen.add(actorId)
  }

  return entries.slice(0, wanted)
}

async function startupCandidateRecords(excludeId?: string): Promise<Array<Record<string, unknown>>> {
  const startups = await store.getAllStartups()
  return startups
    .filter(startup => startup.startup_id !== excludeId)
    .map(startup => ({
      actor_id: startup.startup_id,
      actor_name: startup.startup_name,
      actor_type: 'startup',
      partner_type: null,
      industry: startup.industry,
      stage: startup.stage,
      problem: startup.problem,
      short_description: startup.short_description,
      needs: startup.needs,
    }))
}

async function partnerCandidateRecords(partnerType: string, excludeId?: string): Promise<Array<Record<string, unknown>>> {
  const partners = await store.getAllPartners()
  return partners
    .filter(partner => partner.partner_type === partnerType && partner.partner_id !== excludeId)
    .map(partner => ({
      actor_id: partner.partner_id,
      actor_name: partner.org_name,
      actor_type: partner.partner_type === 'mentor' ? 'mentor' : 'partner',
      partner_type: partner.partner_type === 'mentor' ? null : partner.partner_type,
      industry: partner.industry,
      short_description: partner.short_description,
      status: partner.status,
    }))
}

async function initiativeCandidateRecords(excludeId?: string): Promise<Array<Record<string, unknown>>> {
  const initiatives = await store.getAllInitiatives()
  return initiatives
    .filter(initiative => initiative.initiative_id !== excludeId)
    .map(initiative => ({
      actor_id: initiative.initiative_id,
      actor_name: initiative.name,
      actor_type: 'initiative',
      partner_type: null,
      type: initiative.type,
      description: initiative.description,
      focus_industries: initiative.focus_industries,
      funding_amount: initiative.funding_amount,
      next_intake: initiative.next_intake,
      status: initiative.status,
    }))
}

const SYSTEM_PROMPT = `You are an intelligent startup ecosystem matching agent for Cradle, Malaysia's startup development fund.

Your task: find the top 3 best-fit ecosystem actors for a given startup across 5 categories — mentors, corporate partners, investors, service providers, and initiatives.

Workflow:
1. Call get_startup_profile to understand the startup's industry, stage, problem, and needs
2. Use the startup's industry as a filter when calling search tools to fetch only relevant actors
3. You may call multiple search tools (e.g. search all three partner types, or search initiatives separately)
4. Once you have sufficient candidates in each category, call submit_matches

Scoring rubric:
- 90–100: The actor can directly provide high-value support the startup explicitly needs now, with strong reciprocal strategic value.
- 80–89: The actor can provide clear practical value, but one dimension such as stage fit, industry fit, or reciprocal value is less direct.
- 70–79: The actor provides useful but partial value, or the value depends on follow-up validation.
- 60–69: Weak but plausible value. Use sparingly.

For each match_reason (exactly 2 sentences):
- Sentence 1: State the concrete value this actor can actually provide to the startup, tied to the startup's problem, stage, needs, or market.
- Sentence 2: State what strategic value the startup provides back to the actor, such as pipeline fit, market access, thesis alignment, pilot opportunity, programme eligibility, or ecosystem value.

Score range: 60–100. Be selective — only include actors with genuine alignment.`

export async function runMatchingAgent(startupId: string, requestId = crypto.randomUUID()): Promise<AgentMatchResult> {
  const profileResult = await executeTool('get_startup_profile', { startup_id: startupId }) as Record<string, unknown>
  const startup = profileResult.startup as Record<string, unknown> | undefined
  if (!startup || profileResult.error) throw new Error(`Startup '${startupId}' not found`)

  const [
    mentors,
    corporatePartners,
    investors,
    serviceProviders,
    initiatives,
  ] = await Promise.all([
    partnerCandidateRecords('mentor'),
    partnerCandidateRecords('corporate'),
    partnerCandidateRecords('investor'),
    partnerCandidateRecords('service_provider'),
    initiativeCandidateRecords(),
  ])

  const steps: AgentStep[] = [
    { tool: 'get_startup_profile', args: { startup_id: startupId }, result: profileResult },
    { tool: 'load_mentor_candidates', args: {}, result: { mentors } },
    { tool: 'load_corporate_candidates', args: {}, result: { partners: corporatePartners } },
    { tool: 'load_investor_candidates', args: {}, result: { partners: investors } },
    { tool: 'load_service_provider_candidates', args: {}, result: { partners: serviceProviders } },
    { tool: 'load_initiative_candidates', args: {}, result: { initiatives } },
  ]

  const candidates = {
    mentors,
    corporate_partners: corporatePartners,
    investors,
    service_providers: serviceProviders,
    initiatives,
  }

  const prompt = `${SYSTEM_PROMPT}

STARTUP PROFILE:
${JSON.stringify(startup, null, 2)}

EXISTING LINKAGES:
${JSON.stringify(profileResult.existing_linkages ?? [], null, 2)}

AVAILABLE CANDIDATES:
${JSON.stringify(candidates, null, 2)}

Return JSON only (no markdown fences) with this exact shape:
{
  "mentors": [],
  "corporate_partners": [],
  "investors": [],
  "service_providers": [],
  "initiatives": []
}

Each item must have actor_id, actor_name, match_score, and match_reason.
Return exactly min(3, candidate_count) per category. Do not omit lower-confidence candidates when candidates exist; use a lower score and explain the weaker fit. Rank by concrete value fit, not just industry similarity.`

  logAgent(requestId, 'startup-agent-start', {
    startupId,
    systemPromptLength: SYSTEM_PROMPT.length,
    promptLength: prompt.length,
    tools: steps.map(step => step.tool),
    candidateCounts: Object.fromEntries(Object.entries(candidates).map(([key, value]) => [key, value.length])),
    candidateIds: Object.fromEntries(Object.entries(candidates).map(([key, value]) => [
      key,
      value.map(item => item.actor_id),
    ])),
  })

  const model = getStructuredModel()
  logAgent(requestId, 'model-call', { call: 1, kind: 'startup-generate-content' })
  const res = await withGeminiRetry<GeminiResult>(
    requestId,
    'startup-generate-content',
    async () => model.generateContent(prompt) as Promise<GeminiResult>,
  )
  const text = responseText(res.response).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  logAgent(requestId, 'model-response', {
    call: 1,
    textLength: text.length,
    textPreview: preview(text),
  })
  const parsed = JSON.parse(text)
  const mentorMatches = fillEntries(parsed.mentors, mentors, startup, 'mentor', null)
  const corporateMatches = fillEntries(parsed.corporate_partners, corporatePartners, startup, 'partner', 'corporate')
  const investorMatches = fillEntries(parsed.investors, investors, startup, 'partner', 'investor')
  const serviceProviderMatches = fillEntries(parsed.service_providers, serviceProviders, startup, 'partner', 'service_provider')
  const initiativeMatches = fillEntries(parsed.initiatives, initiatives, startup, 'initiative', null)
  logAgent(requestId, 'submit-matches', {
    modelCalls: 1,
    steps: steps.length,
    rawCounts: {
      mentors: parsed.mentors?.length ?? 0,
      corporatePartners: parsed.corporate_partners?.length ?? 0,
      investors: parsed.investors?.length ?? 0,
      serviceProviders: parsed.service_providers?.length ?? 0,
      initiatives: parsed.initiatives?.length ?? 0,
    },
    mentors: mentorMatches.length,
    corporatePartners: corporateMatches.length,
    investors: investorMatches.length,
    serviceProviders: serviceProviderMatches.length,
    initiatives: initiativeMatches.length,
  })
  return {
    steps,
    modelCalls: 1,
    direction:         'from-startup' as const,
    startups:          [],
    mentors:           mentorMatches,
    corporatePartners: corporateMatches,
    investors:         investorMatches,
    serviceProviders:  serviceProviderMatches,
    initiatives:       initiativeMatches,
  }
}

export async function runActorMatching(actorId: string, actorType: 'partner' | 'initiative', requestId = crypto.randomUUID()): Promise<AgentMatchResult> {
  let actorProfile: Record<string, unknown>
  let sourceLabel: string
  if (actorType === 'partner') {
    const doc = await store.getPartner(actorId)
    if (!doc) throw new Error(`Partner '${actorId}' not found`)
    const rec = docToPartnerRecord(doc)!
    sourceLabel = rec.orgName

    // Enrich profile from JSON seed file if available
    const extra: Record<string, unknown> = {}
    try {
      const dataDir = join(process.cwd(), 'data')
      const file = rec.partnerType === 'mentor' ? 'mentors.json' : 'partners.json'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all: any[] = JSON.parse(readFileSync(join(dataDir, file), 'utf8'))
      const match = all.find((x: { name?: string }) => x.name === rec.orgName)
      if (match) {
        if (match.background) extra.background = match.background
        if (match.expertise) extra.expertise = match.expertise
        if (match.investment_thesis) extra.investment_thesis = match.investment_thesis
        if (match.what_they_offer) extra.what_they_offer = match.what_they_offer
        if (match.industries_interested) extra.industries_interested = match.industries_interested
        if (match.suitable_for_stage) extra.suitable_for_stage = match.suitable_for_stage
        if (match.investment_stage) extra.investment_stage = match.investment_stage
        if (match.ticket_size_min) extra.ticket_size = `$${match.ticket_size_min}-${match.ticket_size_max}`
        if (match.startup_stage) extra.startup_stage = match.startup_stage
      }
    } catch { /* JSON files optional */ }

    actorProfile = {
      actor_id: rec.partnerId,
      actor_name: rec.orgName,
      actor_type: rec.partnerType === 'mentor' ? 'mentor' : 'partner',
      partner_type: rec.partnerType === 'mentor' ? null : rec.partnerType,
      industry: rec.industry,
      short_description: rec.shortDescription,
      status: rec.status,
      ...extra,
    }
  } else {
    const doc = await store.getInitiative(actorId)
    if (!doc) throw new Error(`Initiative '${actorId}' not found`)
    const init = docToInitiative(doc)!
    sourceLabel = init.name

    // Enrich with eligibility/benefits from JSON seed file
    const extra: Record<string, unknown> = {}
    try {
      const all: Array<Record<string, unknown>> = JSON.parse(
        readFileSync(join(process.cwd(), 'data', 'initiatives.json'), 'utf8')
      )
      const match = all.find(x => x.name === init.name)
      if (match) {
        const elig = match.eligibility as Record<string, unknown> | undefined
        if (elig) extra.eligibility = elig
        if (match.benefits) extra.benefits = match.benefits
      }
    } catch { /* JSON files optional */ }

    actorProfile = {
      actor_id: init.initiativeId,
      actor_name: init.name,
      actor_type: 'initiative',
      partner_type: null,
      type: init.type,
      description: init.description,
      focus_industries: init.focusIndustries,
      funding_amount: init.fundingAmount,
      next_intake: init.nextIntake,
      status: init.status,
      ...extra,
    }
  }

  const [
    startupsCands,
    mentorsCands,
    corporateCands,
    investorCands,
    serviceProviderCands,
    initiativesCands,
    existingLinkages,
  ] = await Promise.all([
    startupCandidateRecords(actorType === 'partner' ? undefined : actorId),
    partnerCandidateRecords('mentor', actorId),
    partnerCandidateRecords('corporate', actorId),
    partnerCandidateRecords('investor', actorId),
    partnerCandidateRecords('service_provider', actorId),
    initiativeCandidateRecords(actorType === 'initiative' ? actorId : undefined),
    relevantLinkageRecords(actorId),
  ])
  const candidates = {
    startups: startupsCands,
    mentors: mentorsCands,
    corporate_partners: corporateCands,
    investors: investorCands,
    service_providers: serviceProviderCands,
    initiatives: initiativesCands,
  }

  const prompt = `You are a Cradle ecosystem matching agent.

SOURCE ACTOR:
${JSON.stringify(actorProfile, null, 2)}

EXISTING LINKAGES FOR SOURCE ACTOR:
${JSON.stringify(existingLinkages, null, 2)}

AVAILABLE ACTORS:
${JSON.stringify(candidates, null, 2)}

Find the top 3 best-fit matches for the source actor in every available category. This is one actor to every other actor, not just startups.

Return JSON only (no markdown fences):
{
  "startups": [],
  "mentors": [],
  "corporate_partners": [],
  "investors": [],
  "service_providers": [],
  "initiatives": []
}

Each item must have:
- "actor_id": string from the candidate
- "actor_name": string from the candidate
- "match_score": integer from 60 to 100, based on concrete value the source actor can provide to the candidate and the reciprocal strategic value from the candidate to the source
- "match_reason": exactly 2 sentences explaining value exchange. Sentence 1 must state what value the source actor can actually provide to the candidate. Sentence 2 must state what value the candidate provides back to the source actor.

Rules:
- Never include the source actor itself.
- Consider existing linkages as relationship history. Prefer not to recommend exact duplicate active links unless the existing relationship is strategically important to reinforce.
- Return up to 3 per category. Empty arrays are allowed if a category has no credible matches.
- Score high only when the source actor can provide specific practical value such as funding, mentorship, distribution, pilots, credits, legal support, eligibility, ecosystem access, programme support, or market knowledge.
- Do not score high for surface similarity alone, such as sharing an industry label without a clear value exchange.`

  logAgent(requestId, 'actor-agent-start', {
    actorId,
    actorType,
    sourceLabel,
    promptLength: prompt.length,
    candidateCounts: Object.fromEntries(Object.entries(candidates).map(([key, value]) => [key, value.length])),
    existingLinkages: existingLinkages.length,
    promptPreview: preview(prompt),
  })

  const model = getStructuredModel()
  logAgent(requestId, 'model-call', { call: 1, kind: 'actor-generate-content' })
  const res = await withGeminiRetry<GeminiResult>(
    requestId,
    'actor-generate-content',
    async () => model.generateContent(prompt) as Promise<GeminiResult>,
  )
  const text = responseText(res.response).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  logAgent(requestId, 'model-response', {
    call: 1,
    textLength: text.length,
    textPreview: preview(text),
  })
  const parsed = JSON.parse(text)
  return {
    steps: [],
    modelCalls: 1,
    direction: 'from-actor' as const,
    startups: (parsed.startups ?? []).map((x: Record<string, unknown>) => toEntry(x, 'startup', null)),
    mentors: (parsed.mentors ?? []).map((x: Record<string, unknown>) => toEntry(x, 'mentor', null)),
    corporatePartners: (parsed.corporate_partners ?? []).map((x: Record<string, unknown>) => toEntry(x, 'partner', 'corporate')),
    investors: (parsed.investors ?? []).map((x: Record<string, unknown>) => toEntry(x, 'partner', 'investor')),
    serviceProviders: (parsed.service_providers ?? []).map((x: Record<string, unknown>) => toEntry(x, 'partner', 'service_provider')),
    initiatives: (parsed.initiatives ?? []).map((x: Record<string, unknown>) => toEntry(x, 'initiative', null)),
  }
}
