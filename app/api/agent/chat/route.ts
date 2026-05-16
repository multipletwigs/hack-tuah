import { NextRequest } from 'next/server'
import { getModel, responseText } from '@/app/lib/vertex'
import { store } from '@/app/lib/store'

export async function POST(request: NextRequest) {
  const { message, context } = await request.json()


  const startups = store.getAllStartups()
  const startupList = startups
    .map(s => `${s.startup_id}: ${s.startup_name} (${s.industry}, ${s.stage})`)
    .join('\n')

  const linkedIds: string[] = context?.linkedStartupIds ?? []
  const unlinkedIds = startups.filter(s => !linkedIds.includes(s.startup_id)).map(s => s.startup_id)

  const prompt = `You are a Cradle ecosystem assistant helping a fund manager navigate the startup network.

Startups:
${startupList}

Linked startup IDs (already have confirmed matches): ${linkedIds.join(', ') || 'none'}
Unlinked startup IDs: ${unlinkedIds.join(', ') || 'none'}

User message: "${message}"

Reply with JSON only (no markdown fences):
{
  "response": "conversational reply to show in the chat UI",
  "action": "match" | "none",
  "startup_id": "startup ID if action is match, else omit"
}

Rules:
- action=match only when the user clearly wants to generate matches for a specific startup (by name or ID)
- If the user asks about unmatched startups, list them by name in the response but do not trigger action=match
- Be concise and helpful; mention startup names, not IDs, in the response`

  try {
    const model = getModel()
    const result = await model.generateContent(prompt)
    const text = responseText(result.response).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return Response.json(JSON.parse(text))
  } catch {
    return Response.json({
      response: 'Sorry, I had trouble with that. Try clicking a startup node directly to generate matches.',
      action: 'none',
    })
  }
}
