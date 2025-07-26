# ChoreMinder Navigation & Component Integration Guide

## Overview

This guide documents the integrated navigation system and data flow between components in the ChoreMinder application. The system provides role-based navigation, family context switching, and responsive design for both parent and child interfaces.

## Architecture

### Core Components

#### 1. AppLayout Component
**Path**: `components/AppLayout.tsx`

Main wrapper component that provides:
- Authentication verification
- Family context management
- Role-based access control
- Navigation integration
- Mobile responsiveness

**Usage**:
```tsx
<AppLayout requiresFamily={true} allowedRoles={["parent", "admin"]}>
  <YourComponent />
</AppLayout>
```

**Props**:
- `requiresFamily`: boolean - Whether component requires an active family
- `allowedRoles`: string[] - Array of allowed user roles
- `showMobileTabBar`: boolean - Whether to show mobile tab navigation

#### 2. Navigation Component
**Path**: `components/Navigation.tsx`

Provides:
- Role-based menu items
- Family context switching
- Mobile hamburger menu
- Notification badges
- Role switching (parent ↔ child views)

**Features**:
- Desktop: Horizontal navigation with tooltips
- Mobile: Collapsible menu with descriptions
- Real-time notifications for help requests and pending photos
- Smooth role transitions

#### 3. FamilySwitcher Component
**Path**: `components/FamilySwitcher.tsx`

Manages:
- Multi-family user support
- Family creation and joining
- Active family switching
- Family role display

#### 4. MobileTabBar Component
**Path**: `components/MobileTabBar.tsx`

Provides:
- Bottom navigation for mobile devices
- Role-specific tab items
- Visual active state indicators
- Touch-optimized interface

### Data Flow Architecture

#### Family Context Flow
```
User Login → API: /api/families/context → FamilyContext State → AppLayout → Child Components
```

1. **User Authentication**: Session established via NextAuth
2. **Family Context Fetch**: AppLayout fetches user's family context
3. **Role Determination**: Based on family membership and user role
4. **Component Routing**: Navigation shows appropriate menu items
5. **Data Propagation**: Context passed to child components

#### Navigation State Management
```
Role Detection → Menu Generation → Active State Tracking → Mobile Responsiveness
```

#### Notification System
```
API Polling → Badge Updates → Visual Indicators → User Interaction
```

## Role-Based Navigation

### Parent Navigation Items
- **Dashboard** (`/dashboard/parent`) - Family overview and quick stats
- **Chore Management** (`/dashboard/parent/chores`) - Create, edit, assign chores
- **Family Members** (`/dashboard/parent/family`) - Manage family settings
- **Help Requests** (`/dashboard/parent/help`) - Review child help requests
- **Progress Analytics** (`/dashboard/parent/analytics`) - Family progress reports

### Child Navigation Items
- **My Dashboard** (`/dashboard/child`) - Personalized child interface
- **My Chores** (`/dashboard/child/chores`) - Assigned tasks and status
- **Achievements** (`/dashboard/child/achievements`) - Badges and rewards
- **Photo Missions** (`/dashboard/child/photos`) - Photo upload interface
- **My Progress** (`/dashboard/child/progress`) - Personal growth tracking

### Admin Navigation Items
- **Admin Panel** (`/dashboard/admin`) - System administration
- **All Families** (`/dashboard/admin/families`) - Family management
- **User Management** (`/dashboard/admin/users`) - User administration

## API Integration

### Core API Endpoints

#### Family Context Management
```typescript
// Get current family context
GET /api/families/context
Response: {
  activeFamily: { id, name, createdBy, memberCount, ... },
  role: "parent" | "child" | "admin",
  familyCount: number
}

// Switch active family
POST /api/families/switch
Body: { familyId: string }
```

#### Family Management
```typescript
// List user families
GET /api/families
Response: { families: Family[] }

// Create new family
POST /api/families
Body: { name: string }

// Join family with code
POST /api/families/join
Body: { code: string }
```

#### Help Requests
```typescript
// Create help request
POST /api/help-requests
Body: { choreId: string, message: string, type: string }

// Get help requests
GET /api/help-requests?choreId=...&userId=...
```

## Mobile Responsiveness

### Breakpoint Strategy
- **Mobile**: < 768px - Tab bar navigation, collapsible menus
- **Tablet**: 768px - 1024px - Hybrid navigation
- **Desktop**: > 1024px - Full horizontal navigation

### Touch Optimization
- Minimum 44px touch targets
- Thumb-friendly bottom navigation
- Swipe gestures for tab switching
- Large, clear buttons and controls

### Performance Considerations
- Lazy loading for non-critical components
- Optimized images and assets
- Minimal JavaScript for mobile
- Progressive enhancement

## Component Integration Patterns

### 1. Dashboard Components
Both parent and child dashboards follow this pattern:
```tsx
export default function DashboardPage() {
  return (
    <AppLayout requiresFamily={true} allowedRoles={["parent"]}>
      <DashboardComponent />
    </AppLayout>
  );
}
```

### 2. Chore Interaction Components
Interactive components receive props for data flow:
```tsx
<ChoreDetail
  chore={selectedChore}
  onClose={() => setShowDetail(false)}
  onStatusUpdate={handleStatusUpdate}
  onHelpRequest={handleHelpRequest}
  isOpen={showDetail}
/>
```

### 3. Layout Components
Consistent responsive containers:
```tsx
<ResponsiveContainer maxWidth="xl" padding="md" background="white">
  <PageHeader title="..." description="..." icon="..." />
  <ComponentContent />
</ResponsiveContainer>
```

## State Management

### Family Context State
- Managed at AppLayout level
- Passed down through props
- Refreshed on family switches
- Cached for performance

### Navigation State
- Active route tracking
- Mobile menu state
- Notification counters
- Role switching state

### Component Communication
- Parent → Child: Props passing
- Child → Parent: Callback functions
- Sibling: Shared state through parent
- Global: Context API for family data

## Error Handling

### Network Errors
- Graceful fallbacks for API failures
- Retry mechanisms for critical requests
- User-friendly error messages
- Offline state indicators

### Authentication Errors
- Automatic redirect to login
- Session refresh handling
- Role permission errors
- Family access denied states

### Component Errors
- Error boundaries for crash protection
- Loading states for async operations
- Empty states for no data
- Progressive disclosure for complex UIs

## Performance Optimization

### Code Splitting
- Route-based splitting for dashboards
- Component-based splitting for heavy features
- Dynamic imports for modal components
- Lazy loading for non-critical paths

### Caching Strategy
- Family context caching
- API response caching
- Image optimization
- Static asset caching

### Bundle Optimization
- Tree shaking for unused code
- Component size monitoring
- Dependency analysis
- Production build optimization

## Testing Strategy

### Component Testing
- Unit tests for individual components
- Integration tests for data flow
- Snapshot tests for UI consistency
- Accessibility testing

### Navigation Testing
- Role-based navigation verification
- Mobile responsiveness testing
- Cross-browser compatibility
- Touch interaction testing

### API Integration Testing
- Family context API testing
- Error scenario testing
- Performance testing
- Security testing

## Deployment Considerations

### Environment Configuration
- API endpoint configuration
- Feature flag management
- Environment-specific settings
- Security token management

### Mobile App Considerations
- Progressive Web App (PWA) setup
- App shell architecture
- Offline functionality
- Push notification integration

### Monitoring & Analytics
- Navigation usage tracking
- Component performance monitoring
- Error rate monitoring
- User engagement metrics

## Future Enhancements

### Planned Features
- Real-time notifications via WebSocket
- Enhanced offline support
- Voice command integration
- Advanced analytics dashboard

### Scalability Considerations
- Component library extraction
- Micro-frontend architecture
- API versioning strategy
- Multi-tenant family support

## Troubleshooting

### Common Issues
1. **Family context not loading**: Check API endpoint and authentication
2. **Navigation not updating**: Verify role-based logic and state updates
3. **Mobile tab bar not showing**: Check showMobileTabBar prop
4. **Role switching not working**: Verify user permissions and family membership

### Debug Tools
- React DevTools for component inspection
- Network tab for API debugging
- Console logs for state tracking
- Mobile device simulation

### Support Resources
- Component documentation
- API reference guides
- Mobile testing guidelines
- Performance optimization tips