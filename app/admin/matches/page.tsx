'use client'

import { useState, useEffect } from 'react'
import Toast, { showToast } from '@/app/components/Toast'
import LoadingOverlay from '@/app/components/LoadingOverlay'
import type { AgentMatchResult, MatchEntry, AgentStep } from '@/app/lib/matching-agent'

interface StartupRow {
  startup_id: string
  startup_name: string
  industry: string
  stage: string
}

const TOOL_LABELS: Record<string, string> = {
  get_startup_profile: 'Fetched startup profile',
  search_partners:     'Searched partners',
  search_mentors:      'Searched mentors',
  search_initiatives:  'Searched initiatives',
}

function AgentTrace({ steps }: { steps: AgentStep[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  if (steps.length === 0) return null

  return (
    <div className="section-card" style={{ marginBottom: '2rem' }}>
      <div className="section-card-header">
        <span className="section-card-title">Agent Trace — {steps.length} tool call{steps.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {steps.map((step, i) => (
          <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <button
              style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <span style={{ color: '#4f6ef7', fontWeight: 600 }}>⚙ {TOOL_LABELS[step.tool] ?? step.tool}</span>
              {Object.keys(step.args).length > 0 && (
                <span style={{ color: '#94a3b8' }}>
                  {Object.entries(step.args).map(([k, v]) => `${k}=${v}`).join(', ')}
                </span>
              )}
              <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>{expanded === i ? '▲' : '▼'}</span>
            </button>
            {expanded === i && (
              <pre style={{ margin: 0, padding: '0.5rem 0.9rem', fontSize: '0.75rem', color: '#374151', background: '#f1f5f9', overflowX: 'auto', borderTop: '1px solid #e2e8f0' }}>
                {JSON.stringify(step.result, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MatchCard({ entry, confirmed, onConfirm }: {
  entry: MatchEntry
  confirmed: boolean
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function handle() {
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }

  return (
    <div className="match-card">
      <div className="card-header">
        <span className="card-name">{entry.actorName}</span>
        <span className={`score-badge ${entry.matchScore >= 85 ? 'score-high' : entry.matchScore >= 70 ? 'score-mid' : 'score-low'}`}>
          {entry.matchScore}%
        </span>
      </div>
      <p className="match-reason">{entry.matchReason}</p>
      <button
        className={`btn btn-primary${confirmed ? ' btn-confirmed' : ''}`}
        style={{ marginTop: 'auto', fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
        onClick={handle}
        disabled={confirmed || busy}
      >
        {confirmed ? '✓ Confirmed' : busy ? 'Saving…' : 'Confirm Linkage'}
      </button>
    </div>
  )
}

function MatchSection({ title, entries, confirmed, onConfirm, gridClass }: {
  title: string
  entries: MatchEntry[]
  confirmed: Set<string>
  onConfirm: (e: MatchEntry) => Promise<void>
  gridClass?: string
}) {
  if (entries.length === 0) return null
  return (
    <div className="match-results-section">
      <h2 className="section-title">{title}</h2>
      <div className={`match-admin-grid${gridClass ? ` ${gridClass}` : ''}`}>
        {entries.map(e => (
          <MatchCard
            key={e.actorId}
            entry={e}
            confirmed={confirmed.has(e.actorId)}
            onConfirm={() => onConfirm(e)}
          />
        ))}
      </div>
    </div>
  )
}

export default function MatchesPage() {
  const [startups, setStartups] = useState<StartupRow[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentMatchResult | null>(null)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/startups').then(r => r.json()).then(setStartups)
  }, [])

  async function generate() {
    if (!selectedId) return
    setLoading(true)
    setResult(null)
    setConfirmed(new Set())
    setError(null)
    try {
      const res = await fetch('/api/agent/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupId: selectedId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Match generation failed')
      setResult(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate matches')
    } finally {
      setLoading(false)
    }
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
    showToast(`Linkage confirmed: ${entry.actorName}`)
  }

  const selected = startups.find(s => s.startup_id === selectedId)

  return (
    <div className="admin-content">
      <h1 className="page-title">Generate Matches</h1>
      <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
        AI agent fetches and filters ecosystem actors, then ranks the top 3 per category.
      </p>

      <div className="match-generate-bar">
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="startup-select">Startup</label>
          <select
            id="startup-select"
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setResult(null); setError(null) }}
          >
            <option value="">Select a startup…</option>
            {startups.map(s => (
              <option key={s.startup_id} value={s.startup_id}>
                {s.startup_name} — {s.industry}, {s.stage}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={!selectedId || loading}>
          {loading ? 'Thinking…' : '✨ Generate Matches'}
        </button>
      </div>

      {error && (
        <div className="section-card" style={{ marginBottom: '1.5rem', borderColor: '#fca5a5' }}>
          <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {result && (
        <>
          <AgentTrace steps={result.steps} />

          {selected && (
            <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
              Top matches for <strong>{selected.startup_name}</strong> ({selected.industry}, {selected.stage})
            </p>
          )}

          <MatchSection title="Mentors"            entries={result.mentors}           confirmed={confirmed} onConfirm={confirmLinkage} />
          <MatchSection title="Corporate Partners" entries={result.corporatePartners} confirmed={confirmed} onConfirm={confirmLinkage} gridClass="match-admin-grid-2" />
          <MatchSection title="Investors"          entries={result.investors}         confirmed={confirmed} onConfirm={confirmLinkage} gridClass="match-admin-grid-2" />
          <MatchSection title="Service Providers"  entries={result.serviceProviders}  confirmed={confirmed} onConfirm={confirmLinkage} gridClass="match-admin-grid-2" />
          <MatchSection title="Initiatives"        entries={result.initiatives}       confirmed={confirmed} onConfirm={confirmLinkage} />
        </>
      )}

      <LoadingOverlay visible={loading} message="Agent is thinking…" sub="Fetching and filtering ecosystem actors" />
      <Toast />
    </div>
  )
}
