#!/bin/bash

# Go to the project folder
PROJECT_DIR=~/Desktop/Microsoftinstitute
cd $PROJECT_DIR || { echo "Folder not found!"; exit 1; }

# Pull latest changes from GitHub
git pull origin main

# Optional: If you want to install dependencies or build
# Uncomment if needed
# npm install
# npm run build

echo "Microsoftinstitute folder updated successfully!"
