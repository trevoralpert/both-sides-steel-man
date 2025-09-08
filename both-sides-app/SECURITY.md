# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

1. **Do NOT** open a public GitHub issue
2. Email security@bothsides.app with details
3. Include steps to reproduce the vulnerability
4. Allow up to 48 hours for initial response

## Security Measures

### Authentication & Authorization
- Clerk authentication with JWT tokens
- Role-based access control (RBAC)
- Session management with secure cookies
- Multi-factor authentication support

### Data Protection
- Encryption in transit (HTTPS/TLS)
- Encryption at rest for sensitive data
- PII data classification and handling
- FERPA compliance for educational records

### API Security
- Input validation and sanitization
- Rate limiting on all endpoints
- CORS configuration
- SQL injection prevention
- XSS protection

### Infrastructure Security
- Security headers (CSP, HSTS, etc.)
- Network security and firewall rules
- Regular dependency updates
- Automated security scanning

## Security Headers

The application implements the following security headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy`: Comprehensive CSP policy
- `Referrer-Policy: strict-origin-when-cross-origin`

## Rate Limiting

API endpoints are protected with rate limiting:

- General API: 100 requests per 15 minutes
- Authentication: 10 attempts per 15 minutes  
- Messages: 30 per minute
- Surveys: 5 submissions per hour

## Vulnerability Management

- Automated dependency scanning with GitHub Dependabot
- Regular security audits with `npm audit`
- Static application security testing (SAST)
- Penetration testing on critical updates

## Compliance

- FERPA compliance for student data
- Educational data privacy standards
- Regular compliance audits

## Security Contacts

- Security Team: security@bothsides.app
- Privacy Officer: privacy@bothsides.app
- Compliance: compliance@bothsides.app

---

*Last updated: $(date +'%Y-%m-%d')*