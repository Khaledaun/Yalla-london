/**
 * Basic deployment smoke test for Jest runner
 * @jest-environment node
 */

describe('Deployment Readiness', () => {
  test('Environment loads without errors', () => {
    expect(process.env.NODE_ENV).toBeDefined()
  })

  test('Package.json is valid', () => {
    const packageJson = require('../package.json')
    expect(packageJson.name).toBe('app')
    expect(packageJson.dependencies).toBeDefined()
  })

  test('Required dependencies are available', () => {
    expect(() => require('next')).not.toThrow()
    expect(() => require('@prisma/client')).not.toThrow()
    expect(() => require('@supabase/supabase-js')).not.toThrow()
  })

  test('Critical files exist', () => {
    const fs = require('fs')
    const path = require('path')
    
    const criticalFiles = [
      'next.config.js',
      'package.json',
      'prisma/schema.prisma',
      'lib/supabase.ts',
      'lib/feature-flags.ts'
    ]
    
    criticalFiles.forEach(file => {
      expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true)
    })
  })
})