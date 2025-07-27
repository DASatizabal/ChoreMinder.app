# 🛠️ ChoreMinder Troubleshooting Guide

This comprehensive guide helps users, support teams, and administrators quickly resolve common issues with ChoreMinder.

## 📋 Quick Issue Resolution

### 🚨 Emergency Issues (Immediate Action Required)
- [Unable to log in](#unable-to-log-in)
- [Family data missing](#family-data-missing)
- [Photos not uploading](#photos-not-uploading)
- [Notifications not working](#notifications-not-working)

### ⚠️ Common Issues (Standard Resolution)  
- [Chores not appearing](#chores-not-appearing)
- [Points not updating](#points-not-updating)
- [Calendar sync problems](#calendar-sync-problems)
- [Performance issues](#performance-issues)

### 💡 User Experience Issues
- [Interface problems](#interface-problems)
- [Mobile app issues](#mobile-app-issues)
- [Family member permissions](#family-member-permissions)

---

## 🚨 Emergency Issues

### Unable to Log In

#### **Symptoms**
- Login page shows error messages
- "Invalid credentials" despite correct password
- Account locked or suspended messages
- Email verification loop

#### **Immediate Diagnostics**
```bash
# Check user status
curl -X GET "https://choreminder.com/api/auth/status" \
  -H "Authorization: Bearer [token]"

# Verify email in database
curl -X GET "https://choreminder.com/api/users/verify-email/[email]"
```

#### **Resolution Steps**

**Step 1: Basic Verification**
1. **Check email format**: Ensure no extra spaces or typos
2. **Try password reset**: Use "Forgot Password" link
3. **Check email for verification**: Look in spam/junk folders
4. **Clear browser cache**: Delete cookies and cached data

**Step 2: Account Status Check**
```sql
-- Check user account status
SELECT id, email, hasAccess, emailVerified, lastLoginAt 
FROM users 
WHERE email = '[user_email]';

-- Check for account locks
SELECT * FROM account_locks 
WHERE email = '[user_email]' 
AND expiresAt > NOW();
```

**Step 3: Advanced Resolution**
1. **Manual email verification**: Admin can mark email as verified
2. **Reset user session**: Clear all active sessions
3. **Check authentication service**: Verify NextAuth.js configuration
4. **Database connectivity**: Ensure user collection is accessible

#### **Prevention**
- Implement account recovery options
- Add clear error messaging
- Monitor authentication failure rates
- Set up account status alerts

---

### Family Data Missing

#### **Symptoms**
- Dashboard shows empty family
- Chores disappeared suddenly
- Family members can't see shared data
- "Family not found" errors

#### **Immediate Diagnostics**
```javascript
// Check family data integrity
const familyStatus = await Family.findById(familyId).populate('members');
console.log('Family Status:', {
  exists: !!familyStatus,
  memberCount: familyStatus?.members?.length || 0,
  deletedAt: familyStatus?.deletedAt
});

// Verify user-family relationships
const userFamilyStatus = await User.find({ familyId }).select('name role hasAccess');
console.log('Family Members:', userFamilyStatus);
```

#### **Resolution Steps**

**Step 1: Data Verification**
1. **Check family exists**: Verify family ID in database
2. **Verify user permissions**: Ensure user has family access
3. **Check soft deletes**: Look for deletedAt timestamps
4. **Validate family membership**: Confirm user is in family.members array

**Step 2: Database Recovery**
```sql
-- Restore soft-deleted family
UPDATE families 
SET deletedAt = NULL 
WHERE id = '[family_id]' AND deletedAt IS NOT NULL;

-- Restore user access
UPDATE users 
SET hasAccess = true, familyId = '[family_id]'
WHERE email = '[user_email]';

-- Verify data consistency
SELECT f.name, u.name, u.role 
FROM families f 
JOIN users u ON u.familyId = f.id 
WHERE f.id = '[family_id]';
```

**Step 3: Emergency Recovery**
1. **Database backup restore**: Restore from recent backup if needed
2. **Manual data recreation**: Rebuild family structure if corrupted
3. **User notification**: Inform family members of resolution
4. **Data integrity check**: Run full family data validation

#### **Prevention**
- Implement soft delete safeguards
- Regular automated backups
- Family data consistency monitoring
- User access auditing

---

### Photos Not Uploading

#### **Symptoms**
- Upload progress bar stalls
- "Upload failed" error messages
- Photos appear corrupted or missing
- S3 connection errors

#### **Immediate Diagnostics**
```javascript
// Test S3 connectivity
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION
});

// Test upload capability
s3.putObject({
  Bucket: process.env.AWS_S3_BUCKET,
  Key: 'test-upload.txt',
  Body: 'Test upload'
}, (err, data) => {
  console.log('S3 Test:', err ? 'FAILED' : 'SUCCESS');
});
```

#### **Resolution Steps**

**Step 1: Client-Side Issues**
1. **Check file size**: Ensure under 5MB limit
2. **Verify file format**: Accept only JPG, PNG, WEBP
3. **Test internet connection**: Verify stable upload connection
4. **Browser compatibility**: Try different browser or device

**Step 2: Server-Side Issues**
1. **S3 credentials**: Verify AWS access keys are valid
2. **Bucket permissions**: Check S3 bucket policy and CORS
3. **Storage quota**: Ensure S3 bucket hasn't reached limits
4. **CDN issues**: Check CloudFront distribution if used

**Step 3: Advanced Resolution**
```bash
# Check S3 bucket status
aws s3 ls s3://[bucket-name] --region [region]

# Test direct upload
aws s3 cp test-file.jpg s3://[bucket-name]/test/ --region [region]

# Verify bucket policy
aws s3api get-bucket-policy --bucket [bucket-name]
```

#### **Prevention**
- Monitor S3 service health
- Implement upload retry logic
- Set up S3 event notifications
- Regular credential rotation

---

### Notifications Not Working

#### **Symptoms**
- No WhatsApp/SMS messages received
- Email notifications in spam
- Notification preferences not saving
- Delayed or missing notifications

#### **Immediate Diagnostics**
```javascript
// Test notification services
const testNotification = {
  userId: '[user_id]',
  type: 'chore_assigned',
  message: 'Test notification',
  channels: ['whatsapp', 'sms', 'email']
};

// Check service availability
const serviceStatus = {
  whatsapp: await testWhatsAppConnection(),
  sms: await testTwilioConnection(),
  email: await testResendConnection()
};

console.log('Notification Services:', serviceStatus);
```

#### **Resolution Steps**

**Step 1: Service Verification**
1. **WhatsApp Business API**: Check token validity and webhook
2. **Twilio SMS**: Verify account status and phone number verification
3. **Resend Email**: Check API key and domain verification
4. **User preferences**: Verify notification settings are saved

**Step 2: Message Delivery**
```javascript
// Check notification queue
const pendingNotifications = await NotificationQueue.find({
  status: 'pending',
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
});

// Test direct message sending
await messagingService.sendMessage({
  to: '[phone_number]',
  message: 'ChoreMinder test message',
  channel: 'sms'
});
```

**Step 3: Advanced Debugging**
1. **Rate limiting**: Check if hitting API limits
2. **Webhook validation**: Verify incoming webhook signatures
3. **Queue processing**: Ensure notification workers are running
4. **Fallback chains**: Test primary → fallback → final fallback

#### **Prevention**
- Monitor third-party service status
- Implement robust retry mechanisms
- Set up service health alerts
- Regular notification delivery testing

---

## ⚠️ Common Issues

### Chores Not Appearing

#### **Symptoms**
- Empty chore list despite assignments
- Recurring chores not generating
- Schedule conflicts preventing display
- Family isolation not working correctly

#### **Diagnostics**
```sql
-- Check chore visibility
SELECT c.title, c.status, c.assignedTo, c.family, c.deletedAt
FROM chores c
WHERE c.assignedTo = '[user_id]' 
AND c.deletedAt IS NULL
ORDER BY c.dueDate;

-- Verify family membership
SELECT u.id, u.name, u.familyId, f.name as familyName
FROM users u
JOIN families f ON u.familyId = f.id
WHERE u.id = '[user_id]';
```

#### **Resolution Steps**
1. **Verify family membership**: User must be in correct family
2. **Check chore filters**: Ensure no active filters hiding chores
3. **Timezone issues**: Verify dates display in correct timezone
4. **Permission check**: Confirm user can view assigned chores
5. **Cache clearing**: Clear server-side cache for user

---

### Points Not Updating

#### **Symptoms**
- Completed chores not awarding points
- Point totals incorrect or outdated
- Achievement progress not advancing
- Leaderboard not updating

#### **Diagnostics**
```javascript
// Check user gamification data
const user = await User.findById(userId).select('gamification');
console.log('User Points:', user.gamification);

// Verify chore completion
const completedChores = await Chore.find({
  assignedTo: userId,
  status: 'verified',
  createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
});

console.log('Completed Chores:', completedChores.length);
```

#### **Resolution Steps**
1. **Manual point recalculation**: Run point sync script
2. **Check approval status**: Points awarded only on verification
3. **Gamification service**: Restart point calculation service
4. **Database consistency**: Verify chore-point relationships
5. **Cache invalidation**: Clear gamification caches

---

### Calendar Sync Problems

#### **Symptoms**
- Chores not appearing on calendar
- Scheduling conflicts not detected
- Drag-and-drop rescheduling fails
- Calendar view performance issues

#### **Resolution Steps**
1. **Refresh calendar data**: Clear calendar cache
2. **Check date formats**: Verify timezone and locale settings
3. **Reschedule conflicts**: Manually resolve scheduling conflicts
4. **Calendar library**: Update FullCalendar component
5. **Performance optimization**: Limit calendar date range

---

### Performance Issues

#### **Symptoms**
- Slow page loading
- Database timeout errors
- High memory usage
- Unresponsive interface

#### **Diagnostics**
```bash
# Check system performance
curl -X GET "https://choreminder.com/api/performance/metrics"

# Database query analysis
db.chores.explain("executionStats").find({family: ObjectId("[family_id]")})

# Memory usage check
docker stats choreminder-app
```

#### **Resolution Steps**
1. **Database optimization**: Add missing indexes
2. **Cache warming**: Pre-populate frequently accessed data
3. **Query optimization**: Review and optimize slow queries
4. **Resource scaling**: Increase server resources if needed
5. **CDN optimization**: Optimize asset delivery

---

## 💡 User Experience Issues

### Interface Problems

#### **Common Issues**
- Layout broken on mobile
- Buttons not responsive
- Form validation errors
- Dark/light mode issues

#### **Quick Fixes**
1. **Clear browser cache**: Force reload (Ctrl+F5)
2. **Try different browser**: Test in Chrome, Firefox, Safari
3. **Check screen resolution**: Ensure responsive design works
4. **Disable extensions**: Try incognito/private mode
5. **Update browser**: Use latest browser version

---

### Mobile App Issues

#### **PWA Installation**
```javascript
// Check PWA compatibility
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered'))
    .catch(err => console.log('SW registration failed'));
}

// Check manifest
fetch('/manifest.json')
  .then(response => response.json())
  .then(manifest => console.log('Manifest:', manifest));
```

#### **Resolution Steps**
1. **Service worker**: Clear and reinstall service worker
2. **App cache**: Clear PWA cached data
3. **Manifest validation**: Verify web app manifest
4. **Push notifications**: Re-enable notification permissions
5. **Home screen**: Re-add app to home screen

---

### Family Member Permissions

#### **Permission Matrix**
| Action | Parent | Child | Admin |
|--------|--------|-------|-------|
| Create chores | ✅ | ❌ | ✅ |
| Assign chores | ✅ | ❌ | ✅ |
| Complete chores | ✅ | ✅ | ✅ |
| Approve chores | ✅ | ❌ | ✅ |
| Manage family | ✅ | ❌ | ✅ |
| View analytics | ✅ | Limited | ✅ |

#### **Troubleshooting Steps**
1. **Verify user role**: Check role assignment in database
2. **Permission refresh**: Log out and back in
3. **Family membership**: Confirm active family membership
4. **Role escalation**: Admin can temporarily elevate permissions

---

## 🔧 Technical Troubleshooting

### Database Issues

#### **Connection Problems**
```bash
# Test MongoDB connection
mongosh "mongodb://[connection-string]" --eval "db.runCommand('ping')"

# Check connection pool
db.serverStatus().connections

# Monitor slow queries
db.setProfilingLevel(2, { slowms: 100 })
db.system.profile.find().sort({ts: -1}).limit(5)
```

#### **Data Consistency**
```javascript
// Run data consistency check
const inconsistencies = await runDataConsistencyCheck();
console.log('Data Issues Found:', inconsistencies);

// Fix common data issues
await fixOrphanedChores();
await syncUserPoints();
await validateFamilyMemberships();
```

### Authentication Issues

#### **Session Problems**
```javascript
// Check session validity
const session = await getServerSession(authOptions);
console.log('Session Status:', {
  valid: !!session,
  user: session?.user?.email,
  expires: session?.expires
});

// Force session refresh
await signOut({ redirect: false });
await signIn('credentials', { email, password });
```

#### **OAuth Issues**
```bash
# Verify OAuth configuration
echo "Google OAuth Config:"
echo "Client ID: $GOOGLE_CLIENT_ID"
echo "Callback URL: $NEXTAUTH_URL/api/auth/callback/google"

# Test OAuth flow
curl -X GET "https://accounts.google.com/o/oauth2/v2/auth?client_id=[client_id]&redirect_uri=[callback]&response_type=code&scope=openid%20email%20profile"
```

---

## 📞 Support Escalation

### Level 1 Support (User Issues)
- Account access problems
- Basic feature questions
- Notification preferences
- Mobile app installation

**Tools**: User dashboard, basic diagnostics, knowledge base

### Level 2 Support (Technical Issues)
- Database connectivity problems
- Performance issues
- Integration failures
- Data corruption

**Tools**: Database access, application logs, monitoring dashboards

### Level 3 Support (Critical Issues)
- System-wide outages
- Security incidents
- Data loss scenarios
- Architecture problems

**Tools**: Full system access, deployment capabilities, vendor escalation

---

## 📊 Monitoring & Prevention

### Automated Monitoring
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabaseHealth(),
    s3: await checkS3Connectivity(),
    notifications: await checkNotificationServices(),
    cache: await checkCacheHealth()
  };
  
  const healthy = Object.values(checks).every(check => check.status === 'ok');
  res.status(healthy ? 200 : 500).json(checks);
});
```

### Key Metrics to Monitor
- **Response Times**: < 200ms for 95% of requests
- **Error Rates**: < 1% overall error rate
- **Uptime**: 99.9% availability target
- **User Satisfaction**: Support ticket volume and resolution time

### Alert Thresholds
- **Critical**: System down, data loss, security breach
- **Warning**: High error rates, slow responses, service degradation
- **Info**: Unusual patterns, capacity approaching limits

---

## 📚 Additional Resources

### Documentation Links
- [API Documentation](./api-reference.md)
- [Database Schema](./database-schema.md)
- [Deployment Guide](./deployment-guide.md)
- [Security Guidelines](./security-guidelines.md)

### Support Channels
- **Emergency**: support-emergency@choreminder.com
- **Technical**: support-tech@choreminder.com
- **General**: help@choreminder.com
- **Community**: https://community.choreminder.com

### Useful Tools
- **Database GUI**: MongoDB Compass
- **API Testing**: Postman collection
- **Log Analysis**: Application logs via dashboard
- **Performance**: Built-in performance monitoring

---

**This troubleshooting guide is designed to provide quick resolution paths for common issues while building toward comprehensive system reliability. Regular updates ensure it stays current with system changes and new issue patterns.**

*Last updated: [Current Date]*
*Version: 1.0*