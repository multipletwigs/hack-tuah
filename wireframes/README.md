# Matching Engine Network Wireframes

These wireframes are based on the current admin frontend:

- Shell: `app/admin/layout.tsx`, `app/components/SideNav.tsx`
- Current matching page: `app/admin/matches/page.tsx`
- Shared visual language: `app/globals.css`
- Agent API shape: `app/api/agent/match/route.ts`, `app/lib/matching-agent.ts`
- Persistence action: `POST /api/linkages`

## Files

- `matching-engine-network.html`: clickable static wireframe for the proposed network matching page.

Open the HTML file directly in a browser. It does not require a dev server.

## Intended Page Shape

The proposed `/admin/matches` page becomes a four-zone workspace:

1. Network canvas
   - Compressed ecosystem graph.
   - Center node is `Matcher`.
   - Startup, partner, mentor, service provider, investor, and initiative nodes orbit around it.
   - Selecting a node updates the inspector and report context.

2. Agent chat
   - Fund manager enters natural-language commands, for example:
     `Who are the startups not matched yet in the agriculture sector?`
   - The UI shows a short tool trace that mirrors the current `AgentTrace` component.
   - The graph highlights the startup funnel into `Matcher`, then out to matched actors.

3. Node inspector
   - Shows selected actor profile, stage/type, needs/focus, status, and useful actions.
   - Actions stay close to current app capabilities: generate matches and create linkage.

4. Report tabs
   - Keeps the existing top-3 category model from the current matching page.
   - Tabs group `Partners`, `Programs`, and `Initiatives`.
   - Each recommendation has score, mutual-fit rationale, and `Confirm Linkage`.

## Implementation Notes

- This can replace the current generate bar in `app/admin/matches/page.tsx`, while reusing `MatchCard`, `MatchSection`, `AgentTrace`, and `confirmLinkage`.
- The first implementation does not need a graph library. An SVG with computed node positions is enough for the hackathon page.
- If interactions grow, use a focused graph package later, but keep the current data contract: startup selection or query in, `AgentMatchResult` out, linkages saved through `/api/linkages`.
