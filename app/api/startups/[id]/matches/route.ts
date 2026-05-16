import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { store } from '@/app/lib/store'
import { getGeminiModel, getMatches } from '@/app/lib/gemini'
import { buildMatchingPrompt } from '@/app/lib/prompts'
import type { MatchResult, MatchResponse } from '@/app/lib/types'

function loadSeedData() {
  const dir = join(process.cwd(), 'data')
  return {
    mentors: JSON.parse(readFileSync(join(dir, 'mentors.json'), 'utf8')),
    programmes: JSON.parse(readFileSync(join(dir, 'programmes.json'), 'utf8')),
    partners: JSON.parse(readFileSync(join(dir, 'partners.json'), 'utf8')),
  }
}

function toResults(items: unknown[]): MatchResult[] {
  return (items as Array<Record<string, unknown>>).map(item => ({
    actorId: item.actor_id as string,
    actorName: item.actor_name as string,
    actorType: item.actor_type as MatchResult['actorType'],
    partnerType: (item.partner_type ?? null) as MatchResult['partnerType'],
    matchScore: item.match_score as number,
    matchReason: item.match_reason as string,
  }))
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/startups/[id]/matches'>,
) {
  const { id } = await ctx.params
  const startup = store.getStartup(id)
  if (!startup) return Response.json({ error: `Startup '${id}' not found` }, { status: 404 })

  const { mentors, programmes, partners } = loadSeedData()
  const prompt = buildMatchingPrompt(startup, mentors, programmes, partners)

  let raw: Record<string, unknown[]>
  try {
    const model = getGeminiModel()
    raw = await getMatches(model, prompt)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 })
  }

  const response: MatchResponse = {
    mentors: toResults(raw.mentors ?? []),
    programmes: toResults(raw.programmes ?? []),
    corporatePartners: toResults(raw.corporate_partners ?? []),
    investors: toResults(raw.investors ?? []),
    serviceProviders: toResults(raw.service_providers ?? []),
  }

  return Response.json(response)
}
