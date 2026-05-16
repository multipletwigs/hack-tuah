import { VertexAI, type GenerateContentResponse, type FunctionCall } from '@google-cloud/vertexai'

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-001'

function createVertexAI(): VertexAI {
  const project = process.env.VERTEX_PROJECT
  if (!project) throw new Error('VERTEX_PROJECT is not set')
  const location = process.env.VERTEX_LOCATION ?? 'us-central1'

  const saJson = process.env.VERTEX_SERVICE_ACCOUNT_JSON
  if (saJson) {
    const { client_email, private_key } = JSON.parse(saJson)
    return new VertexAI({ project, location, googleAuthOptions: { credentials: { client_email, private_key } } })
  }

  // Falls back to GOOGLE_APPLICATION_CREDENTIALS or ADC
  return new VertexAI({ project, location })
}

export function responseText(response: GenerateContentResponse): string {
  return response.candidates?.[0]?.content?.parts
    ?.find(p => 'text' in p && p.text)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?.text as string ?? ''
}

export function responseFunctionCalls(response: GenerateContentResponse): FunctionCall[] {
  return (response.candidates?.[0]?.content?.parts ?? [])
    .filter(p => 'functionCall' in p && p.functionCall)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map(p => (p as any).functionCall as FunctionCall)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModel(tools?: any[]) {
  const vertex = createVertexAI()
  return vertex.getGenerativeModel({
    model: GEMINI_MODEL,
    ...(tools ? { tools: [{ functionDeclarations: tools }] } : {}),
  })
}
