import { NextRequest } from 'next/server'
import { store, docToLinkage } from '@/app/lib/store'

function generateLinkageId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const hex = Math.random().toString(16).slice(2, 5)
  return `lnk_${date}_${hex}`
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    startupId,
    startupName,
    sourceId,
    sourceName,
    sourceType,
    sourcePartnerType,
    actorType,
    partnerType,
    actorId,
    actorName,
    matchScore,
    matchReason,
  } = body

  const normalizedSourceId = sourceId ?? startupId
  const normalizedSourceName = sourceName ?? startupName
  const normalizedSourceType = sourceType ?? 'startup'

  if (!normalizedSourceId || !normalizedSourceName || !normalizedSourceType || !actorType || !actorId || !actorName) {
    return Response.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const linkageId = generateLinkageId()
  const normalizedActorType = actorType === 'programme' ? 'initiative' : actorType
  const sourceIsStartup = normalizedSourceType === 'startup'
  store.saveLinkage({
    linkage_id: linkageId,
    startup_id: sourceIsStartup ? normalizedSourceId : '',
    startup_name: sourceIsStartup ? normalizedSourceName : '',
    source_id: normalizedSourceId,
    source_name: normalizedSourceName,
    source_type: normalizedSourceType,
    source_partner_type: sourcePartnerType ?? null,
    actor_type: normalizedActorType,
    partner_type: partnerType ?? null,
    actor_id: actorId,
    actor_name: actorName,
    match_score: matchScore,
    match_reason: matchReason,
    status: 'active',
    initiative_cycle: null,
    created_at: new Date().toISOString(),
    outcome: null,
  })

  return Response.json({ linkageId }, { status: 201 })
}

export async function GET() {
  return Response.json(store.getAllLinkages().map(docToLinkage))
}
