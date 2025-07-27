# Chore Workflow Integration Guide

## Overview

The complete chore lifecycle workflow has been implemented with the following components:

### Core Components

1. **ChoreWorkflow** - Main orchestrator that monitors workflow stages
2. **ChoreAssignmentFlow** - 4-step assignment process for parents
3. **ChildChoreFlow** - Child interface for accepting and completing chores
4. **PhotoApprovalFlow** - Photo review and approval system for parents
5. **NotificationSystem** - Real-time notifications for all workflow stages

### Notification System

The notification system provides real-time updates for:

- **Chore Assignment**: Parent assigns → Child gets notification
- **Chore Acceptance**: Child accepts → Parent gets notification  
- **Chore Declined**: Child declines → Parent gets notification with reason
- **Work Started**: Child starts → Parent gets notification
- **Chore Completed**: Child completes → Parent gets notification
- **Photo Submitted**: Child submits photo → Parent gets notification
- **Photo Approved**: Parent approves → Child gets notification with points
- **Photo Rejected**: Parent rejects → Child gets notification with feedback

### Integration Example

```tsx
import { NotificationLayout } from "@/components/NotificationLayout";
import { ChoreWorkflow } from "@/components/ChoreWorkflow";
import { useNotifications } from "@/hooks/useNotifications";

function ParentDashboard({ familyId, familyMembers }) {
  const notifications = useNotifications({ familyId });

  return (
    <NotificationLayout 
      familyId={familyId} 
      userRole="parent"
    >
      <ChoreWorkflow
        familyId={familyId}
        familyMembers={familyMembers}
        mode="monitor"
        onWorkflowComplete={(chore) => {
          console.log("Workflow completed:", chore);
        }}
      />
    </NotificationLayout>
  );
}
```

### API Endpoints

The notification system uses these endpoints:

- `GET /api/notifications` - Fetch user notifications
- `POST /api/notifications/create` - Create new notification
- `PUT /api/notifications/[id]/read` - Mark notification as read
- `PUT /api/notifications/mark-all-read` - Mark all as read

### Workflow Stages

1. **Created** → **Assigned** → **Accepted** → **In Progress** → **Completed** → **Photo Submitted** → **Under Review** → **Approved**

Each stage transition triggers appropriate notifications to relevant family members.

### Features

- **Real-time Updates**: WebSocket + polling for instant notifications
- **Action Buttons**: Quick actions directly from notifications
- **Smart Recommendations**: AI-powered assignment suggestions
- **Progress Tracking**: Visual progress bars and stage indicators
- **Error Handling**: Comprehensive error recovery and retry mechanisms
- **Timer Functionality**: Work time tracking with encouragement
- **Photo Management**: Full photo upload, review, and approval workflow

### Usage Notes

1. Wrap dashboard pages with `NotificationLayout`
2. Use `useNotifications` hook for programmatic notification triggers
3. All workflow components automatically trigger notifications
4. Notification templates are pre-configured for each workflow stage
5. Components are fully integrated with the existing ChoreMinder architecture

This completes the end-to-end chore lifecycle workflow with comprehensive notification support.