'use client'

import { useState, useEffect } from 'react'
import Toast, { showToast } from '@/app/components/Toast'
import LoadingOverlay from '@/app/components/LoadingOverlay'
import type { MatchResponse, MatchResult } from '@/app/lib/types'

interface StartupRow {
  startup_id: string
  startup_name: string
  industry: string
  stage: string
}

function MatchCard({ result, confirmed, onConfirm }: {
  result: MatchResult
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
        <span className="card-name">{result.actorName}</span>
        <span className={`score-badge ${result.matchScore >= 85 ? 'score-high' : result.matchScore >= 70 ? 'score-mid' : 'score-low'}`}>
          {result.matchScore}%
        </span>
      </div>
      <p className="match-reason">{result.matchReason}</p>
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

function MatchSection({ title, results, confirmed, onConfirm, gridClass }: {
  title: string
  results: MatchResult[]
  confirmed: Set<string>
  onConfirm: (r: MatchResult) => Promise<void>
  gridClass?: string
}) {
  if (results.length === 0) return null
  return (
    <div className="match-results-section">
      <h2 className="section-title">{title}</h2>
      <div className={`match-admin-grid${gridClass ? ` ${gridClass}` : ''}`}>
        {results.map(r => (
          <MatchCard key={r.actorId} result={r} confirmed={confirmed.has(r.actorId)} onConfirm={() => onConfirm(r)} />
        ))}
      </div>
    </div>
  )
}

export default function MatchesPage() {
  const [startups, setStartups] = useState<StartupRow[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<MatchResponse | null>(null)
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/startups').then(r => r.json()).then(setStartups)
  }, [])

  async function generate() {
    if (!selectedId) return
    setLoading(true)
    setMatches(null)
    setConfirmed(new Set())
    setError(null)
    try {
      const res = await fetch(`/api/startups/${selectedId}/matches`)
      if (!res.ok) throw new Error((await res.json()).error ?? 'Match generation failed')
      setMatches(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate matches')
    } finally {
      setLoading(false)
    }
  }

  async function confirmLinkage(result: MatchResult) {
    const startup = startups.find(s => s.startup_id === selectedId)
    const res = await fetch('/api/linkages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startupId: selectedId,
        startupName: startup?.startup_name ?? '',
        actorType: result.actorType,
        partnerType: result.partnerType,
        actorId: result.actorId,
        actorName: result.actorName,
        matchScore: result.matchScore,
        matchReason: result.matchReason,
      }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    setConfirmed(prev => new Set([...prev, result.actorId]))
    showToast(`Linkage confirmed: ${result.actorName}`)
  }

  const selected = startups.find(s => s.startup_id === selectedId)

  return (
    <div className="admin-content">
      <h1 className="page-title">Generate Matches</h1>
      <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
        Select a startup and let AI find the best-fit ecosystem actors.
      </p>

      <div className="match-generate-bar">
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="startup-select">Startup</label>
          <select
            id="startup-select"
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setMatches(null); setError(null) }}
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
          {loading ? 'Generating…' : '✨ Generate Matches'}
        </button>
      </div>

      {error && (
        <div className="section-card" style={{ marginBottom: '1.5rem', borderColor: '#fca5a5' }}>
          <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {matches && selected && (
        <>
          <p className="page-subtitle" style={{ marginBottom: '1.5rem' }}>
            Matches for <strong>{selected.startup_name}</strong> ({selected.industry}, {selected.stage})
          </p>
          <MatchSection title="Mentors" results={matches.mentors} confirmed={confirmed} onConfirm={confirmLinkage} />
          <MatchSection title="Programmes" results={matches.programmes} confirmed={confirmed} onConfirm={confirmLinkage} />
          <MatchSection title="Corporate Partners" results={matches.corporatePartners} confirmed={confirmed} onConfirm={confirmLinkage} gridClass="match-admin-grid-2" />
          <MatchSection title="Investors" results={matches.investors} confirmed={confirmed} onConfirm={confirmLinkage} gridClass="match-admin-grid-2" />
          <MatchSection title="Service Providers" results={matches.serviceProviders} confirmed={confirmed} onConfirm={confirmLinkage} gridClass="match-admin-grid-2" />
        </>
      )}

      <LoadingOverlay visible={loading} message="Generating matches…" sub="AI is analysing startup profile against ecosystem actors" />
      <Toast />
    </div>
  )
}
