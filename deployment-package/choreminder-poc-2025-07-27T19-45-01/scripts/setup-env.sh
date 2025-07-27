#!/bin/bash

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
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   %s\n' "${MISSING_VARS[@]}"
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
if [ ${#NEXTAUTH_SECRET} -lt 32 ]; then
    echo "⚠️  NEXTAUTH_SECRET should be at least 32 characters long"
fi

echo "🎉 Environment configuration validated successfully!"
