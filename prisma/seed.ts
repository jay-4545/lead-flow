import "dotenv/config"
import bcrypt from "bcryptjs"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient, LeadStatus, CampaignStatus } from "../src/generated/prisma/client"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const saasLeads = [
  { firstName: "James", lastName: "Wilson", email: "james@cloudstack.io", company: "CloudStack", jobTitle: "CEO", website: "https://cloudstack.io", industry: "SaaS", location: "San Francisco, CA" },
  { firstName: "Lisa", lastName: "Park", email: "lisa@dataflow.app", company: "DataFlow", jobTitle: "CTO", website: "https://dataflow.app", industry: "SaaS", location: "Seattle, WA" },
  { firstName: "Robert", lastName: "Kim", email: "robert@metricly.com", company: "Metricly", jobTitle: "Head of Growth", website: "https://metricly.com", industry: "SaaS", location: "Austin, TX" },
  { firstName: "Anna", lastName: "Martinez", email: "anna@syncbase.io", company: "SyncBase", jobTitle: "CEO", website: "https://syncbase.io", industry: "SaaS", location: "New York, NY" },
  { firstName: "Tom", lastName: "Anderson", email: "tom@pipeline.co", company: "Pipeline", jobTitle: "CTO", website: "https://pipeline.co", industry: "SaaS", location: "Boston, MA" },
  { firstName: "Rachel", lastName: "Green", email: "rachel@flowstate.io", company: "FlowState", jobTitle: "Head of Growth", website: "https://flowstate.io", industry: "SaaS", location: "Denver, CO" },
  { firstName: "Chris", lastName: "Taylor", email: "chris@nexusapp.com", company: "Nexus App", jobTitle: "CEO", website: "https://nexusapp.com", industry: "SaaS", location: "Chicago, IL" },
  { firstName: "Maria", lastName: "Lopez", email: "maria@scaleup.io", company: "ScaleUp", jobTitle: "CTO", website: "https://scaleup.io", industry: "SaaS", location: "Miami, FL" },
  { firstName: "Kevin", lastName: "Brown", email: "kevin@velocity.saas", company: "Velocity", jobTitle: "Head of Growth", website: "https://velocity.saas", industry: "SaaS", location: "Portland, OR" },
  { firstName: "Sophie", lastName: "Clark", email: "sophie@orbit.io", company: "Orbit", jobTitle: "CEO", website: "https://orbit.io", industry: "SaaS", location: "Los Angeles, CA" },
  { firstName: "Daniel", lastName: "White", email: "daniel@pulseapp.co", company: "Pulse App", jobTitle: "CTO", website: "https://pulseapp.co", industry: "SaaS", location: "Atlanta, GA" },
  { firstName: "Emily", lastName: "Davis", email: "emily@launchkit.io", company: "LaunchKit", jobTitle: "Head of Growth", website: "https://launchkit.io", industry: "SaaS", location: "San Diego, CA" },
  { firstName: "Mark", lastName: "Johnson", email: "mark@stackflow.com", company: "StackFlow", jobTitle: "CEO", website: "https://stackflow.com", industry: "SaaS", location: "Phoenix, AZ" },
  { firstName: "Laura", lastName: "Miller", email: "laura@beam.io", company: "Beam", jobTitle: "CTO", website: "https://beam.io", industry: "SaaS", location: "Nashville, TN" },
  { firstName: "Ryan", lastName: "Moore", email: "ryan@growthloop.app", company: "GrowthLoop", jobTitle: "Head of Growth", website: "https://growthloop.app", industry: "SaaS", location: "Salt Lake City, UT" },
]

const agencyLeads = [
  { firstName: "Jennifer", lastName: "Adams", email: "jennifer@brightpath.agency", company: "BrightPath Agency", jobTitle: "Owner", website: "https://brightpath.agency", industry: "Marketing Agency", location: "New York, NY" },
  { firstName: "Michael", lastName: "Scott", email: "michael@pixelperfect.co", company: "Pixel Perfect", jobTitle: "Account Director", website: "https://pixelperfect.co", industry: "Marketing Agency", location: "Chicago, IL" },
  { firstName: "Sarah", lastName: "Connor", email: "sarah@mediavault.io", company: "MediaVault", jobTitle: "Owner", website: "https://mediavault.io", industry: "Marketing Agency", location: "Los Angeles, CA" },
  { firstName: "David", lastName: "Lee", email: "david@brandforge.com", company: "BrandForge", jobTitle: "Account Director", website: "https://brandforge.com", industry: "Marketing Agency", location: "San Francisco, CA" },
  { firstName: "Jessica", lastName: "Hall", email: "jessica@creativelab.agency", company: "Creative Lab", jobTitle: "Owner", website: "https://creativelab.agency", industry: "Marketing Agency", location: "Austin, TX" },
  { firstName: "Brian", lastName: "Young", email: "brian@adspark.io", company: "AdSpark", jobTitle: "Account Director", website: "https://adspark.io", industry: "Marketing Agency", location: "Miami, FL" },
  { firstName: "Nicole", lastName: "King", email: "nicole@growthhaus.com", company: "GrowthHaus", jobTitle: "Owner", website: "https://growthhaus.com", industry: "Marketing Agency", location: "Denver, CO" },
  { firstName: "Andrew", lastName: "Wright", email: "andrew@contentcrew.co", company: "Content Crew", jobTitle: "Account Director", website: "https://contentcrew.co", industry: "Marketing Agency", location: "Seattle, WA" },
  { firstName: "Amanda", lastName: "Hill", email: "amanda@socialpulse.agency", company: "Social Pulse", jobTitle: "Owner", website: "https://socialpulse.agency", industry: "Marketing Agency", location: "Boston, MA" },
  { firstName: "Jason", lastName: "Baker", email: "jason@reachmedia.io", company: "Reach Media", jobTitle: "Account Director", website: "https://reachmedia.io", industry: "Marketing Agency", location: "Portland, OR" },
  { firstName: "Melissa", lastName: "Turner", email: "melissa@impactads.co", company: "Impact Ads", jobTitle: "Owner", website: "https://impactads.co", industry: "Marketing Agency", location: "Atlanta, GA" },
  { firstName: "Eric", lastName: "Phillips", email: "eric@digitaldrive.agency", company: "Digital Drive", jobTitle: "Account Director", website: "https://digitaldrive.agency", industry: "Marketing Agency", location: "Dallas, TX" },
  { firstName: "Stephanie", lastName: "Campbell", email: "stephanie@viralwave.io", company: "ViralWave", jobTitle: "Owner", website: "https://viralwave.io", industry: "Marketing Agency", location: "Phoenix, AZ" },
  { firstName: "Greg", lastName: "Parker", email: "greg@amplify.agency", company: "Amplify Agency", jobTitle: "Account Director", website: "https://amplify.agency", industry: "Marketing Agency", location: "Minneapolis, MN" },
  { firstName: "Karen", lastName: "Evans", email: "karen@storybrand.co", company: "StoryBrand Co", jobTitle: "Owner", website: "https://storybrand.co", industry: "Marketing Agency", location: "Charlotte, NC" },
]

const ecommerceLeads = [
  { firstName: "Alex", lastName: "Thompson", email: "alex@shopnova.com", company: "ShopNova", jobTitle: "Founder", website: "https://shopnova.com", industry: "eCommerce", location: "Austin, TX" },
  { firstName: "Olivia", lastName: "Roberts", email: "olivia@stylebox.co", company: "StyleBox", jobTitle: "COO", website: "https://stylebox.co", industry: "eCommerce", location: "New York, NY" },
  { firstName: "Nathan", lastName: "Carter", email: "nathan@gearhub.io", company: "GearHub", jobTitle: "Founder", website: "https://gearhub.io", industry: "eCommerce", location: "Seattle, WA" },
  { firstName: "Hannah", lastName: "Mitchell", email: "hannah@freshmart.shop", company: "FreshMart", jobTitle: "COO", website: "https://freshmart.shop", industry: "eCommerce", location: "Chicago, IL" },
  { firstName: "Tyler", lastName: "Perez", email: "tyler@luxelane.com", company: "LuxeLane", jobTitle: "Founder", website: "https://luxelane.com", industry: "eCommerce", location: "Los Angeles, CA" },
  { firstName: "Brittany", lastName: "Collins", email: "brittany@petpalace.co", company: "PetPalace", jobTitle: "COO", website: "https://petpalace.co", industry: "eCommerce", location: "Denver, CO" },
  { firstName: "Jordan", lastName: "Stewart", email: "jordan@homehaven.shop", company: "HomeHaven", jobTitle: "Founder", website: "https://homehaven.shop", industry: "eCommerce", location: "Miami, FL" },
  { firstName: "Megan", lastName: "Morris", email: "megan@fitgear.io", company: "FitGear", jobTitle: "COO", website: "https://fitgear.io", industry: "eCommerce", location: "San Francisco, CA" },
  { firstName: "Brandon", lastName: "Rogers", email: "brandon@techdeals.com", company: "TechDeals", jobTitle: "Founder", website: "https://techdeals.com", industry: "eCommerce", location: "Boston, MA" },
  { firstName: "Ashley", lastName: "Reed", email: "ashley@greenleaf.shop", company: "GreenLeaf", jobTitle: "COO", website: "https://greenleaf.shop", industry: "eCommerce", location: "Portland, OR" },
]

const consultingLeads = [
  { firstName: "Richard", lastName: "Foster", email: "richard@apexconsult.com", company: "Apex Consulting", jobTitle: "Partner", website: "https://apexconsult.com", industry: "Consulting", location: "New York, NY" },
  { firstName: "Patricia", lastName: "Bell", email: "patricia@strategix.co", company: "Strategix", jobTitle: "Managing Director", website: "https://strategix.co", industry: "Consulting", location: "London, UK" },
  { firstName: "William", lastName: "Murphy", email: "william@insightpartners.io", company: "Insight Partners", jobTitle: "Partner", website: "https://insightpartners.io", industry: "Consulting", location: "Chicago, IL" },
  { firstName: "Elizabeth", lastName: "Bailey", email: "elizabeth@navigate.co", company: "Navigate Co", jobTitle: "Managing Director", website: "https://navigate.co", industry: "Consulting", location: "Boston, MA" },
  { firstName: "Charles", lastName: "Rivera", email: "charles@primeadvisory.com", company: "Prime Advisory", jobTitle: "Partner", website: "https://primeadvisory.com", industry: "Consulting", location: "Washington, DC" },
  { firstName: "Susan", lastName: "Cooper", email: "susan@elevateconsult.io", company: "Elevate Consult", jobTitle: "Managing Director", website: "https://elevateconsult.io", industry: "Consulting", location: "San Francisco, CA" },
  { firstName: "Joseph", lastName: "Richardson", email: "joseph@visiongroup.co", company: "Vision Group", jobTitle: "Partner", website: "https://visiongroup.co", industry: "Consulting", location: "Atlanta, GA" },
  { firstName: "Margaret", lastName: "Cox", email: "margaret@claritypartners.com", company: "Clarity Partners", jobTitle: "Managing Director", website: "https://claritypartners.com", industry: "Consulting", location: "Dallas, TX" },
  { firstName: "Thomas", lastName: "Howard", email: "thomas@bridgeconsult.io", company: "Bridge Consult", jobTitle: "Partner", website: "https://bridgeconsult.io", industry: "Consulting", location: "Seattle, WA" },
  { firstName: "Dorothy", lastName: "Ward", email: "dorothy@summitadvisory.co", company: "Summit Advisory", jobTitle: "Managing Director", website: "https://summitadvisory.co", industry: "Consulting", location: "Denver, CO" },
]

const enrichmentData = [
  { companyDesc: "Cloud-native infrastructure platform helping teams deploy faster.", painPoints: "Scaling infrastructure, reducing deployment time, managing cloud costs", icpScore: 9, enrichNotes: "Strong fit for automation tools given their growth stage." },
  { companyDesc: "Analytics SaaS for product teams to track user behavior.", painPoints: "Data silos, slow reporting, low feature adoption", icpScore: 8, enrichNotes: "Product-led growth company, likely open to outreach tools." },
  { companyDesc: "Marketing automation platform for B2B companies.", painPoints: "Lead quality, conversion rates, pipeline visibility", icpScore: 9, enrichNotes: "Perfect ICP — they understand outbound value." },
  { companyDesc: "Collaboration tool for remote engineering teams.", painPoints: "Team communication, project tracking, async workflows", icpScore: 7, enrichNotes: "Remote-first culture, decision makers are accessible." },
  { companyDesc: "Full-service digital marketing agency specializing in B2B.", painPoints: "Client acquisition, proving ROI, scaling operations", icpScore: 8, enrichNotes: "Agencies often need lead gen for themselves too." },
  { companyDesc: "Premium eCommerce brand selling sustainable home goods.", painPoints: "Customer acquisition cost, retention, inventory management", icpScore: 6, enrichNotes: "Growing brand, may be interested in B2B partnerships." },
  { companyDesc: "Management consulting firm focused on digital transformation.", painPoints: "Pipeline development, thought leadership, client retention", icpScore: 7, enrichNotes: "Partners are decision makers with budget authority." },
]

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

async function main() {
  console.log("Seeding database...")

  await prisma.emailLog.deleteMany()
  await prisma.campaignLead.deleteMany()
  await prisma.campaignStep.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.settings.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash("demo123", 12)

  const user = await prisma.user.create({
    data: {
      email: "demo@leadflow.app",
      name: "Alex Johnson",
      password: hashedPassword,
      settings: {
        create: {
          fromName: "Alex Johnson",
          fromEmail: "demo@leadflow.app",
        },
      },
    },
  })

  const allLeadData = [...saasLeads, ...agencyLeads, ...ecommerceLeads, ...consultingLeads]
  const statuses: LeadStatus[] = ["NEW", "CONTACTED", "REPLIED", "INTERESTED", "NEW", "CONTACTED"]

  const leads = await Promise.all(
    allLeadData.map((lead, i) => {
      const isEnriched = i < 30
      const enrich = isEnriched ? enrichmentData[i % enrichmentData.length] : null
      return prisma.lead.create({
        data: {
          ...lead,
          userId: user.id,
          status: statuses[i % statuses.length],
          isEnriched,
          enrichedAt: isEnriched ? daysAgo(30 - i) : null,
          companyDesc: enrich?.companyDesc,
          painPoints: enrich?.painPoints,
          icpScore: enrich?.icpScore,
          enrichNotes: enrich?.enrichNotes,
          tags: [],
        },
      })
    })
  )

  const campaign1 = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: "SaaS Founders Outreach",
      description: "Cold outreach to SaaS founders about our automation platform",
      status: CampaignStatus.ACTIVE,
      fromName: "Alex Johnson",
      fromEmail: "demo@leadflow.app",
      sendingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      launchedAt: daysAgo(25),
      steps: {
        create: [
          { stepNumber: 1, subject: "Quick question about {{company}}", body: "Hi {{firstName}},\n\nI noticed CloudStack is growing fast in the SaaS space. Curious — how are you handling outbound lead gen right now?\n\nWould love to share what's working for similar teams.\n\nBest,\nAlex", delayDays: 0 },
          { stepNumber: 2, subject: "Re: Quick question", body: "Hi {{firstName}},\n\nJust bumping this — I know inboxes get busy.\n\nHappy to send a 2-min overview if helpful.\n\nAlex", delayDays: 4 },
          { stepNumber: 3, subject: "Last note", body: "Hi {{firstName}},\n\nLast email from me — if timing isn't right, no worries at all.\n\nDoor's open if you ever want to chat.\n\nAlex", delayDays: 9 },
        ],
      },
    },
    include: { steps: true },
  })

  const campaign2 = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: "Agency Decision Makers",
      description: "Targeting agency owners and account directors",
      status: CampaignStatus.COMPLETED,
      fromName: "Alex Johnson",
      fromEmail: "demo@leadflow.app",
      sendingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      launchedAt: daysAgo(45),
      completedAt: daysAgo(10),
      steps: {
        create: [
          { stepNumber: 1, subject: "Helping agencies scale outreach", body: "Hi {{firstName}},\n\nI work with agencies like {{company}} to automate their client outreach.\n\nWorth a quick chat?\n\nAlex", delayDays: 0 },
          { stepNumber: 2, subject: "Following up", body: "Hi {{firstName}},\n\nJust checking if this landed at a good time.\n\nAlex", delayDays: 5 },
        ],
      },
    },
    include: { steps: true },
  })

  const campaign3 = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: "eCommerce Automation Pitch",
      description: "Pitching automation to eCommerce founders",
      status: CampaignStatus.DRAFT,
      fromName: "Alex Johnson",
      steps: {
        create: [
          { stepNumber: 1, subject: "Automating {{company}} outreach", body: "Hi {{firstName}},\n\nSaw what you're building at {{company}} — impressive growth.\n\nWe help eCommerce brands automate partner outreach.\n\nInterested?\n\nAlex", delayDays: 0 },
          { stepNumber: 2, subject: "Re: Automating outreach", body: "Hi {{firstName}},\n\nQuick follow-up — happy to show a demo.\n\nAlex", delayDays: 3 },
        ],
      },
    },
    include: { steps: true },
  })

  const campaign1Leads = leads.slice(0, 30)
  const campaign2Leads = leads.slice(30, 45)

  await Promise.all(
    campaign1Leads.map((lead, i) =>
      prisma.campaignLead.create({
        data: {
          campaignId: campaign1.id,
          leadId: lead.id,
          status: i < 20 ? "IN_PROGRESS" : "COMPLETED",
          currentStep: i < 20 ? 2 : 3,
          startedAt: daysAgo(25),
        },
      })
    )
  )

  await Promise.all(
    campaign2Leads.map((lead) =>
      prisma.campaignLead.create({
        data: {
          campaignId: campaign2.id,
          leadId: lead.id,
          status: "COMPLETED",
          currentStep: 2,
          startedAt: daysAgo(45),
          completedAt: daysAgo(10),
        },
      })
    )
  )

  for (let i = 0; i < 30; i++) {
    const lead = campaign1Leads[i]
    const sentAt = daysAgo(25 - Math.floor(i / 2))
    const isOpened = i < 12
    const isClicked = i < 4
    const isReplied = i < 2

    await prisma.emailLog.create({
      data: {
        campaignId: campaign1.id,
        stepId: campaign1.steps[0].id,
        leadId: lead.id,
        subject: campaign1.steps[0].subject,
        body: campaign1.steps[0].body,
        fromEmail: "demo@leadflow.app",
        toEmail: lead.email,
        status: isReplied ? "REPLIED" : isClicked ? "CLICKED" : isOpened ? "OPENED" : "SENT",
        scheduledFor: sentAt,
        sentAt,
        openedAt: isOpened ? new Date(sentAt.getTime() + 3600000) : null,
        openCount: isOpened ? 1 + (i % 3) : 0,
        clickedAt: isClicked ? new Date(sentAt.getTime() + 7200000) : null,
        clickCount: isClicked ? 1 : 0,
        repliedAt: isReplied ? new Date(sentAt.getTime() + 86400000) : null,
      },
    })
  }

  for (let i = 0; i < 15; i++) {
    const lead = campaign2Leads[i]
    const sentAt = daysAgo(40 - i)

    await prisma.emailLog.create({
      data: {
        campaignId: campaign2.id,
        stepId: campaign2.steps[0].id,
        leadId: lead.id,
        subject: campaign2.steps[0].subject,
        body: campaign2.steps[0].body,
        fromEmail: "demo@leadflow.app",
        toEmail: lead.email,
        status: "SENT",
        scheduledFor: sentAt,
        sentAt,
        openCount: i < 8 ? 1 : 0,
        openedAt: i < 8 ? new Date(sentAt.getTime() + 3600000) : null,
      },
    })

    await prisma.emailLog.create({
      data: {
        campaignId: campaign2.id,
        stepId: campaign2.steps[1].id,
        leadId: lead.id,
        subject: campaign2.steps[1].subject,
        body: campaign2.steps[1].body,
        fromEmail: "demo@leadflow.app",
        toEmail: lead.email,
        status: "SENT",
        scheduledFor: daysAgo(35 - i),
        sentAt: daysAgo(35 - i),
        openCount: i < 5 ? 1 : 0,
        openedAt: i < 5 ? daysAgo(34 - i) : null,
      },
    })
  }

  console.log("Seed complete!")
  console.log("Demo login: demo@leadflow.app / demo123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
