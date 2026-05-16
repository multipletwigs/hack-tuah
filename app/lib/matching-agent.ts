import { readFileSync } from 'fs'
import { join } from 'path'
import { getModel, responseText, responseFunctionCalls } from './vertex'
import { store, docToPartnerRecord, docToInitiative } from './store'

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

const MATCH_ITEM = {
  type: 'object' as const,
  properties: {
    actor_id:     { type: 'string' as const, description: 'ID of the actor from the fetched data' },
    actor_name:   { type: 'string' as const, description: 'Name of the actor' },
    match_score:  { type: 'number' as const, description: 'Match quality 0–100' },
    match_reason: { type: 'string' as const, description: 'Two sentences: what the actor offers the startup AND what the startup offers the actor' },
  },
  required: ['actor_id', 'actor_name', 'match_score', 'match_reason'],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOL_DECLARATIONS: any[] = [
  {
    name: 'get_startup_profile',
    description: 'Fetch a startup\'s full profile (industry, stage, problem, needs) by ID',
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
    description: 'Submit final top-3 matches per category. Call this once you have enough data.',
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
    return doc ?? { error: `Startup '${args.startup_id}' not found` }
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

const SYSTEM_PROMPT = `You are an intelligent startup ecosystem matching agent for Cradle, Malaysia's startup development fund.

Your task: find the top 3 best-fit ecosystem actors for a given startup across 5 categories — mentors, corporate partners, investors, service providers, and initiatives.

Workflow:
1. Call get_startup_profile to understand the startup's industry, stage, problem, and needs
2. Use the startup's industry as a filter when calling search tools to fetch only relevant actors
3. You may call multiple search tools (e.g. search all three partner types, or search initiatives separately)
4. Once you have sufficient candidates in each category, call submit_matches

For each match_reason (exactly 2 sentences):
- Sentence 1: What this actor specifically offers that addresses the startup's stated needs and problem
- Sentence 2: Why this startup is a strong fit from the actor's perspective (their thesis, eligibility criteria, or strategic interest)

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
  const empty = { steps: [], direction: 'from-actor' as const, startups: [], mentors: [], corporatePartners: [], investors: [], serviceProviders: [], initiatives: [] }

  let actorProfile: string
  if (actorType === 'partner') {
    const doc = store.getPartner(actorId)
    if (!doc) throw new Error(`Partner '${actorId}' not found`)
    const rec = docToPartnerRecord(doc)!

    // Enrich profile from JSON seed file if available
    let extra = ''
    try {
      const dataDir = join(process.cwd(), 'data')
      const file = rec.partnerType === 'mentor' ? 'mentors.json' : 'partners.json'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all: any[] = JSON.parse(readFileSync(join(dataDir, file), 'utf8'))
      const match = all.find((x: { name?: string }) => x.name === rec.orgName)
      if (match) {
        if (match.background)          extra += `\nBackground: ${match.background}`
        if (match.expertise)           extra += `\nExpertise: ${match.expertise.join(', ')}`
        if (match.investment_thesis)   extra += `\nInvestment thesis: ${match.investment_thesis}`
        if (match.what_they_offer)     extra += `\nWhat they offer: ${match.what_they_offer.join(', ')}`
        if (match.industries_interested) extra += `\nIndustries: ${match.industries_interested.join(', ')}`
        if (match.suitable_for_stage)  extra += `\nSuitable for stage: ${match.suitable_for_stage.join(', ')}`
        if (match.investment_stage)    extra += `\nInvestment stage: ${match.investment_stage.join(', ')}`
        if (match.ticket_size_min)     extra += `\nTicket size: $${match.ticket_size_min}–$${match.ticket_size_max}`
        if (match.startup_stage)       extra += `\nMentors startups at: ${match.startup_stage.join(', ')}`
      }
    } catch { /* JSON files optional */ }

    actorProfile = `Type: ${rec.partnerType}\nOrg: ${rec.orgName}\nIndustry: ${rec.industry}${extra}`
  } else {
    const doc = store.getInitiative(actorId)
    if (!doc) throw new Error(`Initiative '${actorId}' not found`)
    const init = docToInitiative(doc)!

    // Enrich with eligibility/benefits from JSON seed file
    let extra = ''
    try {
      const all: Array<Record<string, unknown>> = JSON.parse(
        readFileSync(join(process.cwd(), 'data', 'initiatives.json'), 'utf8')
      )
      const match = all.find(x => x.name === init.name)
      if (match) {
        const elig = match.eligibility as Record<string, unknown> | undefined
        if (elig?.stage)            extra += `\nEligible stages: ${(elig.stage as string[]).join(', ')}`
        if (elig?.must_be_malaysian) extra += `\nMust be Malaysian: ${elig.must_be_malaysian}`
        if (match.benefits)         extra += `\nBenefits: ${(match.benefits as string[]).join(', ')}`
      }
    } catch { /* JSON files optional */ }

    actorProfile = `Type: initiative / ${init.type}\nName: ${init.name}\nDescription: ${init.description}\nFocus Industries: ${init.focusIndustries.join(', ')}\nStatus: ${init.status}${extra}`
  }

  const startupList = store.getAllStartups().map(s =>
    `ID: ${s.startup_id} | ${s.startup_name} | ${s.industry} | ${s.stage} | problem: ${s.problem} | needs: ${(s.needs ?? []).join(', ')}`
  ).join('\n')

  const prompt = `You are a Cradle ecosystem matching agent.

ACTOR PROFILE:
${actorProfile}

STARTUPS:
${startupList}

Find the top 3 startups that best fit this actor. Return JSON only (no markdown fences):
{
  "startups": [
    { "actor_id": "startup_id", "actor_name": "name", "match_score": 75, "match_reason": "Sentence 1: what this startup needs that this actor provides. Sentence 2: why this actor is strategically interested in this startup." }
  ]
}

Score range 60-100. Top 3 only.`

  logAgent(requestId, 'actor-agent-start', {
    actorId,
    actorType,
    promptLength: prompt.length,
    startupCount: store.getAllStartups().length,
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
    ...empty,
    startups: (parsed.startups ?? []).map((x: Record<string, unknown>) => toEntry(x, 'startup', null)),
  }
}
