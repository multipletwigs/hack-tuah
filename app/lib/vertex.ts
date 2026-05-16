import { VertexAI, type GenerateContentResponse as VertexResponse } from '@google-cloud/vertexai'
import { GoogleGenerativeAI, type FunctionDeclaration } from '@google/generative-ai'

const GOOGLE_AI_MODEL = 'gemini-2.0-flash'
const VERTEX_MODEL = 'gemini-2.0-flash-001'

function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

function normalizeSchemaTypes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeSchemaTypes)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      key === 'type' && typeof child === 'string' ? child.toUpperCase() : normalizeSchemaTypes(child),
    ]),
  )
}

export const GEMINI_MODEL = env('GEMINI_MODEL')
  ?? (env('GEMINI_API_KEY') ? GOOGLE_AI_MODEL : VERTEX_MODEL)

// Returns a model from whichever backend is configured:
//   GEMINI_API_KEY  → Google AI Studio (original)
//   VERTEX_PROJECT  → Vertex AI (GCP)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModel(tools?: any[]): any {
  const apiKey = env('GEMINI_API_KEY')
  if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey)
    const functionDeclarations = tools
      ? normalizeSchemaTypes(tools) as FunctionDeclaration[]
      : undefined

    return genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      ...(functionDeclarations ? { tools: [{ functionDeclarations }] } : {}),
    })
  }

  const project = env('VERTEX_PROJECT')
  if (!project) throw new Error('Set GEMINI_API_KEY (Google AI Studio) or VERTEX_PROJECT (Vertex AI)')
  const location = env('VERTEX_LOCATION') ?? 'us-central1'

  const saJson = env('VERTEX_SERVICE_ACCOUNT_JSON')
  const vertex = saJson
    ? (() => {
        const { client_email, private_key } = JSON.parse(saJson)
        return new VertexAI({ project, location, googleAuthOptions: { credentials: { client_email, private_key } } })
      })()
    : new VertexAI({ project, location })

  return vertex.getGenerativeModel({
    model: GEMINI_MODEL,
    ...(tools ? { tools: [{ functionDeclarations: tools }] } : {}),
  })
}

// Extracts text — works with both Google AI SDK (.text() method) and Vertex AI (plain candidates array)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function responseText(response: VertexResponse | any): string {
  if (typeof response?.text === 'function') return response.text() as string
  return (response as VertexResponse).candidates?.[0]?.content?.parts
    ?.find(p => 'text' in p && p.text)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ?.text as string ?? ''
}

// Extracts function calls — works with both SDKs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function responseFunctionCalls(response: VertexResponse | any): any[] {
  if (typeof response?.functionCalls === 'function') return response.functionCalls() ?? []
  return ((response as VertexResponse).candidates?.[0]?.content?.parts ?? [])
    .filter(p => 'functionCall' in p && p.functionCall)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map(p => (p as any).functionCall)
}
