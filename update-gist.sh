#!/bin/bash

cd ~/Desktop/Microsoftinstitute || exit

git add .
git commit -m "Auto update $(date)"
git push

echo "Gist updated successfully."
