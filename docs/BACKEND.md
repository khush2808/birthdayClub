# Backend & Infrastructure Documentation

## 🏗 Architecture Overview
Birthday Club uses a serverless architecture built on Next.js 15 App Router with MongoDB as the primary database and GitHub Actions for automated scheduling.

## 📊 Database Design

### MongoDB Connection (`src/lib/mongodb.ts`)
```typescript
// Simplified connection approach for serverless environments
const MONGODB_URI = process.env.MONGODB_URI!;
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export default async function connectDB() {
  if (cached.conn) return cached.conn;
  
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }
  
  cached.conn = await cached.promise;
  return cached.conn;
}
```

**Key Features:**
- Connection pooling for serverless optimization
- Global caching to prevent multiple connections
- Error handling for connection failures
- Environment variable configuration

### User Schema (`src/models/User.ts`)
```typescript
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dateOfBirth: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});
```

**Features:**
- Email uniqueness constraint
- Date validation for birthday calculations  
- Automatic timestamp tracking
- MongoDB ObjectId for primary keys

## 🚀 API Endpoints

### Registration Endpoint (`src/app/api/register/route.ts`)
```typescript
POST /api/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "dateOfBirth": "1990-05-15"
}
```

**Features:**
- Input validation and sanitization
- Duplicate email detection
- MongoDB connection error handling
- JSON response with success/error states

**Response Codes:**
- `200` - Registration successful
- `400` - Validation errors or duplicate email
- `500` - Database connection or server errors

### Birthday Email Endpoint (`src/app/api/send-birthday-emails/route.ts`)
```typescript
POST /api/send-birthday-emails  # Trigger email sending
GET /api/send-birthday-emails   # Check today's birthdays
```

**Birthday Detection Logic:**
```typescript
// MongoDB aggregation to find today's birthdays
const todaysBirthdays = await User.find({
  $expr: {
    $and: [
      { $eq: [{ $month: "$dateOfBirth" }, today.getMonth() + 1] },
      { $eq: [{ $dayOfMonth: "$dateOfBirth" }, today.getDate()] }
    ]
  }
});
```

**Features:**
- Date-based birthday detection using MongoDB expressions
- Batch email processing for all users
- Error handling for email delivery failures
- GET endpoint for debugging birthday detection

## 📧 Email Service (`src/lib/email.ts`)

### Gmail SMTP Configuration
```typescript
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD  // App-specific password
  }
});
```

### HTML Email Templates
**Birthday Notification Email:**
- Responsive HTML design with inline CSS
- Dynamic content injection (birthday person's name, age)
- Professional styling with brand colors
- Cross-client compatibility

**Email Content Structure:**
- Subject: "🎉 It's [Name]'s Birthday Today!"
- HTML body with birthday message
- Sender: Birthday Club notification system
- Recipients: All registered users

## ⚙️ Automation & Scheduling

### GitHub Actions Cron (`/.github/workflows/birthday-cron.yml`)
```yaml
name: Birthday Email Cron
on:
  schedule:
    - cron: '30 3 * * *'  # 3:30 AM UTC = 9:00 AM IST
  workflow_dispatch:      # Manual trigger option

jobs:
  send-birthday-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Birthday Emails
        run: |
          curl -X POST ${{ secrets.VERCEL_APP_URL }}/api/send-birthday-emails
```

**Features:**
- Daily automated execution
- Manual trigger capability via GitHub Actions UI
- Error handling and logging
- Environment variable support for deployment URL

**Why GitHub Actions:**
- Free alternative to Vercel Pro cron
- Reliable scheduling infrastructure
- Built-in logging and monitoring
- Easy manual testing and debugging

## 🔧 Environment Variables

### Required Configuration
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/birthday-club

# Email Service  
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-app-password

# Deployment (for GitHub Actions)
VERCEL_APP_URL=https://your-app.vercel.app
```

### Security Considerations
- Gmail App Password (not regular password)
- MongoDB connection string with IP restrictions
- Environment variables stored securely in Vercel/GitHub
- No sensitive data in codebase or version control

## 🚦 Error Handling Strategy

### Database Errors
- Connection timeout handling
- Duplicate key error detection
- Graceful degradation for connection failures
- Informative error messages for debugging

### Email Service Errors  
- Gmail authentication failures
- Network timeout handling
- Batch email error isolation (one failure doesn't stop others)
- Retry logic for transient failures

### API Error Responses
```typescript
// Standardized error response format
return Response.json(
  { error: "User-friendly error message" },
  { status: 400 }
);
```

## 📈 Performance Optimizations

### Database Optimization
- Connection pooling and reuse
- Indexed queries on email and dateOfBirth fields
- Minimal data transfer with projection
- Efficient date queries using MongoDB expressions

### Serverless Optimization
- Cold start reduction with connection caching
- Minimal dependency bundling
- Optimized function execution time
- Memory-efficient operations

### Email Performance
- Batch processing for multiple recipients
- Async email sending to prevent timeout
- Connection reuse for multiple emails
- Graceful handling of rate limits

## 🔍 Monitoring & Debugging

### Available Debug Endpoints
- `GET /api/send-birthday-emails` - Check today's birthdays
- Built-in Next.js development logging
- Vercel function logs for production debugging

### Health Checks
- Database connectivity verification
- Email service authentication validation
- Environment variable presence checks

## 🚀 Deployment Architecture

### Vercel Serverless Functions
- Automatic scaling based on traffic
- Global edge network deployment
- Built-in HTTPS and domain management
- Environment variable management

### Database Hosting
- MongoDB Atlas cloud hosting
- Automatic backups and scaling
- Global cluster deployment
- Connection security with IP whitelisting

### Email Infrastructure
- Gmail SMTP for reliable delivery
- Google's infrastructure for high deliverability
- App-specific passwords for enhanced security
- Built-in spam filtering and reputation management

---

*This backend is designed for scalability, reliability, and cost-effectiveness using modern serverless architecture patterns.*