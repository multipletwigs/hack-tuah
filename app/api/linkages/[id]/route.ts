import { NextRequest } from 'next/server'
import { store, docToLinkage } from '@/app/lib/store'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/linkages/[id]'>,
) {
  const { id } = await ctx.params
  const doc = await store.getLinkage(id)
  if (!doc) return Response.json({ error: `Linkage '${id}' not found` }, { status: 404 })
  return Response.json(docToLinkage(doc))
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/linkages/[id]'>,
) {
  const { id } = await ctx.params
  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.outcome) updates.outcome = body.outcome

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 422 })
  }

  const updated = await store.updateLinkage(id, updates as Parameters<typeof store.updateLinkage>[1])
  if (!updated) return Response.json({ error: `Linkage '${id}' not found` }, { status: 404 })
  return Response.json(docToLinkage(updated))
}
