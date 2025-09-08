/**
 * Phase 4A Schema Validation Test
 * 
 * Simple validation that our new schema changes are correct and the seeding script works
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateSchema() {
  console.log('🔍 Validating Phase 4A schema extensions...')

  try {
    // Test that we can query the new models
    console.log('Testing new models...')
    
    const topicProposalCount = await prisma.topicProposal.count()
    console.log(`✅ TopicProposal model accessible (count: ${topicProposalCount})`)
    
    const rulebookCount = await prisma.rulebookVersion.count()
    console.log(`✅ RulebookVersion model accessible (count: ${rulebookCount})`)
    
    const pageTypeCount = await prisma.pageTypeRecipe.count()
    console.log(`✅ PageTypeRecipe model accessible (count: ${pageTypeCount})`)
    
    const placeCount = await prisma.place.count()
    console.log(`✅ Place model accessible (count: ${placeCount})`)
    
    const imageAssetCount = await prisma.imageAsset.count()
    console.log(`✅ ImageAsset model accessible (count: ${imageAssetCount})`)
    
    const videoAssetCount = await prisma.videoAsset.count()
    console.log(`✅ VideoAsset model accessible (count: ${videoAssetCount})`)
    
    const analyticsCount = await prisma.analyticsSnapshot.count()
    console.log(`✅ AnalyticsSnapshot model accessible (count: ${analyticsCount})`)
    
    const seoAuditCount = await prisma.seoAuditResult.count()
    console.log(`✅ SeoAuditResult model accessible (count: ${seoAuditCount})`)
    
    const siteCount = await prisma.site.count()
    console.log(`✅ Site model accessible (count: ${siteCount})`)
    
    const siteThemeCount = await prisma.siteTheme.count()
    console.log(`✅ SiteTheme model accessible (count: ${siteThemeCount})`)
    
    const siteMemberCount = await prisma.siteMember.count()
    console.log(`✅ SiteMember model accessible (count: ${siteMemberCount})`)

    // Test that extended fields exist on existing models
    console.log('\nTesting extended models...')
    
    const scheduledContent = await prisma.scheduledContent.findFirst({
      select: {
        id: true,
        pageType: true,
        keywordsJson: true,
        questionsJson: true,
        seoScore: true,
        ogImageId: true,
        placeId: true
      }
    })
    console.log('✅ ScheduledContent extended fields accessible')
    
    const blogPost = await prisma.blogPost.findFirst({
      select: {
        id: true,
        pageType: true,
        keywordsJson: true,
        questionsJson: true,
        seoScore: true,
        ogImageId: true,
        placeId: true
      }
    })
    console.log('✅ BlogPost extended fields accessible')

    console.log('\n🎉 All Phase 4A schema extensions validated successfully!')
    return true
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error)
    return false
  }
}

async function main() {
  const isValid = await validateSchema()
  
  if (!isValid) {
    process.exit(1)
  }
  
  console.log('\n✅ Phase 4A database schema is ready!')
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })