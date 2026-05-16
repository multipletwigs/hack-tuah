import { readFileSync } from 'fs'
import { join } from 'path'
import { getGeminiModel, getMatches, GEMINI_MODEL } from './gemini'
import { buildMatchingPrompt } from './prompts'
import { store, docToInitiative } from './store'
import type { MatchResponse, MatchResult, PartnerType } from './types'

type RawRecord = Record<string, unknown>

interface StartupForMatching {
  startup_id: string
  cofounder_name: string
  startup_name: string
  industry: string
  stage: string
  problem: string
  needs: string[]
  created_at: string
}

interface ToolTrace {
  tool: string
  input: Record<string, unknown>
  resultCount?: number
  selectedId?: string
}

interface CandidateSet {
  mentors: RawRecord[]
  initiatives: RawRecord[]
  partners: RawRecord[]
}

export interface MatchingEngineResult {
  startup: StartupForMatching
  matches: MatchResponse
  trace: ToolTrace[]
}

function loadSeedData(): CandidateSet {
  const dir = join(process.cwd(), 'data')
  return {
    mentors: JSON.parse(readFileSync(join(dir, 'mentors.json'), 'utf8')),
    initiatives: JSON.parse(readFileSync(join(dir, 'initiatives.json'), 'utf8')),
    partners: JSON.parse(readFileSync(join(dir, 'partners.json'), 'utf8')),
  }
}

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().trim()
}

function words(value: unknown): string[] {
  return normalize(value).split(/[^a-z0-9]+/).filter(Boolean)
}

function fieldWords(record: RawRecord, fields: string[]): Set<string> {
  return new Set(fields.flatMap(field => words(record[field])))
}

function hasOverlap(record: RawRecord, fields: string[], terms: string[]): boolean {
  const values = fieldWords(record, fields)
  return terms.some(term => values.has(normalize(term)))
}

function arrayIncludes(record: RawRecord, field: string, value: string): boolean {
  const raw = record[field]
  if (!Array.isArray(raw)) return false
  return raw.map(normalize).includes(normalize(value))
}

function candidateScore(startup: StartupForMatching, record: RawRecord): number {
  const industry = normalize(startup.industry)
  const stage = normalize(startup.stage)
  const needs = startup.needs.map(normalize)
  let score = 0

  if (hasOverlap(record, ['industries', 'expertise', 'focus_industries', 'industries_interested', 'service_type', 'investment_thesis', 'description'], [industry])) score += 4
  if (arrayIncludes(record, 'startup_stage', stage) || arrayIncludes(record, 'suitable_for_stage', stage) || arrayIncludes(record, 'investment_stage', stage)) score += 3
  if (typeof record.eligibility === 'object' && record.eligibility && arrayIncludes(record.eligibility as RawRecord, 'stage', stage)) score += 3
  if (hasOverlap(record, ['what_they_offer', 'benefits', 'background', 'investment_thesis', 'description'], needs)) score += 2

  return score
}

function topCandidates(startup: StartupForMatching, records: RawRecord[], limit = 8): RawRecord[] {
  const scored = records
    .map(record => ({ record, score: candidateScore(startup, record) }))
    .sort((a, b) => b.score - a.score)

  const filtered = scored.filter(item => item.score > 0)
  return (filtered.length ? filtered : scored).slice(0, limit).map(item => item.record)
}

function storePartnersAsCandidates(): RawRecord[] {
  return store.getAllPartners().map(partner => ({
    id: partner.partner_id,
    name: partner.org_name,
    partner_type: partner.partner_type,
    industries: words(partner.industry),
    status: partner.status,
    contact_type: partner.contact_name,
  }))
}

function storeInitiativesAsCandidates(): RawRecord[] {
  return store.getAllInitiatives().map(initiative => {
    const publicInitiative = docToInitiative(initiative)!
    return {
      id: publicInitiative.initiativeId,
      name: publicInitiative.name,
      type: publicInitiative.type,
      description: publicInitiative.description,
      focus_industries: publicInitiative.focusIndustries,
      funding_amount: publicInitiative.fundingAmount,
      next_intake: publicInitiative.nextIntake,
      status: publicInitiative.status,
      owner: 'Cradle',
    }
  })
}

function dedupeById(records: RawRecord[]): RawRecord[] {
  const seen = new Set<string>()
  return records.filter(record => {
    const id = String(record.id ?? '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function fetchCandidateSet(startup: StartupForMatching, trace: ToolTrace[]): CandidateSet {
  const seed = loadSeedData()
  const mentors = dedupeById([
    ...seed.mentors,
    ...storePartnersAsCandidates().filter(partner => partner.partner_type === 'mentor'),
  ])
  const initiatives = dedupeById([...seed.initiatives, ...storeInitiativesAsCandidates()])
  const partners = dedupeById([
    ...seed.partners,
    ...storePartnersAsCandidates().filter(partner => partner.partner_type !== 'mentor'),
  ])

  const criteria = { industry: startup.industry, stage: startup.stage, needs: startup.needs }
  const filtered = {
    mentors: topCandidates(startup, mentors),
    initiatives: topCandidates(startup, initiatives),
    partners: topCandidates(startup, partners, 12),
  }

  trace.push({ tool: 'fetch_mentors', input: criteria, resultCount: filtered.mentors.length })
  trace.push({ tool: 'fetch_initiatives', input: criteria, resultCount: filtered.initiatives.length })
  trace.push({ tool: 'fetch_partners', input: criteria, resultCount: filtered.partners.length })

  return filtered
}

function toResults(items: unknown[]): MatchResult[] {
  return (items as RawRecord[]).map(item => ({
    actorId: item.actor_id as string,
    actorName: item.actor_name as string,
    actorType: (item.actor_type === 'programme' ? 'initiative' : item.actor_type) as MatchResult['actorType'],
    partnerType: (item.partner_type ?? null) as PartnerType | null,
    matchScore: item.match_score as number,
    matchReason: item.match_reason as string,
  }))
}

function toMatchResponse(raw: Record<string, unknown[]>): MatchResponse {
  return {
    mentors: toResults(raw.mentors ?? []).slice(0, 3),
    initiatives: toResults(raw.initiatives ?? raw.programmes ?? []).slice(0, 3),
    corporatePartners: toResults(raw.corporate_partners ?? []).slice(0, 3),
    investors: toResults(raw.investors ?? []).slice(0, 3),
    serviceProviders: toResults(raw.service_providers ?? []).slice(0, 3),
  }
}

function startupSearchText(startup: StartupForMatching): string {
  return [
    startup.startup_id,
    startup.startup_name,
    startup.industry,
    startup.stage,
    startup.problem,
    ...startup.needs,
  ].join(' ')
}

function findStartupFromQuery(query: string, trace: ToolTrace[]): StartupForMatching | null {
  const startups = store.getAllStartups()
  trace.push({ tool: 'fetch_startup_list', input: { query }, resultCount: startups.length })

  const queryNorm = normalize(query)
  const exact = startups.find(startup =>
    queryNorm.includes(normalize(startup.startup_id)) ||
    queryNorm.includes(normalize(startup.startup_name)),
  )
  if (exact) {
    trace.push({ tool: 'select_startup', input: { strategy: 'exact_name_or_id' }, selectedId: exact.startup_id })
    return exact
  }

  const queryWords = new Set(words(query))
  const ranked = startups
    .map(startup => ({
      startup,
      score: words(startupSearchText(startup)).filter(word => queryWords.has(word)).length,
    }))
    .sort((a, b) => b.score - a.score)

  const selected = ranked[0]?.score > 0 ? ranked[0].startup : null
  trace.push({ tool: 'select_startup', input: { strategy: 'keyword_overlap' }, selectedId: selected?.startup_id })
  return selected
}

async function runMatching(startup: StartupForMatching, trace: ToolTrace[]): Promise<MatchingEngineResult> {
  trace.push({
    tool: 'reason',
    input: {
      thought: 'Use the startup profile to fetch small candidate sets before asking the LLM to rank mutual fit.',
    },
  })

  const candidates = fetchCandidateSet(startup, trace)
  const prompt = buildMatchingPrompt(startup, candidates.mentors, candidates.initiatives, candidates.partners)
  const model = getGeminiModel()
  const raw = await getMatches(model, prompt)

  trace.push({ tool: 'rank_matches_with_llm', input: { model: GEMINI_MODEL } })
  return { startup, matches: toMatchResponse(raw), trace }
}

export async function matchStartupById(startupId: string): Promise<MatchingEngineResult | null> {
  const startup = store.getStartup(startupId)
  if (!startup) return null

  const trace: ToolTrace[] = [
    { tool: 'fetch_startup_by_id', input: { startupId }, selectedId: startup.startup_id },
  ]
  return runMatching(startup, trace)
}

export async function matchNaturalLanguageQuery(query: string): Promise<MatchingEngineResult | null> {
  const trace: ToolTrace[] = [
    { tool: 'parse_request', input: { query } },
  ]
  const startup = findStartupFromQuery(query, trace)
  if (!startup) return null
  return runMatching(startup, trace)
}
