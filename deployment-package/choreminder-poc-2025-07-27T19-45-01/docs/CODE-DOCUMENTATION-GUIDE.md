# 📖 ChoreMinder Code Documentation Guide

**Comprehensive guide for understanding, maintaining, and extending the ChoreMinder codebase**

## 🏗️ Architecture Overview

### Project Structure
```
choreminder/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   ├── dashboard/         # Protected dashboard pages
│   └── (auth)/           # Authentication pages
├── components/            # Reusable React components
├── libs/                 # Utility libraries and services
├── models/               # Database models (Mongoose)
├── scripts/              # Build, deployment, and testing scripts
├── docs/                 # Documentation and guides
└── deployment/           # Production deployment configurations
```

## 🧩 Core Components Documentation

### Database Models (`/models/`)

#### User Model (`User.ts`)
```typescript
// Core user entity with role-based permissions
interface IUser {
  name: string;
  email: string;
  role: 'user' | 'admin' | 'parent' | 'child';
  familyId: ObjectId;
  gamification: IGamification;
  communicationPreferences: ICommunicationPreferences;
}
```

**Key Features:**
- Role-based access control (RBAC)
- Gamification system integration
- Communication preferences management
- Stripe customer integration
- Family relationship tracking

#### Family Model (`Family.ts`)
```typescript
// Family management with member coordination
interface IFamily {
  name: string;
  description?: string;
  members: IFamilyMember[];
  settings: IFamilySettings;
  challenges: IChallenge[];
  statistics: IFamilyStatistics;
}
```

**Key Features:**
- Multi-member family structure
- Configurable family settings
- Challenge and goal management
- Performance analytics
- Member role assignments

#### Chore Model (`Chore.ts`)
```typescript
// Central chore management with lifecycle tracking
interface IChore {
  title: string;
  description: string;
  family: ObjectId;
  assignedTo: ObjectId;
  assignedBy: ObjectId;
  status: ChoreStatus;
  points: IChorePoints;
  verification: IPhotoVerification;
  recurring: IRecurrencePattern;
  history: IChoreHistoryEntry[];
}
```

**Key Features:**
- Comprehensive lifecycle management
- Photo verification workflow
- Recurring task automation
- Points and gamification
- Audit trail with history

### API Architecture (`/app/api/`)

#### Authentication (`/api/auth/`)
- **NextAuth.js integration** with Google OAuth
- **Session management** with secure tokens
- **Role-based middleware** for endpoint protection

#### Family Management (`/api/families/`)
```typescript
// Family CRUD operations with permission checking
GET    /api/families              // List user's families
POST   /api/families              // Create new family
GET    /api/families/[familyId]   // Get family details
PUT    /api/families/[familyId]   // Update family
DELETE /api/families/[familyId]   // Delete family
```

#### Chore Management (`/api/chores/`)
```typescript
// Chore lifecycle with status transitions
GET    /api/chores                // List chores (filtered by family)
POST   /api/chores                // Create new chore
PUT    /api/chores/[id]/status    // Update chore status
POST   /api/chores/[id]/verify    // Photo verification
PUT    /api/chores/[id]/assign    // Assign/reassign chore
```

### Component Architecture (`/components/`)

#### Layout Components
- **`LayoutClient.tsx`**: Main app layout with navigation
- **`Header.tsx`**: Top navigation with user context
- **`MobileTabBar.tsx`**: Mobile-friendly bottom navigation
- **`Navigation.tsx`**: Sidebar navigation for desktop

#### Dashboard Components
- **`ParentDashboard.tsx`**: Family overview and management
- **`ChildDashboard.tsx`**: Child-focused chore interface
- **`FamilyAnalyticsDashboard.tsx`**: Performance analytics

#### Chore Management
- **`ChoreCreationModal.tsx`**: Advanced chore creation form
- **`ChoreList.tsx`**: Dynamic chore listing with filters
- **`PhotoVerification.tsx`**: Photo upload and approval workflow
- **`ChoreWorkflow.tsx`**: Status transition management

#### Gamification
- **`GamificationDashboard.tsx`**: Points, levels, achievements
- **`AchievementDisplay.tsx`**: Badge and milestone system
- **`ProgressTracker.tsx`**: Visual progress indicators

### Service Libraries (`/libs/`)

#### Database (`mongoose.ts`)
```typescript
// MongoDB connection with environment-based configuration
export default connectMongo;
// Handles connection pooling, error recovery, and environment switching
```

#### Authentication (`next-auth.ts`)
```typescript
// NextAuth configuration with providers and callbacks
export const authOptions: NextAuthOptions;
// Google OAuth, session management, database adapter
```

#### Notifications (`unified-messaging.ts`)
```typescript
// Multi-channel messaging system
class UnifiedMessaging {
  sendWhatsApp(message: WhatsAppMessage): Promise<MessageResult>;
  sendSMS(message: SMSMessage): Promise<MessageResult>;
  sendEmail(message: EmailMessage): Promise<MessageResult>;
}
```

#### File Storage (`s3.ts`)
```typescript
// AWS S3 integration for photo verification
class S3Service {
  uploadPhoto(file: File, metadata: PhotoMetadata): Promise<UploadResult>;
  generateSignedUrl(key: string): Promise<string>;
  deletePhoto(key: string): Promise<void>;
}
```

## 🔧 Development Patterns

### Error Handling
```typescript
// Consistent error response pattern
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

// Usage in API routes
try {
  const result = await performOperation();
  return NextResponse.json(result);
} catch (error) {
  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### Data Validation
```typescript
// Zod schemas for type-safe validation
const ChoreCreateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['bedroom', 'kitchen', 'outdoor', 'pets']),
  points: z.number().min(1).max(100),
  dueDate: z.date(),
  photoRequired: z.boolean().default(false)
});

// API route validation
const validatedData = ChoreCreateSchema.parse(req.body);
```

### Permission Middleware
```typescript
// Role-based access control
export const requireRole = (roles: UserRole[]) => {
  return async (req: AuthenticatedRequest, res: NextResponse) => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !roles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return null; // Continue to handler
  };
};
```

### Database Queries
```typescript
// Family-scoped queries pattern
const getUserChores = async (userId: string, familyId: string) => {
  return await Chore.find({
    assignedTo: userId,
    family: familyId,
    deletedAt: null // Soft delete filter
  })
  .populate('assignedBy', 'name')
  .sort({ dueDate: 1 });
};

// Aggregation pipeline example
const getFamilyStatistics = async (familyId: string) => {
  return await Chore.aggregate([
    { $match: { family: familyId, deletedAt: null } },
    { $group: {
      _id: '$status',
      count: { $sum: 1 },
      totalPoints: { $sum: '$points.total' }
    }},
    { $sort: { count: -1 } }
  ]);
};
```

## 🔒 Security Implementation

### Authentication Flow
1. **OAuth Integration**: Google OAuth with NextAuth.js
2. **Session Management**: Secure HTTP-only cookies
3. **Token Validation**: Server-side session verification
4. **Role Assignment**: Database-backed role management

### Authorization Patterns
```typescript
// Family data isolation
const ensureFamilyAccess = async (userId: string, familyId: string) => {
  const user = await User.findById(userId);
  if (!user.familyId.equals(familyId)) {
    throw new APIError(403, 'Access denied to family data');
  }
};

// Child-safe content filtering
const getChildSafeChores = async (childId: string) => {
  return await Chore.find({
    assignedTo: childId,
    ageAppropriate: true,
    parentApproved: true
  });
};
```

### Data Protection
- **Input Sanitization**: All user inputs validated and sanitized
- **SQL Injection Prevention**: Mongoose parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: NextAuth.js built-in protection

## 📱 Frontend Architecture

### State Management
```typescript
// React hooks for state management
const useChores = (familyId: string) => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchChores = useCallback(async () => {
    try {
      const response = await fetch(`/api/chores?family=${familyId}`);
      const data = await response.json();
      setChores(data);
    } catch (error) {
      console.error('Failed to fetch chores:', error);
    } finally {
      setLoading(false);
    }
  }, [familyId]);
  
  return { chores, loading, refetch: fetchChores };
};
```

### Component Patterns
```typescript
// Compound component pattern for complex UI
interface ChoreCardProps {
  chore: Chore;
  onStatusChange: (choreId: string, status: ChoreStatus) => void;
}

export const ChoreCard: FC<ChoreCardProps> = ({ chore, onStatusChange }) => {
  return (
    <div className="card bg-base-100 shadow-xl">
      <ChoreCard.Header chore={chore} />
      <ChoreCard.Body chore={chore} />
      <ChoreCard.Actions chore={chore} onStatusChange={onStatusChange} />
    </div>
  );
};

ChoreCard.Header = ({ chore }) => (
  <div className="card-header">
    <h3 className="card-title">{chore.title}</h3>
    <ChoreStatusBadge status={chore.status} />
  </div>
);
```

### Performance Optimization
```typescript
// Lazy loading with suspense
const LazyDashboard = lazy(() => import('./Dashboard'));

// Memoization for expensive calculations
const FamilyStats = memo(({ familyId }: { familyId: string }) => {
  const stats = useMemo(() => {
    return calculateFamilyStatistics(familyData);
  }, [familyData]);
  
  return <StatsDisplay stats={stats} />;
});

// Virtual scrolling for large lists
const VirtualizedChoreList = ({ chores }: { chores: Chore[] }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={chores.length}
      itemSize={120}
      itemData={chores}
    >
      {ChoreListItem}
    </FixedSizeList>
  );
};
```

## 🧪 Testing Strategy

### Unit Testing
```typescript
// Component testing with React Testing Library
describe('ChoreCard', () => {
  it('renders chore information correctly', () => {
    const mockChore = createMockChore();
    render(<ChoreCard chore={mockChore} onStatusChange={jest.fn()} />);
    
    expect(screen.getByText(mockChore.title)).toBeInTheDocument();
    expect(screen.getByText(mockChore.description)).toBeInTheDocument();
  });
  
  it('calls onStatusChange when status is updated', async () => {
    const mockOnStatusChange = jest.fn();
    const mockChore = createMockChore();
    
    render(<ChoreCard chore={mockChore} onStatusChange={mockOnStatusChange} />);
    
    const completeButton = screen.getByText('Mark Complete');
    fireEvent.click(completeButton);
    
    expect(mockOnStatusChange).toHaveBeenCalledWith(mockChore.id, 'completed');
  });
});
```

### Integration Testing
```typescript
// API route testing
describe('/api/chores', () => {
  it('creates a new chore with valid data', async () => {
    const session = await createTestSession();
    const choreData = createValidChoreData();
    
    const response = await testApiHandler({
      handler: choreHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { cookie: session.cookie },
          body: JSON.stringify(choreData)
        });
        
        expect(res.status).toBe(201);
        const result = await res.json();
        expect(result.title).toBe(choreData.title);
      }
    });
  });
});
```

### End-to-End Testing
```typescript
// Playwright E2E tests
test('complete chore workflow', async ({ page }) => {
  await page.goto('/dashboard');
  await page.fill('[data-testid=login-email]', 'sarah@demo.com');
  await page.fill('[data-testid=login-password]', 'Demo2024!');
  await page.click('[data-testid=login-button]');
  
  // Create new chore
  await page.click('[data-testid=create-chore-button]');
  await page.fill('[data-testid=chore-title]', 'Test Chore');
  await page.selectOption('[data-testid=chore-category]', 'bedroom');
  await page.click('[data-testid=save-chore]');
  
  // Verify chore appears in list
  await expect(page.locator('[data-testid=chore-list]')).toContainText('Test Chore');
});
```

## 📈 Performance Considerations

### Database Optimization
```typescript
// Compound indexes for common queries
await db.collection('chores').createIndex({
  family: 1,
  assignedTo: 1,
  status: 1,
  dueDate: 1
});

// Aggregation pipeline optimization
const optimizedFamilyStats = await Chore.aggregate([
  { $match: { family: familyId } },
  { $facet: {
    statusCounts: [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ],
    pointsTotal: [
      { $group: { _id: null, total: { $sum: '$points.total' } } }
    ],
    completionTrend: [
      { $match: { status: 'verified' } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        count: { $sum: 1 }
      }}
    ]
  }}
]);
```

### Frontend Optimization
```typescript
// Code splitting by route
const routes = [
  {
    path: '/dashboard',
    component: lazy(() => import('./Dashboard'))
  },
  {
    path: '/analytics',
    component: lazy(() => import('./Analytics'))
  }
];

// Image optimization
import Image from 'next/image';

const OptimizedChorePhoto = ({ photo }: { photo: ChorePhoto }) => (
  <Image
    src={photo.url}
    alt={photo.description}
    width={300}
    height={200}
    priority={photo.featured}
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,..."
  />
);
```

## 🔧 Configuration Management

### Environment Variables
```typescript
// Environment validation
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'RESEND_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'STRIPE_SECRET_KEY'
];

const validateEnvironment = () => {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

### Feature Flags
```typescript
// Feature toggle system
interface FeatureFlags {
  enablePhotoVerification: boolean;
  enableWhatsAppNotifications: boolean;
  enableAIRecommendations: boolean;
  enableAdvancedAnalytics: boolean;
}

const getFeatureFlags = (): FeatureFlags => ({
  enablePhotoVerification: process.env.FEATURE_PHOTO_VERIFICATION === 'true',
  enableWhatsAppNotifications: process.env.FEATURE_WHATSAPP === 'true',
  enableAIRecommendations: process.env.FEATURE_AI_RECOMMENDATIONS === 'true',
  enableAdvancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true'
});
```

## 📚 Development Workflow

### Code Standards
- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Configured with Next.js and React best practices
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality checks

### Branching Strategy
```bash
main                 # Production-ready code
├── develop         # Integration branch
├── feature/*       # Feature development
├── bugfix/*        # Bug fixes
└── release/*       # Release preparation
```

### Deployment Pipeline
```yaml
# GitHub Actions workflow
name: Deploy to Production
on:
  push:
    branches: [main]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📖 API Documentation

### Authentication Endpoints
```typescript
POST /api/auth/signin
Body: { email: string, password: string }
Response: { user: User, session: Session }

GET /api/auth/session
Response: { user: User, expires: string } | null

POST /api/auth/signout
Response: { success: boolean }
```

### Family Management
```typescript
GET /api/families
Response: Family[]

POST /api/families
Body: { name: string, description?: string }
Response: Family

GET /api/families/[familyId]
Response: Family

PUT /api/families/[familyId]
Body: Partial<Family>
Response: Family
```

### Chore Management
```typescript
GET /api/chores?family=string&status=string&assignedTo=string
Response: Chore[]

POST /api/chores
Body: CreateChoreRequest
Response: Chore

PUT /api/chores/[choreId]/status
Body: { status: ChoreStatus, note?: string }
Response: Chore

POST /api/chores/[choreId]/photos
Body: FormData with photo file
Response: { photoUrl: string, verificationStatus: string }
```

This comprehensive documentation provides the foundation for understanding, maintaining, and extending the ChoreMinder codebase. Each section includes practical examples and follows established patterns for consistency and maintainability.