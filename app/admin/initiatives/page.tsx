'use client'

import { useState, useEffect } from 'react'
import StatusBadge from '@/app/components/StatusBadge'
import Toast, { showToast } from '@/app/components/Toast'
import type { Initiative } from '@/app/lib/types'

const INITIATIVE_TYPES = ['accelerator', 'grant', 'incubator', 'programme', 'challenge']

function typeTagClass(t: string) {
  if (t === 'accelerator') return 'tag-mentor'
  if (t === 'grant') return 'tag-investor'
  if (t === 'incubator') return 'tag-programme'
  return 'tag-corporate'
}

interface FormState {
  name: string; type: string; description: string; focusIndustries: string
  fundingAmount: string; nextIntake: string; status: string
}

export default function InitiativesPage() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>({ name: '', type: '', description: '', focusIndustries: '', fundingAmount: '', nextIntake: '', status: 'active' })
  const [saving, setSaving] = useState(false)

  function load() {
    fetch('/api/initiatives').then(r => r.json()).then(data => { setInitiatives(data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.type) return
    setSaving(true)
    try {
      const res = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, type: form.type,
          description: form.description,
          focusIndustries: form.focusIndustries.split(',').map(s => s.trim()).filter(Boolean),
          fundingAmount: form.fundingAmount ? Number(form.fundingAmount) : null,
          nextIntake: form.nextIntake || null,
          status: form.status,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowModal(false)
      setForm({ name: '', type: '', description: '', focusIndustries: '', fundingAmount: '', nextIntake: '', status: 'active' })
      load()
      showToast('Initiative added')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error adding initiative')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-content">
      <div className="mgmt-header">
        <div className="mgmt-header-left">
          <h1 className="page-title">Initiatives</h1>
          {!loading && <span className="count-badge">{initiatives.length}</span>}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Initiative</button>
      </div>

      <div className="mgmt-table-wrap">
        <table className="mgmt-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Description</th><th>Focus Industries</th><th>Funding</th><th>Next Intake</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7}><div className="empty-state">Loading…</div></td></tr>
              : initiatives.length === 0
              ? <tr><td colSpan={7}><div className="empty-state">No initiatives yet.</div></td></tr>
              : initiatives.map(i => (
                <tr key={i.initiativeId}>
                  <td><strong>{i.name}</strong></td>
                  <td><span className={`actor-tag ${typeTagClass(i.type)}`}>{i.type}</span></td>
                  <td style={{ maxWidth: 280, color: '#475569', fontSize: '0.82rem' }}>{i.description || '—'}</td>
                  <td><div className="needs-chips">{i.focusIndustries.map(f => <span key={f} className="need-chip">{f}</span>)}</div></td>
                  <td>{i.fundingAmount ? `RM ${i.fundingAmount.toLocaleString()}` : '—'}</td>
                  <td>{i.nextIntake ?? '—'}</td>
                  <td><StatusBadge status={i.status === 'active' ? 'active' : i.status === 'upcoming' ? 'pending' : 'closed'} /></td>
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
              <h2 className="modal-title">Add Initiative</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. CIP Accelerate" required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select name="type" value={form.type} onChange={handleChange} required>
                  <option value="">Select…</option>
                  {INITIATIVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" rows={3} value={form.description} onChange={handleChange} placeholder="Short description of what this initiative offers and who it targets." />
              </div>
              <div className="form-group">
                <label>Focus Industries</label>
                <input name="focusIndustries" value={form.focusIndustries} onChange={handleChange} placeholder="fintech, healthtech (comma-separated)" />
              </div>
              <div className="form-group">
                <label>Funding Amount (RM)</label>
                <input type="number" name="fundingAmount" value={form.fundingAmount} onChange={handleChange} placeholder="e.g. 500000" />
              </div>
              <div className="form-group">
                <label>Next Intake</label>
                <input name="nextIntake" value={form.nextIntake} onChange={handleChange} placeholder="e.g. Q3 2026" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={saving}>{saving ? 'Saving…' : 'Add Initiative'}</button>
            </form>
          </div>
        </div>
      )}
      <Toast />
    </div>
  )
}
