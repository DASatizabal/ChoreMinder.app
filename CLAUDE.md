# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ChoreMinder** is an AI-powered household management application built on the FeNAgO SaaS boilerplate. The application helps parents assign, track, and verify chores for their children through automation, messaging, photo verification, and gamification.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TailwindCSS, DaisyUI, TypeScript |
| **Backend** | Next.js API Routes, MongoDB with Mongoose ODM |
| **Authentication** | NextAuth.js with Google OAuth, magic links, and credentials |
| **Payments** | Stripe subscriptions (3 pricing tiers) |
| **AI Integration** | OpenAI GPT for personalized chore instructions and photo analysis |
| **Storage** | AWS S3 for photo verification uploads |
| **Email** | Resend for transactional emails |
| **Messaging** | WhatsApp (via Twilio), SMS (via Twilio), Email |
| **Scheduling** | FullCalendar for family calendar views |
| **Charts** | Chart.js with react-chartjs-2 |

## Common Development Commands

### Development Server
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run typecheck    # TypeScript type checking
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run postbuild    # Generate sitemap (runs automatically after build)
```

### Database Operations
```bash
npx tsx scripts/seed-dev.ts         # Seed development data
npx tsx scripts/test-connection.ts   # Test MongoDB connection
npx tsx scripts/test-mongodb.ts      # Test MongoDB with mongoose
node scripts/test-resend.js          # Test email functionality
```

### Testing
```bash
npm run test:api                      # Run all API endpoint tests
npm run test:api:families             # Test family API endpoints
npm run test:api:photos               # Test photo API endpoints
npm run test:api:notifications        # Test notification API endpoints
npm run test:api:cron                 # Test cron job endpoints
npm run test:final                    # Run final testing suite
npm run validate:launch               # Run simple validation test
```

### Sample Data Management
```bash
npm run sample-data                   # Create sample data
npm run sample-data:full              # Create full sample dataset
npm run sample-data:minimal           # Create minimal sample dataset
npm run sample-data:clear             # Clear all sample data
npm run demo:create                   # Create demo data
npm run demo:reset                    # Reset demo data
npm run demo:scenarios                # Run demo scenarios
```

### Production Operations
```bash
npm run production:indexes            # Create production database indexes
npm run production:validate           # Validate deployment
npm run production:benchmark          # Run performance benchmarks
npm run audit:security                # Run security audit
npm run launch:checklist              # Run launch checklist
```

## Architecture Overview

### Directory Structure
```
/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── auth/                 # Authentication pages
│   ├── blog/                 # Blog pages and components
│   ├── dashboard/            # Dashboard pages (parent/child views)
│   ├── home/                 # Home page (authenticated)
│   ├── onboarding/           # Onboarding flow
│   └── join-family/          # Family invitation flow
├── components/               # React components
│   ├── admin/                # Admin dashboard components
│   ├── analytics/            # Analytics and charts
│   ├── calendar/             # Calendar components
│   ├── emails/               # Email templates
│   ├── gamification/         # Gamification UI
│   ├── mobile/               # Mobile-optimized components
│   ├── performance/          # Performance optimization components
│   └── ui/                   # Base UI components
├── hooks/                    # Custom React hooks
├── libs/                     # Utility libraries and services
├── models/                   # Mongoose database models
├── scripts/                  # Development and deployment scripts
├── types/                    # TypeScript type definitions
├── DevDocs/                  # Service setup documentation
└── DevPlanDocs/              # Architecture and planning documents
```

### Database Models

The application uses MongoDB with Mongoose and follows a family-based hierarchy:

| Model | Purpose |
|-------|---------|
| **User** | Core user model with roles (user, admin, parent, child), Stripe integration, gamification data, and communication preferences |
| **Family** | Groups users into families with member roles (parent, child, admin) and permissions |
| **Chore** | Complex chore model with recurrence, photo verification, history tracking, and status management |
| **Achievement** | Defines achievements with categories (completion, quality, consistency, milestone, special) and tiers (bronze, silver, gold, platinum) |
| **Challenge** | Time-limited challenges (daily, weekly, monthly) with targets and rewards |
| **Reward** | Redeemable rewards with point costs, categories, and parent approval requirements |
| **NotificationPreferences** | User notification settings per channel |
| **NotificationLog** | Tracks sent notifications |
| **Lead** | Basic lead capture for marketing |

### Key Database Patterns

- **Soft Deletes**: Chores use `deletedAt` field with pre-find middleware filtering
- **History Tracking**: All chore changes logged in embedded `history` array via pre-save hooks
- **Recurring Tasks**: Automatic chore generation on completion based on recurrence rules
- **Photo Verification**: Embedded verification workflow with approval states (pending, approved, rejected)
- **Gamification**: Points, levels, streaks, achievements, and rewards tracked in User model

### Chore Status Flow
```
pending → in_progress → completed → verified
                     ↘ rejected (with reason)
```

### API Routes Structure

```
/app/api/
├── auth/[...nextauth]/           # NextAuth.js authentication
├── ai/
│   ├── analyze-photo/            # AI photo verification analysis
│   ├── generate-instructions/    # Generate chore instructions
│   └── regenerate-section/       # Regenerate specific instruction sections
├── analytics/
│   ├── export/                   # Export analytics data
│   ├── family/                   # Family analytics
│   └── progress/                 # Progress tracking
├── calendar/
│   ├── family/                   # Family calendar events
│   └── optimize/                 # Schedule optimization
├── chores/
│   ├── [id]/
│   │   ├── assign/               # Chore assignment
│   │   ├── photos/               # Photo uploads
│   │   ├── status/               # Status updates
│   │   └── verify/               # Verification workflow
│   └── route.ts                  # CRUD operations
├── cron/
│   ├── daily-digest/             # Daily summary emails
│   └── reminders/                # Chore reminders
├── families/
│   ├── [familyId]/
│   │   ├── chores/bulk/          # Bulk chore operations
│   │   ├── events/               # Family events
│   │   ├── invitations/          # Member invitations
│   │   ├── members/              # Member management
│   │   ├── pending-approvals/    # Photo approval queue
│   │   └── photo-summary/        # Photo verification summary
│   ├── context/                  # Family context for session
│   ├── join/                     # Accept invitation
│   ├── setup/                    # Initial family setup
│   └── switch/                   # Switch active family
├── gamification/
│   ├── achievements/             # Achievement system
│   ├── challenges/               # Active challenges
│   ├── points/                   # Points management
│   └── rewards/                  # Reward redemption
├── messaging/
│   ├── preferences/              # Communication preferences
│   ├── send/                     # Send messages
│   └── status/                   # Message delivery status
├── notifications/
│   ├── [id]/read/                # Mark as read
│   ├── create/                   # Create notification
│   ├── mark-all-read/            # Batch mark read
│   ├── preferences/              # Notification preferences
│   ├── stats/                    # Notification statistics
│   └── test/                     # Test notifications
├── stripe/
│   ├── create-checkout/          # Create checkout session
│   └── create-portal/            # Create customer portal
├── webhook/stripe/               # Stripe webhook handling
├── whatsapp/                     # WhatsApp integration
├── sms/                          # SMS integration
└── users/                        # User management
```

### Utility Libraries (`libs/`)

| Library | Purpose |
|---------|---------|
| `api.ts` | API client utilities |
| `mongoose.ts` | Database connection (exports `dbConnect`) |
| `mongo.ts` | Native MongoDB client for NextAuth |
| `next-auth.ts` | NextAuth configuration and options |
| `stripe.ts` | Stripe integration helpers |
| `s3.ts` | AWS S3 file upload utilities |
| `resend.ts` | Email sending via Resend |
| `email.ts` | Email template utilities |
| `gpt.ts` | OpenAI GPT integration |
| `gamification.ts` | Points, achievements, challenges service |
| `notifications.ts` | Notification scheduling and delivery |
| `unified-messaging.ts` | Multi-channel messaging (WhatsApp, SMS, Email) |
| `twilio-sms.ts` | Twilio SMS integration |
| `twilio-whatsapp.ts` | Twilio WhatsApp integration |
| `whatsapp-templates.ts` | WhatsApp message templates |
| `message-scheduler.ts` | Message queue and scheduling |
| `scheduling.ts` | Chore scheduling utilities |
| `analytics.ts` | Analytics and reporting |
| `performance.ts` | Performance monitoring |
| `email-blacklist.ts` | Email domain blacklisting |

### Custom React Hooks (`hooks/`)

| Hook | Purpose |
|------|---------|
| `useOfflineSync.ts` | Offline data synchronization |
| `useRealTimeUpdates.ts` | Real-time data updates |
| `usePerformanceOptimization.ts` | Performance optimization helpers |

## Authentication & Authorization

- **NextAuth.js** with JWT session strategy
- **Providers**: Google OAuth, Email magic links, Credentials (email/password)
- **Family-based access control** through middleware
- **Role-based permissions**: parent, child, admin, user
- **Session includes**: user ID, role, name, email, image

### Session Type Extension
```typescript
interface Session {
  user: {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}
```

## Environment Setup

### Required Environment Variables

Create `.env.local` with:

```env
# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret

# Email (Resend)
RESEND_API_KEY=your-resend-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3 (for photo uploads)
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_REGION=us-east-1

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Optional: Messaging
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=your-phone
```

## Development Patterns

### TypeScript Path Aliases
Configured in `tsconfig.json`:
- `@/*` - Root directory
- `@/lib/*` - Library files (alternate path)
- `@/libs/*` - Library files
- `@/models/*` - Database models
- `@/app/*` - App directory files

### Component Categories

| Category | Location | Purpose |
|----------|----------|---------|
| **Core UI** | `/components/` | Buttons, modals, headers, navigation |
| **Chore Management** | `/components/Chore*.tsx` | Chore creation, editing, lists, workflows |
| **Photo Verification** | `/components/Photo*.tsx`, `/components/Enhanced*.tsx` | Photo submission and approval |
| **Gamification** | `/components/gamification/`, `/components/Achievement*.tsx` | Points, badges, rewards UI |
| **Analytics** | `/components/analytics/` | Charts, dashboards, insights |
| **Mobile** | `/components/mobile/` | Touch-friendly, responsive components |
| **Admin** | `/components/admin/` | Messaging dashboard, performance monitoring |
| **Calendar** | `/components/calendar/` | Family calendar integration |
| **Emails** | `/components/emails/` | React Email templates |

### Data Fetching Patterns
```typescript
// Server-side authentication
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/next-auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

### Database Connection Pattern
```typescript
import { dbConnect } from "@/libs/mongoose";

export async function GET() {
  await dbConnect();
  // Query database...
}
```

### Database Query Patterns
- **Family-scoped queries**: Always filter by user's family membership
- **Soft delete queries**: Filter `deletedAt: null` automatically via pre-find middleware
- **Population**: Use `.populate()` for user and family references
- **Pagination**: Standard limit/skip pattern with total counts

### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  console.error("Operation failed:", error);
  return Response.json(
    { error: error instanceof Error ? error.message : "Unknown error" },
    { status: 500 }
  );
}
```

## Gamification System

### Points System
- Base points per chore (configurable)
- Bonuses: time (early completion), quality, streak, challenge
- Level progression: 100, 300, 600, 1000, 1500... points per level

### Achievements
- **Categories**: completion, quality, consistency, milestone, special
- **Tiers**: bronze, silver, gold, platinum
- **Types**: chores_completed, points_earned, streak_days, perfect_week, early_completion

### Rewards
- **Categories**: privileges, treats, activities, items, experiences
- **Age groups**: young, teen, all
- **Requires parent approval** for most rewards

## Stripe Integration

### Pricing Tiers (from `config.ts`)
1. **Starter Plan** ($4.99/mo) - 20 messages, 2 kids, 3 chores
2. **Mid Plan** ($7.99/mo) - 30 messages, 5 kids, 10 chores, AI instructions, recurring schedules
3. **The Nanny** ($12.99/mo) - Unlimited messages, 10 kids, unlimited chores, full features

### Webhook Handling
```bash
# Test webhooks locally
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

## Key Configuration Files

| File | Purpose |
|------|---------|
| `config.ts` | App branding, Stripe plans, email settings, AWS config, theme colors |
| `tailwind.config.js` | DaisyUI themes, custom animations, extended colors |
| `next.config.js` | Image domains, build optimizations |
| `tsconfig.json` | TypeScript configuration and path aliases |
| `.eslintrc.js` | ESLint rules |
| `.husky/pre-commit` | Pre-commit hooks (lint-staged) |

## Common Development Tasks

### Adding New API Endpoints
1. Create route file in `/app/api/[endpoint]/route.ts`
2. Import `getServerSession(authOptions)` for authentication
3. Use `dbConnect()` for database access
4. Follow family-scoped query patterns
5. Add proper error handling and status codes
6. Use Zod for request validation if needed

### Working with Database Models
1. Import models from `/models/` or `/models/index.ts`
2. Use TypeScript interfaces for type safety
3. Follow soft delete patterns for chores (`deletedAt`)
4. Use proper population for relationships
5. Add validation and error handling
6. Use pre-save hooks for automatic operations

### Adding New Components
1. Create in appropriate subfolder of `/components/`
2. Use DaisyUI classes for consistent styling
3. Follow existing patterns (client components with "use client")
4. Export from component file directly

### Testing Endpoints
```bash
# Test S3 connection
curl http://localhost:3000/api/s3-test

# Test email
node scripts/test-resend.js

# Test database
npx tsx scripts/test-connection.ts
```

## Documentation Resources

### Development Docs (`DevDocs/`)
- `0_UI_Components_Guide.md` - UI component usage
- `1_Setting_Up_Email_With_Resend.md` - Email configuration
- `2_Setting_Up_MongoDB_Atlas.md` - Database setup
- `3_Setting_Up_Google_Authentication.md` - Google OAuth
- `4_Setting_Up_Magic_Links_Authentication.md` - Magic links
- `5_Setting_Up_Stripe_Payments.md` - Payment integration
- `6_Setting_Up_SEO_Features.md` - SEO configuration
- `7_Setting_Up_Analytics_With_DataFast.md` - Analytics

### Planning Docs (`DevPlanDocs/`)
- `1-Architecture-Overview.md` - System architecture
- `2-Components-Overview.md` - Component structure
- `3-Development-Plan.md` - Development roadmap
- `4-API-Endpoints.md` - API documentation
- `5-Database-Models.md` - Database schema
- `6-Authentication-System.md` - Auth implementation
- `7-Payment-Integration.md` - Stripe integration
- `8-Rebranding-Strategy.md` - Branding guidelines
- `mermaid-*.md` - Architecture diagrams

## Important Notes

### Security Considerations
- Never commit `.env.local` or credentials
- Validate all user inputs
- Use family-scoped queries to prevent data leaks
- Photo uploads use signed S3 URLs
- Stripe webhook signatures are verified

### Performance Patterns
- Use `VirtualizedList` for long lists
- Use `LazyImage` for image optimization
- Database indexes defined in models
- Rate limiting on notification service

### Mobile Considerations
- Components in `/components/mobile/` are touch-optimized
- `MobileLayoutClient` provides mobile-specific layout
- `OfflineIndicator` shows connectivity status
- `SwipeablePhotoCapture` for easy photo uploads
