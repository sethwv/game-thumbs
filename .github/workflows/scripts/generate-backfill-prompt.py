#!/usr/bin/env python3
import sys
import os
import json

# Read template
with open('.github/workflows/prompts/backfill-prompt.txt', 'r') as f:
    template = f.read()

# Read large content
with open('commits_with_diffs.txt', 'r') as f:
    commits_with_diffs = f.read()

# Get environment variables
version = os.environ.get('VERSION', '')
branch = os.environ.get('BRANCH', '')
is_dirty = os.environ.get('IS_DIRTY', '')
date = os.environ.get('DATE', '')
tag_dates = os.environ.get('TAG_DATES', '')

# Replace placeholders
template = template.replace('{{VERSION}}', version)
template = template.replace('{{BRANCH}}', branch)
template = template.replace('{{IS_DIRTY}}', is_dirty)
template = template.replace('{{DATE}}', date)
template = template.replace('{{TAG_DATES}}', tag_dates)
template = template.replace('{{COMMITS_WITH_DIFFS}}', commits_with_diffs)

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
            "content": "You are a technical changelog generator. Extract MULTIPLE detailed entries from each commit by reading the actual code diffs. Each commit should produce 3-7 entries. Be specific and technical - include file/component names. Never write vague summaries. This project uses squash commits. Return only the changelog content, no markdown code blocks or explanations."
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

print("Backfill prompt and API request generated successfully")
