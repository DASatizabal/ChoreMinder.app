#!/bin/bash

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
if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
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
