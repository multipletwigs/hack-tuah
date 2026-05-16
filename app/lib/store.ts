import { db } from './firebase'
import type { Linkage, Initiative, PartnerRecord } from './types'

function tsToISO(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && 'toDate' in (val as object))
    return (val as { toDate(): Date }).toDate().toISOString()
  return String(val)
}

export interface StartupDoc {
  startup_id: string
  cofounder_name: string
  startup_name: string
  industry: string
  stage: string
  problem: string
  needs: string[]
  created_at: string
}

export interface LinkageDoc {
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
  initiative_cycle: string | null
  created_at: string
  outcome: string | null
}

export interface PartnerDoc {
  partner_id: string
  org_name: string
  contact_name: string
  contact_email: string
  partner_type: string
  industry: string
  status: string
  created_at: string
}

export interface InitiativeDoc {
  initiative_id: string
  name: string
  type: string
  description: string
  focus_industries: string[]
  funding_amount: number | null
  next_intake: string | null
  status: string
  created_at: string
}

export const store = {
  // --- Startups ---
  async saveStartup(id: string, doc: StartupDoc) {
    await db.collection('startups').doc(id).set(doc)
  },

  async getStartup(id: string): Promise<StartupDoc | null> {
    const snap = await db.collection('startups').doc(id).get()
    if (!snap.exists) return null
    const d = snap.data() as StartupDoc
    return { ...d, created_at: tsToISO(d.created_at) }
  },

  async getAllStartups(): Promise<StartupDoc[]> {
    const snap = await db.collection('startups').get()
    return snap.docs.map(d => { const s = d.data() as StartupDoc; return { ...s, created_at: tsToISO(s.created_at) } })
  },

  // --- Linkages ---
  async saveLinkage(doc: LinkageDoc) {
    await db.collection('linkages').doc(doc.linkage_id).set(doc)
  },

  async getLinkage(id: string): Promise<LinkageDoc | null> {
    const snap = await db.collection('linkages').doc(id).get()
    return snap.exists ? (snap.data() as LinkageDoc) : null
  },

  async getAllLinkages(): Promise<LinkageDoc[]> {
    const snap = await db.collection('linkages').get()
    return snap.docs.map(d => d.data() as LinkageDoc)
  },

  async updateLinkage(id: string, updates: Partial<LinkageDoc>): Promise<LinkageDoc | null> {
    const ref = db.collection('linkages').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return null
    await ref.update(updates as Record<string, unknown>)
    const updated = await ref.get()
    return updated.data() as LinkageDoc
  },

  // --- Partners ---
  async savePartner(id: string, doc: PartnerDoc) {
    await db.collection('partners').doc(id).set(doc)
  },

  async getPartner(id: string): Promise<PartnerDoc | null> {
    const snap = await db.collection('partners').doc(id).get()
    return snap.exists ? (snap.data() as PartnerDoc) : null
  },

  async getAllPartners(): Promise<PartnerDoc[]> {
    const snap = await db.collection('partners').get()
    return snap.docs.map(d => d.data() as PartnerDoc)
  },

  async deletePartner(id: string): Promise<boolean> {
    const ref = db.collection('partners').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return false
    await ref.delete()
    return true
  },

  // --- Initiatives ---
  async saveInitiative(id: string, doc: InitiativeDoc) {
    await db.collection('initiatives').doc(id).set(doc)
  },

  async getInitiative(id: string): Promise<InitiativeDoc | null> {
    const snap = await db.collection('initiatives').doc(id).get()
    return snap.exists ? (snap.data() as InitiativeDoc) : null
  },

  async getAllInitiatives(): Promise<InitiativeDoc[]> {
    const snap = await db.collection('initiatives').get()
    return snap.docs.map(d => d.data() as InitiativeDoc)
  },
}

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
    initiativeCycle: doc.initiative_cycle,
    createdAt: tsToISO(doc.created_at),
    outcome: doc.outcome,
  }
}

export function docToPartnerRecord(doc: PartnerDoc | null): PartnerRecord | null {
  if (!doc) return null
  return {
    partnerId: doc.partner_id,
    orgName: doc.org_name,
    contactName: doc.contact_name,
    contactEmail: doc.contact_email,
    partnerType: doc.partner_type as PartnerRecord['partnerType'],
    industry: doc.industry,
    status: doc.status as PartnerRecord['status'],
    createdAt: tsToISO(doc.created_at),
  }
}

export function docToInitiative(doc: InitiativeDoc | null): Initiative | null {
  if (!doc) return null
  return {
    initiativeId: doc.initiative_id,
    name: doc.name,
    type: doc.type as Initiative['type'],
    description: doc.description ?? '',
    focusIndustries: doc.focus_industries,
    fundingAmount: doc.funding_amount,
    nextIntake: doc.next_intake,
    status: doc.status as Initiative['status'],
    createdAt: tsToISO(doc.created_at),
  }
}
