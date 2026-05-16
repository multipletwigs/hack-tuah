// In-memory store — process-level singleton, mirrors the Python StubStore.
// Swap out for Firestore by replacing the methods below.

import type { Linkage, Initiative, PartnerRecord } from './types'

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

interface PartnerDoc {
  partner_id: string
  org_name: string
  contact_name: string
  contact_email: string
  partner_type: string
  industry: string
  status: string
  created_at: string
}

interface InitiativeDoc {
  initiative_id: string
  name: string
  type: string
  focus_industries: string[]
  funding_amount: number | null
  next_intake: string | null
  status: string
  created_at: string
}

function defaultStartups(): Record<string, StartupDoc> {
  const now = new Date().toISOString()
  const rows: StartupDoc[] = [
    { startup_id: 'startup_001', cofounder_name: 'Ahmad Farhan', startup_name: 'PayEase',   industry: 'fintech',    stage: 'seed',     problem: 'Cross-border SME payments are slow and expensive.',      needs: ['mentorship', 'funding', 'pilot partners'], created_at: now },
    { startup_id: 'startup_002', cofounder_name: 'Dr. Mei Ling', startup_name: 'MediTrack', industry: 'healthtech', stage: 'series-a', problem: 'Patient records are siloed across healthcare providers.', needs: ['funding', 'pilot partners'],               created_at: now },
    { startup_id: 'startup_003', cofounder_name: 'Raj Kumar',    startup_name: 'EduSync',   industry: 'edtech',     stage: 'pre-seed', problem: 'Personalized learning is inaccessible to most students.', needs: ['mentorship', 'networking'],              created_at: now },
    { startup_id: 'startup_004', cofounder_name: 'Nurul Ain',    startup_name: 'FarmTrace', industry: 'agritech',   stage: 'seed',     problem: 'Smallholder supply chains lack traceability.',           needs: ['mentorship', 'pilot partners'],           created_at: now },
  ]
  return Object.fromEntries(rows.map(r => [r.startup_id, r]))
}

function defaultPartners(): Record<string, PartnerDoc> {
  const now = new Date().toISOString()
  const rows: PartnerDoc[] = [
    { partner_id: 'partner_001', org_name: 'Mastercard',         contact_name: 'Mastercard Team',    contact_email: 'partnerships@mastercard.com', partner_type: 'corporate',        industry: 'fintech',         status: 'active', created_at: now },
    { partner_id: 'partner_002', org_name: 'Openspace Ventures', contact_name: 'Openspace Team',     contact_email: 'info@openspace.vc',           partner_type: 'investor',         industry: 'fintech/healthtech', status: 'active', created_at: now },
    { partner_id: 'partner_003', org_name: 'Wong & Partners',    contact_name: 'Wong & Partners Team', contact_email: 'info@wongpartners.com',     partner_type: 'service_provider', industry: 'legal',           status: 'active', created_at: now },
    { partner_id: 'partner_004', org_name: 'CIMB Bank',          contact_name: 'CIMB Team',          contact_email: 'partnerships@cimb.com',       partner_type: 'corporate',        industry: 'banking',         status: 'active', created_at: now },
    { partner_id: 'partner_005', org_name: 'Iterative',          contact_name: 'Iterative Team',     contact_email: 'hello@iterative.vc',          partner_type: 'investor',         industry: 'B2B SaaS',        status: 'active', created_at: now },
    { partner_id: 'partner_006', org_name: 'AWS Activate',       contact_name: 'AWS Team',           contact_email: 'activate@amazon.com',         partner_type: 'service_provider', industry: 'cloud',           status: 'active', created_at: now },
    { partner_id: 'mentor_001',  org_name: 'Ahmad Razif',        contact_name: 'Ahmad Razif',        contact_email: 'ahmad.razif@mentor.com',      partner_type: 'mentor',           industry: 'fintech',         status: 'active', created_at: now },
    { partner_id: 'mentor_002',  org_name: 'Priya Nair',         contact_name: 'Priya Nair',         contact_email: 'priya.nair@mentor.com',       partner_type: 'mentor',           industry: 'B2B SaaS',        status: 'active', created_at: now },
    { partner_id: 'mentor_003',  org_name: 'David Tan',          contact_name: 'David Tan',          contact_email: 'david.tan@mentor.com',        partner_type: 'mentor',           industry: 'payments',        status: 'active', created_at: now },
  ]
  return Object.fromEntries(rows.map(r => [r.partner_id, r]))
}

function defaultInitiatives(): Record<string, InitiativeDoc> {
  const now = new Date().toISOString()
  const rows: InitiativeDoc[] = [
    { initiative_id: 'init_001', name: 'CIP Accelerate',        type: 'accelerator', focus_industries: ['fintech','healthtech','edtech','agritech'], funding_amount: 500000, next_intake: 'Q3 2026', status: 'active',   created_at: now },
    { initiative_id: 'init_002', name: 'GAIN Grant',             type: 'grant',       focus_industries: ['fintech','saas','deep tech'],              funding_amount: 150000, next_intake: 'Q2 2026', status: 'active',   created_at: now },
    { initiative_id: 'init_003', name: 'Tech Startup Catalyst', type: 'incubator',   focus_industries: ['saas','edtech','healthtech'],              funding_amount: 250000, next_intake: 'Q4 2026', status: 'active',   created_at: now },
  ]
  return Object.fromEntries(rows.map(r => [r.initiative_id, r]))
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
  private startups: Record<string, StartupDoc> = defaultStartups()
  private linkages: Record<string, LinkageDoc> = defaultLinkages()
  private partners: Record<string, PartnerDoc> = defaultPartners()
  private initiatives: Record<string, InitiativeDoc> = defaultInitiatives()

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

  savePartner(id: string, doc: PartnerDoc) {
    this.partners[id] = doc
  }

  getPartner(id: string): PartnerDoc | null {
    return this.partners[id] ?? null
  }

  getAllPartners(): PartnerDoc[] {
    return Object.values(this.partners)
  }

  getAllInitiatives(): InitiativeDoc[] {
    return Object.values(this.initiatives)
  }

  getInitiative(id: string): InitiativeDoc | null {
    return this.initiatives[id] ?? null
  }

  saveInitiative(id: string, doc: InitiativeDoc) {
    this.initiatives[id] = doc
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

export function docToPartnerRecord(doc: ReturnType<InMemoryStore['getPartner']>): PartnerRecord | null {
  if (!doc) return null
  return {
    partnerId: doc.partner_id,
    orgName: doc.org_name,
    contactName: doc.contact_name,
    contactEmail: doc.contact_email,
    partnerType: doc.partner_type as PartnerRecord['partnerType'],
    industry: doc.industry,
    status: doc.status as PartnerRecord['status'],
    createdAt: doc.created_at,
  }
}

export function docToInitiative(doc: ReturnType<InMemoryStore['getInitiative']>): Initiative | null {
  if (!doc) return null
  return {
    initiativeId: doc.initiative_id,
    name: doc.name,
    type: doc.type as Initiative['type'],
    focusIndustries: doc.focus_industries,
    fundingAmount: doc.funding_amount,
    nextIntake: doc.next_intake,
    status: doc.status as Initiative['status'],
    createdAt: doc.created_at,
  }
}
