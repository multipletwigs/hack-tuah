import { readFileSync } from 'fs'
import { join } from 'path'
import { getModel, responseText, responseFunctionCalls } from './vertex'
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
  mentors: MatchEntry[]
  corporatePartners: MatchEntry[]
  investors: MatchEntry[]
  serviceProviders: MatchEntry[]
  initiatives: MatchEntry[]
  startups: MatchEntry[]
  direction: 'from-startup' | 'from-actor'
}

function preview(value: string, limit = 700): string {
  return value.length > limit ? `${value.slice(0, limit)}...` : value
}

function summarizeToolResult(result: unknown): Record<string, unknown> {
  if (!result || typeof result !== 'object') return { type: typeof result }
  const record = result as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      Array.isArray(value) ? { count: value.length } : typeof value,
    ]),
  )
}

function logAgent(requestId: string, event: string, data: Record<string, unknown> = {}) {
  console.info('[matching-agent]', { requestId, event, ...data })
}

function relevantLinkageRecords(actorId: string): Array<Record<string, unknown>> {
  return store.getAllLinkages()
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

const MATCH_ITEM = {
  type: 'object' as const,
  properties: {
    actor_id:     { type: 'string' as const, description: 'ID of the actor from the fetched data' },
    actor_name:   { type: 'string' as const, description: 'Name of the actor' },
    match_score:  { type: 'number' as const, description: 'Match quality 0–100' },
    match_reason: { type: 'string' as const, description: 'Two sentences explaining concrete value exchange: what the actor can actually provide to the startup AND what the startup provides back strategically' },
  },
  required: ['actor_id', 'actor_name', 'match_score', 'match_reason'],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOL_DECLARATIONS: any[] = [
  {
    name: 'get_startup_profile',
    description: 'Fetch a startup\'s full profile (industry, stage, problem, needs) and existing linkages by ID',
    parameters: {
      type: 'object',
      properties: { startup_id: { type: 'string', description: 'The startup ID' } },
      required: ['startup_id'],
    },
  },
  {
    name: 'search_partners',
    description: 'Search corporate partners, investors, or service providers. Use industry filter to narrow context before matching.',
    parameters: {
      type: 'object',
      properties: {
        industry:     { type: 'string', description: 'Industry keyword to filter by (e.g. fintech, healthtech)' },
        partner_type: { type: 'string', description: 'corporate | investor | service_provider — omit to get all' },
      },
    },
  },
  {
    name: 'search_mentors',
    description: 'Search mentors, optionally filtered by industry expertise',
    parameters: {
      type: 'object',
      properties: {
        industry: { type: 'string', description: 'Industry keyword to filter by' },
      },
    },
  },
  {
    name: 'search_initiatives',
    description: 'Search initiatives such as programmes, grants, accelerators, incubators, and challenges. Filter by industry to reduce context size.',
    parameters: {
      type: 'object',
      properties: {
        industry: { type: 'string', description: 'Industry keyword to filter by' },
        type:     { type: 'string', description: 'accelerator | grant | incubator | programme | challenge' },
      },
    },
  },
  {
    name: 'submit_matches',
    description: 'Submit final top-3 matches per category with value-based scores. Call this once you have enough data.',
    parameters: {
      type: 'object',
      properties: {
        mentors:            { type: 'array', items: MATCH_ITEM, description: 'Top 3 mentor matches' },
        corporate_partners: { type: 'array', items: MATCH_ITEM, description: 'Top 3 corporate partner matches' },
        investors:          { type: 'array', items: MATCH_ITEM, description: 'Top 3 investor matches' },
        service_providers:  { type: 'array', items: MATCH_ITEM, description: 'Top 3 service provider matches' },
        initiatives:        { type: 'array', items: MATCH_ITEM, description: 'Top 3 initiative matches' },
      },
      required: ['mentors', 'corporate_partners', 'investors', 'service_providers', 'initiatives'],
    },
  },
]

function executeTool(name: string, args: Record<string, string>): unknown {
  if (name === 'get_startup_profile') {
    const doc = store.getStartup(args.startup_id)
    return doc
      ? { startup: doc, existing_linkages: relevantLinkageRecords(args.startup_id) }
      : { error: `Startup '${args.startup_id}' not found` }
  }

  if (name === 'search_partners') {
    const all = store.getAllPartners().filter(p => p.partner_type !== 'mentor')
    const filtered = all.filter(p => {
      if (args.partner_type && p.partner_type !== args.partner_type) return false
      if (args.industry && !p.industry.toLowerCase().includes(args.industry.toLowerCase())) return false
      return true
    })
    return { partners: (filtered.length > 0 ? filtered : all).map(p => docToPartnerRecord(p)) }
  }

  if (name === 'search_mentors') {
    const all = store.getAllPartners().filter(p => p.partner_type === 'mentor')
    const filtered = all.filter(p =>
      !args.industry || p.industry.toLowerCase().includes(args.industry.toLowerCase())
    )
    return { mentors: (filtered.length > 0 ? filtered : all).map(p => docToPartnerRecord(p)) }
  }

  if (name === 'search_initiatives') {
    const all = store.getAllInitiatives()
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

function startupCandidateRecords(excludeId?: string): Array<Record<string, unknown>> {
  return store.getAllStartups()
    .filter(startup => startup.startup_id !== excludeId)
    .map(startup => ({
      actor_id: startup.startup_id,
      actor_name: startup.startup_name,
      actor_type: 'startup',
      partner_type: null,
      industry: startup.industry,
      stage: startup.stage,
      problem: startup.problem,
      needs: startup.needs,
    }))
}

function partnerCandidateRecords(partnerType: string, excludeId?: string): Array<Record<string, unknown>> {
  return store.getAllPartners()
    .filter(partner => partner.partner_type === partnerType && partner.partner_id !== excludeId)
    .map(partner => ({
      actor_id: partner.partner_id,
      actor_name: partner.org_name,
      actor_type: partner.partner_type === 'mentor' ? 'mentor' : 'partner',
      partner_type: partner.partner_type === 'mentor' ? null : partner.partner_type,
      industry: partner.industry,
      status: partner.status,
    }))
}

function initiativeCandidateRecords(excludeId?: string): Array<Record<string, unknown>> {
  return store.getAllInitiatives()
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
  const model = getModel(TOOL_DECLARATIONS)
  const firstMessage = `Find ecosystem matches for startup ID: ${startupId}. Begin by fetching the startup profile.`

  logAgent(requestId, 'startup-agent-start', {
    startupId,
    systemPromptLength: SYSTEM_PROMPT.length,
    firstMessage,
    tools: TOOL_DECLARATIONS.map(tool => tool.name),
  })

  const chat = model.startChat({
    history: [
      { role: 'user',  parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood. I will fetch the startup profile first, then search for relevant ecosystem actors before submitting matches.' }] },
    ],
  })

  const steps: AgentStep[] = []
  logAgent(requestId, 'model-call', { call: 1, kind: 'initial-chat' })
  let modelCallCount = 1
  let result = await chat.sendMessage(firstMessage)

  for (let i = 0; i < 10; i++) {
    const calls = responseFunctionCalls(result.response)
    logAgent(requestId, 'model-response', {
      call: modelCallCount,
      loop: i,
      functionCalls: calls?.map(call => call.name) ?? [],
      textPreview: preview(responseText(result.response)),
    })

    if (!calls || calls.length === 0) break

    const responses = []

    for (const call of calls) {
      if (call.name === 'submit_matches') {
        const args = call.args as Record<string, Array<Record<string, unknown>>>
        logAgent(requestId, 'submit-matches', {
          modelCalls: modelCallCount,
          steps: steps.length,
          mentors: args.mentors?.length ?? 0,
          corporatePartners: args.corporate_partners?.length ?? 0,
          investors: args.investors?.length ?? 0,
          serviceProviders: args.service_providers?.length ?? 0,
          initiatives: args.initiatives?.length ?? 0,
        })
        return {
          steps,
          direction:         'from-startup' as const,
          startups:          [],
          mentors:           (args.mentors           ?? []).map(x => toEntry(x, 'mentor',     null)),
          corporatePartners: (args.corporate_partners ?? []).map(x => toEntry(x, 'partner',    'corporate')),
          investors:         (args.investors          ?? []).map(x => toEntry(x, 'partner',    'investor')),
          serviceProviders:  (args.service_providers  ?? []).map(x => toEntry(x, 'partner',    'service_provider')),
          initiatives:       (args.initiatives        ?? []).map(x => toEntry(x, 'initiative', null)),
        }
      }

      const toolResult = executeTool(call.name, call.args as Record<string, string>)
      logAgent(requestId, 'tool-call', {
        loop: i,
        tool: call.name,
        args: call.args,
        result: summarizeToolResult(toolResult),
      })
      steps.push({ tool: call.name, args: call.args as Record<string, unknown>, result: toolResult })
      responses.push({ functionResponse: { name: call.name, response: { result: toolResult } } })
    }

    modelCallCount += 1
    logAgent(requestId, 'model-call', {
      call: modelCallCount,
      kind: 'tool-response-chat',
      toolResponses: responses.map(response => response.functionResponse.name),
    })
    result = await chat.sendMessage(responses)
  }

  logAgent(requestId, 'startup-agent-empty-result', { modelCalls: modelCallCount, steps: steps.length })
  return { steps, direction: 'from-startup' as const, startups: [], mentors: [], corporatePartners: [], investors: [], serviceProviders: [], initiatives: [] }
}

export async function runActorMatching(actorId: string, actorType: 'partner' | 'initiative', requestId = crypto.randomUUID()): Promise<AgentMatchResult> {
  let actorProfile: Record<string, unknown>
  let sourceLabel: string
  if (actorType === 'partner') {
    const doc = store.getPartner(actorId)
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
      status: rec.status,
      ...extra,
    }
  } else {
    const doc = store.getInitiative(actorId)
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

  const candidates = {
    startups: startupCandidateRecords(actorType === 'partner' ? undefined : actorId),
    mentors: partnerCandidateRecords('mentor', actorId),
    corporate_partners: partnerCandidateRecords('corporate', actorId),
    investors: partnerCandidateRecords('investor', actorId),
    service_providers: partnerCandidateRecords('service_provider', actorId),
    initiatives: initiativeCandidateRecords(actorType === 'initiative' ? actorId : undefined),
  }
  const existingLinkages = relevantLinkageRecords(actorId)

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

  const model = getModel()
  logAgent(requestId, 'model-call', { call: 1, kind: 'actor-generate-content' })
  const res = await model.generateContent(prompt)
  const text = responseText(res.response).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  logAgent(requestId, 'model-response', {
    call: 1,
    textLength: text.length,
    textPreview: preview(text),
  })
  const parsed = JSON.parse(text)
  return {
    steps: [],
    direction: 'from-actor' as const,
    startups: (parsed.startups ?? []).map((x: Record<string, unknown>) => toEntry(x, 'startup', null)),
    mentors: (parsed.mentors ?? []).map((x: Record<string, unknown>) => toEntry(x, 'mentor', null)),
    corporatePartners: (parsed.corporate_partners ?? []).map((x: Record<string, unknown>) => toEntry(x, 'partner', 'corporate')),
    investors: (parsed.investors ?? []).map((x: Record<string, unknown>) => toEntry(x, 'partner', 'investor')),
    serviceProviders: (parsed.service_providers ?? []).map((x: Record<string, unknown>) => toEntry(x, 'partner', 'service_provider')),
    initiatives: (parsed.initiatives ?? []).map((x: Record<string, unknown>) => toEntry(x, 'initiative', null)),
  }
}
