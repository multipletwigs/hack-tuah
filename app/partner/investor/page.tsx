'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/app/components/Nav'
import LoadingOverlay from '@/app/components/LoadingOverlay'

interface FormState {
  fundName: string; contactName: string; contactEmail: string; investorType: string
  stages: string[]; industries: string[]; ticketMin: string; ticketMax: string
  thesis: string; portfolio: string
}

const STAGE_OPTIONS = [
  { value: 'pre-seed', label: 'Pre-seed' }, { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' }, { value: 'series-b', label: 'Series B+' },
]
const INDUSTRY_OPTIONS = ['fintech', 'healthtech', 'edtech', 'agritech', 'saas', 'other']

export default function InvestorForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({ fundName: '', contactName: '', contactEmail: '', investorType: '', stages: [], industries: [], ticketMin: '', ticketMax: '', thesis: '', portfolio: '' })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: undefined }))
  }

  function handleCheckbox(field: 'stages' | 'industries', value: string, checked: boolean) {
    setForm(f => ({ ...f, [field]: checked ? [...f[field], value] : f[field].filter(v => v !== value) }))
  }

  function validate() {
    const e: Partial<Record<string, string>> = {}
    if (!form.fundName.trim()) e.fundName = 'This field is required.'
    if (!form.contactName.trim()) e.contactName = 'This field is required.'
    if (!form.contactEmail.includes('@')) e.contactEmail = 'A valid email is required.'
    if (!form.investorType) e.investorType = 'Please select an investor type.'
    if (!form.thesis.trim()) e.thesis = 'This field is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, orgName: form.fundName, partnerType: 'investor' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Nav />
      <main className="container">
        <button className="back-btn" onClick={() => router.push('/partner')} type="button">← Back</button>
        <div className="card form-card">
          <div className="form-type-badge"><span className="actor-tag tag-investor">Investor</span></div>

          {submitted ? (
            <div className="success-box">
              <span className="success-icon">✅</span>
              <h3>Application received!</h3>
              <p>Cradle will review your profile and reach out within 5 working days.</p>
              <button className="btn btn-primary" onClick={() => router.push('/')} type="button" style={{ marginTop: '1rem' }}>Back to Home</button>
            </div>
          ) : (
            <>
              <h1 className="page-title">Register as an Investor</h1>
              <p className="page-subtitle">Your profile will be reviewed by Cradle before being added to the ecosystem.</p>
              <form className="form" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="fundName">Fund / Organisation Name</label>
                  <input type="text" id="fundName" name="fundName" placeholder="e.g. Openspace Ventures" value={form.fundName} onChange={handleChange} required />
                  {errors.fundName && <span className="field-error visible">{errors.fundName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="contactName">Contact Person</label>
                  <input type="text" id="contactName" name="contactName" placeholder="e.g. Marcus Lim" value={form.contactName} onChange={handleChange} required />
                  {errors.contactName && <span className="field-error visible">{errors.contactName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="contactEmail">Work Email</label>
                  <input type="email" id="contactEmail" name="contactEmail" placeholder="e.g. marcus@openspace.vc" value={form.contactEmail} onChange={handleChange} required />
                  {errors.contactEmail && <span className="field-error visible">{errors.contactEmail}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="investorType">Investor Type</label>
                  <select id="investorType" name="investorType" value={form.investorType} onChange={handleChange} required>
                    <option value="">Select…</option>
                    <option value="vc">Venture Capital</option>
                    <option value="angel">Angel Investor</option>
                    <option value="family-office">Family Office</option>
                    <option value="corporate-vc">Corporate VC</option>
                    <option value="government">Government Fund</option>
                  </select>
                  {errors.investorType && <span className="field-error visible">{errors.investorType}</span>}
                </div>
                <div className="form-group">
                  <label>Investment Stage</label>
                  <div className="checkbox-group">
                    {STAGE_OPTIONS.map(opt => (
                      <label key={opt.value} className="checkbox-label">
                        <input type="checkbox" value={opt.value} checked={form.stages.includes(opt.value)} onChange={e => handleCheckbox('stages', opt.value, e.target.checked)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Industries</label>
                  <div className="checkbox-group">
                    {INDUSTRY_OPTIONS.map(opt => (
                      <label key={opt} className="checkbox-label">
                        <input type="checkbox" value={opt} checked={form.industries.includes(opt)} onChange={e => handleCheckbox('industries', opt, e.target.checked)} />
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Ticket Size (RM)</label>
                  <div className="input-row">
                    <input type="number" name="ticketMin" placeholder="Min e.g. 500000" value={form.ticketMin} onChange={handleChange} style={{ flex: 1 }} />
                    <span className="input-row-sep">—</span>
                    <input type="number" name="ticketMax" placeholder="Max e.g. 3000000" value={form.ticketMax} onChange={handleChange} style={{ flex: 1 }} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="thesis">Investment Thesis</label>
                  <textarea id="thesis" name="thesis" rows={3} placeholder="e.g. B2B tech with SEA expansion potential…" value={form.thesis} onChange={handleChange} required />
                  {errors.thesis && <span className="field-error visible">{errors.thesis}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="portfolio">Notable Portfolio Companies (optional)</label>
                  <input type="text" id="portfolio" name="portfolio" placeholder="e.g. Funding Societies, Doctor Anywhere" value={form.portfolio} onChange={handleChange} />
                </div>
                {submitError && <p className="field-error visible">{submitError}</p>}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Submitting…' : 'Submit for Review'}</button>
              </form>
            </>
          )}
        </div>
      </main>
      <LoadingOverlay visible={loading} message="Submitting your profile…" sub="Cradle will review and activate your account" />
    </>
  )
}
