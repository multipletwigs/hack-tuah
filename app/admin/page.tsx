'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import StatusBadge from '@/app/components/StatusBadge'
import type { Linkage } from '@/app/lib/types'

interface EngagementEntry {
  startupId: string
  startupName: string
  industry: string
  stage: string
  score: number
  activeLinks: number
  totalLinks: number
}

interface Stats {
  counts: { startups: number; partners: number; mentors: number; initiatives: number; activeLinks: number; pendingLinks: number }
  avgMatchScore: number
  engagementScores: EngagementEntry[]
  recentLinkages: Linkage[]
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className={`metric-card${accent ? ` accent-${accent}` : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="admin-content"><div className="empty-state" style={{ marginTop: '4rem' }}>Loading…</div></div>
  }
  if (!stats) {
    return <div className="admin-content"><div className="empty-state">Failed to load stats.</div></div>
  }

  const { counts, avgMatchScore, engagementScores, recentLinkages } = stats

  return (
    <div className="admin-content">
      <div className="mgmt-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Ecosystem Dashboard</h1>
          <p className="page-subtitle">Live view of the Cradle startup ecosystem.</p>
        </div>
        <Link href="/admin/matches" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          ✨ Generate Matches
        </Link>
      </div>

      <div className="metric-grid">
        <MetricCard label="Startups" value={counts.startups} sub="enrolled" accent="blue" />
        <MetricCard label="Partners" value={counts.partners} sub="active" accent="orange" />
        <MetricCard label="Mentors" value={counts.mentors} sub="active" accent="purple" />
        <MetricCard label="Initiatives" value={counts.initiatives} sub="running" accent="green" />
        <MetricCard label="Active Linkages" value={counts.activeLinks} sub={`${counts.pendingLinks} pending`} />
        <MetricCard label="Avg Match Score" value={`${avgMatchScore}%`} sub="across active links" accent="blue" />
      </div>

      <div className="dash-two-col">
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">Engagement Scores</span>
            <Link href="/admin/startups" style={{ fontSize: '0.78rem', color: '#4f6ef7', textDecoration: 'none' }}>View all →</Link>
          </div>
          {engagementScores.length === 0
            ? <div className="empty-state" style={{ padding: '1rem 0' }}>No engagement data yet.</div>
            : engagementScores.map(e => (
              <div key={e.startupId} className="engagement-row">
                <span className="engagement-name">{e.startupName}</span>
                <span className="engagement-industry">{e.industry}</span>
                <div className="engagement-bar-track">
                  <div className="engagement-bar-fill" style={{ width: `${e.score}%` }} />
                </div>
                <span className="engagement-score-val">{e.score}</span>
                <span className="engagement-links-val">{e.activeLinks}/{e.totalLinks}</span>
              </div>
            ))
          }
        </div>

        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title">Recent Activity</span>
            <Link href="/admin/linkages" style={{ fontSize: '0.78rem', color: '#4f6ef7', textDecoration: 'none' }}>View all →</Link>
          </div>
          {recentLinkages.length === 0
            ? <div className="empty-state" style={{ padding: '1rem 0' }}>No recent activity.</div>
            : recentLinkages.map(l => (
              <div key={l.linkageId} className="activity-item">
                <div className="activity-dot" />
                <div className="activity-body">
                  <strong>{l.startupName}</strong> → {l.actorName}
                  <div className="activity-meta"><StatusBadge status={l.status} /> · {l.actorType}</div>
                </div>
                <span className="activity-date">{l.createdAt.slice(0, 10)}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
