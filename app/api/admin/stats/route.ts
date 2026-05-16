import { store, docToLinkage, docToPartnerRecord } from '@/app/lib/store'

export async function GET() {
  const allLinkages = store.getAllLinkages().map(docToLinkage)
  const allStartups = store.getAllStartups()
  const allPartners = store.getAllPartners().map(p => docToPartnerRecord(p)!)
  const allInitiatives = store.getAllInitiatives()

  const activeLinks = allLinkages.filter(l => l.status === 'active')
  const pendingLinks = allLinkages.filter(l => l.status === 'pending')
  const avgMatchScore = activeLinks.length > 0
    ? Math.round(activeLinks.reduce((sum, l) => sum + l.matchScore, 0) / activeLinks.length)
    : 0

  const partners = allPartners.filter(p => p.partnerType !== 'mentor')
  const mentors = allPartners.filter(p => p.partnerType === 'mentor')

  const startupMap = new Map(allStartups.map(s => [s.startup_id, s]))
  const linkagesByStartup = new Map<string, typeof allLinkages>()
  for (const l of allLinkages.filter(linkage => linkage.sourceType === 'startup')) {
    if (!linkagesByStartup.has(l.startupId)) linkagesByStartup.set(l.startupId, [])
    linkagesByStartup.get(l.startupId)!.push(l)
  }

  const engagementScores = []
  for (const [startupId, links] of linkagesByStartup) {
    const startup = startupMap.get(startupId)
    if (!startup) continue
    const activeL = links.filter(l => l.status === 'active')
    const avgScore = Math.round(links.reduce((s, l) => s + l.matchScore, 0) / links.length)
    const activeRatio = links.length > 0 ? activeL.length / links.length : 0
    const score = Math.round(avgScore * (0.7 + 0.3 * activeRatio))
    engagementScores.push({
      startupId,
      startupName: startup.startup_name,
      industry: startup.industry,
      stage: startup.stage,
      score,
      activeLinks: activeL.length,
      totalLinks: links.length,
    })
  }
  engagementScores.sort((a, b) => b.score - a.score)

  const recentLinkages = [...allLinkages]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  return Response.json({
    counts: {
      startups: allStartups.length,
      partners: partners.length,
      mentors: mentors.length,
      initiatives: allInitiatives.length,
      activeLinks: activeLinks.length,
      pendingLinks: pendingLinks.length,
    },
    avgMatchScore,
    engagementScores,
    recentLinkages,
  })
}
