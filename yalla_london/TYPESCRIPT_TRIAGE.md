
# TypeScript Error Triage Table

| File | Line | Code | Message | Root Cause | Proposed Fix |
|------|------|------|---------|------------|--------------|
| `components/enhanced-metadata.tsx` | 148 | TS2552 | Cannot find name 'schemaGenerator' | Old import pattern, not using class instance | Replace with `new SchemaGenerator()` pattern |
| `components/enhanced-metadata.tsx` | 206 | TS2552 | Cannot find name 'schemaGenerator' | Same as above | Replace with `new SchemaGenerator()` pattern |  
| `components/enhanced-metadata.tsx` | 259 | TS2552 | Cannot find name 'schemaGenerator' | Same as above | Replace with `new SchemaGenerator()` pattern |
| `components/seo/breadcrumbs.tsx` | 30 | TS2552 | Cannot find name 'schemaGenerator' | Same as above | Replace with `new SchemaGenerator()` pattern |
| `components/seo/structured-content.tsx` | 244 | TS2339 | Property 'generateStructuredSummary' does not exist | Method name mismatch | Need to implement or rename method |
| `lib/seo/schema-generator.ts` | 349 | TS2322 | 'keywords' does not exist in type 'ArticleSchema' | Interface mismatch | Update ArticleSchema interface to include keywords |

## Summary
- **Total Errors**: 6
- **Primary Issue**: Schema generator import/usage pattern inconsistencies
- **Secondary Issue**: Missing interface properties and methods
- **Estimated Fix Time**: 15-20 minutes
