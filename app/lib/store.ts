// In-memory store — process-level singleton, mirrors the Python StubStore.
// Swap out for Firestore by replacing the methods below.

import type { Linkage } from './types'

interface StartupDoc {
  startup_id: string
  cofounder_name: string
  startup_name: string
  industry: string
  stage: string
  problem: string
  needs: string[]
  created_at: string
}

interface LinkageDoc {
  linkage_id: string
  startup_id: string
  startup_name: string
  actor_type: string
  partner_type: string | null
  actor_id: string
  actor_name: string
  match_score: number
  match_reason: string
  status: string
  programme_cycle: string | null
  created_at: string
  outcome: string | null
}

function defaultLinkages(): Record<string, LinkageDoc> {
  const now = new Date().toISOString()
  const rows: LinkageDoc[] = [
    { linkage_id: 'lnk_20260516_001', startup_id: 'startup_001', startup_name: 'PayEase',   actor_type: 'mentor',    partner_type: null,               actor_id: 'mentor_001',  actor_name: 'Ahmad Razif',        match_score: 92, match_reason: 'Fintech expertise at seed stage.',        status: 'active',  programme_cycle: null,       created_at: now, outcome: null },
    { linkage_id: 'lnk_20260516_002', startup_id: 'startup_001', startup_name: 'PayEase',   actor_type: 'programme', partner_type: null,               actor_id: 'prog_001',    actor_name: 'CIP Accelerate',     match_score: 90, match_reason: 'Targets fintech seed-stage startups.',    status: 'active',  programme_cycle: 'Q3 2026',  created_at: now, outcome: null },
    { linkage_id: 'lnk_20260516_003', startup_id: 'startup_001', startup_name: 'PayEase',   actor_type: 'partner',   partner_type: 'corporate',        actor_id: 'partner_001', actor_name: 'Mastercard',         match_score: 88, match_reason: 'Fintech pilot programme.',                status: 'pending', programme_cycle: null,       created_at: now, outcome: null },
    { linkage_id: 'lnk_20260516_004', startup_id: 'startup_001', startup_name: 'PayEase',   actor_type: 'partner',   partner_type: 'investor',         actor_id: 'partner_002', actor_name: 'Openspace Ventures', match_score: 86, match_reason: 'B2B tech SEA focus.',                    status: 'active',  programme_cycle: null,       created_at: now, outcome: null },
    { linkage_id: 'lnk_20260516_005', startup_id: 'startup_001', startup_name: 'PayEase',   actor_type: 'partner',   partner_type: 'service_provider', actor_id: 'partner_003', actor_name: 'Wong & Partners',    match_score: 83, match_reason: 'Fintech legal specialists.',              status: 'active',  programme_cycle: null,       created_at: now, outcome: null },
    { linkage_id: 'lnk_20260515_001', startup_id: 'startup_002', startup_name: 'MediTrack', actor_type: 'mentor',    partner_type: null,               actor_id: 'mentor_002',  actor_name: 'Priya Nair',         match_score: 85, match_reason: 'B2B SaaS GTM experience.',               status: 'active',  programme_cycle: null,       created_at: now, outcome: null },
    { linkage_id: 'lnk_20260514_001', startup_id: 'startup_002', startup_name: 'MediTrack', actor_type: 'programme', partner_type: null,               actor_id: 'prog_002',    actor_name: 'GAIN Grant',         match_score: 76, match_reason: 'Commercialisation grant match.',          status: 'closed',  programme_cycle: null,       created_at: now, outcome: 'Not selected' },
  ]
  return Object.fromEntries(rows.map(r => [r.linkage_id, r]))
}

class InMemoryStore {
  private startups: Record<string, StartupDoc> = {}
  private linkages: Record<string, LinkageDoc> = defaultLinkages()
  private partners: Record<string, object> = {}

  saveStartup(id: string, doc: StartupDoc) {
    this.startups[id] = doc
  }

  getStartup(id: string): StartupDoc | null {
    return this.startups[id] ?? null
  }

  getAllStartups(): StartupDoc[] {
    return Object.values(this.startups)
  }

  saveLinkage(doc: LinkageDoc) {
    this.linkages[doc.linkage_id] = doc
  }

  getLinkage(id: string): LinkageDoc | null {
    return this.linkages[id] ?? null
  }

  getAllLinkages(): LinkageDoc[] {
    return Object.values(this.linkages)
  }

  updateLinkage(id: string, updates: Partial<LinkageDoc>): LinkageDoc | null {
    if (!this.linkages[id]) return null
    this.linkages[id] = { ...this.linkages[id], ...updates }
    return this.linkages[id]
  }

  savePartner(id: string, doc: object) {
    this.partners[id] = doc
  }
}

// Module-level singleton — persists across requests in dev/prod
const globalStore = globalThis as typeof globalThis & { __store?: InMemoryStore }
if (!globalStore.__store) globalStore.__store = new InMemoryStore()

export const store = globalStore.__store

export function docToLinkage(doc: LinkageDoc): Linkage {
  return {
    linkageId: doc.linkage_id,
    startupId: doc.startup_id,
    startupName: doc.startup_name,
    actorType: doc.actor_type as Linkage['actorType'],
    partnerType: doc.partner_type as Linkage['partnerType'],
    actorId: doc.actor_id,
    actorName: doc.actor_name,
    matchScore: doc.match_score,
    matchReason: doc.match_reason,
    status: doc.status as Linkage['status'],
    programmeCycle: doc.programme_cycle,
    createdAt: doc.created_at,
    outcome: doc.outcome,
  }
}
