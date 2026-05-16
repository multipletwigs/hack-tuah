import { NextRequest } from 'next/server'
import { matchNaturalLanguageQuery } from '@/app/lib/matchingEngine'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const query = typeof body.query === 'string' ? body.query.trim() : ''

  if (!query) {
    return Response.json({ error: 'Missing query' }, { status: 422 })
  }

  let result: Awaited<ReturnType<typeof matchNaturalLanguageQuery>>
  try {
    result = await matchNaturalLanguageQuery(query)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 })
  }

  if (!result) {
    return Response.json({ error: 'No matching startup found for query' }, { status: 404 })
  }

  return Response.json(result)
}
