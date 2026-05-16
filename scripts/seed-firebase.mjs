
/**
 * Seed Firestore with sample data.
 * Run: node scripts/seed-firebase.mjs
 */

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local manually (no dotenv dependency needed)
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
const now = new Date().toISOString()

// ─── STARTUPS ───────────────────────────────────────────────────────────────

const startups = [
  { startup_id: 'startup_001', cofounder_name: 'Ahmad Farhan',    startup_name: 'PayEase',       industry: 'fintech',     stage: 'seed',     problem: 'Cross-border SME payments are slow, expensive, and opaque for Malaysian exporters.',          needs: ['mentorship', 'funding', 'pilot partners'],        created_at: now },
  { startup_id: 'startup_002', cofounder_name: 'Dr. Mei Ling',    startup_name: 'MediTrack',     industry: 'healthtech',  stage: 'series-a', problem: 'Patient records are siloed across hospitals and clinics, causing repeat tests and delays.',    needs: ['funding', 'pilot partners', 'regulatory advice'], created_at: now },
  { startup_id: 'startup_003', cofounder_name: 'Raj Kumar',       startup_name: 'EduSync',       industry: 'edtech',      stage: 'pre-seed', problem: 'Personalised learning is inaccessible to students in rural Malaysia.',                        needs: ['mentorship', 'networking', 'pilot partners'],     created_at: now },
  { startup_id: 'startup_004', cofounder_name: 'Nurul Ain',       startup_name: 'FarmTrace',     industry: 'agritech',    stage: 'seed',     problem: 'Smallholder farmers lack traceability tools, losing premium pricing opportunities.',           needs: ['mentorship', 'pilot partners', 'funding'],        created_at: now },
  { startup_id: 'startup_005', cofounder_name: 'Chen Wei',        startup_name: 'LogiQ',         industry: 'logtech',     stage: 'seed',     problem: 'Last-mile delivery costs for e-commerce SMEs in East Malaysia are 3x higher than Peninsular.', needs: ['funding', 'networking', 'pilot partners'],        created_at: now },
  { startup_id: 'startup_006', cofounder_name: 'Siti Rahimah',    startup_name: 'GreenWatt',     industry: 'cleantech',   stage: 'pre-seed', problem: 'Industrial SMEs have no affordable way to monitor and reduce energy consumption.',             needs: ['mentorship', 'funding', 'pilot partners'],        created_at: now },
  { startup_id: 'startup_007', cofounder_name: 'Vikram Nair',     startup_name: 'PropSense',     industry: 'proptech',    stage: 'seed',     problem: 'Property valuations in Malaysia are inconsistent and take weeks, slowing mortgage approvals.', needs: ['pilot partners', 'regulatory advice', 'funding'], created_at: now },
  { startup_id: 'startup_008', cofounder_name: 'Amirah Zulkifli', startup_name: 'CareCircle',    industry: 'healthtech',  stage: 'pre-seed', problem: 'Family caregivers of elderly patients lack coordinated tools to manage care remotely.',        needs: ['mentorship', 'networking', 'pilot partners'],     created_at: now },
  { startup_id: 'startup_009', cofounder_name: 'Jason Lim',       startup_name: 'SupplyMesh',    industry: 'fintech',     stage: 'series-a', problem: 'SME suppliers in automotive and electronics wait 90+ days for invoice payments.',             needs: ['funding', 'pilot partners', 'regulatory advice'], created_at: now },
  { startup_id: 'startup_010', cofounder_name: 'Farah Hani',      startup_name: 'SkillBridge',   industry: 'edtech',      stage: 'seed',     problem: 'TVET graduates struggle to match their skills to industry job requirements efficiently.',       needs: ['mentorship', 'pilot partners', 'networking'],     created_at: now },
]

// ─── PARTNERS ────────────────────────────────────────────────────────────────

const partners = [
  // Corporate (10)
  { partner_id: 'corporate_001', org_name: 'Mastercard Malaysia',     contact_name: 'Partnerships Team',  contact_email: 'partnerships@mastercard.com.my',   partner_type: 'corporate', industry: 'fintech',            status: 'active', created_at: now },
  { partner_id: 'corporate_002', org_name: 'CIMB Bank Berhad',        contact_name: 'Innovation Team',    contact_email: 'innovation@cimb.com',              partner_type: 'corporate', industry: 'banking',            status: 'active', created_at: now },
  { partner_id: 'corporate_003', org_name: 'Tenaga Nasional Berhad',  contact_name: 'Startup Programme',  contact_email: 'startups@tnb.com.my',              partner_type: 'corporate', industry: 'cleantech/energy',   status: 'active', created_at: now },
  { partner_id: 'corporate_004', org_name: 'Axiata Digital',          contact_name: 'BD Team',            contact_email: 'bd@axiatadigital.com',             partner_type: 'corporate', industry: 'fintech/telco',      status: 'active', created_at: now },
  { partner_id: 'corporate_005', org_name: 'Sime Darby Berhad',       contact_name: 'Corporate Ventures', contact_email: 'ventures@simedarby.com',           partner_type: 'corporate', industry: 'agritech/logistics', status: 'active', created_at: now },
  { partner_id: 'corporate_006', org_name: 'Maxis Berhad',            contact_name: 'Maxis Labs',         contact_email: 'maxislabs@maxis.com.my',           partner_type: 'corporate', industry: 'telco/healthtech',   status: 'active', created_at: now },
  { partner_id: 'corporate_007', org_name: 'Malaysia Airports',       contact_name: 'Innovation Hub',     contact_email: 'innovation@malaysiaairports.com',  partner_type: 'corporate', industry: 'logtech/proptech',   status: 'active', created_at: now },
  { partner_id: 'corporate_008', org_name: 'Pos Malaysia',            contact_name: 'Digital BD',         contact_email: 'digital@pos.com.my',               partner_type: 'corporate', industry: 'logtech',            status: 'active', created_at: now },
  { partner_id: 'corporate_009', org_name: 'Petronas Digital',        contact_name: 'Ventures Team',      contact_email: 'petronasdigital@petronas.com',     partner_type: 'corporate', industry: 'cleantech/energy',   status: 'active', created_at: now },
  { partner_id: 'corporate_010', org_name: 'IHH Healthcare Malaysia', contact_name: 'Innovation Office',  contact_email: 'innovation@ihh.com.my',            partner_type: 'corporate', industry: 'healthtech',         status: 'active', created_at: now },

  // Investor (10)
  { partner_id: 'investor_001', org_name: 'Openspace Ventures',     contact_name: 'Investment Team',  contact_email: 'info@openspace.vc',            partner_type: 'investor', industry: 'fintech/healthtech',   status: 'active', created_at: now },
  { partner_id: 'investor_002', org_name: 'Iterative',              contact_name: 'Partner Team',     contact_email: 'hello@iterative.vc',           partner_type: 'investor', industry: 'B2B SaaS',             status: 'active', created_at: now },
  { partner_id: 'investor_003', org_name: 'Vertex Ventures SEA',    contact_name: 'Deal Team',        contact_email: 'sea@vertexventures.com',       partner_type: 'investor', industry: 'fintech/edtech',       status: 'active', created_at: now },
  { partner_id: 'investor_004', org_name: 'Gobi Partners',          contact_name: 'Malaysia Office',  contact_email: 'malaysia@gobipartners.com',    partner_type: 'investor', industry: 'deeptech/fintech',     status: 'active', created_at: now },
  { partner_id: 'investor_005', org_name: 'MAVCAP',                 contact_name: 'Portfolio Team',   contact_email: 'portfolio@mavcap.com',         partner_type: 'investor', industry: 'deeptech/cleantech',   status: 'active', created_at: now },
  { partner_id: 'investor_006', org_name: 'Fatfish Group',          contact_name: 'Investment Team',  contact_email: 'invest@fatfishgroup.com',      partner_type: 'investor', industry: 'edtech/proptech',      status: 'active', created_at: now },
  { partner_id: 'investor_007', org_name: 'KK Fund',                contact_name: 'Partner Team',     contact_email: 'hello@kkfund.co',              partner_type: 'investor', industry: 'logtech/agritech',     status: 'active', created_at: now },
  { partner_id: 'investor_008', org_name: 'TNB Ventures',           contact_name: 'Ventures Team',    contact_email: 'ventures@tnb.com.my',          partner_type: 'investor', industry: 'cleantech/energy',     status: 'active', created_at: now },
  { partner_id: 'investor_009', org_name: 'RHL Ventures',           contact_name: 'Investment Team',  contact_email: 'invest@rhlventures.com',       partner_type: 'investor', industry: 'fintech/healthtech',   status: 'active', created_at: now },
  { partner_id: 'investor_010', org_name: 'Kejora-InterVest',       contact_name: 'SEA Team',         contact_email: 'sea@kejora.vc',                partner_type: 'investor', industry: 'B2B SaaS/logtech',     status: 'active', created_at: now },

  // Service Provider (10)
  { partner_id: 'service_001', org_name: 'Wong & Partners',             contact_name: 'Tech Practice',     contact_email: 'tech@wongpartners.com',          partner_type: 'service_provider', industry: 'legal',                  status: 'active', created_at: now },
  { partner_id: 'service_002', org_name: 'AWS Activate',                contact_name: 'SEA Startup Team',  contact_email: 'activate@amazon.com',            partner_type: 'service_provider', industry: 'cloud infrastructure',   status: 'active', created_at: now },
  { partner_id: 'service_003', org_name: 'KPMG Malaysia',               contact_name: 'Startup Practice',  contact_email: 'startups@kpmg.com.my',           partner_type: 'service_provider', industry: 'finance/tax',            status: 'active', created_at: now },
  { partner_id: 'service_004', org_name: 'Deloitte Digital Malaysia',   contact_name: 'Digital Team',      contact_email: 'digital@deloitte.com.my',        partner_type: 'service_provider', industry: 'consulting/digital',     status: 'active', created_at: now },
  { partner_id: 'service_005', org_name: 'Google Cloud Malaysia',       contact_name: 'Startup Programme', contact_email: 'gcp-startups@google.com',        partner_type: 'service_provider', industry: 'cloud/AI',               status: 'active', created_at: now },
  { partner_id: 'service_006', org_name: 'Zaid Ibrahim & Co.',          contact_name: 'IP Practice',       contact_email: 'ip@zico.com.my',                 partner_type: 'service_provider', industry: 'legal/IP',               status: 'active', created_at: now },
  { partner_id: 'service_007', org_name: 'PwC Malaysia',                contact_name: 'Scale Team',        contact_email: 'scale@pwc.com',                  partner_type: 'service_provider', industry: 'finance/audit',          status: 'active', created_at: now },
  { partner_id: 'service_008', org_name: 'Microsoft for Startups',      contact_name: 'Founders Hub',      contact_email: 'foundersmsia@microsoft.com',     partner_type: 'service_provider', industry: 'cloud/SaaS',             status: 'active', created_at: now },
  { partner_id: 'service_009', org_name: 'Stripe Malaysia',             contact_name: 'Startup BD',        contact_email: 'startups@stripe.com',            partner_type: 'service_provider', industry: 'payments/fintech',        status: 'active', created_at: now },
  { partner_id: 'service_010', org_name: 'Telkom DDB Malaysia',         contact_name: 'Partnership Office', contact_email: 'ddb@telkom.com.my',             partner_type: 'service_provider', industry: 'consulting/technology',  status: 'active', created_at: now },

  // Mentor (10)
  { partner_id: 'mentor_001', org_name: 'Ahmad Razif',     contact_name: 'Ahmad Razif',     contact_email: 'ahmad.razif@mentor.cradle.com.my',  partner_type: 'mentor', industry: 'fintech',         status: 'active', created_at: now },
  { partner_id: 'mentor_002', org_name: 'Priya Nair',      contact_name: 'Priya Nair',      contact_email: 'priya.nair@mentor.cradle.com.my',   partner_type: 'mentor', industry: 'B2B SaaS',        status: 'active', created_at: now },
  { partner_id: 'mentor_003', org_name: 'David Tan',       contact_name: 'David Tan',       contact_email: 'david.tan@mentor.cradle.com.my',    partner_type: 'mentor', industry: 'payments',        status: 'active', created_at: now },
  { partner_id: 'mentor_004', org_name: 'Dr. Rashid Omar', contact_name: 'Dr. Rashid Omar', contact_email: 'rashid.omar@mentor.cradle.com.my',  partner_type: 'mentor', industry: 'healthtech',      status: 'active', created_at: now },
  { partner_id: 'mentor_005', org_name: 'Lisa Cheong',     contact_name: 'Lisa Cheong',     contact_email: 'lisa.cheong@mentor.cradle.com.my',  partner_type: 'mentor', industry: 'edtech',          status: 'active', created_at: now },
  { partner_id: 'mentor_006', org_name: 'Hafiz Kamarudin', contact_name: 'Hafiz Kamarudin', contact_email: 'hafiz.k@mentor.cradle.com.my',      partner_type: 'mentor', industry: 'agritech',        status: 'active', created_at: now },
  { partner_id: 'mentor_007', org_name: 'Sunita Krishnan', contact_name: 'Sunita Krishnan', contact_email: 'sunita.k@mentor.cradle.com.my',     partner_type: 'mentor', industry: 'cleantech',       status: 'active', created_at: now },
  { partner_id: 'mentor_008', org_name: 'Raymond Yap',     contact_name: 'Raymond Yap',     contact_email: 'raymond.yap@mentor.cradle.com.my',  partner_type: 'mentor', industry: 'logtech',         status: 'active', created_at: now },
  { partner_id: 'mentor_009', org_name: 'Nabilah Ismail',  contact_name: 'Nabilah Ismail',  contact_email: 'nabilah.i@mentor.cradle.com.my',   partner_type: 'mentor', industry: 'proptech',        status: 'active', created_at: now },
  { partner_id: 'mentor_010', org_name: 'Eric Lau',        contact_name: 'Eric Lau',        contact_email: 'eric.lau@mentor.cradle.com.my',     partner_type: 'mentor', industry: 'deeptech/AI',     status: 'active', created_at: now },
]

// ─── INITIATIVES ─────────────────────────────────────────────────────────────

const initiatives = [
  { initiative_id: 'init_001', name: 'CIP Accelerate',              type: 'accelerator', description: 'Cradle\'s flagship seed-stage accelerator offering funding, mentorship, lab access, and investor introductions for high-potential Malaysian startups.',       focus_industries: ['fintech','healthtech','edtech','agritech'],    funding_amount: 500000,  next_intake: 'Q3 2026', status: 'active',   created_at: now },
  { initiative_id: 'init_002', name: 'GAIN Grant',                  type: 'grant',       description: 'Non-dilutive commercialisation grant for early-stage Malaysian startups, with quarterly milestone reviews by Cradle\'s investment committee.',              focus_industries: ['fintech','saas','deeptech'],                   funding_amount: 150000,  next_intake: 'Q2 2026', status: 'active',   created_at: now },
  { initiative_id: 'init_003', name: 'Tech Startup Catalyst',       type: 'incubator',   description: 'Six-month incubator programme providing technical mentorship, market access workshops, regulatory guidance, and demo day readiness coaching.',              focus_industries: ['saas','edtech','healthtech'],                  funding_amount: 250000,  next_intake: 'Q4 2026', status: 'active',   created_at: now },
  { initiative_id: 'init_004', name: 'MDEC Global Accelerator',     type: 'accelerator', description: 'MDEC\'s programme to help Malaysian tech startups expand into ASEAN markets with matched corporate partnerships and go-to-market support.',                 focus_industries: ['fintech','logtech','saas','cleantech'],        funding_amount: 300000,  next_intake: 'Q3 2026', status: 'active',   created_at: now },
  { initiative_id: 'init_005', name: 'Green Tech Challenge',        type: 'challenge',   description: 'Open innovation challenge by TNB and Cradle seeking cleantech and energy-efficiency solutions for Malaysia\'s industrial and residential sectors.',         focus_industries: ['cleantech','energy','agritech'],               funding_amount: 200000,  next_intake: 'Q1 2027', status: 'upcoming', created_at: now },
  { initiative_id: 'init_006', name: 'HealthTech Innovation Grant', type: 'grant',       description: 'KKM and Cradle co-funded grant for digital health startups developing solutions that improve public healthcare access and outcomes in Malaysia.',            focus_industries: ['healthtech','medtech'],                        funding_amount: 180000,  next_intake: 'Q2 2026', status: 'active',   created_at: now },
  { initiative_id: 'init_007', name: 'Agritech Scale Programme',    type: 'programme',   description: 'Twelve-week structured programme connecting agritech startups with Felda and Sime Darby for pilot deployments and commercialisation pathways.',             focus_industries: ['agritech','foodtech'],                         funding_amount: 100000,  next_intake: 'Q3 2026', status: 'active',   created_at: now },
  { initiative_id: 'init_008', name: 'DeepTech Launchpad',          type: 'incubator',   description: 'Twelve-month incubator for deeptech, AI, and quantum computing startups, with access to MIMOS labs and PETRONAS technical mentors.',                      focus_industries: ['deeptech','AI','quantum'],                     funding_amount: 400000,  next_intake: 'Q4 2026', status: 'upcoming', created_at: now },
  { initiative_id: 'init_009', name: 'Fintech Regulatory Sandbox',  type: 'programme',   description: 'BNM-Cradle collaborative sandbox allowing fintech startups to test regulated financial products in a controlled environment with live Malaysian users.',    focus_industries: ['fintech','insurtech','wealthtech'],            funding_amount: null,    next_intake: 'Q2 2026', status: 'active',   created_at: now },
  { initiative_id: 'init_010', name: 'SME Digitalisation Grant',    type: 'grant',       description: 'Co-funding programme for startups building productivity and digitalisation tools specifically targeting Malaysian SMEs across manufacturing and retail.',   focus_industries: ['saas','fintech','logtech'],                    funding_amount: 120000,  next_intake: 'Q3 2026', status: 'active',   created_at: now },
]

// ─── LINKAGES ────────────────────────────────────────────────────────────────

const linkages = [
  { linkage_id: 'lnk_20260516_001', startup_id: 'startup_001', startup_name: 'PayEase',     actor_type: 'mentor',     partner_type: null,               actor_id: 'mentor_001',    actor_name: 'Ahmad Razif',           match_score: 92, match_reason: 'Ahmad has 15 years of fintech product experience and helped 3 seed-stage payment startups reach Series A.',         status: 'active',  initiative_cycle: null,       created_at: now, outcome: null },
  { linkage_id: 'lnk_20260516_002', startup_id: 'startup_001', startup_name: 'PayEase',     actor_type: 'initiative', partner_type: null,               actor_id: 'init_001',      actor_name: 'CIP Accelerate',        match_score: 90, match_reason: 'CIP Accelerate targets fintech seed-stage startups and has placed 12 alumni with Series A investors.',               status: 'active',  initiative_cycle: 'Q3 2026',  created_at: now, outcome: null },
  { linkage_id: 'lnk_20260516_003', startup_id: 'startup_001', startup_name: 'PayEase',     actor_type: 'partner',    partner_type: 'corporate',        actor_id: 'corporate_001', actor_name: 'Mastercard Malaysia',   match_score: 88, match_reason: 'Mastercard\'s Start Path programme actively seeks cross-border payment solutions in SEA markets.',               status: 'pending', initiative_cycle: null,       created_at: now, outcome: null },
  { linkage_id: 'lnk_20260516_004', startup_id: 'startup_001', startup_name: 'PayEase',     actor_type: 'partner',    partner_type: 'investor',         actor_id: 'investor_001',  actor_name: 'Openspace Ventures',    match_score: 86, match_reason: 'Openspace invests in B2B fintech across SEA with a strong portfolio network for PayEase\'s pilot expansion.',     status: 'active',  initiative_cycle: null,       created_at: now, outcome: null },
  { linkage_id: 'lnk_20260515_001', startup_id: 'startup_002', startup_name: 'MediTrack',   actor_type: 'mentor',     partner_type: null,               actor_id: 'mentor_004',    actor_name: 'Dr. Rashid Omar',       match_score: 91, match_reason: 'Dr. Rashid is a former MOH digital health lead with deep regulatory and clinical workflow experience.',             status: 'active',  initiative_cycle: null,       created_at: now, outcome: null },
  { linkage_id: 'lnk_20260515_002', startup_id: 'startup_002', startup_name: 'MediTrack',   actor_type: 'initiative', partner_type: null,               actor_id: 'init_006',      actor_name: 'HealthTech Innovation Grant', match_score: 85, match_reason: 'The grant funds exactly MediTrack\'s use case: improving care continuity through digital health records.',  status: 'active',  initiative_cycle: 'Q2 2026',  created_at: now, outcome: null },
  { linkage_id: 'lnk_20260514_001', startup_id: 'startup_003', startup_name: 'EduSync',     actor_type: 'mentor',     partner_type: null,               actor_id: 'mentor_005',    actor_name: 'Lisa Cheong',           match_score: 89, match_reason: 'Lisa founded two edtech companies and has specific experience in rural digital access programmes in Malaysia.',  status: 'active',  initiative_cycle: null,       created_at: now, outcome: null },
  { linkage_id: 'lnk_20260514_002', startup_id: 'startup_004', startup_name: 'FarmTrace',   actor_type: 'initiative', partner_type: null,               actor_id: 'init_007',      actor_name: 'Agritech Scale Programme', match_score: 87, match_reason: 'The programme directly connects agritech startups to Felda and Sime Darby — ideal pilot partners for FarmTrace.', status: 'active',  initiative_cycle: 'Q3 2026',  created_at: now, outcome: null },
  { linkage_id: 'lnk_20260513_001', startup_id: 'startup_009', startup_name: 'SupplyMesh',  actor_type: 'partner',    partner_type: 'investor',         actor_id: 'investor_009',  actor_name: 'RHL Ventures',          match_score: 84, match_reason: 'RHL Ventures focuses on fintech infrastructure and has portfolio companies that are ideal pilot customers for SupplyMesh.', status: 'active',  initiative_cycle: null,       created_at: now, outcome: null },
  { linkage_id: 'lnk_20260513_002', startup_id: 'startup_006', startup_name: 'GreenWatt',   actor_type: 'partner',    partner_type: 'corporate',        actor_id: 'corporate_003', actor_name: 'Tenaga Nasional Berhad', match_score: 93, match_reason: 'TNB\'s sustainability mandate and industrial client base make them the perfect pilot partner for GreenWatt\'s energy monitoring platform.', status: 'pending', initiative_cycle: null, created_at: now, outcome: null },
]

// ─── SEED FUNCTION ───────────────────────────────────────────────────────────

async function seedCollection(collectionName, docs, idField) {
  console.log(`\nSeeding '${collectionName}' (${docs.length} docs)...`)
  const col = db.collection(collectionName)

  // Clear existing docs
  const existing = await col.get()
  if (!existing.empty) {
    const batch = db.batch()
    existing.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
    console.log(`  Cleared ${existing.size} existing docs`)
  }

  // Write in batches of 500 (Firestore limit)
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch()
    docs.slice(i, i + 500).forEach(doc => {
      batch.set(col.doc(doc[idField]), doc)
    })
    await batch.commit()
  }
  console.log(`  ✓ Wrote ${docs.length} docs`)
}

async function main() {
  console.log(`Connecting to Firestore project: ${process.env.FIREBASE_PROJECT_ID}`)
  await seedCollection('startups',    startups,    'startup_id')
  await seedCollection('partners',    partners,    'partner_id')
  await seedCollection('initiatives', initiatives, 'initiative_id')
  await seedCollection('linkages',    linkages,    'linkage_id')
  console.log('\n✓ All collections seeded successfully.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
