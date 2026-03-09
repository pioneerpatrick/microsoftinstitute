#!/bin/bash

# Folder where your project lives
PROJECT_DIR=~/Desktop/Microsoftinstitute
cd "$PROJECT_DIR" || { echo "Folder not found! Exiting."; exit 1; }

echo "🔄 Pulling latest changes from GitHub..."
git pull origin main --rebase

if [ $? -ne 0 ]; then
    echo "⚠️ Error pulling from GitHub. Resolve conflicts manually."
    exit 1
fi

echo "📝 Adding changes..."
git add .

# Create a commit with current timestamp
COMMIT_MSG="Auto update: $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG" 2>/dev/null

echo "🚀 Pushing changes to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Microsoftinstitute folder successfully updated and pushed!"
else
    echo "⚠️ Push failed. You may need to resolve conflicts."
fi
