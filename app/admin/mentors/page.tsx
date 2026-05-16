'use client'

import { useState, useEffect } from 'react'
import StatusBadge from '@/app/components/StatusBadge'
import Toast, { showToast } from '@/app/components/Toast'
import type { PartnerRecord } from '@/app/lib/types'

const EXPERTISE_OPTIONS = [
  'fintech', 'healthtech', 'edtech', 'agritech', 'logtech',
  'cleantech', 'proptech', 'deeptech/AI', 'B2B SaaS', 'payments',
  'e-commerce', 'legal', 'marketing', 'fundraising', 'operations',
]

interface FormState {
  name: string
  email: string
  expertise: string
  shortDescription: string
}

const EMPTY_FORM: FormState = { name: '', email: '', expertise: '', shortDescription: '' }

export default function MentorsPage() {
  const [mentors, setMentors] = useState<PartnerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  function load() {
    fetch('/api/partners')
      .then(r => r.json())
      .then((data: PartnerRecord[]) => {
        setMentors(data.filter(p => p.partnerType === 'mentor'))
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const filtered = mentors.filter(m =>
    !search ||
    m.orgName.toLowerCase().includes(search.toLowerCase()) ||
    m.industry.toLowerCase().includes(search.toLowerCase())
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) return
    setSaving(true)
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: form.name,
          contactName: form.name,
          contactEmail: form.email,
          partnerType: 'mentor',
          industry: form.expertise,
          shortDescription: form.shortDescription,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowModal(false)
      setForm(EMPTY_FORM)
      load()
      showToast('Mentor added successfully')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add mentor')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the mentor list?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/partners/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setMentors(m => m.filter(x => x.partnerId !== id))
      showToast('Mentor removed')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove mentor')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="admin-content">
      <div className="mgmt-header">
        <div className="mgmt-header-left">
          <h1 className="page-title">Mentors</h1>
          {!loading && <span className="count-badge">{mentors.length}</span>}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Mentor</button>
      </div>

      <div className="filters-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <label htmlFor="mentor-search">Search</label>
          <input
            id="mentor-search"
            type="text"
            placeholder="Search by name or expertise…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mgmt-table-wrap">
        <table className="mgmt-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Expertise</th>
              <th>Email</th>
              <th>Status</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr key="loading"><td colSpan={7}><div className="empty-state">Loading…</div></td></tr>
              : filtered.length === 0
              ? <tr key="empty"><td colSpan={7}><div className="empty-state">{search ? 'No mentors match your search.' : 'No mentors yet. Add the first one!'}</div></td></tr>
              : filtered.map((m, i) => (
                <tr key={m.partnerId ?? i}>
                  <td><strong>{m.orgName}</strong></td>
                  <td style={{ maxWidth: 220, color: '#475569', fontSize: '0.82rem' }}>{m.shortDescription || '—'}</td>
                  <td>
                    <span className="actor-tag tag-mentor">{m.industry || '—'}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.contactEmail}</td>
                  <td><StatusBadge status={m.status === 'active' ? 'active' : 'pending'} /></td>
                  <td>{m.createdAt?.slice(0, 10) ?? '—'}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', color: '#ef4444', borderColor: '#fca5a5' }}
                      disabled={deletingId === m.partnerId}
                      onClick={() => handleDelete(m.partnerId!, m.orgName)}
                    >
                      {deletingId === m.partnerId ? '…' : 'Remove'}
                    </button>
                  </td>
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
              <h2 className="modal-title">Add Mentor</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Ahmad Razif"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="ahmad@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Area of Expertise</label>
                <select name="expertise" value={form.expertise} onChange={handleChange}>
                  <option value="">Select or type below…</option>
                  {EXPERTISE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Custom Expertise (overrides above)</label>
                <input
                  name="expertise"
                  value={form.expertise}
                  onChange={handleChange}
                  placeholder="e.g. fintech, legal, B2B SaaS"
                />
              </div>
              <div className="form-group">
                <label>Short Description</label>
                <textarea
                  name="shortDescription"
                  rows={2}
                  value={form.shortDescription}
                  onChange={handleChange}
                  placeholder="What does this mentor offer? What is their background?"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={saving}
              >
                {saving ? 'Adding…' : 'Add Mentor'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Toast />
    </div>
  )
}
