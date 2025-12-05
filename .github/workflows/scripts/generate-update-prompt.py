#!/usr/bin/env python3
import sys
import os
import json

# Read template
with open('.github/workflows/prompts/update-prompt.txt', 'r') as f:
    template = f.read()

# Read large content
with open('commits_with_diffs.txt', 'r') as f:
    commits_with_diffs = f.read()

existing_changelog = ''
if os.path.exists('CHANGELOG.md'):
    with open('CHANGELOG.md', 'r') as f:
        existing_changelog = f.read()

# Get environment variables
version = os.environ.get('VERSION', '')
last_tag = os.environ.get('LAST_TAG', '')
branch = os.environ.get('BRANCH', '')
is_dirty = os.environ.get('IS_DIRTY', '')
date = os.environ.get('DATE', '')
all_tags = os.environ.get('ALL_TAGS', '')

# Replace placeholders
template = template.replace('{{VERSION}}', version)
template = template.replace('{{LAST_TAG}}', last_tag)
template = template.replace('{{BRANCH}}', branch)
template = template.replace('{{IS_DIRTY}}', is_dirty)
template = template.replace('{{DATE}}', date)
template = template.replace('{{ALL_TAGS}}', all_tags)
template = template.replace('{{COMMITS_WITH_DIFFS}}', commits_with_diffs)
template = template.replace('{{EXISTING_CHANGELOG}}', existing_changelog)

# Write prompt to file
with open('prompt.txt', 'w') as f:
    f.write(template)

# Create API request JSON
# Using gpt-4o-mini which has 128k context window
request_data = {
    "model": "gpt-4o-mini",
    "messages": [
        {
            "role": "system",
            "content": "You are a technical changelog generator. Extract MULTIPLE detailed entries from each commit (3-7 per commit typical) by analyzing actual code diffs. Be specific and technical. This project uses squash commits - each commit is a full PR worth of changes. Commits after the latest tag MUST go in [Unreleased]. Return only the changelog content, no markdown code blocks or explanations."
        },
        {
            "role": "user",
            "content": template
        }
    ],
    "temperature": 0.3,
    "max_tokens": 16000
}

# Write request JSON
with open('request.json', 'w') as f:
    json.dump(request_data, f)

print("Update prompt and API request generated successfully")
