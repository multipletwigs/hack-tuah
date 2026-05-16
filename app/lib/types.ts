export type ActorType = 'mentor' | 'programme' | 'partner'

export interface Initiative {
  initiativeId: string
  name: string
  type: 'accelerator' | 'grant' | 'incubator' | 'programme' | 'challenge'
  focusIndustries: string[]
  fundingAmount: number | null
  nextIntake: string | null
  status: 'active' | 'upcoming' | 'closed'
  createdAt: string
}

export interface PartnerRecord {
  partnerId: string
  orgName: string
  contactName: string
  contactEmail: string
  partnerType: PartnerType | 'mentor'
  industry: string
  status: 'active' | 'pending_review'
  createdAt: string
}
export type PartnerType = 'corporate' | 'investor' | 'service_provider'

export interface StartupProfile {
  cofounderName: string
  startupName: string
  industry: string
  stage: string
  problem: string
  needs: string[]
}

export interface MatchResult {
  actorId: string
  actorName: string
  actorType: ActorType
  partnerType: PartnerType | null
  matchScore: number
  matchReason: string
}

export interface MatchResponse {
  mentors: MatchResult[]
  programmes: MatchResult[]
  corporatePartners: MatchResult[]
  investors: MatchResult[]
  serviceProviders: MatchResult[]
}

export interface LinkageCreate {
  startupId: string
  startupName: string
  actorType: ActorType
  partnerType: PartnerType | null
  actorId: string
  actorName: string
  matchScore: number
  matchReason: string
}

export interface Linkage {
  linkageId: string
  startupId: string
  startupName: string
  actorType: ActorType
  partnerType: PartnerType | null
  actorId: string
  actorName: string
  matchScore: number
  matchReason: string
  status: 'active' | 'pending' | 'closed'
  programmeCycle: string | null
  createdAt: string
  outcome: string | null
}
