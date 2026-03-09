#!/bin/bash

# =====================================
# Safe Auto-Update Script for Microsoftinstitute
# =====================================

# Project folder
PROJECT_DIR=~/Desktop/Microsoftinstitute
cd "$PROJECT_DIR" || { echo "Folder not found! Exiting."; exit 1; }

# Log file
LOG_FILE="$PROJECT_DIR/auto-update.log"

echo "===============================" | tee -a $LOG_FILE
echo "Update started at $(date)" | tee -a $LOG_FILE

# Backup modified files
BACKUP_DIR="$PROJECT_DIR/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

MODIFIED_FILES=$(git status --porcelain | grep '^[ M]' | awk '{print $2}')

if [ -n "$MODIFIED_FILES" ]; then
    echo "Backing up modified files to $BACKUP_DIR" | tee -a $LOG_FILE
    for file in $MODIFIED_FILES; do
        mkdir -p "$(dirname "$BACKUP_DIR/$file")"
        cp -r "$file" "$BACKUP_DIR/$file"
    done
else
    echo "No modified files to back up." | tee -a $LOG_FILE
fi

# Pull latest changes from GitHub
echo "🔄 Pulling latest changes from GitHub..." | tee -a $LOG_FILE
git pull origin main --rebase | tee -a $LOG_FILE
if [ $? -ne 0 ]; then
    echo "⚠️ Pull failed. Resolve conflicts manually." | tee -a $LOG_FILE
    exit 1
fi

# Add any new or changed files
echo "📝 Adding local changes..." | tee -a $LOG_FILE
git add .

# Commit only if there are changes
if git diff --cached --quiet; then
    echo "ℹ️ No local changes to commit." | tee -a $LOG_FILE
else
    COMMIT_MSG="Auto update: $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG" | tee -a $LOG_FILE
fi

# Push to GitHub
echo "🚀 Pushing changes to GitHub..." | tee -a $LOG_FILE
git push origin main | tee -a $LOG_FILE
if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub." | tee -a $LOG_FILE
else
    echo "⚠️ Push failed. Resolve conflicts manually." | tee -a $LOG_FILE
fi

# Automatically install dependencies and rebuild if Node.js project
if [ -f package.json ]; then
    echo "📦 Installing dependencies..." | tee -a $LOG_FILE
    npm install | tee -a $LOG_FILE
    echo "🛠️ Running build script..." | tee -a $LOG_FILE
    npm run build | tee -a $LOG_FILE
    echo "✅ Build completed!" | tee -a $LOG_FILE
else
    echo "ℹ️ No package.json found. Skipping npm install/build." | tee -a 
$LOG_FILE
fi

echo "Update finished at $(date)" | tee -a $LOG_FILE
echo "===============================" | tee -a $LOG_FILE
