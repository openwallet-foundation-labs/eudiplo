---
name: 🐛 Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: ['bug', 'needs-triage']
assignees: ''
---

## 🐛 Bug Description

A clear and concise description of what the bug is.

## 🔄 Steps to Reproduce

Steps to reproduce the behavior:

1. Make API call to '...'
2. Send request with payload '....'
3. Check response status/body
4. See error

## ✅ Expected Behavior

A clear and concise description of what you expected to happen (expected
response, status code, etc.).

## ❌ Actual Behavior

A clear and concise description of what actually happened (actual response,
error message, status code, etc.).

## API Request/Response

If applicable, provide the actual API request and response:

**Request:**

```http
POST /api/endpoint
Content-Type: application/json

{
  "example": "payload"
}
```

**Response:**

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "error": "Something went wrong"
}
```

## 📋 Logs

If applicable, include relevant server logs or error messages.

## 🌍 Environment

Please complete the following information:

- OS: [e.g. macOS, Windows, Linux]
- Node.js version: [e.g. 18.17.0]
- Service version: [e.g. 1.0.0]
- environment configuration

## 📋 Additional Context

Add any other context about the problem here.

## ✔️ Checklist

- [ ] I have searched for existing issues before creating this one
- [ ] I have provided all the requested information
- [ ] I can reproduce this issue consistently
- [ ] This issue is not related to a security vulnerability (use security policy
      instead)
