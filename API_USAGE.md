#!/usr/bin/env node

/**
 * API Usage Examples
 * This script demonstrates how to use the birthday emails API with rate limiting
 */

console.log('🎂 Birthday Club API Usage Examples\n');

console.log('📋 Environment Variables Required:');
console.log('  MONGODB_URI=mongodb://...');
console.log('  GMAIL_EMAIL=your-email@gmail.com');
console.log('  GMAIL_APP_PASSWORD=your-16-char-password');
console.log('  API_SECRET_KEY=your-secret-key (optional)\n');

console.log('📡 API Endpoints:\n');

// Example 1: GET endpoint (no rate limiting)
console.log('1️⃣ Check Today\'s Birthdays (GET - No rate limiting):');
console.log('   curl https://your-app.vercel.app/api/send-birthday-emails');
console.log('   Response: List of today\'s birthdays without sending emails\n');

// Example 2: POST endpoint without API key
console.log('2️⃣ Send Birthday Emails (POST - Rate limited):');
console.log('   curl -X POST https://your-app.vercel.app/api/send-birthday-emails');
console.log('   Rate Limit: 2 calls per day');
console.log('   Possible responses:');
console.log('     200: ✅ Emails sent successfully');
console.log('     429: 🚫 Rate limit exceeded (try again in 24 hours)');
console.log('     401: 🔐 API key required (if API_SECRET_KEY is set)\n');

// Example 3: POST endpoint with API key
console.log('3️⃣ Send Birthday Emails with API Key (POST - Authenticated):');
console.log('   curl -X POST https://your-app.vercel.app/api/send-birthday-emails \\');
console.log('        -H "x-api-key: your-secret-api-key"');
console.log('   Note: Only required if API_SECRET_KEY environment variable is set\n');

// Example 4: Rate limit exceeded response
console.log('4️⃣ Rate Limit Exceeded Response:');
console.log('   {');
console.log('     "error": "Rate limit exceeded. The send birthday emails API can only be called 2 times per day.",');
console.log('     "resetTime": "2024-01-15T09:00:00.000Z"');
console.log('   }\n');

// Example 5: GitHub Actions configuration
console.log('5️⃣ GitHub Actions Configuration:');
console.log('   File: .github/workflows/birthday-cron.yml');
console.log('   ```yaml');
console.log('   name: Birthday Email Cron');
console.log('   on:');
console.log('     schedule:');
console.log('       - cron: "30 3 * * *"  # 9:00 AM IST daily');
console.log('   jobs:');
console.log('     send-birthday-emails:');
console.log('       runs-on: ubuntu-latest');
console.log('       steps:');
console.log('         - name: Trigger Birthday Emails');
console.log('           run: |');
console.log('             curl -X POST ${{ secrets.VERCEL_APP_URL }}/api/send-birthday-emails \\');
console.log('                  -H "x-api-key: ${{ secrets.API_SECRET_KEY }}"');
console.log('   ```\n');

console.log('🔒 Security Features:');
console.log('  ✅ Rate limiting: 2 calls per day');
console.log('  ✅ Automatic reset after 24 hours');
console.log('  ✅ Optional API key authentication');
console.log('  ✅ Proper HTTP status codes (401, 429)');
console.log('  ✅ Detailed error messages with reset times\n');

console.log('📝 Testing Rate Limiting:');
console.log('  1. Make first API call → Success (counter = 1)');
console.log('  2. Make second API call → Success (counter = 2)');
console.log('  3. Make third API call → 429 Rate Limit Exceeded');
console.log('  4. Wait 24 hours → Counter resets');
console.log('  5. Make API call → Success (counter = 1)');

console.log('\n🎉 Setup complete! Your birthday club app is now protected against spam.');