import { NextRequest } from 'next/server'
import { store, docToInitiative } from '@/app/lib/store'

export async function GET() {
  return Response.json(store.getAllInitiatives().map(i => docToInitiative(i)!))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, type, focusIndustries, fundingAmount, nextIntake, status } = body

  if (!name || !type) {
    return Response.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const initiativeId = `init_${Math.random().toString(16).slice(2, 8)}`
  store.saveInitiative(initiativeId, {
    initiative_id: initiativeId,
    name,
    type,
    focus_industries: focusIndustries ?? [],
    funding_amount: fundingAmount ?? null,
    next_intake: nextIntake ?? null,
    status: status ?? 'active',
    created_at: new Date().toISOString(),
  })

  return Response.json({ initiativeId }, { status: 201 })
}
