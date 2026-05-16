import { NextRequest } from 'next/server'
import { store, docToPartnerRecord } from '@/app/lib/store'

export async function GET() {
  return Response.json((await store.getAllPartners()).map(p => docToPartnerRecord(p)))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { orgName, contactName, contactEmail, partnerType, industry } = body

  if (!orgName || !contactName || !contactEmail || !partnerType) {
    return Response.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const partnerId = `partner_${Math.random().toString(16).slice(2, 10)}`
  await store.savePartner(partnerId, {
    partner_id: partnerId,
    org_name: orgName,
    contact_name: contactName,
    contact_email: contactEmail,
    partner_type: partnerType,
    industry: industry ?? '',
    status: 'pending_review',
    created_at: new Date().toISOString(),
  })

  return Response.json({ partnerId, status: 'pending_review' }, { status: 201 })
}
