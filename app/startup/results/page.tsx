'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/app/components/Nav'
import MatchCard from '@/app/components/MatchCard'
import Toast, { showToast } from '@/app/components/Toast'
import type { MatchResponse, MatchResult } from '@/app/lib/types'

const META_MAP: Record<string, string> = {
  'Ahmad Razif': 'Fintech · Seed · Kuala Lumpur',
  'Priya Nair': 'B2B SaaS · Pre-seed, Seed · Remote',
  'David Tan': 'Payments · Series A · Singapore',
  'CIP Accelerate': 'Funding: RM 500,000 · Next intake: Q3 2026',
  'GAIN Grant': 'Funding: RM 150,000 · Next intake: Q4 2026',
  'Tech Startup Catalyst': 'Funding: RM 100,000 · Next intake: Q2 2026',
  'Mastercard': 'Payments · Pilot Program · API Access',
  'CIMB Bank': 'Banking · API Sandbox · Distribution',
  'Openspace Ventures': 'Ticket: RM 500K–3M · Seed, Series A · B2B Tech',
  'Iterative': 'Ticket: RM 150K–600K · Pre-seed, Seed · SEA Founders',
  'Wong & Partners': 'Legal · Discounted · Incorporation, Term Sheets, IP',
  'AWS Activate': 'Cloud Credits · Free Tier · All stages',
}

interface MatchSectionProps {
  title: string
  results: MatchResult[]
  gridClass?: string
  startupId: string
  startupName: string
}

function MatchSection({ title, results, gridClass, startupId, startupName }: MatchSectionProps) {
  if (results.length === 0) return null
  return (
    <section className="match-section">
      <h2 className="section-title">{title}</h2>
      <div className={`card-grid${gridClass ? ` ${gridClass}` : ''}`}>
        {results.map(r => (
          <MatchCard
            key={r.actorId}
            actorId={r.actorId}
            actorName={r.actorName}
            actorType={r.actorType}
            partnerType={r.partnerType}
            matchScore={r.matchScore}
            matchReason={r.matchReason}
            metaLine={META_MAP[r.actorName] ?? ''}
            onConfirm={async () => {
              const res = await fetch('/api/linkages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  startupId, startupName,
                  actorType: r.actorType, partnerType: r.partnerType,
                  actorId: r.actorId, actorName: r.actorName,
                  matchScore: r.matchScore, matchReason: r.matchReason,
                }),
              })
              if (!res.ok) throw new Error((await res.json()).error)
              showToast(`Linkage confirmed: ${r.actorName}`)
            }}
          />
        ))}
      </div>
    </section>
  )
}

interface SlideDeckModalProps {
  startupName: string
  matches: MatchResponse
  onClose: () => void
}

function SlideDeckModal({ startupName, matches, onClose }: SlideDeckModalProps) {
  const top = {
    mentor: matches.mentors[0],
    prog: matches.programmes[0],
    corp: matches.corporatePartners[0],
    inv: matches.investors[0],
    svc: matches.serviceProviders[0],
  }
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Startup Summary Deck</h2>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>
        <div className="slide">
          <div className="slide-number">1 / 3</div>
          <h3 className="slide-title">{startupName}</h3>
          <p className="slide-tagline">Cross-border payments for SMEs</p>
          <div className="slide-chips">
            <span className="chip">Fintech</span>
            <span className="chip">Seed Stage</span>
            <span className="chip">Kuala Lumpur</span>
          </div>
        </div>
        <div className="slide">
          <div className="slide-number">2 / 3</div>
          <h3 className="slide-title">Top Matches</h3>
          <ul className="slide-list">
            {top.mentor && <li>🧑‍💼 Mentor — {top.mentor.actorName} ({top.mentor.matchScore}%)</li>}
            {top.prog && <li>📋 Programme — {top.prog.actorName} ({top.prog.matchScore}%)</li>}
            {top.corp && <li>🤝 Partner — {top.corp.actorName} ({top.corp.matchScore}%)</li>}
            {top.inv && <li>💰 Investor — {top.inv.actorName} ({top.inv.matchScore}%)</li>}
            {top.svc && <li>⚖️ Service — {top.svc.actorName} ({top.svc.matchScore}%)</li>}
          </ul>
        </div>
        <div className="slide">
          <div className="slide-number">3 / 3</div>
          <h3 className="slide-title">Next Steps</h3>
          <ul className="slide-list">
            <li>Confirm linkages to activate matches</li>
            <li>Cradle staff will reach out within 5 working days</li>
            <li>Prepare a 10-slide deck for programme application</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function MatchResults() {
  const router = useRouter()
  const [data, setData] = useState<{ startupId: string; startupName: string; matches: MatchResponse } | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('matchData')
    if (raw) setData(JSON.parse(raw))
  }, [])

  if (!data) {
    return (
      <>
        <Nav />
        <main className="container">
          <p>No match data found. <button className="back-btn" onClick={() => router.push('/startup')} type="button">← Go back</button></p>
        </main>
      </>
    )
  }

  const { startupId, startupName, matches } = data

  return (
    <>
      <Nav rightLabel="Admin Dashboard" rightHref="/admin" />
      <main className="container">
        <div className="results-header">
          <div>
            <h1 className="page-title">Matches for <span className="highlight">{startupName}</span></h1>
            <p className="page-subtitle">AI-matched based on your profile. Confirm a match to save it as a structured linkage.</p>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowModal(true)} type="button">
            Generate Slide Deck
          </button>
        </div>

        <MatchSection title="Mentors" results={matches.mentors} startupId={startupId} startupName={startupName} />
        <MatchSection title="Programmes" results={matches.programmes} startupId={startupId} startupName={startupName} />
        <MatchSection title="Corporate Partners" results={matches.corporatePartners} gridClass="card-grid-2" startupId={startupId} startupName={startupName} />
        <MatchSection title="Investors" results={matches.investors} gridClass="card-grid-2" startupId={startupId} startupName={startupName} />
        <MatchSection title="Service Providers" results={matches.serviceProviders} gridClass="card-grid-2" startupId={startupId} startupName={startupName} />
      </main>

      {showModal && <SlideDeckModal startupName={startupName} matches={matches} onClose={() => setShowModal(false)} />}
      <Toast />
    </>
  )
}
