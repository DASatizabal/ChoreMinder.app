# 🚀 ChoreMinder Production Deployment Guide

**Complete guide for deploying ChoreMinder to production environment**

## 📋 Pre-Deployment Checklist

### ✅ Code & Dependencies
- [ ] All tests passing (integration, performance, unit)
- [ ] Code review completed and approved
- [ ] Dependencies updated and security scanned
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Build process verified

### ✅ Infrastructure Setup
- [ ] Production servers provisioned
- [ ] Domain and SSL certificates configured
- [ ] CDN setup for static assets
- [ ] Database cluster configured
- [ ] Redis cache cluster setup
- [ ] Load balancer configured

### ✅ Security & Compliance
- [ ] Security audit completed
- [ ] API rate limiting configured
- [ ] CORS policies set
- [ ] Data encryption verified
- [ ] Backup encryption tested
- [ ] GDPR compliance verified

### ✅ Third-Party Services
- [ ] AWS S3 production bucket configured
- [ ] WhatsApp Business API approved for production
- [ ] Twilio SMS production account verified
- [ ] Resend email domain verified
- [ ] Stripe production keys configured
- [ ] MongoDB Atlas production cluster ready

---

## 🏗️ Infrastructure Architecture

### Production Environment Stack
```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx)                   │
│                     SSL Termination                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                ┌─────▼─────┐
                │  Vercel   │
                │ (Frontend │
                │ & API)    │
                └─────┬─────┘
                      │
            ┌─────────▼─────────┐
            │                   │
    ┌───────▼────┐    ┌────────▼────┐
    │ MongoDB    │    │   Redis     │
    │ Atlas      │    │ (Cache)     │
    │ (Primary)  │    │             │
    └────────────┘    └─────────────┘
            │
    ┌───────▼────┐
    │ AWS S3     │
    │ (Files)    │
    └────────────┘
```

### Recommended Production Setup

#### **Vercel Deployment (Recommended)**
- **Tier**: Pro ($20/month)
- **Features**: Edge functions, analytics, DDoS protection
- **Scaling**: Automatic based on traffic
- **SSL**: Automatic certificate management

#### **Alternative: VPS Deployment**
- **Server**: 4 CPU, 8GB RAM, 160GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Load Balancer**: Nginx with PM2
- **Process Manager**: PM2 for Node.js

#### **Database: MongoDB Atlas**
- **Tier**: M10 ($57/month) - Production minimum
- **Features**: Replica set, automated backups, monitoring
- **Regions**: Multi-region for redundancy
- **Connection**: Connection pooling enabled

#### **Cache: Redis Cloud**
- **Tier**: 1GB plan ($15/month)
- **Features**: High availability, persistence
- **Configuration**: Optimized for session and data caching

---

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production` file:

```bash
# Application
NODE_ENV=production
NEXTAUTH_URL=https://choreminder.com
NEXTAUTH_SECRET=your-super-secure-secret-key-here

# Database
DATABASE_URL=mongodb+srv://prod-user:password@cluster.mongodb.net/choreminder-prod
MONGODB_URI=mongodb+srv://prod-user:password@cluster.mongodb.net/choreminder-prod

# Redis Cache
REDIS_URL=redis://:password@redis-server:6379

# Authentication
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Email Service (Resend)
RESEND_API_KEY=re_your_production_api_key

# SMS & WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
WHATSAPP_ACCESS_TOKEN=your-whatsapp-business-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=choreminder-prod-uploads
AWS_S3_REGION=us-east-1

# Payment Processing (Stripe)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Monitoring & Analytics
SENTRY_DSN=https://your-sentry-dsn
ANALYTICS_ID=your-analytics-id

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Security
CORS_ORIGIN=https://choreminder.com
```

### Security Configuration

#### **API Rate Limiting**
```javascript
// middleware/rateLimiting.js
import rateLimit from 'express-rate-limit';

export const createRateLimit = (options = {}) => {
  return rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
};

// Different limits for different endpoints
export const strictRateLimit = createRateLimit({ max: 10 }); // Auth endpoints
export const moderateRateLimit = createRateLimit({ max: 50 }); // API endpoints
export const relaxedRateLimit = createRateLimit({ max: 200 }); // Public endpoints
```

#### **CORS Configuration**
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ORIGIN || 'https://choreminder.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ];
  },
};
```

---

## 🗄️ Database Setup

### MongoDB Atlas Production Configuration

#### **1. Create Production Cluster**
```bash
# Using MongoDB Atlas CLI
atlas clusters create choreminder-prod \
  --provider AWS \
  --region US_EAST_1 \
  --tier M10 \
  --backup true \
  --diskSizeGB 10
```

#### **2. Configure Security**
```bash
# Create database user
atlas dbusers create \
  --username prod-user \
  --password $MONGODB_PASSWORD \
  --role readWrite \
  --database choreminder-prod

# Whitelist application IPs
atlas accessLists create --ip 0.0.0.0/0 --comment "Production access"
```

#### **3. Database Indexes for Performance**
```javascript
// scripts/create-production-indexes.js
import { dbConnect } from '../libs/mongoose.js';
import mongoose from 'mongoose';

const createProductionIndexes = async () => {
  await dbConnect();
  
  const db = mongoose.connection.db;
  
  // Users collection
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ familyId: 1 });
  await db.collection('users').createIndex({ role: 1, familyId: 1 });
  
  // Families collection
  await db.collection('families').createIndex({ createdBy: 1 });
  await db.collection('families').createIndex({ 'members.user': 1 });
  
  // Chores collection
  await db.collection('chores').createIndex({ family: 1, status: 1 });
  await db.collection('chores').createIndex({ assignedTo: 1, status: 1 });
  await db.collection('chores').createIndex({ dueDate: 1 });
  await db.collection('chores').createIndex({ status: 1, dueDate: 1 });
  await db.collection('chores').createIndex({ family: 1, category: 1 });
  await db.collection('chores').createIndex({ createdAt: 1 });
  
  // Compound indexes for common queries
  await db.collection('chores').createIndex({ 
    family: 1, 
    assignedTo: 1, 
    status: 1, 
    dueDate: 1 
  });
  
  // Text search index
  await db.collection('chores').createIndex({ 
    title: 'text', 
    description: 'text' 
  });
  
  console.log('Production indexes created successfully');
};

export default createProductionIndexes;
```

### Redis Configuration

#### **Production Redis Setup**
```javascript
// libs/redis.js
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  // Production optimizations
  connectTimeout: 10000,
  commandTimeout: 5000,
  family: 4, // Force IPv4
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

export default redis;
```

---

## 🔐 Security Hardening

### **1. Environment Security**
```bash
# Set secure file permissions
chmod 600 .env.production
chown app:app .env.production

# Secure the application directory
chmod -R 755 /app
chown -R app:app /app
```

### **2. HTTP Security Headers**
```javascript
// middleware/security.js
export const securityHeaders = {
  'X-DNS-Prefetch-Control': 'false',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.stripe.com https://*.amazonaws.com;
    frame-src https://js.stripe.com;
  `.replace(/\s+/g, ' ').trim()
};
```

### **3. API Security Middleware**
```javascript
// middleware/apiSecurity.js
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

export const requireAuth = async (req, res, next) => {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  req.user = session.user;
  next();
};

export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const validateFamily = async (req, res, next) => {
  const { familyId } = req.params;
  const userFamilyId = req.user.familyId;
  
  if (familyId !== userFamilyId) {
    return res.status(403).json({ error: 'Access to family data denied' });
  }
  
  next();
};
```

---

## 📦 Deployment Process

### **Vercel Deployment (Recommended)**

#### **1. Install Vercel CLI**
```bash
npm i -g vercel
vercel login
```

#### **2. Configure Project**
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "app/api/webhooks/stripe/route.js": {
      "maxDuration": 30
    }
  }
}
```

#### **3. Deploy to Production**
```bash
# Set environment variables in Vercel dashboard
vercel env add NODE_ENV production
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
# ... add all environment variables

# Deploy
vercel --prod
```

### **Alternative: VPS Deployment**

#### **1. Server Setup Script**
```bash
#!/bin/bash
# setup-production-server.sh

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx

# Create application user
useradd -m -s /bin/bash app
usermod -aG sudo app

# Create application directory
mkdir -p /app
chown app:app /app

# Setup firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo "Server setup complete"
```

#### **2. Application Deployment Script**
```bash
#!/bin/bash
# deploy-app.sh

# Navigate to app directory
cd /app

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build application
npm run build

# Create ecosystem file for PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'choreminder',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/choreminder/error.log',
    out_file: '/var/log/choreminder/out.log',
    log_file: '/var/log/choreminder/combined.log',
    time: true
  }]
}
EOF

# Create log directory
mkdir -p /var/log/choreminder
chown app:app /var/log/choreminder

# Start/restart application
pm2 reload ecosystem.config.js
pm2 save
pm2 startup

echo "Application deployed successfully"
```

#### **3. Nginx Configuration**
```nginx
# /etc/nginx/sites-available/choreminder
server {
    listen 80;
    server_name choreminder.com www.choreminder.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name choreminder.com www.choreminder.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/choreminder.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/choreminder.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/javascript
        application/json
        application/xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        # ... same proxy settings as above
    }

    # Strict rate limiting for auth endpoints
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        # ... same proxy settings as above
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }
}
```

---

## 🔍 Health Checks & Monitoring

### **Application Health Check**
```javascript
// app/api/health/route.js
import { dbConnect } from '@/libs/mongoose';
import redis from '@/libs/redis';
import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };

  try {
    // Database health
    const dbStart = Date.now();
    await dbConnect();
    checks.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    checks.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    checks.status = 'unhealthy';
  }

  try {
    // Redis health
    const redisStart = Date.now();
    await redis.ping();
    checks.checks.redis = {
      status: 'healthy',
      responseTime: Date.now() - redisStart
    };
  } catch (error) {
    checks.checks.redis = {
      status: 'unhealthy',
      error: error.message
    };
    checks.status = 'unhealthy';
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  checks.checks.memory = {
    status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    rss: memUsage.rss
  };

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
```

### **Performance Monitoring**
```javascript
// libs/monitoring.js
import { performance } from 'perf_hooks';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  startTimer(name) {
    this.metrics.set(name, { start: performance.now() });
  }

  endTimer(name) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.duration = performance.now() - metric.start;
      metric.end = new Date().toISOString();
      return metric.duration;
    }
    return 0;
  }

  recordApiCall(endpoint, method, duration, statusCode) {
    const metric = {
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: new Date().toISOString()
    };
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('Slow API call:', metric);
    }
    
    // Send to monitoring service (e.g., Sentry, DataDog)
    this.sendToMonitoring(metric);
  }

  async sendToMonitoring(metric) {
    // Implementation for your monitoring service
    if (process.env.MONITORING_ENDPOINT) {
      try {
        await fetch(process.env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metric)
        });
      } catch (error) {
        console.error('Failed to send monitoring data:', error);
      }
    }
  }
}

export const monitor = new PerformanceMonitor();
```

---

## 🚨 Deployment Validation

### **Post-Deployment Checklist**
```bash
#!/bin/bash
# validate-deployment.sh

echo "🚀 Validating ChoreMinder Production Deployment"

# Check application health
echo "Checking application health..."
curl -f https://choreminder.com/api/health || exit 1

# Check authentication
echo "Testing authentication endpoints..."
curl -f https://choreminder.com/api/auth/providers || exit 1

# Check database connectivity
echo "Testing database operations..."
curl -f -X POST https://choreminder.com/api/test/db-connection || exit 1

# Check file upload capability
echo "Testing file upload..."
curl -f https://choreminder.com/api/test/s3-connection || exit 1

# Check notification services
echo "Testing notification services..."
curl -f https://choreminder.com/api/test/notifications || exit 1

# Performance check
echo "Running performance test..."
curl -w "@curl-format.txt" -s -o /dev/null https://choreminder.com/

echo "✅ All deployment validations passed!"
```

### **Performance Benchmarks**
```javascript
// scripts/performance-benchmark.js
import { performance } from 'perf_hooks';

const runBenchmarks = async () => {
  const baseUrl = process.env.PRODUCTION_URL || 'https://choreminder.com';
  
  const benchmarks = [
    { name: 'Homepage Load', url: `${baseUrl}/` },
    { name: 'API Health Check', url: `${baseUrl}/api/health` },
    { name: 'Authentication Check', url: `${baseUrl}/api/auth/providers` },
    { name: 'Demo Family Data', url: `${baseUrl}/api/families/demo` }
  ];

  for (const benchmark of benchmarks) {
    const start = performance.now();
    
    try {
      const response = await fetch(benchmark.url);
      const duration = performance.now() - start;
      
      console.log(`✅ ${benchmark.name}: ${duration.toFixed(2)}ms (${response.status})`);
      
      if (duration > 2000) {
        console.warn(`⚠️  Slow response for ${benchmark.name}`);
      }
    } catch (error) {
      console.error(`❌ ${benchmark.name}: ${error.message}`);
    }
  }
};

runBenchmarks();
```

This deployment configuration ensures your ChoreMinder POC is production-ready with proper security, monitoring, and performance optimization. The next step is creating compelling demo family data.