'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/app/components/Nav'
import LoadingOverlay from '@/app/components/LoadingOverlay'
import type { MatchResponse } from '@/app/lib/types'

interface FormState {
  cofounderName: string
  startupName: string
  industry: string
  stage: string
  problem: string
  needs: string[]
}

const NEEDS_OPTIONS = ['mentorship', 'funding', 'pilot partners', 'networking']

export default function ProfileForm() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    cofounderName: '', startupName: '', industry: '', stage: '', problem: '', needs: [],
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: undefined }))
  }

  function handleCheckbox(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setForm(f => ({
      ...f,
      needs: e.target.checked ? [...f.needs, value] : f.needs.filter(n => n !== value),
    }))
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {}
    if (!form.cofounderName.trim()) newErrors.cofounderName = 'This field is required.'
    if (!form.startupName.trim()) newErrors.startupName = 'This field is required.'
    if (!form.industry) newErrors.industry = 'Please select an industry.'
    if (!form.stage) newErrors.stage = 'Please select a stage.'
    if (!form.problem.trim()) newErrors.problem = 'This field is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)
    try {
      const createRes = await fetch('/api/startups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!createRes.ok) throw new Error((await createRes.json()).error)
      const { startupId } = await createRes.json()

      const matchRes = await fetch(`/api/startups/${startupId}/matches`)
      if (!matchRes.ok) throw new Error((await matchRes.json()).error)
      const matches: MatchResponse = await matchRes.json()

      sessionStorage.setItem('matchData', JSON.stringify({ startupId, startupName: form.startupName, matches }))
      router.push('/startup/results')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <Nav />
      <main className="container">
        <button className="back-btn" onClick={() => router.push('/')} type="button">← Back</button>
        <div className="card form-card">
          <h1 className="page-title">Tell us about your startup</h1>
          <p className="page-subtitle">We'll match you with mentors, programmes, and partners.</p>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="cofounderName">Cofounder Name</label>
              <input type="text" id="cofounderName" name="cofounderName" placeholder="e.g. Jane Lim" value={form.cofounderName} onChange={handleChange} required />
              {errors.cofounderName && <span className="field-error visible">{errors.cofounderName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="startupName">Startup Name</label>
              <input type="text" id="startupName" name="startupName" placeholder="e.g. PayEase" value={form.startupName} onChange={handleChange} required />
              {errors.startupName && <span className="field-error visible">{errors.startupName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="industry">Industry</label>
              <select id="industry" name="industry" value={form.industry} onChange={handleChange} required>
                <option value="">Select industry…</option>
                <option value="fintech">Fintech</option>
                <option value="healthtech">Healthtech</option>
                <option value="edtech">Edtech</option>
                <option value="agritech">Agritech</option>
                <option value="other">Other</option>
              </select>
              {errors.industry && <span className="field-error visible">{errors.industry}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="stage">Stage</label>
              <select id="stage" name="stage" value={form.stage} onChange={handleChange} required>
                <option value="">Select stage…</option>
                <option value="pre-seed">Pre-seed</option>
                <option value="seed">Seed</option>
                <option value="series-a">Series A</option>
                <option value="series-b">Series B+</option>
              </select>
              {errors.stage && <span className="field-error visible">{errors.stage}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="problem">Problem Being Solved</label>
              <textarea id="problem" name="problem" rows={4} placeholder="Describe the problem your startup solves…" value={form.problem} onChange={handleChange} required />
              {errors.problem && <span className="field-error visible">{errors.problem}</span>}
            </div>

            <div className="form-group">
              <label>What help do you need?</label>
              <div className="checkbox-group">
                {NEEDS_OPTIONS.map(opt => (
                  <label key={opt} className="checkbox-label">
                    <input type="checkbox" value={opt} checked={form.needs.includes(opt)} onChange={handleCheckbox} />
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {submitError && <p className="field-error visible">{submitError}</p>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Processing…' : 'Find My Matches'}
            </button>
          </form>
        </div>
      </main>
      <LoadingOverlay visible={loading} message="Finding your best matches…" sub="Analysing mentors, programmes, and partners" />
    </>
  )
}
