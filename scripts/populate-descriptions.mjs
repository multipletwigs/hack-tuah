/**
 * Populate short_description for all existing actors in Firestore.
 * Run: node scripts/populate-descriptions.mjs
 * Safe: only sets short_description; does not overwrite other fields.
 */

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '')
  process.env[key] = val
}

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = admin.firestore()

// ─── Curated descriptions keyed by doc ID ──────────────────────────────────

const STARTUP_DESC = {
  startup_001: `PayEase simplifies cross-border SME payments for Malaysian exporters — faster, cheaper, and fully transparent FX transfers.`,
  startup_002: `MediTrack unifies patient health records across hospitals and clinics, eliminating duplicate tests and speeding up diagnosis.`,
  startup_003: `EduSync delivers AI-personalised learning to rural Malaysian students through low-bandwidth-friendly mobile experiences.`,
  startup_004: `FarmTrace gives smallholder farmers end-to-end supply chain traceability, unlocking premium pricing through verified provenance.`,
  startup_005: `LogiQ optimises last-mile delivery for East Malaysian e-commerce SMEs, cutting logistics costs by up to 40%.`,
  startup_006: `GreenWatt provides affordable IoT-based energy monitoring for industrial SMEs, helping them cut consumption and carbon footprint.`,
  startup_007: `PropSense automates property valuations in Malaysia using real-time market data and AI, reducing appraisal time from weeks to hours.`,
  startup_008: `CareCircle is a coordinated care platform for family caregivers of elderly patients, enabling remote monitoring and team communication.`,
  startup_009: `SupplyMesh provides invoice financing infrastructure for SME suppliers in automotive and electronics, slashing 90-day payment waits.`,
  startup_010: `SkillBridge matches TVET graduates to industry job requirements using competency mapping and employer-verified skill profiles.`,
}

const PARTNER_DESC = {
  // Corporate
  corporate_001: `Mastercard partners with fintech startups through its Start Path programme, offering API access, co-marketing, and global network introductions.`,
  corporate_002: `CIMB Bank provides startups with banking sandbox access, API integration support, and co-development pilots for regulated financial products.`,
  corporate_003: `Tenaga Nasional Berhad (TNB) collaborates with cleantech startups seeking to pilot energy-efficiency and sustainability solutions across its industrial network.`,
  corporate_004: `Axiata Digital invests in and partners with fintech and telco startups to scale mobile financial services across Southeast Asia.`,
  corporate_005: `Sime Darby Berhad runs a corporate venture unit focused on agritech, logistics, and industrial automation startups that can pilot at scale.`,
  corporate_006: `Maxis Labs partners with healthtech and telco startups to co-develop connected health and smart city solutions on its 5G network.`,
  corporate_007: `Malaysia Airports runs an innovation hub that pilots proptech and logtech solutions across its airport ecosystem and retail properties.`,
  corporate_008: `Pos Malaysia's digital business unit seeks logtech and e-commerce solutions to modernise its last-mile delivery and parcel network.`,
  corporate_009: `Petronas Digital partners with cleantech, AI, and energy-tech startups to improve operational efficiency and sustainability in its facilities.`,
  corporate_010: `IHH Healthcare Malaysia's innovation office pilots digital health and medtech solutions across its private hospital network in Malaysia.`,

  // Investor
  investor_001: `Openspace Ventures is a Southeast Asia-focused VC investing $500K-$3M in B2B tech with strong unit economics, including fintech, healthtech, and logistics.`,
  investor_002: `Iterative is an early-stage VC backing pre-seed and seed B2B software founders in Southeast Asia with $150K-$500K tickets.`,
  investor_003: `Vertex Ventures SEA backs fintech and edtech startups from seed to Series A, with a focus on platform businesses that scale across ASEAN.`,
  investor_004: `Gobi Partners is a pan-Asian VC with a Malaysian office, investing in deeptech and fintech startups with cross-border growth potential.`,
  investor_005: `MAVCAP is Malaysia's national venture fund backing deeptech, AI, and cleantech startups with patient capital and government co-investment.`,
  investor_006: `Fatfish Group is a listed venture builder investing in edtech and proptech startups, providing capital plus operational support.`,
  investor_007: `KK Fund backs early-stage logtech and agritech startups in Southeast Asia, writing first checks into founders with strong domain expertise.`,
  investor_008: `TNB Ventures is the corporate VC arm of Tenaga Nasional, backing cleantech and energy startups that can be piloted within TNB's operations.`,
  investor_009: `RHL Ventures focuses on Series A-ready fintech and healthtech companies in Malaysia, leveraging its network of GLCs and large enterprise partners.`,
  investor_010: `Kejora-InterVest is a growth-stage VC backing B2B SaaS and logtech companies in SEA with ticket sizes from $500K to $5M.`,

  // Service Provider
  service_001: `Wong & Partners is a leading Malaysian law firm offering startups discounted legal services including incorporation, term sheet review, and IP filing.`,
  service_002: `AWS Activate provides startups with up to $100K in cloud credits, technical support, and access to AWS's global startup training and marketplace.`,
  service_003: `KPMG Malaysia's startup practice offers tax advisory, financial modelling, and audit services tailored to early-stage and growth-stage ventures.`,
  service_004: `Deloitte Digital Malaysia provides startups with strategy consulting, digital transformation advisory, and enterprise partnership introductions.`,
  service_005: `Google Cloud for Startups offers cloud credits, AI/ML tooling, and technical mentorship to help startups scale on GCP infrastructure.`,
  service_006: `Zaid Ibrahim & Co. is a top Malaysian IP and corporate law firm providing startups with trademark filing, regulatory advisory, and M&A support.`,
  service_007: `PwC Malaysia's Scale programme helps growth-stage startups with financial reporting, investor readiness, and cross-border expansion planning.`,
  service_008: `Microsoft for Startups Founders Hub provides Azure credits, GitHub access, and enterprise customer introductions for SaaS and AI startups.`,
  service_009: `Stripe Malaysia offers best-in-class payments infrastructure for startups, with developer-friendly APIs and startup-specific pricing.`,
  service_010: `Telkom DDB Malaysia provides technology consulting, system integration, and digital transformation support for startups working with enterprise clients.`,

  // Mentor
  mentor_001: `Ex-VP at Maybank with 15 years building cross-border payment products and leading digital banking initiatives across Southeast Asia.`,
  mentor_002: `Former Product Director at Salesforce APAC who scaled two B2B SaaS products from zero to $1M ARR in Malaysia and Singapore.`,
  mentor_003: `Ex-Head of Payments at RHB Bank with deep expertise in BNM regulations, licensed e-money operators, and regulated payments infrastructure.`,
  mentor_004: `Former Ministry of Health digital health lead with clinical workflow experience and a track record in Malaysian public healthcare IT projects.`,
  mentor_005: `Serial edtech founder who built and exited two companies focused on digital access in rural Malaysian schools and TVET institutions.`,
  mentor_006: `Ex-Felda agronomist turned agritech operator, with hands-on experience commercialising precision farming tools across Malaysian smallholder networks.`,
  mentor_007: `Sustainability consultant and former TNB engineer specialising in cleantech adoption, carbon accounting, and industrial energy efficiency for SMEs.`,
  mentor_008: `Operations and supply chain expert who scaled last-mile logistics for two East Malaysian e-commerce platforms from launch to Series A.`,
  mentor_009: `PropTech advisor with 12 years in Malaysian real estate, helping startups navigate developer partnerships, NAPIC data, and digital valuation rollouts.`,
  mentor_010: `AI researcher and deeptech operator with publications in NLP and computer vision, and experience commercialising AI products for the Malaysian market.`,
}

const INITIATIVE_DESC = {
  init_001: `Cradle's flagship seed-stage accelerator offering RM 500K funding, mentorship, lab access, and investor introductions for high-potential Malaysian startups.`,
  init_002: `Non-dilutive commercialisation grant of RM 150K for early-stage Malaysian startups, with quarterly milestone reviews by Cradle's investment committee.`,
  init_003: `Six-month incubator providing technical mentorship, market access workshops, regulatory guidance, and demo day readiness for pre-seed to Series A startups.`,
  init_004: `MDEC programme helping Malaysian tech startups expand into ASEAN markets through corporate partnerships and go-to-market support, with RM 300K in funding.`,
  init_005: `TNB and Cradle open innovation challenge seeking cleantech and energy-efficiency solutions, awarding RM 200K to winners selected for pilot deployment.`,
  init_006: `KKM and Cradle co-funded RM 180K grant for digital health startups improving public healthcare access and patient outcomes across Malaysia.`,
  init_007: `Twelve-week structured agritech programme connecting startups with Felda and Sime Darby for paid pilot deployments and commercialisation pathways.`,
  init_008: `Twelve-month deeptech incubator providing RM 400K funding, MIMOS lab access, and PETRONAS technical mentors for AI, quantum, and advanced materials startups.`,
  init_009: `BNM-Cradle regulatory sandbox allowing fintech startups to test regulated financial products with live Malaysian users in a risk-controlled environment.`,
  init_010: `Co-funding programme of RM 120K for startups building productivity and digitalisation tools specifically targeting Malaysian SMEs in manufacturing and retail.`,
}

// ─── Patch function ──────────────────────────────────────────────────────────

async function patchDescriptions(collectionName, descMap, fieldName) {
  const col = db.collection(collectionName)
  const snap = await col.get()
  console.log(`\n${collectionName}: ${snap.size} docs found`)

  let updated = 0
  let skipped = 0
  let unknown = 0

  for (const doc of snap.docs) {
    const data = doc.data()
    const existingDesc = data[fieldName]

    if (existingDesc && existingDesc.trim().length > 0) {
      skipped++
      continue
    }

    const desc = descMap[doc.id]
    if (!desc) {
      const fallback = buildFallback(collectionName, data)
      if (fallback) {
        await doc.ref.update({ [fieldName]: fallback })
        console.log(`  [fallback] ${doc.id}: ${fallback.slice(0, 70)}...`)
        updated++
      } else {
        console.log(`  [unknown]  ${doc.id} — no description available`)
        unknown++
      }
      continue
    }

    await doc.ref.update({ [fieldName]: desc })
    console.log(`  [ok] ${doc.id}`)
    updated++
  }

  console.log(`  => ${updated} updated, ${skipped} already had description, ${unknown} unknown`)
}

function buildFallback(collection, data) {
  if (collection === 'startups') {
    const { startup_name, industry, stage, problem } = data
    if (startup_name && problem) {
      return `${startup_name} is a ${stage ?? ''} ${industry ?? ''} startup. ${problem}`.replace(/\s+/g, ' ').trim()
    }
  }
  if (collection === 'partners') {
    const { org_name, partner_type, industry } = data
    if (org_name && partner_type) {
      const typeLabel = partner_type === 'service_provider' ? 'service provider' : partner_type
      return `${org_name} is a ${typeLabel} focused on ${industry || 'technology'} supporting Malaysian startups.`
    }
  }
  if (collection === 'initiatives') {
    const { name, type, focus_industries } = data
    if (name) {
      return `${name} is a Cradle ${type ?? 'initiative'} supporting startups in ${(focus_industries ?? []).join(', ')}.`
    }
  }
  return null
}

async function main() {
  console.log(`Connecting to Firestore: ${process.env.FIREBASE_PROJECT_ID}`)
  await patchDescriptions('startups',    STARTUP_DESC,    'short_description')
  await patchDescriptions('partners',    PARTNER_DESC,    'short_description')
  await patchDescriptions('initiatives', INITIATIVE_DESC, 'description')
  console.log('\nDone.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
