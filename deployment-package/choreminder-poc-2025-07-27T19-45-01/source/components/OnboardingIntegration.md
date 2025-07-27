# Family Onboarding System Integration Guide

## Overview

The family onboarding system provides a smooth, educational experience for new families joining ChoreMinder. It consists of four main components working together to guide families through setup.

## Components Created

### 1. FamilySetupWizard
**Purpose**: 6-step wizard for creating a family profile
**Features**:
- Family information collection
- Rule setting with predefined options
- Member addition with role assignment
- Settings configuration
- Review and confirmation
- Comprehensive validation

**Usage**:
```tsx
import FamilySetupWizard from "@/components/FamilySetupWizard";

<FamilySetupWizard
  onComplete={(familyData) => {
    console.log("Family created:", familyData);
  }}
  onSkip={() => {
    // Handle skip action
  }}
  existingFamily={existingFamilyData} // Optional for editing
/>
```

### 2. MemberInvitation
**Purpose**: Email-based invitation system for family members
**Features**:
- Single and bulk email invitations
- Role-based invitation templates
- Personal message customization
- Invitation tracking and management
- Resend and cancel functionality
- Email validation and duplicate prevention

**Usage**:
```tsx
import MemberInvitation from "@/components/MemberInvitation";

<MemberInvitation
  familyId="family123"
  familyName="The Johnson Family"
  onInvitationSent={(invitation) => {
    console.log("Invitation sent:", invitation);
  }}
  existingMembers={familyMembers}
/>
```

### 3. InitialChoreSetup
**Purpose**: Guided chore creation with smart recommendations
**Features**:
- Age-appropriate chore templates
- Category and difficulty filtering
- Smart assignment recommendations
- Custom chore creation
- Bulk chore creation
- Recurrence configuration

**Usage**:
```tsx
import InitialChoreSetup from "@/components/InitialChoreSetup";

<InitialChoreSetup
  familyId="family123"
  familyMembers={familyMembers}
  onComplete={(chores) => {
    console.log("Chores created:", chores);
  }}
  onSkip={() => {
    // Handle skip
  }}
/>
```

### 4. TutorialSystem
**Purpose**: Interactive guided tours and help system
**Features**:
- Role-based tutorials (parent/child/admin)
- Interactive element highlighting
- Progress tracking
- Skip functionality
- Multiple tutorial categories
- Prerequisite system

**Usage**:
```tsx
import TutorialSystem from "@/components/TutorialSystem";

<TutorialSystem
  userRole="parent"
  isVisible={true}
  startTutorial="parent-getting-started"
  onComplete={() => {
    console.log("Tutorial completed");
  }}
  onSkip={() => {
    console.log("Tutorial skipped");
  }}
/>
```

### 5. OnboardingOrchestrator
**Purpose**: Manages the complete onboarding flow
**Features**:
- Step progression management
- Progress persistence
- Skip handling
- Success celebrations
- Integration with all components

**Usage**:
```tsx
import OnboardingOrchestrator from "@/components/OnboardingOrchestrator";

<OnboardingOrchestrator
  currentStep="family-setup"
  onComplete={() => {
    // Redirect to dashboard
    router.push("/dashboard");
  }}
  existingFamily={familyData}
/>
```

## API Endpoints

### Family Setup
- `POST /api/families/setup` - Create family with initial setup
- `GET /api/families/[familyId]` - Get family details

### Member Invitations
- `GET /api/families/[familyId]/invitations` - List invitations
- `POST /api/families/[familyId]/invitations` - Send single invitation
- `POST /api/families/[familyId]/invitations/bulk` - Send bulk invitations
- `POST /api/families/[familyId]/invitations/[id]/resend` - Resend invitation
- `DELETE /api/families/[familyId]/invitations/[id]` - Cancel invitation

### Chore Setup
- `POST /api/families/[familyId]/chores/bulk` - Create multiple chores
- `GET /api/chores/templates` - Get chore templates

## Integration Examples

### New User Onboarding Flow
```tsx
// pages/onboarding.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingOrchestrator from "@/components/OnboardingOrchestrator";

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <OnboardingOrchestrator
      onComplete={() => {
        router.push("/dashboard/parent");
      }}
    />
  );
}
```

### Existing Family Enhancement
```tsx
// In parent dashboard
import { useState } from "react";
import MemberInvitation from "@/components/MemberInvitation";

const [showInviteModal, setShowInviteModal] = useState(false);

return (
  <div>
    <button onClick={() => setShowInviteModal(true)}>
      Invite Family Members
    </button>
    
    {showInviteModal && (
      <div className="modal modal-open">
        <div className="modal-box">
          <MemberInvitation
            familyId={family.id}
            familyName={family.name}
            onClose={() => setShowInviteModal(false)}
            onInvitationSent={() => {
              // Refresh family data
              refreshFamily();
            }}
          />
        </div>
      </div>
    )}
  </div>
);
```

### Tutorial Integration
```tsx
// Add to any dashboard layout
import TutorialSystem, { TutorialTarget } from "@/components/TutorialSystem";

return (
  <div>
    {/* Wrap elements that should be highlighted in tutorials */}
    <TutorialTarget id="create-chore-btn">
      <button className="btn btn-primary">
        Create Chore
      </button>
    </TutorialTarget>

    <TutorialTarget id="family-members">
      <div className="family-members-section">
        {/* Family members content */}
      </div>
    </TutorialTarget>

    {/* Tutorial system */}
    <TutorialSystem
      userRole={userRole}
      isVisible={true}
    />
  </div>
);
```

## Customization

### Adding New Tutorial Steps
```tsx
// In TutorialSystem.tsx, add to tutorials array:
{
  id: "new-feature-tutorial",
  name: "New Feature Guide",
  description: "Learn about our latest feature",
  role: "parent",
  category: "feature",
  estimatedTime: 2,
  steps: [
    {
      id: "intro",
      title: "New Feature! 🎉",
      content: "Check out this amazing new feature...",
      target: "[data-new-feature]",
      placement: "bottom",
      action: "click",
      skippable: true,
      showArrow: true
    }
  ]
}
```

### Custom Chore Templates
```tsx
// Add to InitialChoreSetup.tsx presetChores array:
{
  id: "custom-chore",
  title: "Custom Family Chore",
  description: "A chore specific to your family's needs",
  category: "Custom",
  priority: "medium",
  points: 15,
  estimatedMinutes: 20,
  requiresPhotoVerification: true,
  ageGroup: "teen",
  difficulty: "medium",
  emoji: "🏠",
  tips: ["Customize this for your family", "Add specific instructions"]
}
```

## Data Flow

1. **Family Setup**: User completes wizard → Family created in database → Members invited
2. **Member Invitations**: Emails sent → Invitation tokens stored → Members join via links
3. **Chore Setup**: Templates selected → Chores created in bulk → Members assigned
4. **Tutorial**: User completes guided tour → Progress tracked → Onboarding finished

## Error Handling

All components include comprehensive error handling:
- Form validation with user-friendly messages
- API error handling with retry options
- Graceful degradation when services are unavailable
- Progress persistence across browser sessions

## Mobile Responsiveness

All onboarding components are fully responsive:
- Mobile-first design approach
- Touch-friendly interactions
- Responsive layouts for all screen sizes
- Mobile-optimized tutorial overlays

## Accessibility

- Screen reader support
- Keyboard navigation
- High contrast mode compatibility
- Focus management during tutorials

This onboarding system creates a smooth, educational experience that helps families get started quickly while learning how to use ChoreMinder effectively.