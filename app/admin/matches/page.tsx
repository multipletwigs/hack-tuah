'use client'

import { useMemo, useState, useEffect } from 'react'
import Toast, { showToast } from '@/app/components/Toast'
import LoadingOverlay, { type LoadingOverlayStep } from '@/app/components/LoadingOverlay'
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

const GRAPH_W = 860
const GRAPH_H = 520
const CX = GRAPH_W / 2
const CY = GRAPH_H / 2
const GROUP_RING_R = 138
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

function actorNodeSize(count: number): number {
  if (count <= 8) return 30
  if (count <= 16) return 25
  if (count <= 28) return 21
  return 18
}

function actorLabelLimit(count: number): number {
  if (count <= 8) return 13
  if (count <= 16) return 11
  if (count <= 28) return 9
  return 7
}

function placeRings(
  items: Array<{ id: string; label: string; sublabel: string; kind: GraphNodeKind }>,
  centerX: number,
  centerY: number,
): GraphNode[] {
  const count = items.length
  if (count === 0) return []

  const nodeR = actorNodeSize(count)
  const labelLimit = actorLabelLimit(count)
  const maxRingR = Math.min(centerX, centerY) - nodeR - 18
  const minRingR = 92
  const ringCount = count <= 10 ? 1 : count <= 24 ? 2 : 3
  const availableR = Math.max(0, maxRingR - minRingR)
  const ringGap = ringCount === 1 ? 0 : availableR / (ringCount - 1)
  const rings: Array<{ start: number; end: number; radius: number; offset: number }> = []
  let start = 0

  for (let ringIndex = 0; ringIndex < ringCount && start < count; ringIndex += 1) {
    const radius = ringCount === 1 ? maxRingR : minRingR + ringGap * ringIndex
    const remaining = count - start
    const ringsLeft = ringCount - ringIndex
    const take = Math.ceil(remaining / ringsLeft)
    rings.push({
      start,
      end: start + take,
      radius,
      offset: ringIndex % 2 === 0 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / Math.max(take, 2),
    })
    start += take
  }

  return rings.flatMap(ring => {
    const ringItems = items.slice(ring.start, ring.end)
    const ringCount = ringItems.length
    return ringItems.map((item, i) => {
      const angle = ringCount === 1 ? ring.offset : ring.offset + (Math.PI * 2 * i) / ringCount
      return {
        id: item.id,
        name: item.label,
        label: trunc(item.label, labelLimit),
        sublabel: item.sublabel,
        kind: item.kind,
        x: Math.round(centerX + ring.radius * Math.cos(angle)),
        y: Math.round(centerY + ring.radius * Math.sin(angle)),
        r: nodeR,
      }
    })
  })
}

function overviewGroupNodes(groupCounts: Record<GroupKind, number>): GraphNode[] {
  return GROUP_META.map(g => ({
    id: g.id,
    name: g.label,
    label: g.label,
    sublabel: `${groupCounts[g.group]} actors`,
    kind: g.kind,
    x: Math.round(CX + GROUP_RING_R * Math.cos(g.angle)),
    y: Math.round(CY + GROUP_RING_R * Math.sin(g.angle)),
    r: 44,
  }))
}

function focusedGroupNode(group: GroupKind, groupCounts: Record<GroupKind, number>): GraphNode {
  const meta = GROUP_META.find(g => g.group === group)!
  return {
    id: meta.id,
    name: meta.label,
    label: meta.label,
    sublabel: `${groupCounts[group]} actors`,
    kind: meta.kind,
    x: CX,
    y: CY,
    r: 54,
  }
}

function graphNodeTitle(node: GraphNode): string {
  return node.sublabel ? `${node.name} - ${node.sublabel}` : node.name
}

function ActorNode({ node, selected, onClick }: {
  node: GraphNode
  selected: boolean
  onClick: () => void
}) {
  const isCompact = node.r <= 22
  return (
    <g
      className={['node', node.kind, selected ? 'selected' : '', isCompact ? 'compact' : ''].filter(Boolean).join(' ')}
      transform={`translate(${node.x} ${node.y})`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <title>{graphNodeTitle(node)}</title>
      <circle r={node.r} />
      <text y={isCompact ? '3' : '-4'}>{node.label}</text>
      {!isCompact && <text className="sub" y="12">{node.sublabel}</text>}
    </g>
  )
}

function GroupNode({ node, selected, onClick }: {
  node: GraphNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <g
      className={`node ${node.kind} group-node${selected ? ' selected' : ''}`}
      transform={`translate(${node.x} ${node.y})`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <title>{graphNodeTitle(node)}</title>
      <circle r={node.r} />
      <text y="-5">{node.label}</text>
      <text className="sub" y="12">{node.sublabel}</text>
    </g>
  )
}

function MatcherNode() {
  return (
    <g className="node matcher" transform={`translate(${CX} ${CY})`}>
      <circle r={56} />
      <text y="-4">Matcher</text>
      <text className="sub" y="14">agent core</text>
    </g>
  )
}

function step(tool: string, detail: string): LoadingOverlayStep {
  return { tool, detail, status: 'queued' }
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

  const groupNodes = useMemo<GraphNode[]>(() => {
    if (expandedGroup) return [focusedGroupNode(expandedGroup, groupCounts)]
    return overviewGroupNodes(groupCounts)
  }, [expandedGroup, groupCounts])

  const actorNodes = useMemo<GraphNode[]>(() => {
    if (!expandedGroup) return []
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
    return placeRings(actors, CX, CY)
  }, [expandedGroup, startups, partners, initiatives, normalizedFilter])

  const expandedGroupNode = expandedGroup ? groupNodes[0] : undefined
  const activeActorNode   = actorNodes.find(n => n.id === selectedId)

  return (
    <div className="network-wrap">
      <svg className="network-svg" viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} role="img" aria-label="Matching engine network graph">
        {/* Matcher → group edges */}
        {!expandedGroup && groupNodes.map(gn => {
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

        {/* Selected actor → focused group flow edge */}
        {expandedGroupNode && activeActorNode && (
          <line className="edge active" strokeDasharray="6 5"
            x1={activeActorNode.x} y1={activeActorNode.y} x2={expandedGroupNode.x} y2={expandedGroupNode.y}
          />
        )}

        {/* Matcher */}
        {!expandedGroup && <MatcherNode />}

        {/* Group nodes */}
        {groupNodes.map(node => {
          const meta    = GROUP_META.find(m => m.id === node.id)!
          const isOpen  = meta.group === expandedGroup
          return (
            <GroupNode
              key={node.id}
              node={node}
              selected={isOpen}
              onClick={() => { setExpandedGroup(isOpen ? null : meta.group); onSelectNode(node.id) }}
            />
          )
        })}

        {/* Individual actor nodes */}
        {actorNodes.map(node => (
          <ActorNode
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id}
            onClick={() => { onSelectNode(node.id); onRunMatch(node.id, node.kind) }}
          />
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
  const [loadingSteps, setLoadingSteps] = useState<LoadingOverlayStep[]>([])
  const [result, setResult] = useState<AgentMatchResult | null>(null)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/startups').then(r => r.json()).then(setStartups)
    fetch('/api/partners').then(r => r.json()).then(setPartners)
    fetch('/api/initiatives').then(r => r.json()).then(setInitiatives)
    fetch('/api/linkages').then(r => r.json()).then(setLinkages)
  }, [])

  useEffect(() => {
    if (!loading || loadingSteps.length === 0) return

    let activeIndex = 0
    setLoadingSteps(prev => prev.map((item, index) => ({
      ...item,
      status: index === 0 ? 'active' : 'queued',
    })))

    const interval = window.setInterval(() => {
      activeIndex = Math.min(activeIndex + 1, loadingSteps.length - 1)
      setLoadingSteps(prev => prev.map((item, index) => ({
        ...item,
        status: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'queued',
      })))
    }, 1100)

    return () => window.clearInterval(interval)
  }, [loading, loadingSteps.length])

  const linkedStartupIds = useMemo(() => new Set(linkages.map(l => l.startupId)), [linkages])
  const selectedStartup    = selectedKind === 'startup'    ? startups.find(s => s.startup_id === selectedId)  : undefined
  const selectedPartner    = (selectedKind !== 'startup' && selectedKind !== 'matcher' && selectedKind !== 'initiative')
    ? partners.find(p => p.partnerId === selectedId) : undefined
  const selectedInitiative = selectedKind === 'initiative' ? initiatives.find(i => i.initiativeId === selectedId) : undefined
  const selectedActorName  = selectedStartup?.startup_name ?? selectedPartner?.orgName ?? selectedInitiative?.name ?? ''
  const fromStartup        = result?.direction === 'from-startup'

  function buildLoadingSteps(id: string, kind: GraphNodeKind): LoadingOverlayStep[] {
    const startup = startups.find(s => s.startup_id === id)
    const partner = partners.find(p => p.partnerId === id)
    const initiative = initiatives.find(i => i.initiativeId === id)
    const name = startup?.startup_name ?? partner?.orgName ?? initiative?.name ?? id

    if (kind === 'startup') {
      return [
        step('get_startup_profile', `Fetching ${name}'s profile, stage, needs, and existing linkages.`),
        step('search_mentors', 'Fetching mentor candidates filtered by industry expertise.'),
        step('search_partners', 'Fetching corporate, investor, and service provider candidates.'),
        step('search_initiatives', 'Fetching grants, accelerators, programmes, and challenges.'),
        step('submit_matches', 'Scoring reciprocal fit and returning the ranked match lists.'),
      ]
    }

    return [
      step('load_actor_profile', `Fetching ${name}'s profile, relationship history, and seed data context.`),
      step('fetch_startups', 'Fetching startup candidates for reciprocal ecosystem fit.'),
      step('fetch_partners', 'Fetching mentor, corporate, investor, and service provider candidates.'),
      step('fetch_initiatives', 'Fetching initiative candidates and eligibility context.'),
      step('rank_matches_with_llm', 'Scoring mutual value and returning the ranked match lists.'),
    ]
  }

  async function generate(id: string, kind: GraphNodeKind) {
    if (!id || id === 'matcher') return
    setSelectedId(id)
    setSelectedKind(kind)
    setSelectedNodeId(id)
    setLoadingSteps(buildLoadingSteps(id, kind))
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
      setLoadingSteps(prev => prev.map(item => ({ ...item, status: 'done' })))
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

      <LoadingOverlay
        visible={loading}
        message="Matching engine is working"
        sub="Showing tool calls, fetched context, and ranking progress while results are prepared."
        steps={loadingSteps}
      />
      <Toast />
    </div>
  )
}
