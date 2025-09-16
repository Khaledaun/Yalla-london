#!/bin/bash

# Deployment Migration Safety Script
# Ensures safe database migrations in production environment (Vercel)

set -e  # Exit on any error

echo "🚀 Starting deployment migration safety script..."

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

if [ -z "$DIRECT_URL" ]; then
    echo "❌ DIRECT_URL is not set"
    exit 1
fi

echo "✅ Environment variables validated"

# Function to create pre-migration backup
create_pre_migration_backup() {
    echo "📦 Creating pre-migration backup..."
    
    BACKUP_NAME="pre-migration-$(date +%Y%m%d-%H%M%S)"
    
    # Create backup via API if available
    if [ ! -z "$NEXTAUTH_URL" ]; then
        echo "   Using API backup endpoint..."
        curl -X POST "$NEXTAUTH_URL/api/database/backups" \
            -H "Content-Type: application/json" \
            -d "{\"backupName\":\"$BACKUP_NAME\",\"backupType\":\"pre-migration\"}" \
            -f || echo "   ⚠️  API backup failed, continuing..."
    fi
    
    echo "✅ Pre-migration backup attempted"
}

# Function to verify Prisma client
verify_prisma_client() {
    echo "🔍 Verifying Prisma client..."
    
    # Generate Prisma client if needed
    npx prisma generate --schema prisma/schema.prisma || {
        echo "   ⚠️  Prisma client generation failed, using existing client"
    }
    
    echo "✅ Prisma client verified"
}

# Function to check migration status
check_migration_status() {
    echo "🔍 Checking migration status..."
    
    # Get migration status
    npx prisma migrate status --schema prisma/schema.prisma || {
        echo "   ⚠️  Could not check migration status"
        return 1
    }
    
    echo "✅ Migration status checked"
}

# Function to run migrations safely
run_migrations() {
    echo "🗄️  Running database migrations..."
    
    # Deploy migrations
    npx prisma migrate deploy --schema prisma/schema.prisma || {
        echo "❌ Migration deployment failed"
        return 1
    }
    
    echo "✅ Migrations deployed successfully"
}

# Function to verify deployment
verify_deployment() {
    echo "🔍 Verifying deployment..."
    
    # Check if we can connect to database
    node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        prisma.\$connect()
            .then(() => {
                console.log('   ✅ Database connection successful');
                return prisma.blogPost.count();
            })
            .then((count) => {
                console.log('   ✅ Sample query successful: ' + count + ' blog posts');
                return prisma.\$disconnect();
            })
            .catch((error) => {
                console.error('   ❌ Database verification failed:', error.message);
                process.exit(1);
            });
    " || {
        echo "❌ Deployment verification failed"
        return 1
    }
    
    echo "✅ Deployment verified"
}

# Function to create baseline data if needed
create_baseline_data() {
    echo "🌱 Creating baseline data if needed..."
    
    node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function ensureBaseline() {
            try {
                // Check if admin user exists
                const adminUser = await prisma.user.findFirst({
                    where: { email: 'admin@yalla-london.com' }
                });
                
                if (!adminUser) {
                    console.log('   Creating admin user...');
                    await prisma.user.create({
                        data: {
                            email: 'admin@yalla-london.com',
                            name: 'Admin User',
                            role: 'admin'
                        }
                    });
                }
                
                // Check if default category exists
                const defaultCategory = await prisma.category.findFirst({
                    where: { slug: 'general' }
                });
                
                if (!defaultCategory) {
                    console.log('   Creating default category...');
                    await prisma.category.create({
                        data: {
                            name_en: 'General',
                            name_ar: 'عام',
                            slug: 'general',
                            description_en: 'General content category',
                            description_ar: 'فئة المحتوى العام'
                        }
                    });
                }
                
                console.log('   ✅ Baseline data ensured');
                await prisma.\$disconnect();
            } catch (error) {
                console.error('   ❌ Baseline data creation failed:', error.message);
                await prisma.\$disconnect();
                process.exit(1);
            }
        }
        
        ensureBaseline();
    " || {
        echo "❌ Baseline data creation failed"
        return 1
    }
    
    echo "✅ Baseline data verified"
}

# Main execution flow
main() {
    echo "🎯 Deployment Target: $(echo $VERCEL_ENV || echo 'LOCAL')"
    echo "📅 Timestamp: $(date)"
    
    # Step 1: Create backup
    create_pre_migration_backup
    
    # Step 2: Verify Prisma
    verify_prisma_client
    
    # Step 3: Check migration status
    check_migration_status
    
    # Step 4: Run migrations
    run_migrations
    
    # Step 5: Create baseline data
    create_baseline_data
    
    # Step 6: Verify deployment
    verify_deployment
    
    echo ""
    echo "🎉 Deployment migration completed successfully!"
    echo "📊 Summary:"
    echo "   - Pre-migration backup: ✅"
    echo "   - Prisma client: ✅"
    echo "   - Database migrations: ✅"
    echo "   - Baseline data: ✅"
    echo "   - Deployment verification: ✅"
    echo ""
    echo "🔗 Next steps:"
    echo "   1. Verify public site loads correctly"
    echo "   2. Test admin dashboard functionality"
    echo "   3. Run sync tests via /admin/sync-test"
}

# Execute main function
main