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

interface LinkageRow {
  startupId: string
  actorId: string
}

type ReportTab = 'partners' | 'programs' | 'initiatives' | 'trace'
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
  if (tab === 'partners') return [...result.corporatePartners, ...result.investors, ...result.serviceProviders]
  if (tab === 'programs') return result.mentors
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

function EcosystemGraph({ selected, result, selectedNodeId, onSelectNode }: {
  selected: StartupRow | undefined
  result: AgentMatchResult | null
  selectedNodeId: string
  onSelectNode: (id: string) => void
}) {
  const nodes = useMemo<GraphNode[]>(() => {
    const base: GraphNode[] = [
      {
        id: selected?.startup_id ?? 'startup-empty',
        name: selected?.startup_name ?? 'Select startup',
        label: selected?.startup_name ?? 'Startup',
        sublabel: selected ? `${selected.industry}, ${selected.stage}` : 'source node',
        kind: 'startup',
        x: 125,
        y: 260,
        r: 54,
      },
      { id: 'matcher', name: 'Matcher', label: 'Matcher', sublabel: 'agent core', kind: 'matcher', x: 430, y: 260, r: 64 },
    ]

    const positions = [
      [640, 85], [720, 205], [665, 345], [455, 445], [250, 420],
      [230, 100], [430, 75], [765, 385], [120, 410],
    ]

    const actors = allMatchEntries(result).slice(0, positions.length).map((entry, index) => {
      const [x, y] = positions[index]
      return {
        id: entry.actorId,
        name: entry.actorName,
        label: entry.actorName.length > 13 ? `${entry.actorName.slice(0, 12)}...` : entry.actorName,
        sublabel: actorLabel(entry),
        kind: actorKind(entry),
        x,
        y,
        r: 45 + Math.min(9, Math.max(0, Math.round((entry.matchScore - 70) / 3))),
      }
    })

    return [...base, ...actors]
  }, [result, selected])

  const actorNodes = nodes.filter(node => node.id !== 'matcher' && node.kind !== 'startup')

  return (
    <div className="network-wrap">
      <svg className="network-svg" viewBox="0 0 860 520" role="img" aria-label="Matching engine network graph">
        {selected && <line className="edge active" x1="125" y1="260" x2="430" y2="260" />}
        {actorNodes.map(node => (
          <line key={`edge-${node.id}`} className="edge match" x1="430" y1="260" x2={node.x} y2={node.y} />
        ))}
        {!result && (
          <>
            <line className="edge" x1="430" y1="260" x2="640" y2="85" />
            <line className="edge" x1="430" y1="260" x2="720" y2="205" />
            <line className="edge" x1="430" y1="260" x2="665" y2="345" />
            <line className="edge" x1="430" y1="260" x2="250" y2="420" />
            <line className="edge" x1="430" y1="260" x2="230" y2="100" />
          </>
        )}

        {nodes.map(node => (
          <g
            key={node.id}
            className={`node ${node.kind}${selectedNodeId === node.id ? ' selected' : ''}`}
            transform={`translate(${node.x} ${node.y})`}
            onClick={() => onSelectNode(node.id)}
          >
            <circle r={node.r} />
            <text y="-4">{node.label}</text>
            <text className="sub" y="16">{node.sublabel}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function MatchesPage() {
  const [startups, setStartups] = useState<StartupRow[]>([])
  const [linkages, setLinkages] = useState<LinkageRow[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('matcher')
  const [query, setQuery] = useState(SAMPLE_QUERY)
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'Ask the matcher to find unmatched startups, run ecosystem matching, or inspect a node.' },
  ])
  const [reportTab, setReportTab] = useState<ReportTab>('partners')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentMatchResult | null>(null)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/startups').then(r => r.json()).then(setStartups)
    fetch('/api/linkages').then(r => r.json()).then(setLinkages)
  }, [])

  const linkedStartupIds = useMemo(() => new Set(linkages.map(l => l.startupId)), [linkages])
  const selected = startups.find(s => s.startup_id === selectedId)
  const selectedEntry = allMatchEntries(result).find(entry => entry.actorId === selectedNodeId)
  const reportEntries = entriesForTab(result, reportTab)

  async function generate(startupId = selectedId, source = 'manual') {
    if (!startupId) return
    setSelectedId(startupId)
    setSelectedNodeId(startupId)
    setLoading(true)
    setResult(null)
    setConfirmed(new Set())
    setError(null)

    try {
      const res = await fetch('/api/agent/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Match generation failed')
      const nextResult = await res.json()
      setResult(nextResult)
      setReportTab('partners')
      setSelectedNodeId('matcher')
      const startup = startups.find(s => s.startup_id === startupId)
      setMessages(prev => [
        ...prev,
        { role: 'agent', text: `Generated a matching report for ${startup?.startup_name ?? startupId} from ${source}.` },
      ])
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
      setMessages(prev => [...prev, { role: 'agent', text: 'No startup matched that query. Try a startup name, industry, or stage.' }])
      return
    }

    setMessages(prev => [...prev, { role: 'agent', text: `Found ${startup.startup_name}. Sending it through Matcher now.` }])
    await generate(startup.startup_id, 'chat query')
  }

  async function confirmLinkage(entry: MatchEntry) {
    const startup = startups.find(s => s.startup_id === selectedId)
    const res = await fetch('/api/linkages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startupId: selectedId,
        startupName: startup?.startup_name ?? '',
        actorType: entry.actorType === 'initiative' ? 'programme' : entry.actorType,
        partnerType: entry.partnerType,
        actorId: entry.actorId,
        actorName: entry.actorName,
        matchScore: entry.matchScore,
        matchReason: entry.matchReason,
      }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    setConfirmed(prev => new Set([...prev, entry.actorId]))
    setLinkages(prev => [...prev, { startupId: selectedId, actorId: entry.actorId }])
    showToast(`Linkage confirmed: ${entry.actorName}`)
  }

  return (
    <div className="admin-content matching-network-page">
      <div className="matching-page-header">
        <div>
          <h1 className="page-title">Matching Engine</h1>
          <p className="page-subtitle">
            Agentic ecosystem graph for finding startups, routing them through Matcher, and confirming partner, program, and initiative linkages.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => generate()} disabled={!selectedId || loading}>
          {loading ? 'Running...' : 'Run Matcher'}
        </button>
      </div>

      <div className="matching-workspace">
        <section className="section-card matching-graph-card">
          <div className="section-card-header">
            <span className="section-card-title">Ecosystem Network</span>
            <div className="matching-toolbar">
              <button className="filter-tab active">All actors</button>
              <button className="filter-tab">Unmatched</button>
              <button className="filter-tab">Sector view</button>
              <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setSelectedNodeId(e.target.value || 'matcher') }}>
                <option value="">Select startup</option>
                {startups.map(s => (
                  <option key={s.startup_id} value={s.startup_id}>{s.startup_name} - {s.industry}, {s.stage}</option>
                ))}
              </select>
            </div>
          </div>
          <EcosystemGraph selected={selected} result={result} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
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
              {result && (
                <div className="chat-message agent">
                  Report ready with {allMatchEntries(result).length} recommendations. Open the report tabs below to confirm linkages.
                </div>
              )}
            </div>
            <div className="chat-input-row">
              <textarea value={query} onChange={e => setQuery(e.target.value)} />
              <button className="btn btn-primary" onClick={submitQuery} disabled={loading}>Send</button>
            </div>
          </section>

          <section className="section-card node-inspector-card">
            <div className="section-card-header">
              <span className="section-card-title">Selected Node</span>
              <button className="btn btn-secondary" onClick={() => selectedId && generate()} disabled={!selectedId || loading}>Generate</button>
            </div>
            <h2 className="node-title">{selectedEntry?.actorName ?? selected?.startup_name ?? 'Matcher'}</h2>
            <p className="node-subtitle">
              {selectedEntry?.matchReason ?? selected?.problem ?? 'Central agent node for filtering, ranking, and submitting ecosystem matches.'}
            </p>
            <div className="node-detail-grid">
              <div><span>Type</span><strong>{selectedEntry ? actorLabel(selectedEntry) : selected ? 'startup' : 'agent'}</strong></div>
              <div><span>Status</span><strong>{selected && linkedStartupIds.has(selected.startup_id) ? 'matched' : 'open'}</strong></div>
              <div><span>Industry</span><strong>{selected?.industry ?? 'mixed'}</strong></div>
              <div><span>Stage</span><strong>{selected?.stage ?? 'n/a'}</strong></div>
            </div>
            {selected?.needs && selected.needs.length > 0 && (
              <div className="needs-chips">
                {selected.needs.map(need => <span key={need} className="need-chip">{need}</span>)}
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
            <p className="page-subtitle">
              {selected ? `Top recommendations for ${selected.startup_name}.` : 'Select a startup or ask the agent to generate a report.'}
            </p>
          </div>
        </div>
        <div className="report-layout">
          <div className="report-tabs">
            <button className={`report-tab${reportTab === 'partners' ? ' active' : ''}`} onClick={() => setReportTab('partners')}>Partners</button>
            <button className={`report-tab${reportTab === 'programs' ? ' active' : ''}`} onClick={() => setReportTab('programs')}>Programs</button>
            <button className={`report-tab${reportTab === 'initiatives' ? ' active' : ''}`} onClick={() => setReportTab('initiatives')}>Initiatives</button>
            <button className={`report-tab${reportTab === 'trace' ? ' active' : ''}`} onClick={() => setReportTab('trace')}>Agent Trace</button>
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
              <div className="network-empty">Run Matcher to populate this report tab.</div>
            )}
          </div>
        </div>
      </section>

      <LoadingOverlay visible={loading} message="Agent is thinking..." sub="Fetching and filtering ecosystem actors" />
      <Toast />
    </div>
  )
}
