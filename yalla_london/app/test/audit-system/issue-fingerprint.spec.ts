/**
 * Unit tests for issue fingerprinting.
 */

import { createIssueFingerprint } from '../../lib/audit-system/issue-fingerprint';

describe('createIssueFingerprint', () => {
  it('produces deterministic output for same inputs', () => {
    const fp1 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog/test', 'metadata', 'Missing meta description');
    const fp2 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog/test', 'metadata', 'Missing meta description');
    expect(fp1).toBe(fp2);
  });

  it('is a 16-char hex string', () => {
    const fp = createIssueFingerprint('yalla-london', 'https://yalla-london.com/', 'http', 'Page returns 500');
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });

  it('differs for different URLs', () => {
    const fp1 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog/a', 'metadata', 'Title too short');
    const fp2 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog/b', 'metadata', 'Title too short');
    expect(fp1).not.toBe(fp2);
  });

  it('differs for different categories', () => {
    const fp1 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog/a', 'metadata', 'Issue X');
    const fp2 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog/a', 'canonical', 'Issue X');
    expect(fp1).not.toBe(fp2);
  });

  it('differs for different sites', () => {
    const fp1 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/', 'http', 'Server error');
    const fp2 = createIssueFingerprint('zenitha-yachts-med', 'https://yalla-london.com/', 'http', 'Server error');
    expect(fp1).not.toBe(fp2);
  });

  it('normalizes URL trailing slashes', () => {
    const fp1 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog/test/', 'http', 'Error');
    const fp2 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog/test', 'http', 'Error');
    expect(fp1).toBe(fp2);
  });

  it('normalizes URL case', () => {
    const fp1 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/Blog/Test', 'http', 'Error');
    const fp2 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog/test', 'http', 'Error');
    expect(fp1).toBe(fp2);
  });

  it('strips query params from URL', () => {
    const fp1 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog?page=1', 'http', 'Error');
    const fp2 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/blog?page=2', 'http', 'Error');
    expect(fp1).toBe(fp2);
  });

  it('normalizes title whitespace', () => {
    const fp1 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/', 'metadata', 'Missing  meta   description');
    const fp2 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/', 'metadata', 'Missing meta description');
    expect(fp1).toBe(fp2);
  });

  it('is case-insensitive for titles', () => {
    const fp1 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/', 'metadata', 'Missing Meta Description');
    const fp2 = createIssueFingerprint('yalla-london', 'https://yalla-london.com/', 'metadata', 'missing meta description');
    expect(fp1).toBe(fp2);
  });

  it('handles non-parseable URLs gracefully', () => {
    const fp = createIssueFingerprint('yalla-london', 'not-a-valid-url', 'http', 'Error');
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });
});
