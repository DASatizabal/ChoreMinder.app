# ChoreMinder

<div align="center">
  <img src="public/ChoreMinder Logo Clippy.png" alt="ChoreMinder Logo" width="120" height="120">
  
  **AI-Powered Family Chore Management**
  
  *Tired of the chore wars? Let ChoreMinder keep score and keep the peace.*
  
  [![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://choreminder.app)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-14-blue)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
</div>

## 🎯 Overview

ChoreMinder is a comprehensive household management application that transforms the way families handle chores and responsibilities. Using AI-powered automation, photo verification, and gamification, it makes household tasks engaging while teaching children responsibility and building healthy habits.

### Key Features

- 🤖 **AI-Powered Instructions** - Generate personalized, age-appropriate chore instructions
- 📸 **Photo Verification** - Visual proof of task completion with approval workflow
- 🎮 **Gamification System** - Points, achievements, and rewards to motivate children
- 📱 **Multi-Channel Messaging** - Email, SMS, and WhatsApp notifications
- 📅 **Smart Scheduling** - Recurring chores with intelligent optimization
- 👨‍👩‍👧‍👦 **Family Management** - Role-based access for parents and children
- 📊 **Analytics Dashboard** - Track progress and family productivity

## 🚀 Tech Stack

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS + DaisyUI
- React Hook Form
- Framer Motion

**Backend**
- Next.js API Routes
- MongoDB with Mongoose ODM
- NextAuth.js (Google OAuth + Magic Links)
- OpenAI GPT Integration

**Infrastructure**
- AWS S3 (File Storage)
- Stripe (Payments)
- Resend (Email)
- Twilio (SMS/WhatsApp)
- Render (Deployment)

## 📋 Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- MongoDB Atlas account or local MongoDB
- OpenAI API key
- AWS S3 bucket (optional, for photo uploads)
- Stripe account (optional, for payments)

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-username/choreminder.git
cd choreminder
npm install
```

### 2. Environment Setup

Create `.env.local` file:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/choreminder
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/choreminder

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_ID=your-google-oauth-id
GOOGLE_SECRET=your-google-oauth-secret

# AI Integration
OPENAI_API_KEY=your-openai-api-key

# Email Service
RESEND_API_KEY=your-resend-api-key

# File Storage (Optional)
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_REGION=us-east-1

# Payments (Optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Messaging (Optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
```

### 3. Database Setup

```bash
# Test database connection
npx tsx scripts/test-connection.ts

# Seed development data
npx tsx scripts/seed-dev.ts
```

### 4. Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
choreminder/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── chores/        # Chore management
│   │   ├── families/      # Family operations
│   │   ├── ai/            # AI integrations
│   │   └── auth/          # Authentication
│   ├── dashboard/         # Protected dashboards
│   └── (marketing)/       # Public pages
├── components/            # React components
│   ├── analytics/         # Charts and metrics
│   ├── mobile/           # Mobile-optimized views
│   └── ui/               # Reusable UI components
├── models/               # Database schemas
├── libs/                 # Utility libraries
├── types/                # TypeScript definitions
└── public/               # Static assets
```

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run typecheck        # TypeScript validation

# Database
npx tsx scripts/test-connection.ts    # Test DB connection
npx tsx scripts/seed-dev.ts          # Seed development data
npx tsx scripts/create-demo-data.js  # Create demo families

# Testing
npm run test:api         # Test API endpoints
node scripts/test-resend.js          # Test email service
```

## 🔒 Security Features

- **Authentication**: NextAuth.js with Google OAuth and magic links
- **Authorization**: Role-based access control (parent/child/admin)
- **Data Protection**: Family-scoped queries and soft deletes
- **Security Headers**: CSP, HSTS, and other security headers
- **Input Validation**: Comprehensive validation and sanitization
- **Rate Limiting**: API endpoint protection

## 📊 Database Models

### Core Models
- **User**: Authentication and profile data
- **Family**: Family groups and member relationships
- **Chore**: Task definition, status, and history
- **NotificationLog**: Message tracking and delivery

### Key Features
- Soft deletes with `deletedAt` timestamps
- Comprehensive history tracking
- Automatic recurring task generation
- Photo verification workflow

## 🚀 Deployment

### Render (Recommended)

1. **Connect Repository**: Link your GitHub repository to Render
2. **Environment Variables**: Add all required environment variables
3. **Build Settings**:
   - Build Command: `npm run build`
   - Start Command: `npm run start`
4. **Domain**: Configure custom domain (choreminder.app)

### Environment Variables for Production

```env
NODE_ENV=production
NEXTAUTH_URL=https://choreminder.app
# ... other variables
```

## 📈 Performance

- **Bundle Size**: Optimized with Next.js 14
- **Database**: Indexed queries and connection pooling
- **Caching**: Intelligent caching strategies
- **Images**: Next.js Image optimization
- **Code Splitting**: Automatic route-based splitting

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

- [Setup Guide](DevDocs/) - Detailed setup instructions
- [API Documentation](docs/api-testing-guide.md) - API endpoint reference
- [Architecture Overview](DevPlanDocs/1-Architecture-Overview.md) - System design
- [Database Schema](DevPlanDocs/5-Database-Models.md) - Data models

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/choreminder/issues)
- **Email**: support@choreminder.app
- **Documentation**: Check the `DevDocs/` folder

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on the [FeNAgO](https://fenago.com) SaaS boilerplate
- UI components from [DaisyUI](https://daisyui.com/)
- Icons and illustrations from various open-source projects

---

<div align="center">
  <strong>Made with ❤️ for families everywhere</strong>
  
  [Website](https://choreminder.app) • [Demo](https://choreminder.app) • [Support](mailto:support@choreminder.app)
</div>