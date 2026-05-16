import { NextRequest } from 'next/server'
import { runMatchingAgent, runActorMatching } from '@/app/lib/matching-agent'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { startupId, actorId, actorType } = body

  try {
    if (startupId) {
      return Response.json(await runMatchingAgent(startupId))
    }
    if (actorId && (actorType === 'partner' || actorType === 'initiative')) {
      return Response.json(await runActorMatching(actorId, actorType))
    }
    return Response.json({ error: 'Provide startupId or actorId+actorType' }, { status: 422 })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Agent failed' }, { status: 500 })
  }
}
