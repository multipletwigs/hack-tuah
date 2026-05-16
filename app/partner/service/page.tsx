'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/app/components/Nav'
import LoadingOverlay from '@/app/components/LoadingOverlay'

interface FormState {
  orgName: string; contactName: string; contactEmail: string
  serviceType: string; whatOffer: string; pricingModel: string; stages: string[]
}

const STAGE_OPTIONS = [
  { value: 'pre-seed', label: 'Pre-seed' }, { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' }, { value: 'series-b', label: 'Series B+' },
]

export default function ServiceProviderForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({ orgName: '', contactName: '', contactEmail: '', serviceType: '', whatOffer: '', pricingModel: '', stages: [] })
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: undefined }))
  }

  function handleStageCheckbox(value: string, checked: boolean) {
    setForm(f => ({ ...f, stages: checked ? [...f.stages, value] : f.stages.filter(v => v !== value) }))
  }

  function validate() {
    const e: Partial<Record<string, string>> = {}
    if (!form.orgName.trim()) e.orgName = 'This field is required.'
    if (!form.contactName.trim()) e.contactName = 'This field is required.'
    if (!form.contactEmail.includes('@')) e.contactEmail = 'A valid email is required.'
    if (!form.serviceType) e.serviceType = 'Please select a service type.'
    if (!form.whatOffer.trim()) e.whatOffer = 'This field is required.'
    if (!form.pricingModel) e.pricingModel = 'Please select a pricing model.'
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
        body: JSON.stringify({ ...form, partnerType: 'service_provider' }),
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
          <div className="form-type-badge"><span className="actor-tag tag-service">Service Provider</span></div>

          {submitted ? (
            <div className="success-box">
              <span className="success-icon">✅</span>
              <h3>Application received!</h3>
              <p>Cradle will review your profile and reach out within 5 working days.</p>
              <button className="btn btn-primary" onClick={() => router.push('/')} type="button" style={{ marginTop: '1rem' }}>Back to Home</button>
            </div>
          ) : (
            <>
              <h1 className="page-title">Register as a Service Provider</h1>
              <p className="page-subtitle">Your profile will be reviewed by Cradle before being added to the ecosystem.</p>
              <form className="form" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="orgName">Organisation Name</label>
                  <input type="text" id="orgName" name="orgName" placeholder="e.g. Wong & Partners" value={form.orgName} onChange={handleChange} required />
                  {errors.orgName && <span className="field-error visible">{errors.orgName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="contactName">Contact Person</label>
                  <input type="text" id="contactName" name="contactName" placeholder="e.g. David Wong" value={form.contactName} onChange={handleChange} required />
                  {errors.contactName && <span className="field-error visible">{errors.contactName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="contactEmail">Work Email</label>
                  <input type="email" id="contactEmail" name="contactEmail" placeholder="e.g. david@wongpartners.com" value={form.contactEmail} onChange={handleChange} required />
                  {errors.contactEmail && <span className="field-error visible">{errors.contactEmail}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="serviceType">Service Type</label>
                  <select id="serviceType" name="serviceType" value={form.serviceType} onChange={handleChange} required>
                    <option value="">Select…</option>
                    <option value="legal">Legal</option>
                    <option value="accounting">Accounting / Finance</option>
                    <option value="cloud">Cloud Credits / Infrastructure</option>
                    <option value="marketing">Marketing / PR</option>
                    <option value="regulatory">Regulatory / Compliance</option>
                    <option value="hr">HR / Recruitment</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.serviceType && <span className="field-error visible">{errors.serviceType}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="whatOffer">What do you offer?</label>
                  <textarea id="whatOffer" name="whatOffer" rows={3} placeholder="e.g. Startup incorporation, term sheet review, IP filing…" value={form.whatOffer} onChange={handleChange} required />
                  {errors.whatOffer && <span className="field-error visible">{errors.whatOffer}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="pricingModel">Pricing Model for Cradle Startups</label>
                  <select id="pricingModel" name="pricingModel" value={form.pricingModel} onChange={handleChange} required>
                    <option value="">Select…</option>
                    <option value="free">Free tier available</option>
                    <option value="discounted">Discounted rate</option>
                    <option value="paid">Standard paid</option>
                  </select>
                  {errors.pricingModel && <span className="field-error visible">{errors.pricingModel}</span>}
                </div>
                <div className="form-group">
                  <label>Suitable Startup Stage</label>
                  <div className="checkbox-group">
                    {STAGE_OPTIONS.map(opt => (
                      <label key={opt.value} className="checkbox-label">
                        <input type="checkbox" value={opt.value} checked={form.stages.includes(opt.value)} onChange={e => handleStageCheckbox(opt.value, e.target.checked)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
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
