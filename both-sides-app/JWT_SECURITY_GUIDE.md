# JWT Security Guide

## Overview
This guide explains how to handle JWT tokens securely in the Both Sides application to prevent accidental leaks and security vulnerabilities.

## Current Status ✅
- **Test files contain DUMMY tokens only** - These are safe example tokens for testing JWT structure validation
- **GitGuardian alerts for test files are FALSE POSITIVES** - Can be safely ignored/resolved
- **Production secrets are properly configured** via environment variables

## Security Best Practices

### 1. Environment Variables
- **NEVER** hardcode real JWT tokens in source code
- Use `.env.local` for development secrets (already in `.gitignore`)
- Use `.env.example` as a template (safe to commit)
- Production secrets should be set in deployment environment

### 2. Test Token Guidelines
All test JWT tokens in this codebase are dummy tokens:

```javascript
// ✅ SAFE - Example token from jwt.io documentation
const EXAMPLE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// ❌ DANGEROUS - Real production token
const REAL_TOKEN = process.env.JWT_TOKEN; // Only use in production with proper env setup
```

### 3. File Locations of Test Tokens
These files contain dummy JWT tokens (safe):
- `src/__tests__/integration/auth-integration.test.ts` - Standard JWT example token
- `backend/test-profile-endpoints.js` - Dummy token for API testing
- `backend/test-class-management-endpoints.js` - Dummy token for API testing

### 4. How to Use Real Tokens Safely

#### For Development Testing:
```javascript
// In test files - use environment variable
const TEST_JWT = process.env.TEST_JWT_TOKEN || 'fallback-dummy-token';
```

#### For Production:
```javascript
// In application code - always use environment variables
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

### 5. GitGuardian Integration
- Current alerts for test files are **false positives**
- To prevent future alerts, consider adding test files to GitGuardian ignore list
- Real secrets should trigger alerts - don't ignore those!

### 6. Token Validation Checklist
Before committing code with JWT tokens:

- [ ] Is this a test/example token? ✅ Safe to commit
- [ ] Does it contain real user data? ❌ Use environment variable
- [ ] Is it from jwt.io or documentation? ✅ Safe to commit
- [ ] Does it have a real signature? ❌ Use environment variable
- [ ] Is it in a test file with clear comments? ✅ Safe to commit

### 7. Emergency Response
If a real JWT token is accidentally committed:

1. **Immediately revoke the token** in your auth provider (Clerk)
2. **Rotate the JWT secret** that signed the token
3. **Remove the token from git history** using `git filter-branch` or BFG Repo-Cleaner
4. **Update all affected users/sessions**
5. **Review and strengthen security practices**

## Example Tokens in This Codebase

### Standard JWT Example (jwt.io)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```
**Payload:** `{"sub":"1234567890","name":"John Doe","iat":1516239022}`
**Status:** ✅ Safe - Standard documentation example

### Test User Token
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXJfMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzU1MTI3MjQxLCJleHAiOjE3NTUxMzA4NDF9.JCI5CvGlIh0xbClozEfLOifpG57DaQpvB6yXEOLcz5Q
```
**Payload:** `{"sub":"test_user_123","email":"test@example.com","iat":1755127241,"exp":1755130841}`
**Status:** ✅ Safe - Dummy test data with fake signature

## Contact
For security concerns or questions about JWT handling, contact the development team.
