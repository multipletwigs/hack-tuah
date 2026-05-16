import { NextRequest } from 'next/server'
import { store, docToLinkage } from '@/app/lib/store'

function generateLinkageId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const hex = Math.random().toString(16).slice(2, 5)
  return `lnk_${date}_${hex}`
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { startupId, startupName, actorType, partnerType, actorId, actorName, matchScore, matchReason } = body

  if (!startupId || !startupName || !actorType || !actorId || !actorName) {
    return Response.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const linkageId = generateLinkageId()
  const normalizedActorType = actorType === 'programme' ? 'initiative' : actorType
  store.saveLinkage({
    linkage_id: linkageId,
    startup_id: startupId,
    startup_name: startupName,
    actor_type: normalizedActorType,
    partner_type: partnerType ?? null,
    actor_id: actorId,
    actor_name: actorName,
    match_score: matchScore,
    match_reason: matchReason,
    status: 'active',
    programme_cycle: null,
    created_at: new Date().toISOString(),
    outcome: null,
  })

  return Response.json({ linkageId }, { status: 201 })
}

export async function GET() {
  return Response.json(store.getAllLinkages().map(docToLinkage))
}
