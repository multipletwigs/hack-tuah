'use client'

import { useMemo, useState, useEffect } from 'react'
import Toast, { showToast } from '@/app/components/Toast'
import LoadingOverlay from '@/app/components/LoadingOverlay'
import type { AgentMatchResult, MatchEntry, AgentStep } from '@/app/lib/matching-agent'

interface StartupRow {
  startup_id: string
  startup_name: string
  industry: string
  stage: string
  problem?: string
  needs?: string[]
}

interface PartnerRow {
  partnerId: string
  orgName: string
  partnerType: string
  industry: string
}

interface InitiativeRow {
  initiativeId: string
  name: string
  type: string
}

interface LinkageRow {
  startupId: string
  actorId: string
}

type ReportTab = 'startups' | 'partners' | 'programs' | 'initiatives' | 'trace'
type GraphNodeKind = 'startup' | 'matcher' | 'mentor' | 'partner' | 'investor' | 'service' | 'initiative'

interface GraphNode {
  id: string
  name: string
  label: string
  sublabel: string
  kind: GraphNodeKind
  x: number
  y: number
  r: number
}

const TOOL_LABELS: Record<string, string> = {
  get_startup_profile: 'Fetched startup profile',
  search_partners: 'Searched partners',
  search_mentors: 'Searched mentors',
  search_initiatives: 'Searched initiatives',
}

const SAMPLE_QUERY = 'Who are the startups that are not matched yet in the agriculture sector?'

function actorKind(entry: MatchEntry): GraphNodeKind {
  if (entry.actorType === 'mentor') return 'mentor'
  if (entry.actorType === 'initiative') return 'initiative'
  if (entry.partnerType === 'investor') return 'investor'
  if (entry.partnerType === 'service_provider') return 'service'
  return 'partner'
}

function actorLabel(entry: MatchEntry): string {
  if (entry.actorType === 'initiative') return 'initiative'
  if (entry.actorType === 'mentor') return 'mentor'
  return entry.partnerType?.replace('_', ' ') ?? 'partner'
}

function scoreClass(score: number): string {
  if (score >= 85) return 'score-high'
  if (score >= 70) return 'score-mid'
  return 'score-low'
}

function uniqueEntries(entries: MatchEntry[]): MatchEntry[] {
  const seen = new Set<string>()
  return entries.filter(entry => {
    if (seen.has(entry.actorId)) return false
    seen.add(entry.actorId)
    return true
  })
}

function allMatchEntries(result: AgentMatchResult | null): MatchEntry[] {
  if (!result) return []
  return uniqueEntries([
    ...result.mentors,
    ...result.corporatePartners,
    ...result.investors,
    ...result.serviceProviders,
    ...result.initiatives,
  ])
}

function findStartupForQuery(query: string, startups: StartupRow[], linkedStartupIds: Set<string>): StartupRow | null {
  const text = query.toLowerCase()
  const wantsUnmatched = text.includes('not matched') || text.includes('unmatched')
  const agricultureQuery = text.includes('agriculture') || text.includes('agri')

  const candidates = startups.filter(startup => {
    if (wantsUnmatched && linkedStartupIds.has(startup.startup_id)) return false
    if (agricultureQuery) {
      const industry = startup.industry.toLowerCase()
      return industry.includes('agri') || industry.includes('farm') || industry.includes('agriculture')
    }
    return true
  })

  const exact = candidates.find(startup =>
    text.includes(startup.startup_name.toLowerCase()) || text.includes(startup.startup_id.toLowerCase()),
  )
  return exact ?? candidates[0] ?? null
}

function entriesForTab(result: AgentMatchResult | null, tab: ReportTab): MatchEntry[] {
  if (!result) return []
  if (tab === 'startups')    return result.startups
  if (tab === 'partners')    return [...result.corporatePartners, ...result.investors, ...result.serviceProviders]
  if (tab === 'programs')    return result.mentors
  if (tab === 'initiatives') return result.initiatives
  return []
}

function AgentTrace({ steps }: { steps: AgentStep[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  if (steps.length === 0) return <div className="network-empty">No tool calls yet.</div>

  return (
    <div className="agent-trace-list">
      {steps.map((step, i) => (
        <div key={i} className="agent-trace-item">
          <button className="agent-trace-button" onClick={() => setExpanded(expanded === i ? null : i)}>
            <span>{TOOL_LABELS[step.tool] ?? step.tool}</span>
            <span>{expanded === i ? 'Collapse' : 'View'}</span>
          </button>
          {expanded === i && (
            <pre className="agent-trace-json">{JSON.stringify(step.result, null, 2)}</pre>
          )}
        </div>
      ))}
    </div>
  )
}

function MatchCard({ entry, confirmed, onConfirm }: {
  entry: MatchEntry
  confirmed: boolean
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }

  return (
    <article className="network-match-card">
      <div className="card-header">
        <div>
          <span className="card-name">{entry.actorName}</span>
          <span className={`actor-tag network-actor-tag actor-${actorKind(entry)}`}>{actorLabel(entry)}</span>
        </div>
        <span className={`score-badge ${scoreClass(entry.matchScore)}`}>{entry.matchScore}%</span>
      </div>
      <p className="match-reason">{entry.matchReason}</p>
      <button
        className={`btn btn-primary${confirmed ? ' btn-confirmed' : ''}`}
        onClick={handleConfirm}
        disabled={confirmed || busy}
      >
        {confirmed ? 'Confirmed' : busy ? 'Saving...' : 'Confirm Linkage'}
      </button>
    </article>
  )
}

const CX = 430
const CY = 260
const GROUP_RING_R = 138
const ACTOR_RING_R = 220

type GroupKind = 'startups' | 'mentors' | 'partners' | 'initiatives'

const GROUP_META: Array<{ id: string; kind: GraphNodeKind; group: GroupKind; angle: number; label: string }> = [
  { id: 'g-startups',    kind: 'startup',    group: 'startups',    angle: -Math.PI / 2, label: 'Startups'    },
  { id: 'g-partners',    kind: 'partner',    group: 'partners',    angle: 0,             label: 'Partners'    },
  { id: 'g-initiatives', kind: 'initiative', group: 'initiatives', angle: Math.PI / 2,  label: 'Initiatives' },
  { id: 'g-mentors',     kind: 'mentor',     group: 'mentors',     angle: Math.PI,       label: 'Mentors'     },
]

function trunc(s: string, n = 12) { return s.length > n ? `${s.slice(0, n - 1)}…` : s }

function placeArc(
  items: Array<{ id: string; label: string; sublabel: string; kind: GraphNodeKind }>,
  centerAngle: number,
  ringR: number,
  nodeR: number,
): GraphNode[] {
  const n = items.length
  const spread = Math.min(Math.PI * 0.85, 0.5 + n * 0.22)
  return items.map((item, i) => {
    const angle = n === 1 ? centerAngle : centerAngle - spread / 2 + (spread * i) / (n - 1)
    return {
      id: item.id,
      name: item.label,
      label: trunc(item.label),
      sublabel: item.sublabel,
      kind: item.kind,
      x: Math.round(CX + ringR * Math.cos(angle)),
      y: Math.round(CY + ringR * Math.sin(angle)),
      r: nodeR,
    }
  })
}

function getGroupActors(
  group: GroupKind,
  startups: StartupRow[],
  partners: PartnerRow[],
  initiatives: InitiativeRow[],
): Array<{ id: string; label: string; sublabel: string; kind: GraphNodeKind }> {
  switch (group) {
    case 'startups':
      return startups.map(s => ({ id: s.startup_id, label: s.startup_name, sublabel: `${s.industry} · ${s.stage}`, kind: 'startup' as GraphNodeKind }))
    case 'mentors':
      return partners.filter(p => p.partnerType === 'mentor').map(p => ({ id: p.partnerId, label: p.orgName, sublabel: p.industry, kind: 'mentor' as GraphNodeKind }))
    case 'partners':
      return partners.filter(p => p.partnerType !== 'mentor').map(p => ({
        id: p.partnerId, label: p.orgName, sublabel: p.partnerType.replace('_', ' '),
        kind: (p.partnerType === 'investor' ? 'investor' : p.partnerType === 'service_provider' ? 'service' : 'partner') as GraphNodeKind,
      }))
    case 'initiatives':
      return initiatives.map(i => ({ id: i.initiativeId, label: i.name, sublabel: i.type, kind: 'initiative' as GraphNodeKind }))
  }
}

function EcosystemGraph({ startups, partners, initiatives, selectedId, result, selectedNodeId, onSelectNode, onRunMatch }: {
  startups: StartupRow[]
  partners: PartnerRow[]
  initiatives: InitiativeRow[]
  selectedId: string
  result: AgentMatchResult | null
  selectedNodeId: string
  onSelectNode: (id: string) => void
  onRunMatch: (id: string, kind: GraphNodeKind) => void
}) {
  const [expandedGroup, setExpandedGroup] = useState<GroupKind | null>(null)

  const matchedIds = useMemo(() => new Set(allMatchEntries(result).map(e => e.actorId)), [result])

  const groupHasMatch = useMemo((): Record<GroupKind, boolean> => ({
    startups:    false,
    mentors:     (result?.mentors.length ?? 0) > 0,
    partners:    ((result?.corporatePartners.length ?? 0) + (result?.investors.length ?? 0) + (result?.serviceProviders.length ?? 0)) > 0,
    initiatives: (result?.initiatives.length ?? 0) > 0,
  }), [result])

  const groupCounts = useMemo((): Record<GroupKind, number> => ({
    startups:    startups.length,
    mentors:     partners.filter(p => p.partnerType === 'mentor').length,
    partners:    partners.filter(p => p.partnerType !== 'mentor').length,
    initiatives: initiatives.length,
  }), [startups, partners, initiatives])

  const groupNodes = useMemo<GraphNode[]>(() =>
    GROUP_META.map(g => ({
      id: g.id, name: g.label, label: g.label, sublabel: `${groupCounts[g.group]} actors`,
      kind: g.kind,
      x: Math.round(CX + GROUP_RING_R * Math.cos(g.angle)),
      y: Math.round(CY + GROUP_RING_R * Math.sin(g.angle)),
      r: 44,
    })),
  [groupCounts])

  const actorNodes = useMemo<GraphNode[]>(() => {
    if (!expandedGroup) return []
    const meta = GROUP_META.find(g => g.group === expandedGroup)!
    const actors = getGroupActors(expandedGroup, startups, partners, initiatives)
    return placeArc(actors, meta.angle, ACTOR_RING_R, 30)
  }, [expandedGroup, startups, partners, initiatives])

  const expandedGroupNode = groupNodes.find(n => GROUP_META.find(m => m.id === n.id)?.group === expandedGroup)
  const activeActorNode   = actorNodes.find(n => n.id === selectedId)

  return (
    <div className="network-wrap">
      <svg className="network-svg" viewBox="0 0 860 520" role="img" aria-label="Matching engine network graph">
        {/* Matcher → group edges */}
        {groupNodes.map(gn => {
          const isOpen = GROUP_META.find(m => m.id === gn.id)?.group === expandedGroup
          return <line key={`ge-${gn.id}`} className={`edge${isOpen ? ' active' : ''}`}
            x1={CX} y1={CY} x2={gn.x} y2={gn.y} opacity={isOpen ? 0.85 : 0.35} />
        })}

        {/* Group → actor edges (when expanded) */}
        {expandedGroupNode && actorNodes.map(an => (
          <line key={`ae-${an.id}`}
            className={`edge${matchedIds.has(an.id) ? ' match' : ''}`}
            x1={expandedGroupNode.x} y1={expandedGroupNode.y} x2={an.x} y2={an.y}
            opacity={matchedIds.has(an.id) ? 0.9 : 0.4}
          />
        ))}

        {/* Selected startup → matcher flow edge */}
        {activeActorNode && (
          <line className="edge active" strokeDasharray="6 5"
            x1={activeActorNode.x} y1={activeActorNode.y} x2={CX} y2={CY}
          />
        )}

        {/* Matcher */}
        <g className="node matcher" transform={`translate(${CX} ${CY})`}>
          <circle r={56} />
          <text y="-4">Matcher</text>
          <text className="sub" y="14">agent core</text>
        </g>

        {/* Group nodes */}
        {groupNodes.map(node => {
          const meta    = GROUP_META.find(m => m.id === node.id)!
          const isOpen  = meta.group === expandedGroup
          const hasBadge = groupHasMatch[meta.group]
          return (
            <g key={node.id}
              className={`node ${node.kind} group-node${isOpen ? ' selected' : ''}`}
              transform={`translate(${node.x} ${node.y})`}
              onClick={() => { setExpandedGroup(isOpen ? null : meta.group); onSelectNode(node.id) }}
              style={{ cursor: 'pointer' }}
            >
              <circle r={node.r} />
              {hasBadge && <circle r={7} cx={node.r - 5} cy={-(node.r - 5)} className="match-dot" />}
              <text y="-5">{node.label}</text>
              <text className="sub" y="12">{node.sublabel}</text>
            </g>
          )
        })}

        {/* Individual actor nodes */}
        {actorNodes.map(node => (
          <g key={node.id}
            className={['node', node.kind, selectedNodeId === node.id ? 'selected' : '', matchedIds.has(node.id) ? 'matched' : ''].filter(Boolean).join(' ')}
            transform={`translate(${node.x} ${node.y})`}
            onClick={() => { onSelectNode(node.id); onRunMatch(node.id, node.kind) }}
            style={{ cursor: 'pointer' }}
          >
            <circle r={node.r} />
            <text y="-4">{node.label}</text>
            <text className="sub" y="12">{node.sublabel}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function MatchesPage() {
  const [startups,    setStartups]    = useState<StartupRow[]>([])
  const [partners,    setPartners]    = useState<PartnerRow[]>([])
  const [initiatives, setInitiatives] = useState<InitiativeRow[]>([])
  const [linkages,    setLinkages]    = useState<LinkageRow[]>([])
  const [selectedId,   setSelectedId]   = useState('')
  const [selectedKind, setSelectedKind] = useState<GraphNodeKind>('matcher')
  const [selectedNodeId, setSelectedNodeId] = useState('matcher')
  const [query, setQuery] = useState(SAMPLE_QUERY)
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'Click any actor node to run matching. Startups find partners & initiatives; partners & mentors find matching startups.' },
  ])
  const [reportTab, setReportTab] = useState<ReportTab>('partners')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentMatchResult | null>(null)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/startups').then(r => r.json()).then(setStartups)
    fetch('/api/partners').then(r => r.json()).then(setPartners)
    fetch('/api/initiatives').then(r => r.json()).then(setInitiatives)
    fetch('/api/linkages').then(r => r.json()).then(setLinkages)
  }, [])

  const linkedStartupIds = useMemo(() => new Set(linkages.map(l => l.startupId)), [linkages])
  const selectedStartup  = selectedKind === 'startup' ? startups.find(s => s.startup_id === selectedId) : undefined
  const selectedPartner  = (selectedKind !== 'startup' && selectedKind !== 'matcher' && selectedKind !== 'initiative')
    ? partners.find(p => p.partnerId === selectedId) : undefined
  const selectedInitiative = selectedKind === 'initiative' ? initiatives.find(i => i.initiativeId === selectedId) : undefined
  const selectedEntry    = allMatchEntries(result).find(e => e.actorId === selectedNodeId)
    ?? result?.startups.find(e => e.actorId === selectedNodeId)
  const reportEntries    = entriesForTab(result, reportTab)

  const selectedActorName = selectedStartup?.startup_name ?? selectedPartner?.orgName ?? selectedInitiative?.name ?? ''
  const fromStartup = result?.direction === 'from-startup'

  async function generate(id: string, kind: GraphNodeKind, source = 'node click') {
    if (!id || id === 'matcher') return
    setSelectedId(id)
    setSelectedKind(kind)
    setSelectedNodeId(id)
    setLoading(true)
    setResult(null)
    setConfirmed(new Set())
    setError(null)

    try {
      const isStartup = kind === 'startup'
      const actorType = kind === 'initiative' ? 'initiative' : 'partner'
      const body = isStartup
        ? { startupId: id }
        : { actorId: id, actorType }

      const res = await fetch('/api/agent/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Match generation failed')
      const nextResult: AgentMatchResult = await res.json()
      setResult(nextResult)
      setReportTab(isStartup ? 'partners' : 'startups')
      setSelectedNodeId('matcher')

      const name = isStartup
        ? startups.find(s => s.startup_id === id)?.startup_name
        : partners.find(p => p.partnerId === id)?.orgName ?? initiatives.find(i => i.initiativeId === id)?.name
      const total = isStartup
        ? allMatchEntries(nextResult).length
        : nextResult.startups.length
      setMessages(prev => [...prev, {
        role: 'agent',
        text: `Found ${total} match${total !== 1 ? 'es' : ''} for ${name ?? id} (${source}).`,
      }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate matches')
    } finally {
      setLoading(false)
    }
  }

  async function submitQuery() {
    const text = query.trim()
    if (!text) return
    setMessages(prev => [...prev, { role: 'user', text }])
    const startup = findStartupForQuery(text, startups, linkedStartupIds)
    if (!startup) {
      setMessages(prev => [...prev, { role: 'agent', text: 'No startup matched. Try a name, industry, or stage.' }])
      return
    }
    setMessages(prev => [...prev, { role: 'agent', text: `Found ${startup.startup_name}. Running through Matcher…` }])
    await generate(startup.startup_id, 'startup', 'chat query')
  }

  async function confirmLinkage(entry: MatchEntry) {
    let body: Record<string, unknown>

    if (fromStartup) {
      // startup → actor direction
      const startup = startups.find(s => s.startup_id === selectedId)
      body = {
        startupId:   selectedId,
        startupName: startup?.startup_name ?? '',
        actorType:   entry.actorType === 'initiative' ? 'programme' : entry.actorType,
        partnerType: entry.partnerType,
        actorId:     entry.actorId,
        actorName:   entry.actorName,
        matchScore:  entry.matchScore,
        matchReason: entry.matchReason,
      }
    } else {
      // actor → startup direction: entry is a matched startup
      const startup = startups.find(s => s.startup_id === entry.actorId)
      const actorType = selectedKind === 'initiative' ? 'programme' : 'partner'
      const partnerType = selectedKind === 'investor' ? 'investor'
        : selectedKind === 'service' ? 'service_provider'
        : selectedKind === 'mentor'  ? null
        : 'corporate'
      body = {
        startupId:   entry.actorId,
        startupName: startup?.startup_name ?? entry.actorName,
        actorType,
        partnerType,
        actorId:     selectedId,
        actorName:   selectedActorName,
        matchScore:  entry.matchScore,
        matchReason: entry.matchReason,
      }
    }

    const res = await fetch('/api/linkages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    setConfirmed(prev => new Set([...prev, entry.actorId]))
    const linkedStartupId = fromStartup ? selectedId : entry.actorId
    setLinkages(prev => [...prev, { startupId: linkedStartupId, actorId: fromStartup ? entry.actorId : selectedId }])
    showToast(`Linkage confirmed: ${entry.actorName}`)
  }

  const reportSubtitle = selectedActorName
    ? fromStartup
      ? `Top ecosystem matches for ${selectedActorName}`
      : `Matching startups for ${selectedActorName}`
    : 'Click any actor node to generate matches.'

  return (
    <div className="admin-content matching-network-page">
      <div className="matching-page-header">
        <div>
          <h1 className="page-title">Matching Engine</h1>
          <p className="page-subtitle">
            Click any actor node to run matching. Startups find partners &amp; initiatives; partners, mentors, and initiatives find matching startups.
          </p>
        </div>
      </div>

      <div className="matching-workspace">
        <section className="section-card matching-graph-card">
          <div className="section-card-header">
            <span className="section-card-title">Ecosystem Network</span>
            <span className="page-subtitle" style={{ margin: 0, fontSize: '0.8rem' }}>
              {loading ? '⏳ Matching…' : selectedActorName ? `Selected: ${selectedActorName}` : 'Click a group to expand, then click an actor'}
            </span>
          </div>
          <EcosystemGraph
            startups={startups} partners={partners} initiatives={initiatives}
            selectedId={selectedId} result={result}
            selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId}
            onRunMatch={(id: string, kind: GraphNodeKind) => { generate(id, kind) }}
          />
          <div className="network-legend">
            <span><i className="legend-dot dot-startup" />Startups</span>
            <span><i className="legend-dot dot-matcher" />Matcher</span>
            <span><i className="legend-dot dot-partner" />Partners</span>
            <span><i className="legend-dot dot-investor" />Investors</span>
            <span><i className="legend-dot dot-service" />Service</span>
            <span><i className="legend-dot dot-initiative" />Initiatives</span>
          </div>
        </section>

        <aside className="matching-rail">
          <section className="section-card matching-chat-card">
            <div className="section-card-header">
              <span className="section-card-title">Agent Chat</span>
              <span className="actor-tag">ReAct</span>
            </div>
            <div className="chat-log">
              {messages.map((message, index) => (
                <div key={index} className={`chat-message ${message.role}`}>{message.text}</div>
              ))}
            </div>
            <div className="chat-input-row">
              <textarea value={query} onChange={e => setQuery(e.target.value)} />
              <button className="btn btn-primary" onClick={submitQuery} disabled={loading}>Send</button>
            </div>
          </section>

          <section className="section-card node-inspector-card">
            <div className="section-card-header">
              <span className="section-card-title">Selected Node</span>
            </div>
            <h2 className="node-title">
              {selectedEntry?.actorName ?? (selectedActorName || 'Matcher')}
            </h2>
            <p className="node-subtitle">
              {selectedEntry?.matchReason ?? selectedStartup?.problem ?? 'Central agent node for filtering, ranking, and submitting ecosystem matches.'}
            </p>
            <div className="node-detail-grid">
              <div><span>Type</span><strong>{selectedEntry ? actorLabel(selectedEntry) : selectedKind}</strong></div>
              <div><span>Status</span><strong>{selectedStartup && linkedStartupIds.has(selectedId) ? 'matched' : 'open'}</strong></div>
              <div><span>Industry</span><strong>{selectedStartup?.industry ?? selectedPartner?.industry ?? '—'}</strong></div>
              <div><span>Stage</span><strong>{selectedStartup?.stage ?? '—'}</strong></div>
            </div>
            {selectedStartup?.needs && selectedStartup.needs.length > 0 && (
              <div className="needs-chips">
                {selectedStartup.needs.map(need => <span key={need} className="need-chip">{need}</span>)}
              </div>
            )}
          </section>
        </aside>
      </div>

      {error && (
        <div className="section-card network-error">
          <p>{error}</p>
        </div>
      )}

      <section className="section-card matching-report-card">
        <div className="section-card-header">
          <div>
            <span className="section-card-title">Matching Report</span>
            <p className="page-subtitle">{reportSubtitle}</p>
          </div>
        </div>
        <div className="report-layout">
          <div className="report-tabs">
            {!fromStartup && (
              <button className={`report-tab${reportTab === 'startups' ? ' active' : ''}`} onClick={() => setReportTab('startups')}>Startups</button>
            )}
            {fromStartup && (
              <>
                <button className={`report-tab${reportTab === 'partners' ? ' active' : ''}`} onClick={() => setReportTab('partners')}>Partners</button>
                <button className={`report-tab${reportTab === 'programs' ? ' active' : ''}`} onClick={() => setReportTab('programs')}>Mentors</button>
                <button className={`report-tab${reportTab === 'initiatives' ? ' active' : ''}`} onClick={() => setReportTab('initiatives')}>Initiatives</button>
              </>
            )}
            <button className={`report-tab${reportTab === 'trace' ? ' active' : ''}`} onClick={() => setReportTab('trace')}>Trace</button>
          </div>

          <div className="report-panel">
            {reportTab === 'trace' ? (
              <AgentTrace steps={result?.steps ?? []} />
            ) : reportEntries.length > 0 ? (
              <div className="report-match-grid">
                {reportEntries.map(entry => (
                  <MatchCard
                    key={entry.actorId}
                    entry={entry}
                    confirmed={confirmed.has(entry.actorId)}
                    onConfirm={() => confirmLinkage(entry)}
                  />
                ))}
              </div>
            ) : (
              <div className="network-empty">
                {loading ? 'Agent is thinking…' : 'Click an actor node to generate matches.'}
              </div>
            )}
          </div>
        </div>
      </section>

      <LoadingOverlay visible={loading} message="Agent is thinking..." sub="Fetching and filtering ecosystem actors" />
      <Toast />
    </div>
  )
}
