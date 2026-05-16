import { GoogleGenerativeAI } from '@google/generative-ai'

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

export async function getMatches(model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, prompt: string): Promise<Record<string, unknown[]>> {
  const result = await model.generateContent(prompt)
  let text = result.response.text().trim()

  if (text.startsWith('```')) {
    const lines = text.split('\n').slice(1)
    if (lines.at(-1)?.trim().startsWith('```')) lines.pop()
    text = lines.join('\n').trim()
  }

  let parsed: Record<string, unknown[]>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Gemini response is not valid JSON: ${text.slice(0, 200)}`)
  }

  const all = [
    ...(parsed.mentors ?? []),
    ...(parsed.programmes ?? []),
    ...(parsed.corporate_partners ?? []),
    ...(parsed.investors ?? []),
    ...(parsed.service_providers ?? []),
  ] as Array<Record<string, unknown>>

  for (const item of all) {
    const score = item.match_score
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error(`match_score out of range for actor_id=${item.actor_id}: ${score}`)
    }
  }

  return parsed
}
