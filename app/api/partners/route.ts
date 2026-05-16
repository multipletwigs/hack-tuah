import { NextRequest } from 'next/server'
import { store } from '@/app/lib/store'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { orgName, contactName, contactEmail, partnerType } = body

  if (!orgName || !contactName || !contactEmail || !partnerType) {
    return Response.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const partnerId = `partner_${Math.random().toString(16).slice(2, 10)}`
  store.savePartner(partnerId, {
    partner_id: partnerId,
    ...body,
    status: 'pending_review',
    created_at: new Date().toISOString(),
  })

  return Response.json({ partnerId, status: 'pending_review' }, { status: 201 })
}
