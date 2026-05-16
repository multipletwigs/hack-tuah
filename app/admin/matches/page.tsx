'use client'

import { useMemo, useState, useEffect } from 'react'
import Toast, { showToast } from '@/app/components/Toast'
import LoadingOverlay from '@/app/components/LoadingOverlay'
import type { AgentMatchResult, MatchEntry } from '@/app/lib/matching-agent'

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
  description: string
}

interface LinkageRow {
  startupId: string
  actorId: string
}

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

function scoreClass(score: number): string {
  if (score >= 85) return 'score-high'
  if (score >= 70) return 'score-mid'
  return 'score-low'
}

function kindActorType(kind: GraphNodeKind): MatchEntry['actorType'] {
  if (kind === 'startup') return 'startup'
  if (kind === 'initiative') return 'initiative'
  if (kind === 'mentor') return 'mentor'
  return 'partner'
}

function kindPartnerType(kind: GraphNodeKind): string | null {
  if (kind === 'investor') return 'investor'
  if (kind === 'service') return 'service_provider'
  if (kind === 'partner') return 'corporate'
  return null
}

function ResultCard({ entry, confirmed, onConfirm, meta, canConfirm }: {
  entry: MatchEntry
  confirmed: boolean
  onConfirm: (e: MatchEntry) => Promise<void>
  meta?: string
  canConfirm: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <div className={`result-card${confirmed ? ' result-card-confirmed' : ''}`}>
      <div className="result-card-row">
        <button className="result-expand-btn" onClick={() => setExpanded(v => !v)}>{expanded ? '▾' : '▸'}</button>
        <span className="result-card-name">
          {entry.actorName}
          {meta && <span className="result-card-meta">{meta}</span>}
        </span>
        <span className={`score-badge ${scoreClass(entry.matchScore)}`}>{entry.matchScore}%</span>
        {canConfirm && (
          <button
            className={`btn result-link-btn${confirmed ? ' btn-confirmed' : ' btn-primary'}`}
            disabled={confirmed || busy}
            onClick={async () => { setBusy(true); try { await onConfirm(entry) } finally { setBusy(false) } }}
          >
            {confirmed ? '✓' : busy ? '…' : 'Link'}
          </button>
        )}
      </div>
      {expanded && <p className="result-card-reason">{entry.matchReason}</p>}
    </div>
  )
}

function ResultSection({ title, entries, topK, confirmed, onConfirm, getMeta, canConfirm }: {
  title: string
  entries: MatchEntry[]
  topK: number
  confirmed: Set<string>
  onConfirm: (e: MatchEntry) => Promise<void>
  getMeta?: (e: MatchEntry) => string | undefined
  canConfirm?: (e: MatchEntry) => boolean
}) {
  const [open, setOpen] = useState(true)
  const shown = entries.slice(0, topK)
  if (shown.length === 0) return null
  return (
    <div className="result-section">
      <button className="result-section-head" onClick={() => setOpen(o => !o)}>
        <span>{open ? '▾' : '▸'} {title}</span>
        <span className="count-badge">{shown.length}</span>
      </button>
      {open && shown.map(e => (
        <ResultCard
          key={e.actorId}
          entry={e}
          confirmed={confirmed.has(e.actorId)}
          onConfirm={onConfirm}
          meta={getMeta?.(e)}
          canConfirm={canConfirm?.(e) ?? true}
        />
      ))}
    </div>
  )
}

const CX = 430
const CY = 260
const GROUP_RING_R = 138
const ACTOR_RING_R = 220
const TOP_K_MIN = 1
const TOP_K_MAX = 5
const DEFAULT_TOP_K = 3

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

function EcosystemGraph({ startups, partners, initiatives, selectedId, selectedNodeId, filterText, onSelectNode, onRunMatch }: {
  startups: StartupRow[]
  partners: PartnerRow[]
  initiatives: InitiativeRow[]
  selectedId: string
  selectedNodeId: string
  filterText: string
  onSelectNode: (id: string) => void
  onRunMatch: (id: string, kind: GraphNodeKind) => void
}) {
  const [expandedGroup, setExpandedGroup] = useState<GroupKind | null>(null)
  const normalizedFilter = filterText.trim().toLowerCase()

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
      .filter(actor => {
        if (!normalizedFilter) return true
        return [
          actor.id,
          actor.label,
          actor.sublabel,
          actor.kind,
        ].some(value => value.toLowerCase().includes(normalizedFilter))
      })
    return placeArc(actors, meta.angle, ACTOR_RING_R, 30)
  }, [expandedGroup, startups, partners, initiatives, normalizedFilter])

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
            className={`edge${an.id === selectedId ? ' active' : ''}`}
            x1={expandedGroupNode.x} y1={expandedGroupNode.y} x2={an.x} y2={an.y}
            opacity={an.id === selectedId ? 0.9 : 0.4}
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
          return (
            <g key={node.id}
              className={`node ${node.kind} group-node${isOpen ? ' selected' : ''}`}
              transform={`translate(${node.x} ${node.y})`}
              onClick={() => { setExpandedGroup(isOpen ? null : meta.group); onSelectNode(node.id) }}
              style={{ cursor: 'pointer' }}
            >
              <circle r={node.r} />
              <text y="-5">{node.label}</text>
              <text className="sub" y="12">{node.sublabel}</text>
            </g>
          )
        })}

        {/* Individual actor nodes */}
        {actorNodes.map(node => (
          <g key={node.id}
            className={['node', node.kind, selectedNodeId === node.id ? 'selected' : ''].filter(Boolean).join(' ')}
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
  const [graphFilter, setGraphFilter] = useState('')
  const [topK, setTopK] = useState(() => {
    const v = Number(process.env.NEXT_PUBLIC_DEFAULT_TOP_K)
    return Number.isFinite(v) ? Math.min(TOP_K_MAX, Math.max(TOP_K_MIN, v)) : DEFAULT_TOP_K
  })
  // const [query, setQuery] = useState('')
  // const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  // const [reportTab, setReportTab] = useState<ReportTab>('partners')
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
  const selectedStartup    = selectedKind === 'startup'    ? startups.find(s => s.startup_id === selectedId)  : undefined
  const selectedPartner    = (selectedKind !== 'startup' && selectedKind !== 'matcher' && selectedKind !== 'initiative')
    ? partners.find(p => p.partnerId === selectedId) : undefined
  const selectedInitiative = selectedKind === 'initiative' ? initiatives.find(i => i.initiativeId === selectedId) : undefined
  const selectedActorName  = selectedStartup?.startup_name ?? selectedPartner?.orgName ?? selectedInitiative?.name ?? ''
  const fromStartup        = result?.direction === 'from-startup'

  async function generate(id: string, kind: GraphNodeKind) {
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
      const body = isStartup
        ? { startupId: id }
        : { actorId: id, actorType: kind === 'initiative' ? 'initiative' : 'partner' }
      const res = await fetch('/api/agent/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Match failed')
      setResult(await res.json())
      setSelectedNodeId('matcher')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate matches')
    } finally {
      setLoading(false)
    }
  }

  /* chat — temporarily disabled
  async function submitQuery() { ... }
  */

  async function confirmLinkage(entry: MatchEntry) {
    const sourceType = kindActorType(selectedKind)
    const sourcePartnerType = kindPartnerType(selectedKind)
    const body: Record<string, unknown> = {
      sourceId: selectedId,
      sourceName: selectedActorName,
      sourceType,
      sourcePartnerType,
      actorType: entry.actorType,
      partnerType: entry.partnerType,
      actorId: entry.actorId,
      actorName: entry.actorName,
      matchScore: entry.matchScore,
      matchReason: entry.matchReason,
    }

    if (fromStartup) {
      const startup = startups.find(s => s.startup_id === selectedId)
      Object.assign(body, {
        startupId: selectedId, startupName: startup?.startup_name ?? '',
      })
    } else if (entry.actorType === 'startup') {
      const startup = startups.find(s => s.startup_id === entry.actorId)
      Object.assign(body, {
        startupId: entry.actorId, startupName: startup?.startup_name ?? entry.actorName,
      })
    }

    const res = await fetch('/api/linkages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    setConfirmed(prev => new Set([...prev, entry.actorId]))
    const linkedStartupId = fromStartup ? selectedId : entry.actorId
    setLinkages(prev => [...prev, { startupId: linkedStartupId, actorId: fromStartup ? entry.actorId : selectedId }])
    showToast(`Linked: ${entry.actorName}`)
  }

  const resultSections = fromStartup
    ? [
        { label: 'Mentors',           entries: result?.mentors           ?? [] },
        { label: 'Corporate Partners',entries: result?.corporatePartners ?? [] },
        { label: 'Investors',         entries: result?.investors         ?? [] },
        { label: 'Service Providers', entries: result?.serviceProviders  ?? [] },
        { label: 'Initiatives',       entries: result?.initiatives       ?? [], getMeta: (entry: MatchEntry) => initiatives.find(i => i.initiativeId === entry.actorId)?.type },
      ].filter(s => s.entries.length > 0)
    : [
        { label: 'Startups',           entries: result?.startups          ?? [] },
        { label: 'Mentors',            entries: result?.mentors           ?? [] },
        { label: 'Corporate Partners', entries: result?.corporatePartners ?? [] },
        { label: 'Investors',          entries: result?.investors         ?? [] },
        { label: 'Service Providers',  entries: result?.serviceProviders  ?? [] },
        { label: 'Initiatives',        entries: result?.initiatives       ?? [], getMeta: (entry: MatchEntry) => initiatives.find(i => i.initiativeId === entry.actorId)?.type },
      ].filter(s => s.entries.length > 0)

  const canConfirmMatch = () => true

  return (
    <div className="admin-content matching-network-page">
      <div className="matching-workspace">
        <section className="section-card matching-graph-card">
          <div className="section-card-header">
            <span className="section-card-title">Ecosystem Network</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {loading ? '⏳ Matching…' : selectedActorName ? `Selected: ${selectedActorName}` : 'Expand a group → click an actor to match'}
            </span>
          </div>
          <div className="network-filter-bar">
            <input
              value={graphFilter}
              onChange={event => setGraphFilter(event.target.value)}
              placeholder="Filter visible nodes by name, type, industry, or ID"
              aria-label="Filter visible network nodes"
            />
            {graphFilter && (
              <button type="button" className="network-filter-clear" onClick={() => setGraphFilter('')}>
                Clear
              </button>
            )}
          </div>
          <EcosystemGraph
            startups={startups} partners={partners} initiatives={initiatives}
            selectedId={selectedId}
            selectedNodeId={selectedNodeId} filterText={graphFilter} onSelectNode={setSelectedNodeId}
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
          {/* Node inspector */}
          <section className="section-card" style={{ padding: '1rem 1.25rem' }}>
            {selectedActorName ? (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className="result-actor-name">{selectedActorName}</span>
                  <span className="result-actor-meta">
                    {selectedKind}
                    {selectedStartup ? ` · ${selectedStartup.industry} · ${selectedStartup.stage}` : ''}
                    {selectedPartner ? ` · ${selectedPartner.industry}` : ''}
                    {selectedInitiative ? ` · ${selectedInitiative.type}` : ''}
                  </span>
                </div>
                {selectedInitiative?.description && (
                  <p className="node-subtitle" style={{ marginBottom: '0.75rem' }}>{selectedInitiative.description}</p>
                )}
                {selectedStartup?.needs && selectedStartup.needs.length > 0 && (
                  <div className="needs-chips">
                    {selectedStartup.needs.map(n => <span key={n} className="need-chip">{n}</span>)}
                  </div>
                )}
                {selectedStartup && linkedStartupIds.has(selectedId) && (
                  <span className="status-badge status-active" style={{ marginTop: '0.5rem', display: 'inline-block' }}>Has linkages</span>
                )}
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Expand a group node, then click any actor to run matching.
              </p>
            )}
          </section>

          {/* Results panel */}
          <section className="section-card result-panel">
            <div className="result-panel-header">
              <span className="section-card-title">
                {result ? (fromStartup ? 'Ecosystem Matches' : 'Actor Matches') : 'Match Results'}
              </span>
              {result && (
                <div className="topk-bar">
                  <span>Top K</span>
                  <div className="topk-controls">
                    <button className="topk-btn" disabled={topK <= TOP_K_MIN} onClick={() => setTopK(k => Math.max(TOP_K_MIN, k - 1))}>−</button>
                    <span className="topk-val">{topK}</span>
                    <button className="topk-btn" disabled={topK >= TOP_K_MAX} onClick={() => setTopK(k => Math.min(TOP_K_MAX, k + 1))}>+</button>
                  </div>
                </div>
              )}
            </div>

            {!result && !loading && (
              <p className="network-empty" style={{ padding: '1.5rem 0' }}>
                Click an actor node in the graph to generate matches.
              </p>
            )}
            {loading && (
              <p className="network-empty" style={{ padding: '1.5rem 0', color: '#4f6ef7' }}>
                Agent is thinking…
              </p>
            )}
            {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>}
            {result && !loading && resultSections.length === 0 && (
              <p className="network-empty" style={{ padding: '1.5rem 0', color: '#94a3b8' }}>
                No matches found for this actor.
              </p>
            )}

            {resultSections.map(section => (
              <ResultSection
                key={section.label}
                title={section.label}
                entries={section.entries}
                topK={topK}
                confirmed={confirmed}
                onConfirm={confirmLinkage}
                canConfirm={canConfirmMatch}
                getMeta={'getMeta' in section ? section.getMeta : undefined}
              />
            ))}
          </section>
        </aside>
      </div>

      <LoadingOverlay visible={loading} message="Agent is thinking..." sub="Fetching and filtering ecosystem actors" />
      <Toast />
    </div>
  )
}
