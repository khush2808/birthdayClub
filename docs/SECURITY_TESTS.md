# Security Tests

This file documents manual testing for the security features implemented.

## 1. Testing Input Validation

### Valid Registration
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "dateOfBirth": "1990-05-15"
  }'
```

### Invalid Email Test
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "invalid-email",
    "dateOfBirth": "1990-05-15"
  }'
```

### XSS Attempt Test
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert('xss')</script>",
    "email": "test@example.com",
    "dateOfBirth": "1990-05-15"
  }'
```

### Invalid Date Test
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "dateOfBirth": "2030-05-15"
  }'
```

## 2. Testing API Authentication

### Without API Key
```bash
curl -X POST http://localhost:3000/api/send-birthday-emails
```

### With API Key (if configured)
```bash
curl -X POST http://localhost:3000/api/send-birthday-emails \
  -H "x-api-key: your-api-key-here"
```

### GET Endpoint Test
```bash
curl -X GET http://localhost:3000/api/send-birthday-emails \
  -H "x-api-key: your-api-key-here"
```

## 3. Testing Bot Detection

### Honeypot Field Test
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "dateOfBirth": "1990-05-15",
    "website": "http://spam.com"
  }'
```

## Expected Results

1. **Valid Registration**: Should return 201 with user data
2. **Invalid Email**: Should return 400 with validation error
3. **XSS Attempt**: Should return sanitized data or validation error
4. **Invalid Date**: Should return 400 with date validation error
5. **No API Key**: Should return 401 Unauthorized
6. **With API Key**: Should work normally (if API_KEY is set)
7. **Honeypot Test**: Should return 200 but not actually register user

## Security Headers Verification

Check that responses include:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`