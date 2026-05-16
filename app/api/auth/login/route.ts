import { NextRequest } from 'next/server'

const STAFF_EMAIL = process.env.STAFF_EMAIL ?? 'admin@cradle.com.my'
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'cradle2026'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (email === STAFF_EMAIL && password === STAFF_PASSWORD) {
    return Response.json({ success: true, role: 'admin' })
  }

  return Response.json({ error: 'Invalid credentials' }, { status: 401 })
}
