import { NextRequest } from 'next/server'
import { store } from '@/app/lib/store'

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/partners/[id]'>,
) {
  const { id } = await ctx.params
  const deleted = await store.deletePartner(id)
  if (!deleted) return Response.json({ error: `Partner '${id}' not found` }, { status: 404 })
  return Response.json({ ok: true })
}
