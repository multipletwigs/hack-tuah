'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/app/components/Nav'
import LoadingOverlay from '@/app/components/LoadingOverlay'

export default function StaffLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function validate() {
    const e: { email?: string; password?: string } = {}
    if (!email.includes('@')) e.email = 'A valid email is required.'
    if (!password.trim()) e.password = 'This field is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.push('/admin')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Nav />
      <main className="container">
        <button className="back-btn" onClick={() => router.push('/')} type="button">← Back</button>
        <div className="card form-card">
          <div className="form-type-badge"><span className="actor-tag tag-cradle">Cradle Staff</span></div>
          <h1 className="page-title">Staff Login</h1>
          <p className="page-subtitle">Access is restricted to Cradle programme and ecosystem administrators.</p>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" placeholder="you@cradle.com.my" value={email} onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })) }} required />
              {errors.email && <span className="field-error visible">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: undefined })) }} required />
              {errors.password && <span className="field-error visible">{errors.password}</span>}
            </div>
            {submitError && <p className="field-error visible">{submitError}</p>}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
          </form>
        </div>
      </main>
      <LoadingOverlay visible={loading} message="Logging you in…" sub="Verifying credentials" />
    </>
  )
}
