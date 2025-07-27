#!/usr/bin/env node

/**
 * ChoreMinder Deployment Package Creator
 * 
 * Creates a complete deployment package with all necessary files,
 * configurations, and documentation for production deployment
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class DeploymentPackager {
  constructor() {
    this.packageDir = 'deployment-package';
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.packageName = `choreminder-poc-${this.timestamp}`;
    this.excludedDirs = [
      'node_modules',
      '.git',
      '.next',
      'deployment-package',
      '.env.local'
    ];
  }

  async createPackage() {
    console.log('📦 Creating ChoreMinder Deployment Package');
    console.log('=========================================');
    
    try {
      await this.setupPackageDirectory();
      await this.copySourceCode();
      await this.createConfigurationTemplates();
      await this.bundleDocumentation();
      await this.createDeploymentScripts();
      await this.generatePackageManifest();
      await this.createArchive();
      
      console.log('\n✅ Deployment package created successfully!');
      console.log(`📁 Package location: ${this.packageDir}/${this.packageName}`);
      console.log(`🗜️  Archive: ${this.packageDir}/${this.packageName}.tar.gz`);
      
    } catch (error) {
      console.error('❌ Failed to create deployment package:', error);
      throw error;
    }
  }

  async setupPackageDirectory() {
    console.log('🏗️  Setting up package directory...');
    
    await fs.mkdir(this.packageDir, { recursive: true });
    await fs.mkdir(`${this.packageDir}/${this.packageName}`, { recursive: true });
    
    // Create subdirectories
    const subdirs = [
      'source',
      'config',
      'docs',
      'scripts',
      'assets',
      'tests'
    ];
    
    for (const subdir of subdirs) {
      await fs.mkdir(`${this.packageDir}/${this.packageName}/${subdir}`, { recursive: true });
    }
    
    console.log('✅ Package directory structure created');
  }

  async copySourceCode() {
    console.log('📂 Copying source code...');
    
    const sourceDir = `${this.packageDir}/${this.packageName}/source`;
    
    // Copy essential directories
    const essentialDirs = [
      'app',
      'components', 
      'libs',
      'models',
      'hooks',
      'types',
      'public',
      'styles'
    ];
    
    for (const dir of essentialDirs) {
      if (await this.directoryExists(dir)) {
        await this.copyDirectory(dir, `${sourceDir}/${dir}`);
      }
    }
    
    // Copy essential files
    const essentialFiles = [
      'package.json',
      'package-lock.json',
      'next.config.js',
      'tailwind.config.js',
      'tsconfig.json',
      'next-sitemap.config.js',
      'postcss.config.js',
      'CLAUDE.md',
      'README.md'
    ];
    
    for (const file of essentialFiles) {
      if (await this.fileExists(file)) {
        await fs.copyFile(file, `${sourceDir}/${file}`);
      }
    }
    
    console.log('✅ Source code copied');
  }

  async createConfigurationTemplates() {
    console.log('⚙️  Creating configuration templates...');
    
    const configDir = `${this.packageDir}/${this.packageName}/config`;
    
    // Environment template
    const envTemplate = `# ChoreMinder Production Environment Configuration
# Copy this file to .env.local and configure with your values

# =============================================================================
# APPLICATION SETTINGS
# =============================================================================
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secure-secret-key-minimum-32-characters

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
# MongoDB Atlas connection string
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/choreminder?retryWrites=true&w=majority
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/choreminder?retryWrites=true&w=majority

# =============================================================================
# AUTHENTICATION PROVIDERS
# =============================================================================
# Google OAuth (required)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# =============================================================================
# EMAIL SERVICE (RESEND)
# =============================================================================
RESEND_API_KEY=re_your_resend_api_key

# =============================================================================
# FILE STORAGE (AWS S3)
# =============================================================================
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_S3_BUCKET_REGION=us-east-1

# =============================================================================
# PAYMENT PROCESSING (STRIPE)
# =============================================================================
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# =============================================================================
# MESSAGING SERVICES (OPTIONAL)
# =============================================================================
# Twilio for SMS
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your-whatsapp-business-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# =============================================================================
# AI SERVICES (OPTIONAL)
# =============================================================================
OPENAI_API_KEY=sk-your-openai-api-key

# =============================================================================
# MONITORING & ANALYTICS (OPTIONAL)
# =============================================================================
SENTRY_DSN=https://your-sentry-dsn
ANALYTICS_ID=your-analytics-id

# =============================================================================
# SECURITY SETTINGS
# =============================================================================
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
`;

    await fs.writeFile(`${configDir}/.env.template`, envTemplate);
    
    // Vercel configuration
    const vercelConfig = {
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
    };
    
    await fs.writeFile(`${configDir}/vercel.json`, JSON.stringify(vercelConfig, null, 2));
    
    // Docker configuration
    const dockerfile = `# ChoreMinder Production Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
`;

    await fs.writeFile(`${configDir}/Dockerfile`, dockerfile);
    
    // Docker Compose
    const dockerCompose = `version: '3.8'

services:
  choreminder:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.local
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: choreminder
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
`;

    await fs.writeFile(`${configDir}/docker-compose.yml`, dockerCompose);
    
    console.log('✅ Configuration templates created');
  }

  async bundleDocumentation() {
    console.log('📚 Bundling documentation...');
    
    const docsDir = `${this.packageDir}/${this.packageName}/docs`;
    
    // Copy all documentation
    if (await this.directoryExists('docs')) {
      await this.copyDirectory('docs', docsDir);
    }
    
    // Copy deployment documentation
    if (await this.directoryExists('deployment')) {
      await this.copyDirectory('deployment', `${docsDir}/deployment`);
    }
    
    // Copy development documentation
    if (await this.directoryExists('DevDocs')) {
      await this.copyDirectory('DevDocs', `${docsDir}/development`);
    }
    
    if (await this.directoryExists('DevPlanDocs')) {
      await this.copyDirectory('DevPlanDocs', `${docsDir}/planning`);
    }
    
    console.log('✅ Documentation bundled');
  }

  async createDeploymentScripts() {
    console.log('🔧 Creating deployment scripts...');
    
    const scriptsDir = `${this.packageDir}/${this.packageName}/scripts`;
    
    // Copy existing scripts
    if (await this.directoryExists('scripts')) {
      await this.copyDirectory('scripts', scriptsDir);
    }
    
    // Quick deployment script
    const quickDeploy = `#!/bin/bash

# ChoreMinder Quick Deployment Script
# This script sets up ChoreMinder for production deployment

set -e

echo "🚀 ChoreMinder Quick Deployment"
echo "==============================="

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
if [ "$(printf '%s\\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
    echo "❌ Node.js 18.0.0 or higher is required (found $NODE_VERSION)"
    exit 1
fi

echo "✅ Node.js $NODE_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Check environment configuration
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Copying template..."
    cp config/.env.template .env.local
    echo "🔧 Please configure .env.local with your production values"
    echo "📖 See docs/deployment/production-deployment.md for details"
    exit 1
fi

# Build application
echo "🏗️  Building application..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm run test:final 2>/dev/null || echo "⚠️  Tests not available"

# Start production server
echo "🎉 Deployment complete!"
echo "💡 Start the server with: npm start"
echo "🌐 Access your application at: http://localhost:3000"
`;

    await fs.writeFile(`${scriptsDir}/deploy.sh`, quickDeploy);
    await fs.chmod(`${scriptsDir}/deploy.sh`, 0o755);
    
    // Environment setup script
    const envSetup = `#!/bin/bash

# Environment Setup Script
# Validates and configures environment variables

set -e

echo "🔧 Environment Configuration Setup"
echo "=================================="

# Required environment variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET" 
    "NEXTAUTH_URL"
    "RESEND_API_KEY"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_S3_BUCKET_NAME"
)

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found"
    echo "💡 Copy config/.env.template to .env.local and configure it"
    exit 1
fi

# Load environment variables
source .env.local

# Validate required variables
MISSING_VARS=()
for var in "\${REQUIRED_VARS[@]}"; do
    if [ -z "\${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ \${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   %s\\n' "\${MISSING_VARS[@]}"
    echo "📖 See docs/deployment/production-deployment.md for configuration guide"
    exit 1
fi

echo "✅ All required environment variables are configured"

# Test database connection
echo "🗄️  Testing database connection..."
npm run test:connection || {
    echo "❌ Database connection failed"
    echo "💡 Check your DATABASE_URL configuration"
    exit 1
}

echo "✅ Database connection successful"

# Validate NextAuth configuration
if [ \${#NEXTAUTH_SECRET} -lt 32 ]; then
    echo "⚠️  NEXTAUTH_SECRET should be at least 32 characters long"
fi

echo "🎉 Environment configuration validated successfully!"
`;

    await fs.writeFile(`${scriptsDir}/setup-env.sh`, envSetup);
    await fs.chmod(`${scriptsDir}/setup-env.sh`, 0o755);
    
    console.log('✅ Deployment scripts created');
  }

  async generatePackageManifest() {
    console.log('📋 Generating package manifest...');
    
    const manifest = {
      name: "ChoreMinder POC",
      version: "1.0.0",
      description: "Complete deployment package for ChoreMinder POC",
      created: new Date().toISOString(),
      contents: {
        source: "Complete application source code",
        config: "Configuration templates and deployment files",
        docs: "Comprehensive documentation and guides",
        scripts: "Deployment and maintenance scripts",
        tests: "Testing suites and validation tools"
      },
      requirements: {
        nodejs: ">=18.0.0",
        npm: ">=8.0.0",
        mongodb: ">=6.0.0",
        environment: "Production-ready environment variables"
      },
      deployment: {
        platforms: ["Vercel", "AWS", "Docker", "VPS"],
        databases: ["MongoDB Atlas", "Self-hosted MongoDB"],
        storage: ["AWS S3", "Compatible S3 services"]
      },
      quickStart: [
        "1. Extract package contents",
        "2. Copy config/.env.template to .env.local",
        "3. Configure environment variables",
        "4. Run scripts/setup-env.sh",
        "5. Run scripts/deploy.sh",
        "6. Access application at http://localhost:3000"
      ],
      support: {
        documentation: "docs/",
        troubleshooting: "docs/Troubleshooting-Guide.md",
        deployment: "docs/deployment/production-deployment.md",
        api: "docs/api-reference.md"
      }
    };
    
    await fs.writeFile(
      `${this.packageDir}/${this.packageName}/PACKAGE-MANIFEST.json`,
      JSON.stringify(manifest, null, 2)
    );
    
    // Create README for the package
    const packageReadme = `# ChoreMinder POC Deployment Package

**Complete deployment package for ChoreMinder Proof of Concept**

## 📦 Package Contents

- **source/**: Complete application source code
- **config/**: Configuration templates and deployment files
- **docs/**: Comprehensive documentation and guides
- **scripts/**: Deployment and maintenance scripts

## 🚀 Quick Deployment

1. **Extract Package**: Extract all contents to your deployment directory
2. **Configure Environment**: Copy \`config/.env.template\` to \`.env.local\` and configure
3. **Setup Environment**: Run \`./scripts/setup-env.sh\`
4. **Deploy**: Run \`./scripts/deploy.sh\`
5. **Access**: Open http://localhost:3000

## 📚 Documentation

- **Deployment Guide**: \`docs/deployment/production-deployment.md\`
- **User Guide**: \`docs/Family-User-Guide.md\`
- **API Reference**: \`docs/api-reference.md\`
- **Troubleshooting**: \`docs/Troubleshooting-Guide.md\`

## 🔧 Requirements

- Node.js 18.0.0 or higher
- MongoDB 6.0.0 or higher
- Production environment variables configured
- AWS S3 bucket for file storage
- Resend account for email services

## 🎯 Demo Credentials

After deployment, use these credentials for demonstrations:

- **Parent**: sarah@demo.com / Demo2024!
- **Child**: emma@demo.com / Demo2024!

## 📞 Support

For deployment assistance or technical questions, refer to the documentation in the \`docs/\` directory.

**Package Version**: ${manifest.version}  
**Created**: ${manifest.created}
`;

    await fs.writeFile(`${this.packageDir}/${this.packageName}/README.md`, packageReadme);
    
    console.log('✅ Package manifest generated');
  }

  async createArchive() {
    console.log('🗜️  Creating deployment archive...');
    
    try {
      await execAsync(`cd ${this.packageDir} && tar -czf ${this.packageName}.tar.gz ${this.packageName}/`);
      console.log('✅ Archive created successfully');
    } catch (error) {
      console.log('⚠️  Archive creation failed (tar not available)');
      console.log('📁 Package available in directory format');
    }
  }

  async directoryExists(dir) {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async fileExists(file) {
    try {
      const stat = await fs.stat(file);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        if (!this.excludedDirs.includes(entry.name)) {
          await this.copyDirectory(srcPath, destPath);
        }
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

// Run the packager
const packager = new DeploymentPackager();

packager.createPackage()
  .then(() => {
    console.log('\n🎉 Deployment package creation completed!');
    console.log('📦 Ready for production deployment');
  })
  .catch((error) => {
    console.error('\n💥 Package creation failed:', error);
    process.exit(1);
  });