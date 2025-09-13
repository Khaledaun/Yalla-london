# CI/CD Failure Detector Action

A GitHub Action that automatically detects critical job failures or skips in CI/CD workflows and creates GitHub issues for immediate visibility and accountability.

## Features

- 🔍 **Monitors Critical Jobs**: Tracks specified critical jobs for failures and skips
- 🚨 **Automatic Issue Creation**: Creates detailed GitHub issues when failures are detected
- 🔒 **Deduplication**: Ensures only one issue per workflow run (prevents spam)
- 📊 **Rich Context**: Includes workflow details, run logs, and direct links
- 📝 **Job Summaries**: Adds workflow summaries showing detection results

## Usage

```yaml
- name: Detect CI/CD failures
  id: failure-detector
  uses: ./.github/actions/failure-detector
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    workflow-name: 'My Workflow Name'
    run-id: ${{ github.run_id }}
    critical-jobs: 'lint,test,build,deploy'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github-token` | GitHub token for API access | Yes | - |
| `workflow-name` | Name of the workflow | Yes | - |
| `run-id` | GitHub workflow run ID | Yes | - |
| `critical-jobs` | Comma-separated list of critical job names | Yes | `lint-and-typecheck,build-and-test,migration-check,security-scan,full-test-suite,rbac-security-tests,dependency-audit,compliance-check` |

## Outputs

| Output | Description |
|--------|-------------|
| `issue-created` | Whether an issue was created (`true`/`false`) |
| `issue-url` | URL of the created issue (if any) |

## Example Issue Created

When a failure is detected, the action creates an issue with:

**Title**: `CI/CD Critical Failure Detected - Enterprise CI/CD Pipeline (Run #123)`

**Labels**: `ci-failure`, `automated`, `priority-high`

**Content**:
- Workflow information (name, run ID, branch, commit SHA)
- Status summary (failed/skipped job counts)
- Detailed list of failed/skipped jobs with IDs
- Direct link to workflow run
- Next steps for resolution
- Timestamp information

## Integration Examples

### Main CI/CD Pipeline

```yaml
jobs:
  # ... other jobs ...
  
  detect-failures:
    name: Detect CI/CD Failures
    runs-on: ubuntu-latest
    needs: [lint, test, build, deploy]
    if: always()
    
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/failure-detector
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          workflow-name: 'Main Pipeline'
          run-id: ${{ github.run_id }}
          critical-jobs: 'lint,test,build,deploy'
```

### Security Pipeline

```yaml
jobs:
  # ... security jobs ...
  
  detect-security-failures:
    name: Detect Security Failures
    runs-on: ubuntu-latest
    needs: [sast, dast, dependency-scan]
    if: always()
    
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/failure-detector
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          workflow-name: 'Security Automation'
          run-id: ${{ github.run_id }}
          critical-jobs: 'sast,dast,dependency-scan'
```

## Deduplication Logic

The action prevents issue spam by:

1. Searching for existing open issues with the `ci-failure` label
2. Checking if any issue body contains the current run ID
3. Skipping issue creation if a duplicate is found
4. Outputting the existing issue URL for reference

## Error Handling

- Gracefully handles API failures
- Continues workflow execution even if issue creation fails
- Provides detailed logging for troubleshooting
- Uses `continue-on-error: true` pattern when integrated

## Testing

Use the test workflow to validate the failure detection:

```bash
# Test critical job failure
gh workflow run test-failure-detection.yml -f simulate_failure=test-job-1

# Test job skip
gh workflow run test-failure-detection.yml -f simulate_skip=test-job-1

# Test non-critical job failure (should not create issue)
gh workflow run test-failure-detection.yml -f simulate_failure=test-job-3
```

## Security Considerations

- Uses provided `GITHUB_TOKEN` for API access
- Only creates issues in the same repository
- Does not expose sensitive information in issue content
- Follows GitHub's rate limiting guidelines

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure `GITHUB_TOKEN` has `issues: write` permission
2. **Job Not Found**: Verify job names match exactly (case-sensitive)
3. **API Rate Limiting**: Implement delays between API calls if needed

### Debug Mode

Enable debug logging by setting `ACTIONS_STEP_DEBUG=true` in repository secrets.