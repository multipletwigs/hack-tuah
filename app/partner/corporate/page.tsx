'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/app/components/Nav'
import LoadingOverlay from '@/app/components/LoadingOverlay'

interface FormState {
  orgName: string; contactName: string; contactEmail: string
  industries: string[]; offers: string[]; stages: string[]; pastInitiatives: string
}

const INDUSTRY_OPTIONS = ['fintech', 'healthtech', 'edtech', 'agritech', 'other']
const OFFER_OPTIONS = [
  { value: 'pilot', label: 'Pilot Program' }, { value: 'api', label: 'API Access' },
  { value: 'distribution', label: 'Distribution' }, { value: 'co-marketing', label: 'Co-marketing' },
  { value: 'credits', label: 'Credits / Resources' },
]
const STAGE_OPTIONS = [
  { value: 'pre-seed', label: 'Pre-seed' }, { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' }, { value: 'series-b', label: 'Series B+' },
]

export default function CorporateForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({ orgName: '', contactName: '', contactEmail: '', industries: [], offers: [], stages: [], pastInitiatives: '' })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: undefined }))
  }

  function handleCheckbox(field: 'industries' | 'offers' | 'stages', value: string, checked: boolean) {
    setForm(f => ({ ...f, [field]: checked ? [...f[field], value] : f[field].filter(v => v !== value) }))
  }

  function validate() {
    const e: Partial<Record<string, string>> = {}
    if (!form.orgName.trim()) e.orgName = 'This field is required.'
    if (!form.contactName.trim()) e.contactName = 'This field is required.'
    if (!form.contactEmail.includes('@')) e.contactEmail = 'A valid email is required.'
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
        body: JSON.stringify({ ...form, partnerType: 'corporate' }),
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
          <div className="form-type-badge"><span className="actor-tag tag-corporate">Corporate Partner</span></div>

          {submitted ? (
            <div className="success-box">
              <span className="success-icon">✅</span>
              <h3>Profile Submitted!</h3>
              <p>Cradle will review and activate your account within 5 working days.</p>
              <button className="btn btn-primary" onClick={() => router.push('/')} type="button" style={{ marginTop: '1rem' }}>Back to Home</button>
            </div>
          ) : (
            <>
              <h1 className="page-title">Register your organisation</h1>
              <p className="page-subtitle">Your profile will be reviewed by Cradle before being added to the ecosystem.</p>
              <form className="form" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="orgName">Organisation Name</label>
                  <input type="text" id="orgName" name="orgName" placeholder="e.g. Mastercard" value={form.orgName} onChange={handleChange} required />
                  {errors.orgName && <span className="field-error visible">{errors.orgName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="contactName">Contact Person</label>
                  <input type="text" id="contactName" name="contactName" placeholder="e.g. Sarah Lee" value={form.contactName} onChange={handleChange} required />
                  {errors.contactName && <span className="field-error visible">{errors.contactName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="contactEmail">Work Email</label>
                  <input type="email" id="contactEmail" name="contactEmail" placeholder="e.g. sarah@mastercard.com" value={form.contactEmail} onChange={handleChange} required />
                  {errors.contactEmail && <span className="field-error visible">{errors.contactEmail}</span>}
                </div>
                <div className="form-group">
                  <label>Industries Interested In</label>
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
                  <label>What do you offer startups?</label>
                  <div className="checkbox-group">
                    {OFFER_OPTIONS.map(opt => (
                      <label key={opt.value} className="checkbox-label">
                        <input type="checkbox" value={opt.value} checked={form.offers.includes(opt.value)} onChange={e => handleCheckbox('offers', opt.value, e.target.checked)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Suitable Startup Stage</label>
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
                  <label htmlFor="pastInitiatives">Past Initiatives (optional)</label>
                  <textarea id="pastInitiatives" name="pastInitiatives" rows={3} placeholder="e.g. Mastercard Fintech Express 2025…" value={form.pastInitiatives} onChange={handleChange} />
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
