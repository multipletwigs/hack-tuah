import { NextRequest } from 'next/server'
import { runMatchingAgent, runActorMatching } from '@/app/lib/matching-agent'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const body = await request.json()
  const { startupId, actorId, actorType } = body

  console.info('[matching-api] request', {
    requestId,
    mode: startupId ? 'startup' : actorId ? 'actor' : 'invalid',
    startupId,
    actorId,
    actorType,
  })

  try {
    if (startupId) {
      const result = await runMatchingAgent(startupId, requestId)
      console.info('[matching-api] success', {
        requestId,
        steps: result.steps.length,
        mentors: result.mentors.length,
        corporatePartners: result.corporatePartners.length,
        investors: result.investors.length,
        serviceProviders: result.serviceProviders.length,
        initiatives: result.initiatives.length,
        startups: result.startups.length,
      })
      return Response.json(result)
    }
    if (actorId && (actorType === 'partner' || actorType === 'initiative')) {
      const result = await runActorMatching(actorId, actorType, requestId)
      console.info('[matching-api] success', {
        requestId,
        steps: result.steps.length,
        startups: result.startups.length,
      })
      return Response.json(result)
    }
    return Response.json({ error: 'Provide startupId or actorId+actorType' }, { status: 422 })
  } catch (err) {
    console.error('[matching-api] error', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    })
    return Response.json({ error: err instanceof Error ? err.message : 'Agent failed' }, { status: 500 })
  }
}
