# GitHub Secrets UI Screenshots

This directory contains screenshots referenced in the documentation.

## Required Screenshots

### 1. github-secrets-ui.png
Screenshot showing the GitHub repository Settings → Secrets and variables → Actions page with configured secrets.

**How to capture:**
1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions  
3. Take a screenshot showing the secrets list (without revealing values)
4. Save as `github-secrets-ui.png`

**Should show:**
- Repository secrets list
- "New repository secret" button
- Secret names (values should be hidden)
- Environment variables section

### 2. workflow-debug-output.png (Optional)
Screenshot showing the debug output from a workflow run displaying secret availability.

**Should show:**
- Debug step output with ✅ yes / ❌ no indicators
- Secret names without revealing actual values
- Clear indication of which secrets are configured

## Usage

These screenshots are referenced in:
- `README.md` - Main setup instructions
- `docs/ci-cd-troubleshooting.md` - Troubleshooting guide

## Security Note

**NEVER** include actual secret values in screenshots. GitHub automatically hides secret values in the UI, but always verify before committing images.