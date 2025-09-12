#!/bin/bash

# Enterprise Security & Analytics Migration Script
# Adds RBAC and analytics capabilities to existing database

echo "🔧 Enterprise Security & Analytics Migration"
echo "============================================="

# Check if we're in the right directory
if [[ ! -f "prisma/schema.prisma" ]]; then
    echo "❌ Error: Must be run from the app directory with prisma/schema.prisma"
    exit 1
fi

# Check if DATABASE_URL is set
if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ Error: DATABASE_URL environment variable not set"
    exit 1
fi

echo "📝 Creating migration for RBAC and analytics features..."

# Generate migration
yarn prisma migrate dev --name "add-rbac-and-analytics" --create-only

if [[ $? -eq 0 ]]; then
    echo "✅ Migration created successfully"
    echo ""
    echo "📋 Migration includes:"
    echo "   • User role and permission fields"
    echo "   • AuditLog table for compliance tracking"
    echo "   • AnalyticsEvent table for custom analytics"
    echo "   • SystemMetrics table for performance monitoring"
    echo "   • UserSession table for enhanced security"
    echo ""
    echo "🚀 To apply the migration, run:"
    echo "   yarn prisma migrate dev"
    echo ""
    echo "🔍 To review the migration SQL:"
    echo "   cat prisma/migrations/*/migration.sql"
else
    echo "❌ Migration creation failed"
    exit 1
fi

echo ""
echo "📚 Next Steps:"
echo "1. Review the generated migration SQL"
echo "2. Apply the migration: yarn prisma migrate dev"
echo "3. Generate Prisma client: yarn prisma generate"
echo "4. Restart your application"
echo ""
echo "🔐 Default Admin Setup:"
echo "Set ADMIN_EMAILS environment variable with admin email addresses:"
echo "   ADMIN_EMAILS=admin@yourcompany.com,owner@yourcompany.com"
echo ""
echo "📊 Analytics Setup:"
echo "Configure analytics environment variables:"
echo "   GA4_MEASUREMENT_ID=G-XXXXXXXXXX"
echo "   FEATURE_CONTENT_ANALYTICS=true"
echo "   ANALYTICS_ANONYMIZE_IP=true"
echo ""
echo "For full documentation, see docs/enterprise-playbook.md"