import type { Linkage, ActorType, PartnerType } from '@/app/lib/types'
import StatusBadge from './StatusBadge'

interface Props {
  linkages: Linkage[]
}

function scoreClass(score: number) {
  if (score >= 85) return 'score-high'
  if (score >= 70) return 'score-mid'
  return 'score-low'
}

function actorTagClass(t: ActorType) {
  if (t === 'startup') return 'tag-startup'
  if (t === 'mentor') return 'tag-mentor'
  if (t === 'initiative' || String(t) === 'programme') return 'tag-programme'
  return 'tag-corporate'
}

function actorLabel(t: ActorType) {
  if (String(t) === 'programme') return 'Initiative'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function partnerTagClass(t: PartnerType) {
  if (t === 'corporate') return 'tag-corporate'
  if (t === 'investor') return 'tag-investor'
  return 'tag-service'
}

function partnerLabel(t: PartnerType) {
  if (t === 'corporate') return 'Corporate'
  if (t === 'investor') return 'Investor'
  return 'Service Provider'
}

export default function LinkageTable({ linkages }: Props) {
  return (
    <section className="table-section">
      <table className="linkage-table">
        <thead>
          <tr>
            <th>Source</th><th>Source Type</th><th>Target Type</th><th>Partner Type</th>
            <th>Target Name</th><th>Match Score</th><th>Status</th>
            <th>Date</th><th>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {linkages.map(row => (
            <tr key={row.linkageId}>
              <td>{row.sourceName}</td>
              <td>
                <span className={`actor-tag ${actorTagClass(row.sourceType)}`}>
                  {actorLabel(row.sourceType)}
                </span>
              </td>
              <td>
                <span className={`actor-tag ${actorTagClass(row.actorType)}`}>
                  {actorLabel(row.actorType)}
                </span>
              </td>
              <td>
                {row.partnerType
                  ? <span className={`actor-tag ${partnerTagClass(row.partnerType)}`}>{partnerLabel(row.partnerType)}</span>
                  : <span className="text-muted">—</span>
                }
              </td>
              <td>{row.actorName}</td>
              <td><span className={`score-badge ${scoreClass(row.matchScore)}`}>{row.matchScore}%</span></td>
              <td><StatusBadge status={row.status} /></td>
              <td>{row.createdAt.slice(0, 10)}</td>
              <td>{row.outcome ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {linkages.length === 0 && (
        <div className="empty-state">No linkages match your filters.</div>
      )}
    </section>
  )
}
