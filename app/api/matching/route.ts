import { NextRequest } from 'next/server'
import { matchNaturalLanguageQuery } from '@/app/lib/matchingEngine'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const body = await request.json()
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  console.info('[matching-api-legacy] request', {
    requestId,
    route: '/api/matching',
    queryLength: query.length,
    queryPreview: query.length > 200 ? `${query.slice(0, 200)}...` : query,
  })

  if (!query) {
    return Response.json({ error: 'Missing query' }, { status: 422 })
  }

  let result: Awaited<ReturnType<typeof matchNaturalLanguageQuery>>
  try {
    result = await matchNaturalLanguageQuery(query, requestId)
  } catch (err) {
    console.error('[matching-api-legacy] error', {
      requestId,
      route: '/api/matching',
      error: err instanceof Error ? err.message : String(err),
    })
    return Response.json({ error: String(err) }, { status: 502 })
  }

  if (!result) {
    console.info('[matching-api-legacy] not-found', { requestId, route: '/api/matching' })
    return Response.json({ error: 'No matching startup found for query' }, { status: 404 })
  }

  console.info('[matching-api-legacy] success', {
    requestId,
    route: '/api/matching',
    startupId: result.startup.startup_id,
  })
  return Response.json(result)
}
