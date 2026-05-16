export function buildMatchingPrompt(
  startup: object,
  mentors: unknown[],
  programmes: unknown[],
  partners: unknown[],
): string {
  return `You are an AI matching engine for a startup ecosystem portal.

Given the startup profile below and the available ecosystem actors, identify the best matches.

## Startup Profile
${JSON.stringify(startup, null, 2)}

## Available Mentors
${JSON.stringify(mentors, null, 2)}

## Available Programmes
${JSON.stringify(programmes, null, 2)}

## Available Partners (corporate, investor, service_provider)
${JSON.stringify(partners, null, 2)}

## Instructions

Return ONLY a valid JSON object — no markdown, no code fences, no explanations.

The JSON must have exactly these keys:
- "mentors": array of top 3 mentor matches
- "programmes": array of top 3 programme matches
- "corporate_partners": array of top 2 corporate partner matches
- "investors": array of top 2 investor matches
- "service_providers": array of top 2 service provider matches

Each item in every array must have exactly these fields:
- "actor_id": string — the id field from the source record
- "actor_name": string — the name field from the source record
- "actor_type": one of "mentor", "programme", "partner"
- "partner_type": one of "corporate", "investor", "service_provider", or null (null for mentors and programmes)
- "match_score": integer between 0 and 100 (higher = stronger match)
- "match_reason": string — exactly 2 sentences explaining why this is a strong match for this specific startup

Do not include any text outside the JSON object.`
}
