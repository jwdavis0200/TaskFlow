#!/bin/bash

# Firebase Storage Rules Switcher for TaskFlow Pro
# Usage: ./switch-rules.sh [dev|prod]

ENV=${1:-dev}

echo "🔧 Switching storage rules to: $ENV"

if [ "$ENV" = "dev" ] || [ "$ENV" = "emulator" ]; then
    # Copy emulator rules to active storage.rules
    cp storage-emulator.rules storage.rules
    echo "✅ Development rules active (emulator-friendly)"
    echo "💡 Run: firebase emulators:start"
    
elif [ "$ENV" = "prod" ] || [ "$ENV" = "production" ]; then
    # Copy production rules to active storage.rules
    cp storage-production.rules storage.rules
    echo "✅ Production rules active (full security)"
    echo "💡 Run: firebase deploy --only storage"
    
else
    echo "❌ Usage: $0 [dev|prod]"
    echo "Available commands:"
    echo "  $0 dev   - Switch to emulator-friendly rules"
    echo "  $0 prod  - Switch to production security rules"
    exit 1
fi

echo ""
echo "Current active rules:"
echo "===================="
head -3 storage.rules
echo "===================="