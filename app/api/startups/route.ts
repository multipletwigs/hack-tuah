import { NextRequest } from 'next/server'
import { store } from '@/app/lib/store'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { cofounderName, startupName, industry, stage, problem, needs, shortDescription } = body

  if (!cofounderName || !startupName || !industry || !stage || !problem) {
    return Response.json({ error: 'Missing required fields' }, { status: 422 })
  }

  const startupId = `startup_${Math.random().toString(16).slice(2, 10)}`
  await store.saveStartup(startupId, {
    startup_id: startupId,
    cofounder_name: cofounderName,
    startup_name: startupName,
    industry,
    stage,
    problem,
    needs: needs ?? [],
    short_description: shortDescription ?? '',
    created_at: new Date().toISOString(),
  })

  return Response.json({ startupId }, { status: 201 })
}

export async function GET() {
  return Response.json(await store.getAllStartups())
}
