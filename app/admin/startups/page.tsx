'use client'

import { useState, useEffect } from 'react'
import Toast, { showToast } from '@/app/components/Toast'

interface StartupRow {
  startup_id: string
  startup_name: string
  cofounder_name: string
  industry: string
  stage: string
  needs: string[]
  short_description?: string
  created_at: string
}

interface FormState {
  startupName: string
  cofounderName: string
  industry: string
  stage: string
  problem: string
  needs: string[]
  shortDescription: string
}

const NEEDS_OPTIONS = ['mentorship', 'funding', 'pilot partners', 'networking']
const INDUSTRIES = ['fintech', 'healthtech', 'edtech', 'agritech', 'other']
const STAGES = ['pre-seed', 'seed', 'series-a', 'series-b']

const INDUSTRY_TAG: Record<string, string> = {
  fintech: 'tag-mentor', healthtech: 'tag-programme', edtech: 'tag-investor',
  agritech: 'tag-service', other: 'tag-corporate',
}

export default function StartupsPage() {
  const [startups, setStartups] = useState<StartupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>({ startupName: '', cofounderName: '', industry: '', stage: '', problem: '', needs: [], shortDescription: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    fetch('/api/startups')
      .then(r => r.json())
      .then(data => { setStartups(data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleCheckbox(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setForm(f => ({ ...f, needs: e.target.checked ? [...f.needs, v] : f.needs.filter(n => n !== v) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.startupName || !form.cofounderName || !form.industry || !form.stage || !form.problem) return
    setSaving(true)
    try {
      const res = await fetch('/api/startups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowModal(false)
      setForm({ startupName: '', cofounderName: '', industry: '', stage: '', problem: '', needs: [], shortDescription: '' })
      load()
      showToast('Startup added')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error adding startup')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-content">
      <div className="mgmt-header">
        <div className="mgmt-header-left">
          <h1 className="page-title">Startups</h1>
          {!loading && <span className="count-badge">{startups.length}</span>}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Startup</button>
      </div>

      <div className="mgmt-table-wrap">
        <table className="mgmt-table">
          <thead>
            <tr><th>Startup</th><th>Description</th><th>Industry</th><th>Stage</th><th>Cofounder</th><th>Needs</th><th>Enrolled</th></tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={6}><div className="empty-state">Loading…</div></td></tr>
              : startups.length === 0
              ? <tr><td colSpan={6}><div className="empty-state">No startups yet.</div></td></tr>
              : startups.map(s => (
                <tr key={s.startup_id}>
                  <td><strong>{s.startup_name}</strong></td>
                  <td style={{ maxWidth: 220, color: '#475569', fontSize: '0.82rem' }}>{s.short_description || '—'}</td>
                  <td><span className={`actor-tag ${INDUSTRY_TAG[s.industry] ?? 'tag-corporate'}`}>{s.industry}</span></td>
                  <td>{s.stage}</td>
                  <td>{s.cofounder_name}</td>
                  <td><div className="needs-chips">{s.needs.map(n => <span key={n} className="need-chip">{n}</span>)}</div></td>
                  <td>{s.created_at?.slice(0, 10) ?? '—'}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Add Startup</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Startup Name</label>
                <input name="startupName" value={form.startupName} onChange={handleChange} placeholder="e.g. PayEase" required />
              </div>
              <div className="form-group">
                <label>Cofounder Name</label>
                <input name="cofounderName" value={form.cofounderName} onChange={handleChange} placeholder="e.g. Ahmad Farhan" required />
              </div>
              <div className="form-group">
                <label>Industry</label>
                <select name="industry" value={form.industry} onChange={handleChange} required>
                  <option value="">Select…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Stage</label>
                <select name="stage" value={form.stage} onChange={handleChange} required>
                  <option value="">Select…</option>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Problem Statement</label>
                <textarea name="problem" rows={3} value={form.problem} onChange={handleChange} placeholder="What problem does this startup solve?" required />
              </div>
              <div className="form-group">
                <label>Short Description</label>
                <textarea name="shortDescription" rows={2} value={form.shortDescription} onChange={handleChange} placeholder="One or two sentences describing this startup for the matching engine." />
              </div>
              <div className="form-group">
                <label>Needs</label>
                <div className="checkbox-group">
                  {NEEDS_OPTIONS.map(o => (
                    <label key={o} className="checkbox-label">
                      <input type="checkbox" value={o} checked={form.needs.includes(o)} onChange={handleCheckbox} />
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={saving}>{saving ? 'Saving…' : 'Add Startup'}</button>
            </form>
          </div>
        </div>
      )}
      <Toast />
    </div>
  )
}
