/**
 * Topic Validation Business Rules Tests
 * Tests the critical business rules for topic proposals
 */

import { describe, test, expect } from '@jest/globals'

// Mock topic proposal validation function
function validateTopicProposal(topic: any) {
  const errors: string[] = []

  // Rule 1: Must have exactly 2 featured long-tails
  if (!topic.featured_longtails || topic.featured_longtails.length !== 2) {
    errors.push('Must have exactly 2 featured long-tails')
  }

  // Rule 2: Must have 3-4 authority links
  if (!topic.authority_links_json || topic.authority_links_json.length < 3 || topic.authority_links_json.length > 4) {
    errors.push('Must have 3-4 authority links')
  }

  // Rule 3: Must have at least 5 long-tail keywords
  if (!topic.longtails || topic.longtails.length < 5) {
    errors.push('Must have at least 5 long-tail keywords')
  }

  // Rule 4: Authority links must have required fields
  if (topic.authority_links_json) {
    topic.authority_links_json.forEach((link: any, index: number) => {
      if (!link.url || !link.title || !link.sourceDomain) {
        errors.push(`Authority link ${index + 1} missing required fields (url, title, sourceDomain)`)
      }
      if (link.url && !link.url.startsWith('http')) {
        errors.push(`Authority link ${index + 1} must have valid URL`)
      }
    })
  }

  // Rule 5: Primary keyword must be present
  if (!topic.primary_keyword || topic.primary_keyword.trim().length === 0) {
    errors.push('Primary keyword is required')
  }

  // Rule 6: Confidence score must be between 0 and 1 if provided
  if (topic.confidence_score !== undefined && (topic.confidence_score < 0 || topic.confidence_score > 1)) {
    errors.push('Confidence score must be between 0 and 1')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Mock backlink trigger validation
function shouldTriggerBacklinkOffers(indexedPages: number, minPages: number = 40): boolean {
  return indexedPages >= minPages
}

// Mock SEO score validation
function validateSeoScore(score: number): { isValid: boolean; level: string } {
  if (score < 0 || score > 100) {
    return { isValid: false, level: 'invalid' }
  }
  
  if (score >= 80) return { isValid: true, level: 'excellent' }
  if (score >= 60) return { isValid: true, level: 'good' }
  return { isValid: true, level: 'needs_improvement' }
}

describe('Topic Validation Business Rules', () => {
  test('should validate correct topic proposal', () => {
    const validTopic = {
      primary_keyword: 'best areas to stay in london',
      longtails: [
        'best areas to stay in london 2024',
        'where to stay in london first time',
        'safest areas to stay in london',
        'london neighborhoods guide',
        'best london districts for tourists'
      ],
      featured_longtails: [
        'best areas to stay in london 2024',
        'where to stay in london first time'
      ],
      authority_links_json: [
        {
          url: 'https://www.timeout.com/london',
          title: 'Time Out London',
          sourceDomain: 'timeout.com'
        },
        {
          url: 'https://www.visitlondon.com',
          title: 'Visit London Official Guide',
          sourceDomain: 'visitlondon.com'
        },
        {
          url: 'https://www.standard.co.uk',
          title: 'Evening Standard',
          sourceDomain: 'standard.co.uk'
        }
      ],
      confidence_score: 0.85
    }

    const result = validateTopicProposal(validTopic)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('should reject topic with wrong number of featured longtails', () => {
    const invalidTopic = {
      primary_keyword: 'london travel guide',
      longtails: ['london guide', 'travel london', 'visit london', 'london tips', 'london attractions'],
      featured_longtails: ['london guide'], // Only 1, should be 2
      authority_links_json: [
        { url: 'https://example.com', title: 'Example', sourceDomain: 'example.com' },
        { url: 'https://test.com', title: 'Test', sourceDomain: 'test.com' },
        { url: 'https://demo.com', title: 'Demo', sourceDomain: 'demo.com' }
      ]
    }

    const result = validateTopicProposal(invalidTopic)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Must have exactly 2 featured long-tails')
  })

  test('should reject topic with wrong number of authority links', () => {
    const invalidTopic = {
      primary_keyword: 'london restaurants',
      longtails: ['best london restaurants', 'london dining', 'where to eat london', 'london food guide', 'top restaurants london'],
      featured_longtails: ['best london restaurants', 'london dining'],
      authority_links_json: [
        { url: 'https://example.com', title: 'Example', sourceDomain: 'example.com' },
        { url: 'https://test.com', title: 'Test', sourceDomain: 'test.com' }
      ] // Only 2, should be 3-4
    }

    const result = validateTopicProposal(invalidTopic)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Must have 3-4 authority links')
  })

  test('should reject topic with insufficient longtails', () => {
    const invalidTopic = {
      primary_keyword: 'london events',
      longtails: ['london events', 'what to do london'], // Only 2, should be at least 5
      featured_longtails: ['london events', 'what to do london'],
      authority_links_json: [
        { url: 'https://example.com', title: 'Example', sourceDomain: 'example.com' },
        { url: 'https://test.com', title: 'Test', sourceDomain: 'test.com' },
        { url: 'https://demo.com', title: 'Demo', sourceDomain: 'demo.com' }
      ]
    }

    const result = validateTopicProposal(invalidTopic)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Must have at least 5 long-tail keywords')
  })

  test('should reject topic with malformed authority links', () => {
    const invalidTopic = {
      primary_keyword: 'london attractions',
      longtails: ['london attractions', 'top london sights', 'must see london', 'london landmarks', 'best london attractions'],
      featured_longtails: ['london attractions', 'top london sights'],
      authority_links_json: [
        { url: 'invalid-url', title: 'Example', sourceDomain: 'example.com' }, // Invalid URL
        { title: 'Test', sourceDomain: 'test.com' }, // Missing URL
        { url: 'https://demo.com', title: 'Demo', sourceDomain: 'demo.com' }
      ]
    }

    const result = validateTopicProposal(invalidTopic)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(error => error.includes('Authority link 1 must have valid URL'))).toBe(true)
    expect(result.errors.some(error => error.includes('Authority link 2 missing required fields'))).toBe(true)
  })

  test('should reject topic with invalid confidence score', () => {
    const invalidTopic = {
      primary_keyword: 'london shopping',
      longtails: ['london shopping', 'best london shops', 'where to shop london', 'london markets', 'oxford street shopping'],
      featured_longtails: ['london shopping', 'best london shops'],
      authority_links_json: [
        { url: 'https://example.com', title: 'Example', sourceDomain: 'example.com' },
        { url: 'https://test.com', title: 'Test', sourceDomain: 'test.com' },
        { url: 'https://demo.com', title: 'Demo', sourceDomain: 'demo.com' }
      ],
      confidence_score: 1.5 // Invalid, should be between 0 and 1
    }

    const result = validateTopicProposal(invalidTopic)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Confidence score must be between 0 and 1')
  })
})

describe('Backlink Offers Business Rules', () => {
  test('should trigger backlink offers when indexed pages >= 40', () => {
    expect(shouldTriggerBacklinkOffers(40)).toBe(true)
    expect(shouldTriggerBacklinkOffers(50)).toBe(true)
    expect(shouldTriggerBacklinkOffers(100)).toBe(true)
  })

  test('should not trigger backlink offers when indexed pages < 40', () => {
    expect(shouldTriggerBacklinkOffers(39)).toBe(false)
    expect(shouldTriggerBacklinkOffers(20)).toBe(false)
    expect(shouldTriggerBacklinkOffers(0)).toBe(false)
  })

  test('should support custom minimum pages threshold', () => {
    expect(shouldTriggerBacklinkOffers(30, 25)).toBe(true)
    expect(shouldTriggerBacklinkOffers(20, 25)).toBe(false)
  })
})

describe('SEO Score Validation Business Rules', () => {
  test('should validate correct SEO scores', () => {
    expect(validateSeoScore(85)).toEqual({ isValid: true, level: 'excellent' })
    expect(validateSeoScore(75)).toEqual({ isValid: true, level: 'good' })
    expect(validateSeoScore(55)).toEqual({ isValid: true, level: 'needs_improvement' })
    expect(validateSeoScore(0)).toEqual({ isValid: true, level: 'needs_improvement' })
    expect(validateSeoScore(100)).toEqual({ isValid: true, level: 'excellent' })
  })

  test('should reject invalid SEO scores', () => {
    expect(validateSeoScore(-1)).toEqual({ isValid: false, level: 'invalid' })
    expect(validateSeoScore(101)).toEqual({ isValid: false, level: 'invalid' })
  })

  test('should categorize SEO scores correctly', () => {
    // Excellent: 80-100
    expect(validateSeoScore(80).level).toBe('excellent')
    expect(validateSeoScore(90).level).toBe('excellent')
    expect(validateSeoScore(100).level).toBe('excellent')

    // Good: 60-79
    expect(validateSeoScore(60).level).toBe('good')
    expect(validateSeoScore(70).level).toBe('good')
    expect(validateSeoScore(79).level).toBe('good')

    // Needs improvement: 0-59
    expect(validateSeoScore(0).level).toBe('needs_improvement')
    expect(validateSeoScore(30).level).toBe('needs_improvement')
    expect(validateSeoScore(59).level).toBe('needs_improvement')
  })
})