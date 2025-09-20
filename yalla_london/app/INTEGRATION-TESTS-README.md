# Yalla London Integration Test Suite

This comprehensive integration test suite validates the full connection and integration between the Yalla London workflow (backend and APIs), dashboard (admin UI), and public website.

## Overview

The test suite includes:

- **Database Connectivity Tests**: Validates Prisma client, Supabase integration, and migrations
- **API Endpoint Validation**: Tests all backend API endpoints used by dashboard and website
- **Admin Workflow E2E Tests**: End-to-end tests for admin login, article creation, media upload, and workflow automation
- **Comprehensive Integration Tests**: Full system integration validation
- **Error State Verification**: Tests for proper error handling and edge cases

## Prerequisites

### System Requirements
- Node.js 18+ 
- Yarn package manager
- PostgreSQL database (for full testing)
- Environment variables configured

### Environment Setup

1. **Install Dependencies**
   ```bash
   yarn install
   ```

2. **Install Playwright Browsers**
   ```bash
   npx playwright install
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Required variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/yalla_london"
   DIRECT_URL="postgresql://user:password@localhost:5432/yalla_london"
   
   # Admin Authentication
   NEXT_PUBLIC_ADMIN_PASSWORD="YallaLondon24!"
   
   # Application
   NEXT_PUBLIC_SITE_URL="http://localhost:3000"
   
   # Optional: Supabase (if using)
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

4. **Database Setup** (if testing locally)
   ```bash
   # Run migrations
   npx prisma migrate dev
   
   # Generate Prisma client
   npx prisma generate
   ```

## Running Tests

### Complete Test Suite

Run all integration tests with comprehensive reporting:

```bash
# Run the complete integration test suite
node tests/run-integration-tests.js

# Or using the npm script (if added to package.json)
yarn test:integration
```

### Individual Test Suites

Run specific test categories:

```bash
# Database connectivity and Supabase integration
yarn test tests/database-connectivity.test.ts

# API endpoint validation
npx playwright test tests/api-endpoint-validation.test.ts

# Admin workflow end-to-end tests
npx playwright test tests/admin-workflow-e2e.test.ts

# Comprehensive integration tests
npx playwright test tests/comprehensive-integration.test.ts

# Existing staging tests
npx playwright test tests/api-staging.spec.ts
npx playwright test tests/e2e-staging.spec.ts
```

### Development Testing

For development and debugging:

```bash
# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/admin-workflow-e2e.test.ts --headed

# Run with debug mode
npx playwright test --debug

# Run Jest tests with watch mode
yarn test --watch tests/database-connectivity.test.ts
```

## Test Configuration

### Jest Configuration
- Located in `jest.config.js`
- Configured for Node.js environment
- Includes coverage reporting
- Custom module path mapping for absolute imports

### Playwright Configuration
- Located in `playwright.config.ts`
- Supports multiple browsers (Chrome, Firefox, Safari, Edge)
- Includes mobile testing (Chrome Mobile, Safari Mobile)
- Configured for both local and CI environments
- Automatic screenshot and video capture on failures

### Environment Variables for Testing
```bash
# Test environment
NODE_ENV=test

# Base URL for testing
STAGING_URL=http://localhost:3000

# Admin credentials for E2E tests
NEXT_PUBLIC_ADMIN_PASSWORD=YallaLondon24!

# Database connection for integration tests
DATABASE_URL=postgresql://...
```

## Test Reports

### Automatic Report Generation

After running the complete test suite, comprehensive reports are generated:

- **Latest Report**: `test-results/latest-audit-report.md`
- **Timestamped Report**: `test-results/comprehensive-audit-{timestamp}.md`
- **Individual Reports**: API validation, database connectivity reports
- **Playwright Reports**: HTML reports with screenshots and traces

### Report Contents

The comprehensive audit report includes:

- Executive summary with overall status
- Test summary with pass/fail rates
- Integration status by component
- Error state analysis
- Performance metrics
- Coverage assessment
- Security and quality checks
- Recommendations and next steps
- CI/CD integration instructions

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/integration-tests.yml`:

```yaml
name: Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: yalla_user
          POSTGRES_PASSWORD: yalla_pass
          POSTGRES_DB: yalla_london_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Setup database
        env:
          DATABASE_URL: postgresql://yalla_user:yalla_pass@localhost:5432/yalla_london_test
        run: |
          npx prisma migrate deploy
          npx prisma generate

      - name: Build application
        run: yarn build
        env:
          DATABASE_URL: postgresql://yalla_user:yalla_pass@localhost:5432/yalla_london_test
          NEXT_PUBLIC_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}

      - name: Start application
        run: yarn start &
        env:
          DATABASE_URL: postgresql://yalla_user:yalla_pass@localhost:5432/yalla_london_test
          NEXT_PUBLIC_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}

      - name: Wait for application
        run: npx wait-on http://localhost:3000 --timeout 60000

      - name: Run integration tests
        run: node tests/run-integration-tests.js
        env:
          DATABASE_URL: postgresql://yalla_user:yalla_pass@localhost:5432/yalla_london_test
          NEXT_PUBLIC_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
          NEXT_PUBLIC_SITE_URL: http://localhost:3000

      - name: Upload test reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: |
            test-results/
            playwright-report/
          retention-days: 30

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Vercel/Netlify Integration

For deployment platforms, add the test script to your build process:

```json
{
  "scripts": {
    "build": "next build",
    "test:integration": "node tests/run-integration-tests.js",
    "test:smoke": "npx playwright test tests/comprehensive-integration.test.ts --grep=\"should validate homepage loads correctly\"",
    "deploy:verify": "yarn test:smoke"
  }
}
```

## Test Coverage

### Components Tested

✅ **Database & Backend**
- Prisma client availability and connection
- Database migrations and schema validation
- Supabase client integration
- API endpoint functionality and error handling
- Performance and rate limiting

✅ **Admin Interface**
- Authentication and authorization
- Dashboard access and navigation
- Article creation and editing workflow
- Media upload and management
- All admin routes and pages
- Error state handling

✅ **Public Website**
- Homepage loading and content display
- Navigation and routing
- Content synchronization from admin
- Error handling and 404 pages
- Cross-browser compatibility

✅ **Integration Workflows**
- Admin content creation → Public site display
- Media upload → Asset management
- Real-time updates and cache invalidation
- Error propagation and recovery

### Error States Specifically Tested

The test suite validates fixes for issues mentioned in the problem statement:

- ❌ "Error Loading Articles" on admin pages
- ❌ 404 errors on `/admin/articles/new`
- ❌ 404 errors on `/admin/media/upload`
- ⚠️ Database connectivity warnings
- ⚠️ Prisma client availability warnings

## Troubleshooting

### Common Issues

**Database Connection Failures**
```bash
# Check database is running
pg_isready -h localhost -p 5432

# Verify connection string
echo $DATABASE_URL

# Test connection manually
psql $DATABASE_URL -c "SELECT 1;"
```

**Playwright Browser Issues**
```bash
# Reinstall browsers
npx playwright install --force

# Install system dependencies
npx playwright install-deps
```

**Port Conflicts**
```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9

# Use different port
STAGING_URL=http://localhost:3001 yarn test:integration
```

**Environment Variable Issues**
```bash
# Check required variables are set
node -e "console.log(process.env.DATABASE_URL ? '✅ DB OK' : '❌ DB Missing')"
node -e "console.log(process.env.NEXT_PUBLIC_ADMIN_PASSWORD ? '✅ Admin OK' : '❌ Admin Missing')"
```

### Debug Mode

Enable verbose logging:

```bash
# Debug Playwright tests
DEBUG=pw:* npx playwright test

# Debug Jest tests
DEBUG=* yarn test

# Debug application
DEBUG=* yarn dev
```

### Test Data Cleanup

Clean up test data between runs:

```bash
# Reset test database
npx prisma migrate reset --force

# Clear test results
rm -rf test-results/ playwright-report/

# Clear browser cache
npx playwright test --headed --browser=chromium --global-setup=./tests/clear-cache.js
```

## Contributing

### Adding New Tests

1. **Create test file** in appropriate directory:
   - `/tests/` for integration tests
   - Follow naming convention: `*.test.ts` or `*.spec.ts`

2. **Update test runner** in `tests/run-integration-tests.js`:
   ```javascript
   const testSuites = [
     // ... existing tests
     {
       name: 'Your New Test Suite',
       command: 'npx playwright test tests/your-test.spec.ts',
       type: 'playwright',
       critical: true // Set based on importance
     }
   ];
   ```

3. **Add test documentation** to this README

### Test Writing Guidelines

- Use descriptive test names
- Include proper error handling
- Add meaningful assertions
- Use data-testid attributes for stable selectors
- Mock external dependencies where appropriate
- Include performance checks for critical paths

## Support

For issues with the test suite:

1. Check the troubleshooting section above
2. Review test reports in `test-results/`
3. Check GitHub Actions logs for CI failures
4. Create an issue with test output and environment details

---

**Last Updated**: Generated automatically by integration test suite
**Version**: 1.0