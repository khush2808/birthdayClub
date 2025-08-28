# Birthday Club App 🎂

A simple birthday reminder app that sends email notifications to all registered users when someone has a birthday.

## Features
- User registration with name, email, and date of birth
- Beautiful UI with Tailwind CSS and Lucide icons
- MongoDB storage with Mongoose
- Gmail integration for email notifications
- Automated daily birthday checks

## Setup

### 1. Environment Variables
Create `.env.local` with:
```
MONGODB_URI=your_mongodb_connection_string
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

### 2. Gmail App Password Setup
1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account → Security → 2-Step Verification → App passwords
3. Generate a new app password for "Mail"
4. Use the 16-character password in your environment variables

### 3. Deployment on Vercel

#### Option A: Vercel Cron (Pro Plan Required)
The `vercel.json` file is configured to run birthday checks daily at 9 AM UTC.

#### Option B: Free External Triggers
Use these free services to trigger `/api/send-birthday-emails` daily:

**EasyCron.com:**
- Sign up for free account
- Create new cron job
- URL: `https://your-app.vercel.app/api/send-birthday-emails`
- Schedule: `0 9 * * *` (9 AM daily)
- Method: POST

**cron-job.org:**
- Free account allows 50 executions/month
- URL: `https://your-app.vercel.app/api/send-birthday-emails`
- Schedule: Daily at 9:00 AM

**GitHub Actions (if you use GitHub):**
Create `.github/workflows/birthday-cron.yml`:
```yaml
name: Daily Birthday Check
on:
  schedule:
    - cron: '0 9 * * *'
jobs:
  birthday-check:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger birthday emails
        run: |
          curl -X POST https://your-app.vercel.app/api/send-birthday-emails
```

## API Endpoints

### POST /api/register
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "dateOfBirth": "1990-05-15"
}
```

### GET /api/send-birthday-emails
Check today's birthdays (returns list without sending emails)

### POST /api/send-birthday-emails
Trigger birthday email notifications for today's birthdays

## Manual Testing
You can manually trigger birthday emails by visiting:
`https://your-app.vercel.app/api/send-birthday-emails` (POST request)

## Development
```bash
npm install
npm run dev
```

App will be available at `http://localhost:3000`
