import { NextRequest } from 'next/server'
import { matchStartupById } from '@/app/lib/matchingEngine'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/startups/[id]/matches'>,
) {
  const { id } = await ctx.params

  let result: Awaited<ReturnType<typeof matchStartupById>>
  try {
    result = await matchStartupById(id)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 })
  }

  if (!result) return Response.json({ error: `Startup '${id}' not found` }, { status: 404 })

  return Response.json(result.matches)
}
