
# Environment Variables Reference

Complete reference for all environment variables used in the Yalla London CMS.

## 📊 Environment Variables Table

| Variable | Description | Example | Required | Default |
|----------|-------------|---------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | ✅ | - |
| `DIRECT_URL` | Direct PostgreSQL connection (for connection pooling) | `postgresql://user:pass@host:5432/db` | ⚠️ | Same as DATABASE_URL |
| `NEXTAUTH_SECRET` | NextAuth.js secret (32+ chars) | `abcd1234efgh5678...` | ✅ | - |
| `NEXTAUTH_URL` | Application base URL | `https://yalla-london.com` | ✅ | - |
| `AWS_BUCKET_NAME` | S3 bucket name | `yalla-london-production` | ✅ | - |
| `AWS_FOLDER_PREFIX` | S3 folder prefix | `production/` | ⚠️ | `""` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` | ✅ | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `your-secret-key` | ✅ | - |
| `AWS_REGION` | AWS region | `us-east-1` | ⚠️ | `us-east-1` |
| `AWS_ENDPOINT_URL` | Custom S3 endpoint (R2) | `https://account.r2.cloudflarestorage.com` | ❌ | - |
| `ABACUSAI_API_KEY` | AI content generation | `your-abacus-key` | ✅ | - |
| `FEATURE_SEO` | Enable SEO features | `1` | ❌ | `0` |
| `FEATURE_EMBEDS` | Enable social embeds | `1` | ❌ | `0` |
| `FEATURE_MEDIA` | Enable media library | `1` | ❌ | `0` |
| `FEATURE_HOMEPAGE_BUILDER` | Enable homepage builder | `1` | ❌ | `0` |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | GA4 measurement ID | `G-XXXXXXXXXX` | ❌ | - |
| `GOOGLE_SEARCH_CONSOLE_KEY` | GSC API key | `your-gsc-key` | ❌ | - |
| `GOOGLE_SEARCH_CONSOLE_CX` | Custom search engine ID | `your-search-engine-id` | ❌ | - |
| `SENTRY_DSN` | Error tracking URL | `https://key@sentry.io/project` | ❌ | - |
| `SENTRY_ENVIRONMENT` | Environment name | `production` | ❌ | `development` |
| `SMTP_HOST` | Email server host | `smtp.gmail.com` | ❌ | - |
| `SMTP_PORT` | Email server port | `587` | ❌ | `587` |
| `SMTP_USER` | Email username | `noreply@yallalondon.com` | ❌ | - |
| `SMTP_PASSWORD` | Email password | `your-email-password` | ❌ | - |
| `NODE_ENV` | Runtime environment | `production` | ❌ | `development` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `https://yalla-london.com` | ❌ | `http://localhost:3000` |

## 🔑 Legend

- ✅ **Required**: Must be set for application to function
- ⚠️ **Recommended**: Should be set for production
- ❌ **Optional**: Enables additional features when set

## 📝 Environment-Specific Notes

### Development (.env.local)
```bash
DATABASE_URL="postgresql://localhost:5432/yalla_london_dev"
DIRECT_URL="postgresql://localhost:5432/yalla_london_dev"
NEXTAUTH_URL="http://localhost:3000"
AWS_BUCKET_NAME="yalla-london-dev"
NODE_ENV="development"
```

### Staging (.env.staging)
```bash
DATABASE_URL="postgresql://staging-db.neon.tech:5432/yalla_london_staging"
DIRECT_URL="postgresql://staging-db.neon.tech:5432/yalla_london_staging"
NEXTAUTH_URL="https://yalla-london-staging.vercel.app"
AWS_BUCKET_NAME="yalla-london-staging"
AWS_FOLDER_PREFIX="staging/"
NODE_ENV="staging"
```

### Production (.env.production)
```bash
DATABASE_URL="postgresql://prod-db.neon.tech:5432/yalla_london_prod"
DIRECT_URL="postgresql://prod-db.neon.tech:5432/yalla_london_prod"
NEXTAUTH_URL="https://yalla-london.com"
AWS_BUCKET_NAME="yalla-london-production"
AWS_FOLDER_PREFIX="production/"
NODE_ENV="production"
```

## 🔐 Security Guidelines

### Secret Management
- Never commit secrets to version control
- Use environment variable management systems (Vercel, Railway, etc.)
- Rotate secrets regularly
- Use least-privilege IAM policies

### Database Security
- Always use SSL mode (`?sslmode=require`)
- Use connection pooling in production
- Regularly backup and test restore procedures
- Monitor for suspicious queries

### API Keys
- Use separate keys for each environment
- Implement rate limiting
- Monitor usage and costs
- Restrict API key permissions to minimum required

## ⚙️ Validation Commands

### Check Required Variables
```bash
# Verify all required variables are set
node -e "
const required = ['DATABASE_URL', 'DIRECT_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'AWS_BUCKET_NAME'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  console.error('❌ Missing required variables:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
}
"
```

### Test Database Connection
```bash
# Test PostgreSQL connection
psql "$DATABASE_URL" -c "SELECT version();"
```

### Test S3 Connection
```bash
# List S3 bucket (requires AWS CLI)
aws s3 ls s3://$AWS_BUCKET_NAME/
```

### Test Feature Flags
```bash
# Check which features are enabled
node -e "
const features = ['SEO', 'EMBEDS', 'MEDIA', 'HOMEPAGE_BUILDER'];
features.forEach(feature => {
  const enabled = process.env[\`FEATURE_\${feature}\`] === '1';
  console.log(\`\${enabled ? '✅' : '❌'} FEATURE_\${feature}: \${enabled}\`);
});
"
```

## 🚨 Troubleshooting

### Common Issues

**"Invalid DATABASE_URL"**
- Check connection string format
- Verify SSL mode is included
- Test connection with `psql` directly

**"S3 Access Denied"**  
- Verify AWS credentials are correct
- Check IAM policy permissions
- Confirm bucket name and region

**"Feature not working"**
- Check feature flag is set to `1`
- Verify related environment variables
- Check browser console for errors

**"NextAuth error"**
- Ensure NEXTAUTH_SECRET is 32+ characters
- Verify NEXTAUTH_URL matches deployed URL
- Check for HTTPS in production

### Debug Commands

```bash
# Check all environment variables
env | grep -E "(DATABASE|AWS|NEXT|FEATURE)" | sort

# Test API endpoints
curl -f "$NEXT_PUBLIC_APP_URL/api/health"

# Verify build with environment
yarn build 2>&1 | grep -i error
```
