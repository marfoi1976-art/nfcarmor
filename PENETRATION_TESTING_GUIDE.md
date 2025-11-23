# NFC Transaction System - Penetration Testing Guide

## Overview
This comprehensive guide provides detailed information for penetration testing the Secure NFC Payment system. The system implements multiple layers of security including authentication, authorization, transaction validation, fraud detection, and audit logging.

## System Architecture

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **NFC**: Web NFC API
- **Security**: Row Level Security (RLS), PIN verification, Transaction signatures

### Security Layers
1. **Authentication Layer**: Email/password + PIN verification
2. **Authorization Layer**: Row Level Security policies
3. **Transaction Layer**: Signature verification, fraud detection
4. **Audit Layer**: Comprehensive security logging
5. **Device Layer**: NFC device registration and management

---

## Test Categories

### 1. Authentication & Authorization Tests

#### Test 1.1: Account Lockout Mechanism
**Objective**: Test if accounts lock after 5 failed login attempts

**Steps**:
1. Register a new account
2. Attempt to sign in with wrong password 5 times
3. Verify account status changes to 'locked'
4. Verify security log entry created with severity 'critical'

**Expected Result**: Account should be locked and unable to authenticate

**SQL Query to Verify**:
```sql
SELECT status, failed_auth_attempts, last_failed_auth
FROM users
WHERE email = 'test@example.com';
```

#### Test 1.2: PIN Verification Bypass
**Objective**: Attempt to process transaction without valid PIN

**Steps**:
1. Authenticate normally
2. Attempt transaction with incorrect PIN
3. Verify transaction is rejected
4. Check security logs for invalid PIN event

**Expected Result**: Transaction should fail, security event logged

#### Test 1.3: SQL Injection in Authentication
**Objective**: Test SQL injection vulnerabilities

**Test Inputs**:
- Email: `admin' OR '1'='1`
- Email: `test@example.com'; DROP TABLE users;--`
- Password: `' OR '1'='1' --`

**Expected Result**: All should be safely handled by parameterized queries

---

### 2. Row Level Security (RLS) Tests

#### Test 2.1: Cross-User Data Access
**Objective**: Verify users cannot access other users' data

**Steps**:
1. Create two user accounts (User A and User B)
2. Authenticate as User A
3. Attempt to query User B's transactions using direct SQL or API manipulation
4. Use browser dev tools to modify requests

**SQL to Test** (should return empty or error):
```sql
-- As User A, trying to access User B's data
SELECT * FROM transactions WHERE user_id = '<user_b_id>';
```

**Expected Result**: No data returned or authorization error

#### Test 2.2: Device Ownership Bypass
**Objective**: Verify users cannot use another user's NFC device

**Steps**:
1. Register device with User A
2. Authenticate as User B
3. Attempt to use User A's device UID in transaction
4. Verify transaction is rejected

**Expected Result**: Transaction should fail device ownership check

#### Test 2.3: Security Log Tampering
**Objective**: Verify users cannot modify or delete security logs

**Steps**:
1. Authenticate as regular user
2. Attempt to DELETE or UPDATE security_logs table
3. Use browser console or direct SQL

**Expected Result**: All modification attempts should fail

---

### 3. Transaction Security Tests

#### Test 3.1: Daily Limit Bypass
**Objective**: Attempt to exceed daily transaction limit

**Steps**:
1. Create account with $1000 daily limit
2. Process transaction for $600 (approved)
3. Process transaction for $500 (should be declined)
4. Verify total doesn't exceed limit

**Expected Result**: Second transaction should be rejected

#### Test 3.2: Duplicate Transaction Detection
**Objective**: Test duplicate transaction prevention

**Steps**:
1. Process a transaction
2. Immediately submit identical transaction (same merchant, amount)
3. Verify risk score increases
4. Check if flagged as suspicious

**Expected Result**: Duplicate should have high risk score

#### Test 3.3: Transaction Signature Tampering
**Objective**: Verify transaction signature validation

**Steps**:
1. Intercept transaction request
2. Modify amount or merchant_id
3. Submit with original signature
4. Verify rejection

**Expected Result**: Transaction should fail signature verification

#### Test 3.4: Negative Amount Transaction
**Objective**: Test for negative amount handling

**Test Inputs**:
- Amount: -50.00
- Amount: 0.00

**Expected Result**: Both should be rejected (CHECK constraint)

#### Test 3.5: Fraud Detection Evasion
**Objective**: Test if fraud detection can be bypassed

**Risk Factors to Test**:
- Amount > $500 (+30 risk)
- 3+ transactions in 5 minutes (+40 risk)
- Daily total > $1000 (+50 risk)
- Duplicate transactions (+70 risk)

**Steps**: Try to process high-risk transactions that evade detection

**Expected Result**: Risk score should accurately reflect threat level

---

### 4. NFC Security Tests

#### Test 4.1: Device UID Spoofing
**Objective**: Test if fake device UIDs are accepted

**Steps**:
1. Register legitimate device
2. Attempt transaction with fabricated device UID
3. Verify device ownership validation

**Expected Result**: Unknown devices should be auto-registered, but ownership verified

#### Test 4.2: Deactivated Device Usage
**Objective**: Verify deactivated devices cannot be used

**Steps**:
1. Register and deactivate a device
2. Attempt transaction with deactivated device UID
3. Verify rejection

**Expected Result**: Transaction should fail

---

### 5. Data Exposure Tests

#### Test 5.1: Sensitive Data in Responses
**Objective**: Check for exposed sensitive data

**Items to Check**:
- PIN hashes in API responses
- Full device UIDs exposed unnecessarily
- User passwords in any form
- Transaction signatures exposed

**Expected Result**: No sensitive data should be exposed

#### Test 5.2: Browser Storage Inspection
**Objective**: Check for sensitive data in localStorage/sessionStorage

**Steps**:
1. Open browser dev tools
2. Check Application > Storage
3. Look for PINs, passwords, sensitive tokens

**Expected Result**: No sensitive data in plain text

---

### 6. Rate Limiting Tests

#### Test 6.1: Transaction Velocity Check
**Objective**: Test rapid transaction attempts

**Steps**:
1. Attempt 5+ transactions within 5 minutes
2. Verify rate limiting or increased risk scores
3. Check security logs

**Expected Result**: High velocity should increase risk scores

#### Test 6.2: API Endpoint Flooding
**Objective**: Test for DoS vulnerabilities

**Steps**:
1. Send 100+ rapid requests to authentication endpoint
2. Send 100+ rapid requests to transaction endpoint
3. Monitor system response

**Expected Result**: System should handle gracefully or rate limit

---

### 7. Session Management Tests

#### Test 7.1: Session Hijacking
**Objective**: Test session token security

**Steps**:
1. Authenticate and capture session token
2. Try to use token from different IP/browser
3. Verify session validation

**Expected Result**: Supabase handles session security

#### Test 7.2: Token Expiration
**Objective**: Verify expired tokens are rejected

**Steps**:
1. Authenticate and wait for token expiration
2. Attempt to use expired token
3. Verify rejection

**Expected Result**: Expired tokens should be rejected

---

### 8. Input Validation Tests

#### Test 8.1: XSS Attacks
**Objective**: Test for cross-site scripting vulnerabilities

**Test Inputs** (in merchant name, device name):
- `<script>alert('XSS')</script>`
- `<img src=x onerror=alert('XSS')>`
- `javascript:alert('XSS')`

**Expected Result**: All should be sanitized or escaped

#### Test 8.2: SQL Injection
**Objective**: Test SQL injection in all input fields

**Test Inputs**:
- `' OR '1'='1`
- `'; DROP TABLE transactions;--`
- `1' UNION SELECT * FROM users--`

**Expected Result**: Parameterized queries should prevent all injection

#### Test 8.3: NoSQL Injection
**Objective**: Test JSONB field injection

**Test in geolocation field**:
- `{"$ne": null}`
- `{"lat": {"$gt": ""}}

**Expected Result**: JSON validation should prevent injection

---

### 9. Business Logic Tests

#### Test 9.1: Race Conditions
**Objective**: Test for race conditions in transaction processing

**Steps**:
1. Submit 2 identical transactions simultaneously
2. Verify both aren't approved if they exceed daily limit

**Expected Result**: Proper locking should prevent race conditions

#### Test 9.2: Status Manipulation
**Objective**: Attempt to change transaction status after creation

**Steps**:
1. Create transaction with 'declined' status
2. Attempt to UPDATE status to 'approved'
3. Verify RLS prevents modification

**Expected Result**: Transaction status should be immutable by users

---

### 10. Audit & Compliance Tests

#### Test 10.1: Audit Trail Completeness
**Objective**: Verify all security events are logged

**Events to Verify**:
- User signup
- User signin/signout
- Failed authentication
- PIN verification failures
- Device registration/deactivation
- Transaction processing
- Account lockout

**Expected Result**: All events should be in security_logs table

#### Test 10.2: Log Integrity
**Objective**: Verify logs cannot be tampered with

**Steps**:
1. Attempt to modify existing log entries
2. Attempt to delete log entries
3. Verify RLS prevents both

**Expected Result**: Logs should be immutable

---

## Attack Vectors Summary

### High Priority
1. ✅ SQL Injection (Protected by parameterized queries)
2. ✅ Authentication bypass (Protected by Supabase Auth + PIN)
3. ✅ Cross-user data access (Protected by RLS)
4. ✅ Transaction signature tampering (Protected by SHA-256)
5. ✅ Daily limit bypass (Protected by server-side validation)

### Medium Priority
6. ✅ Session hijacking (Handled by Supabase)
7. ✅ Rate limiting (Risk score increases with velocity)
8. ✅ Device spoofing (Device ownership verified)
9. ✅ XSS attacks (React escapes by default)
10. ✅ Fraud detection evasion (Multi-factor risk scoring)

### Low Priority
11. ✅ Log tampering (RLS prevents modification)
12. ✅ Account enumeration (Generic error messages)
13. ✅ Browser storage exposure (Session managed by Supabase)

---

## Testing Tools

### Recommended Tools
1. **Burp Suite**: HTTP request interception and manipulation
2. **OWASP ZAP**: Automated vulnerability scanning
3. **Postman**: API endpoint testing
4. **sqlmap**: SQL injection testing
5. **Browser DevTools**: Client-side inspection
6. **Supabase Dashboard**: Direct database access for verification

### Manual Testing Checklist
- [ ] Create multiple test accounts
- [ ] Test all authentication flows
- [ ] Attempt cross-user data access
- [ ] Test transaction limits and validations
- [ ] Verify fraud detection scoring
- [ ] Check security log completeness
- [ ] Test device registration/deactivation
- [ ] Attempt SQL injection on all inputs
- [ ] Test rate limiting
- [ ] Verify RLS policies on all tables

---

## Security Features Implemented

### ✅ Authentication
- Email/password authentication
- PIN-based transaction authorization
- Account lockout after 5 failed attempts
- Failed authentication tracking

### ✅ Authorization
- Row Level Security on all tables
- User-specific data access policies
- Device ownership verification
- Immutable security logs

### ✅ Transaction Security
- Cryptographic signature verification
- Real-time fraud detection scoring
- Daily transaction limits
- Duplicate transaction detection
- Velocity checks

### ✅ Audit & Compliance
- Comprehensive security event logging
- Tamper-proof audit trail
- Event severity classification
- Security score calculation

### ✅ Data Protection
- PIN hashing (SHA-256)
- Transaction signature generation
- Sensitive data never exposed in responses
- Database-level constraints

---

## Known Limitations

1. **NFC API Support**: Web NFC API only works on Chrome for Android (experimental)
2. **Client-Side NFC Reading**: NFC tag reading happens client-side
3. **PIN Hashing**: Using SHA-256 (consider bcrypt for production)
4. **Rate Limiting**: Application-level only (consider edge function rate limiting)

---

## Reporting Vulnerabilities

### What to Report
- Any successful bypass of authentication or authorization
- Data exposure or privacy issues
- SQL injection or XSS vulnerabilities
- Business logic flaws
- Rate limiting bypasses

### Report Format
1. Vulnerability title
2. Severity (Critical/High/Medium/Low)
3. Steps to reproduce
4. Proof of concept
5. Suggested fix

---

## Quick Start for Pen Testing

### 1. Set Up Test Environment
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Create Test Accounts
- Create 2-3 test accounts with different PINs
- Register devices for each account
- Process various transactions

### 3. Access Database Directly
- Use Supabase dashboard
- Run SQL queries to verify security
- Check RLS policies

### 4. Test Attack Vectors
- Start with authentication tests
- Move to authorization (RLS) tests
- Test transaction security
- Verify audit logging

### 5. Document Findings
- Screenshot evidence
- SQL queries used
- API requests/responses
- Security log entries

---

## Security Contact

For security issues found during testing:
- Document thoroughly
- Include reproduction steps
- Provide proof of concept
- Suggest mitigation strategies

---

**Remember**: This is a security testing environment. Test responsibly and document all findings.
