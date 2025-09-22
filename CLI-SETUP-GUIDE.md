# CLI Setup Guide for Vercel & Supabase

This guide provides step-by-step instructions to connect your local Yalla London project to Vercel and Supabase using CLI tools (no GitHub OAuth required).

## 🚀 Vercel CLI Setup

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
# Choose "Email" option and follow the magic link
```

### 3. Link Your Project
```bash
# From your project root directory
vercel link
# Choose to link to existing project or create new one
```

### 4. Environment Variables
```bash
# Pull existing environment variables from Vercel
vercel env pull .env

# Add missing environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add other required vars as needed

# List all environment variables
vercel env ls
```

### 5. Development & Deployment
```bash
# Run local development with Vercel
vercel dev

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 6. Quick Status Checks
```bash
# Check who you're logged in as
vercel whoami

# List your projects
vercel projects list

# Check environment variables
vercel env ls
```

---

## 🗄️ Supabase CLI Setup

### 1. Install Supabase CLI
```bash
npm i -g supabase
```

### 2. Login to Supabase
```bash
supabase login
# Paste your Supabase access token from: https://supabase.com/dashboard/account/tokens
```

### 3. Link Your Project
```bash
# Get your project reference from Supabase Dashboard → Settings → General
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Generate TypeScript Types (Optional)
```bash
# Generate types for your database schema
supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > types/database.ts
```

### 5. Deploy Edge Functions (If Using)
```bash
# Deploy a specific function
supabase functions deploy function-name

# Deploy all functions
supabase functions deploy
```

### 6. Local Development (Optional)
```bash
# Start local Supabase stack
supabase start

# Stop local stack
supabase stop
```

### 7. Quick Status Checks
```bash
# List your projects
supabase projects list

# Check project status
supabase status
```

---

## 🔧 Environment Variables Setup

### Required Variables for Supabase
```bash
# Add these to your .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Get Your Supabase Keys
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🧪 Health Check Commands

### Test Supabase Connection
```bash
# From the app directory
cd yalla_london/app
yarn health
# or
npm run health
```

### Test Vercel Connection
```bash
vercel whoami
vercel projects list
```

### Test Supabase Connection
```bash
supabase projects list
supabase status
```

---

## 📋 Quick Setup Checklist

- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Install Supabase CLI: `npm i -g supabase`
- [ ] Login to Vercel: `vercel login`
- [ ] Login to Supabase: `supabase login`
- [ ] Link Vercel project: `vercel link`
- [ ] Link Supabase project: `supabase link --project-ref YOUR_REF`
- [ ] Copy `env.example` to `.env.local` and fill in values
- [ ] Test health check: `yarn health`
- [ ] Deploy to Vercel: `vercel --prod`

---

## 🆘 Troubleshooting

### Vercel Issues
- **Login fails**: Try `vercel logout` then `vercel login` again
- **Project not found**: Check you're in the right directory and have correct permissions
- **Env vars not syncing**: Use `vercel env pull .env` to sync

### Supabase Issues
- **Token expired**: Get a new token from Supabase Dashboard
- **Project not found**: Verify project reference ID is correct
- **Types not generating**: Ensure you have proper database schema

### Health Check Issues
- **Supabase not reachable**: Check environment variables and network
- **Script not found**: Ensure you're in the `yalla_london/app` directory
- **Permission denied**: Make sure the script is executable

