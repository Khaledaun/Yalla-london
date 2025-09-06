
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: {},
    pathname: '/',
  }),
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_BRAND_TYPE = 'luxury-guide'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'

// Mock fetch globally
global.fetch = jest.fn()

// Mock console.error and console.warn for cleaner test output
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning:') || args[0]?.includes?.('ReactDOM')) {
      return
    }
    originalError.call(console, ...args)
  }
  
  console.warn = (...args) => {
    if (args[0]?.includes?.('Warning:')) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})
