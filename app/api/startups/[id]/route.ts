import type { NextRequest } from 'next/server'
import { store } from '@/app/lib/store'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/startups/[id]'>,
) {
  const { id } = await ctx.params
  const startup = store.getStartup(id)
  if (!startup) return Response.json({ error: `Startup '${id}' not found` }, { status: 404 })
  return Response.json(startup)
}
