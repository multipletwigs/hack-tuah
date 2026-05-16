'use client'

import { useState } from 'react'
import type { ActorType, PartnerType } from '@/app/lib/types'

interface Props {
  actorId: string
  actorName: string
  actorType: ActorType
  partnerType: PartnerType | null
  matchScore: number
  matchReason: string
  metaLine: string
  onConfirm: () => Promise<void>
}

function scoreClass(score: number) {
  if (score >= 85) return 'score-high'
  if (score >= 70) return 'score-mid'
  return 'score-low'
}

function tagClass(actorType: ActorType, partnerType: PartnerType | null) {
  if (actorType === 'mentor') return 'tag-mentor'
  if (actorType === 'programme') return 'tag-programme'
  if (partnerType === 'corporate') return 'tag-corporate'
  if (partnerType === 'investor') return 'tag-investor'
  if (partnerType === 'service_provider') return 'tag-service'
  return 'tag-corporate'
}

function tagLabel(actorType: ActorType, partnerType: PartnerType | null) {
  if (actorType === 'mentor') return 'Mentor'
  if (actorType === 'programme') return 'Programme'
  if (partnerType === 'corporate') return 'Corporate'
  if (partnerType === 'investor') return 'Investor'
  if (partnerType === 'service_provider') return 'Service Provider'
  return 'Partner'
}

export default function MatchCard({ actorName, actorType, partnerType, matchScore, matchReason, metaLine, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      setConfirmed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm linkage')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="match-card">
      <div className="card-header">
        <div>
          <h3 className="card-name">{actorName}</h3>
          <span className={`actor-tag ${tagClass(actorType, partnerType)}`}>
            {tagLabel(actorType, partnerType)}
          </span>
        </div>
        <span className={`score-badge ${scoreClass(matchScore)}`}>{matchScore}%</span>
      </div>
      <p className="card-meta">{metaLine}</p>
      <p className="match-reason">"{matchReason}"</p>
      {error && <p className="field-error visible">{error}</p>}
      <button
        className={`btn btn-full ${confirmed ? 'btn-confirmed' : 'btn-primary'}`}
        onClick={handleConfirm}
        disabled={confirmed || loading}
        type="button"
      >
        {confirmed ? 'Linked ✓' : loading ? 'Confirming…' : 'Confirm Linkage'}
      </button>
    </div>
  )
}
