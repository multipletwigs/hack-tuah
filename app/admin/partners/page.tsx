'use client'

import { useState, useEffect } from 'react'
import StatusBadge from '@/app/components/StatusBadge'
import Toast, { showToast } from '@/app/components/Toast'
import type { PartnerRecord } from '@/app/lib/types'

const TABS = ['All', 'Corporate', 'Investor', 'Service Provider', 'Mentor'] as const
type Tab = typeof TABS[number]

const TAB_FILTER: Record<Tab, string | null> = {
  'All': null, 'Corporate': 'corporate', 'Investor': 'investor',
  'Service Provider': 'service_provider', 'Mentor': 'mentor',
}

const PARTNER_TYPES = ['corporate', 'investor', 'service_provider', 'mentor']

function typeTagClass(t: string) {
  if (t === 'corporate') return 'tag-corporate'
  if (t === 'investor') return 'tag-investor'
  if (t === 'service_provider') return 'tag-service'
  return 'tag-mentor'
}

function typeLabel(t: string) {
  if (t === 'service_provider') return 'Service Provider'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

interface FormState {
  orgName: string; contactName: string; contactEmail: string; partnerType: string; industry: string
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('All')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>({ orgName: '', contactName: '', contactEmail: '', partnerType: '', industry: '' })
  const [saving, setSaving] = useState(false)

  function load() {
    fetch('/api/partners').then(r => r.json()).then(data => { setPartners(data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const filtered = partners.filter(p => !TAB_FILTER[tab] || p.partnerType === TAB_FILTER[tab])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.orgName || !form.contactName || !form.contactEmail || !form.partnerType) return
    setSaving(true)
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowModal(false)
      setForm({ orgName: '', contactName: '', contactEmail: '', partnerType: '', industry: '' })
      load()
      showToast('Partner added')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error adding partner')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-content">
      <div className="mgmt-header">
        <div className="mgmt-header-left">
          <h1 className="page-title">Partners & Mentors</h1>
          {!loading && <span className="count-badge">{partners.length}</span>}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Partner</button>
      </div>

      <div className="filter-tabs">
        {TABS.map(t => (
          <button key={t} className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="mgmt-table-wrap">
        <table className="mgmt-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Industry</th><th>Contact</th><th>Status</th><th>Added</th></tr>
          </thead>
          <tbody>
            {loading
              ? <tr key="loading"><td colSpan={6}><div className="empty-state">Loading…</div></td></tr>
              : filtered.length === 0
              ? <tr key="empty"><td colSpan={6}><div className="empty-state">No partners in this category.</div></td></tr>
              : filtered.map((p, i) => (
                <tr key={p.partnerId ?? i}>
                  <td><strong>{p.orgName}</strong></td>
                  <td><span className={`actor-tag ${typeTagClass(p.partnerType)}`}>{typeLabel(p.partnerType)}</span></td>
                  <td>{p.industry}</td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.contactEmail}</td>
                  <td><StatusBadge status={p.status === 'active' ? 'active' : 'pending'} /></td>
                  <td>{p.createdAt?.slice(0, 10) ?? '—'}</td>
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
              <h2 className="modal-title">Add Partner / Mentor</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Organisation / Name</label>
                <input name="orgName" value={form.orgName} onChange={handleChange} placeholder="e.g. Mastercard" required />
              </div>
              <div className="form-group">
                <label>Contact Name</label>
                <input name="contactName" value={form.contactName} onChange={handleChange} placeholder="e.g. Sarah Lim" required />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" name="contactEmail" value={form.contactEmail} onChange={handleChange} placeholder="sarah@example.com" required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select name="partnerType" value={form.partnerType} onChange={handleChange} required>
                  <option value="">Select…</option>
                  {PARTNER_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Industry / Focus</label>
                <input name="industry" value={form.industry} onChange={handleChange} placeholder="e.g. fintech, legal" />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={saving}>{saving ? 'Saving…' : 'Add Partner'}</button>
            </form>
          </div>
        </div>
      )}
      <Toast />
    </div>
  )
}
