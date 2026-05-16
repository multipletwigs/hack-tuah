import { NextRequest } from 'next/server'
import { runMatchingAgent } from '@/app/lib/matching-agent'

export async function POST(request: NextRequest) {
  const { startupId } = await request.json()
  if (!startupId) return Response.json({ error: 'startupId is required' }, { status: 422 })

  try {
    const result = await runMatchingAgent(startupId)
    return Response.json(result)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Agent failed' },
      { status: 500 }
    )
  }
}
