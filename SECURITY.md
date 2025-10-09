# Security Documentation - The Forge

## Overview

The Forge handles sensitive Personally Identifiable Information (PII) including names, addresses, phone numbers, dates of birth, Medicare information, and uploaded documents. This document outlines security measures and best practices.

---

## Data Protection Status

### ✅ Currently Implemented

**Encryption:**
- ✅ HTTPS/SSL encryption for all data in transit
- ✅ SSL certificate auto-renews via Let's Encrypt
- ✅ Secure domain: https://the4rge.com

**Authentication:**
- ✅ NextAuth v5 with bcrypt password hashing
- ✅ Session-based authentication with JWT tokens
- ✅ Protected API routes (authentication required)

**Backup & Recovery:**
- ✅ Daily automated backups (database + images)
- ✅ 7-day backup retention
- ✅ Weekly DigitalOcean server snapshots (4-week retention)
- ✅ Safety backups before restoration
- ✅ Database excluded from version control

**Infrastructure:**
- ✅ Nginx reverse proxy with security headers
- ✅ PM2 process management with auto-restart
- ✅ DigitalOcean VPS hosting

### ⚠️ Future Considerations

**Access Control:**
- ⚠️ IP whitelisting for administrative access
- ⚠️ Rate limiting for login attempts
- ⚠️ VPN requirement for sensitive operations

**Enhanced Authentication:**
- ⚠️ Two-factor authentication (2FA)
- ⚠️ Password complexity requirements
- ⚠️ Password expiration policies
- ⚠️ Failed login attempt monitoring

**Data Protection:**
- ⚠️ Database encryption at rest
- ⚠️ Field-level encryption for SSNs/sensitive data
- ⚠️ Automated PII detection and masking

**Compliance:**
- ⚠️ HIPAA compliance considerations (if handling health data)
- ⚠️ Data retention policies
- ⚠️ User data deletion procedures
- ⚠️ Audit logging

---

## Environment Variables - CRITICAL

### Current Environment Variables

**Location:** `/var/www/the-forge/.env.local` (production server)

**Contents:**
```bash
AUTH_SECRET=<random-secret-key>
NEXTAUTH_URL=https://the4rge.com
```

### ⚠️ BACKUP YOUR ENVIRONMENT VARIABLES NOW

**These are NOT backed up automatically and are needed to rebuild the server.**

**To backup:**
```bash
ssh root@143.244.185.41
cat /var/www/the-forge/.env.local
```

**Copy and store securely in:**
- Password manager (1Password, LastPass, Bitwarden)
- Secure note in encrypted storage
- Encrypted file on your computer

**DO NOT:**
- ❌ Commit to GitHub
- ❌ Email to yourself
- ❌ Store in plain text file
- ❌ Share with anyone

### Regenerating AUTH_SECRET (if lost)

If you lose your `AUTH_SECRET`, all existing sessions will be invalidated and users will need to log in again.

```bash
# Generate new secret
openssl rand -base64 32

# Update .env.local with new secret
nano /var/www/the-forge/.env.local

# Restart application
pm2 restart the-forge --update-env
pm2 save
```

---

## SSL Certificate Management

### Current Status
- **Domain:** the4rge.com
- **Provider:** Let's Encrypt (free)
- **Renewal:** Automatic via Certbot
- **Validity:** 90 days, auto-renews at 30 days remaining

### Check Certificate Status
```bash
ssh root@143.244.185.41
certbot certificates
```

Should show:
```
Certificate Name: the4rge.com
  Expiry Date: YYYY-MM-DD (>30 days)
  Certificate Path: /etc/letsencrypt/live/the4rge.com/fullchain.pem
  Private Key Path: /etc/letsencrypt/live/the4rge.com/privkey.pem
```

### Manual Renewal (if needed)
```bash
certbot renew
systemctl reload nginx
```

### If Certificate Expires

**Symptoms:**
- Browser shows "Your connection is not private"
- Site shows SSL warning

**Fix:**
```bash
ssh root@143.244.185.41
certbot renew --force-renewal
systemctl reload nginx
```

---

## Access Control

### Current Access
- **SSH Access:** Password authentication (root@143.244.185.41)
- **Application Access:** Username/password via NextAuth
- **Network:** Public internet access (no IP restrictions)

### Recommended Improvements

**1. SSH Key Authentication**
```bash
# Generate SSH key on local machine (if not already done)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy to server
ssh-copy-id root@143.244.185.41

# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

**2. Firewall Rules**
```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (redirects to HTTPS)
ufw allow 443/tcp  # HTTPS
ufw enable
```

**3. IP Whitelisting (for your office/home)**
```bash
# In Nginx config, restrict access to specific IPs
# /etc/nginx/sites-available/the-forge
location / {
    allow YOUR_HOME_IP;
    allow YOUR_OFFICE_IP;
    deny all;
    # ... rest of config
}
```

---

## Data Handling Best Practices

### Personally Identifiable Information (PII)

**Data We Collect:**
- Full names
- Physical addresses
- Phone numbers (primary and secondary)
- Email addresses
- Dates of birth
- Age, gender, marital status
- Occupation and income
- Medicare/insurance information
- Uploaded documents (IDs, applications, etc.)

**How We Protect It:**
- ✅ Encrypted in transit (HTTPS)
- ✅ Backed up daily (encrypted backups recommended)
- ✅ Access controlled (authentication required)
- ✅ Not exposed in logs or error messages
- ⚠️ Not encrypted at rest (future consideration)

### Uploaded Images

**Current Security:**
- Stored in `/public/uploads/` on server
- Included in daily backups
- Served only to authenticated users (via API)
- Not directly accessible via public URLs

**File Upload Security:**
- File type validation (images only)
- File size limits enforced
- Unique filenames generated (UUID)
- Stored outside web root (not directly accessible)

---

## Incident Response Plan

### If You Suspect a Security Breach

**1. Immediate Actions:**
```bash
# Stop the application
pm2 stop the-forge

# Block all access via firewall
ufw deny 443/tcp
```

**2. Investigation:**
- Check PM2 logs: `pm2 logs the-forge --lines 500`
- Check Nginx access logs: `tail -100 /var/log/nginx/access.log`
- Check for unauthorized SSH access: `last -20`
- Check for file modifications: `find /var/www/the-forge -mtime -1`

**3. Recovery:**
- Restore from clean backup
- Change all passwords (server, application, database if applicable)
- Regenerate AUTH_SECRET
- Review and update security measures

**4. Notification:**
- Document what happened
- Determine if PII was exposed
- Consider regulatory requirements (HIPAA, state breach laws)

### If You Lose Access to Production Server

**1. DigitalOcean Console Access:**
- Login to DigitalOcean dashboard
- Use "Access" → "Launch Console" for direct server access

**2. Server Locked/Compromised:**
- Restore from latest DigitalOcean snapshot
- Change all passwords
- Review security logs

**3. Complete Server Loss:**
- Provision new DigitalOcean droplet
- Restore from DigitalOcean snapshot OR rebuild from scratch
- Restore latest backup of database/images
- Reconfigure domain DNS if needed

---

## Security Audit Checklist

### Monthly Review

- [ ] SSL certificate has >30 days remaining
- [ ] Daily backups are running (check `/var/www/the-forge/backups/`)
- [ ] DigitalOcean snapshots are being created weekly
- [ ] No unauthorized user accounts exist
- [ ] PM2 logs show no suspicious activity
- [ ] Server OS is up to date: `apt update && apt list --upgradable`
- [ ] Application dependencies are current (check for security updates)

### Quarterly Review

- [ ] Test backup restoration procedure
- [ ] Review user access logs (future feature)
- [ ] Update all passwords
- [ ] Review and update this security documentation
- [ ] Check for known vulnerabilities in dependencies: `npm audit`
- [ ] Verify firewall rules are current

### Annual Review

- [ ] Full security assessment
- [ ] Consider penetration testing
- [ ] Review compliance requirements
- [ ] Update disaster recovery procedures
- [ ] Train team on security best practices

---

## Security Contacts

**For Security Issues:**
- Review logs and documentation first
- Check DISASTER_RECOVERY.md for data issues
- Check DEPLOYMENT_CHECKLIST.md for deployment issues

**Reporting Vulnerabilities:**
- Document the issue with steps to reproduce
- Include impact assessment
- Do not publicly disclose until fixed

---

## Regulatory Compliance

### Current Status: Not HIPAA Compliant

If you plan to handle Protected Health Information (PHI), additional measures required:
- Business Associate Agreements (BAA)
- Encryption at rest
- Comprehensive audit logging
- Access controls and user activity monitoring
- Data retention and deletion policies
- Regular security risk assessments

**Consult with legal/compliance team before handling PHI.**

---

## Password Security

### Application Passwords
- Stored using bcrypt hashing (strong)
- Never stored in plain text
- Cannot be recovered (only reset)

### Server Password
- Current: Password-based SSH authentication
- Recommended: Switch to SSH key authentication
- Change regularly (every 90 days)

### Best Practices
- Use unique passwords for each system
- Use password manager (1Password, LastPass, Bitwarden)
- Minimum 12 characters, include numbers/symbols/uppercase
- Never share passwords via email/chat
- Use 2FA where available

---

## Last Updated

October 9, 2025

---

**Remember: Security is an ongoing process, not a one-time setup. Review and update these practices regularly.**
