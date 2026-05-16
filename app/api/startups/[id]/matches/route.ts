import { NextRequest } from 'next/server'
import { matchStartupById } from '@/app/lib/matchingEngine'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/startups/[id]/matches'>,
) {
  const requestId = crypto.randomUUID()
  const { id } = await ctx.params
  console.info('[matching-api-legacy] request', {
    requestId,
    route: '/api/startups/[id]/matches',
    startupId: id,
  })

  let result: Awaited<ReturnType<typeof matchStartupById>>
  try {
    result = await matchStartupById(id, requestId)
  } catch (err) {
    console.error('[matching-api-legacy] error', {
      requestId,
      route: '/api/startups/[id]/matches',
      startupId: id,
      error: err instanceof Error ? err.message : String(err),
    })
    return Response.json({ error: String(err) }, { status: 502 })
  }

  if (!result) {
    console.info('[matching-api-legacy] not-found', {
      requestId,
      route: '/api/startups/[id]/matches',
      startupId: id,
    })
    return Response.json({ error: `Startup '${id}' not found` }, { status: 404 })
  }

  console.info('[matching-api-legacy] success', {
    requestId,
    route: '/api/startups/[id]/matches',
    startupId: id,
  })
  return Response.json(result.matches)
}
