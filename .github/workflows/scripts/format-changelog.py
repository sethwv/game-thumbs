#!/usr/bin/env python3
"""
Format changelog from AI-generated entries into proper Keep a Changelog structure.
Used for single-call API responses to ensure consistent formatting.
"""
import sys
import os
import json
import re

def parse_entries_by_category(content):
    """Parse AI response and extract entries organized by category"""
    categories = {}
    current_category = None
    
    for line in content.split('\n'):
        line = line.strip()
        
        # Check for category headers
        if line.startswith('### '):
            current_category = line[4:].strip()
            if current_category not in categories:
                categories[current_category] = []
        elif line.startswith('- ') and current_category:
            # This is an entry under the current category
            categories[current_category].append(line)
    
    return categories

def format_changelog_section(categories):
    """Format categories and entries into proper changelog section"""
    lines = []
    
    # Standard category order
    category_order = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']
    
    for category in category_order:
        if category in categories and categories[category]:
            lines.append(f"### {category}")
            lines.append("")
            for entry in categories[category]:
                lines.append(entry)
            lines.append("")
    
    # Add any other categories not in standard order
    for category, entries in categories.items():
        if category not in category_order and entries:
            lines.append(f"### {category}")
            lines.append("")
            for entry in entries:
                lines.append(entry)
            lines.append("")
    
    return '\n'.join(lines)

def main():
    # Read the API response
    with open('api_response.json', 'r') as f:
        response = json.load(f)
    
    # Extract content
    content = response.get('choices', [{}])[0].get('message', {}).get('content', '')
    
    if not content:
        print("Error: No content in API response")
        sys.exit(1)
    
    # Remove markdown code blocks if present
    content = re.sub(r'^```markdown\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^```\n', '', content, flags=re.MULTILINE)
    content = content.strip()
    
    # Get environment variables
    version = os.environ.get('VERSION', '')
    last_tag = os.environ.get('LAST_TAG', '')
    date = os.environ.get('DATE', '')
    tag_dates = os.environ.get('TAG_DATES', '')
    all_tags = os.environ.get('ALL_TAGS', '')
    changelog_exists = os.environ.get('CHANGELOG_EXISTS', 'false')
    
    # Parse tag dates
    tag_to_date = {}
    if tag_dates:
        for line in tag_dates.strip().split('\n'):
            if ':' in line:
                tag, tag_date = line.split(':', 1)
                tag_to_date[tag.strip()] = tag_date.strip()
    
    # Build the changelog
    lines = []
    
    # Header
    lines.append("# Changelog")
    lines.append("")
    lines.append("All notable changes to this project will be documented in this file.")
    lines.append("")
    lines.append("The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),")
    lines.append("and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).")
    lines.append("")
    
    # Check if this is an update (changelog exists) or backfill
    if changelog_exists == 'true' and last_tag:
        # Update mode: AI generated entries for new commits go in [Unreleased]
        # unless this is a release event
        is_release = version and last_tag and version != last_tag and version.startswith('v')
        
        if is_release:
            # New version section
            lines.append(f"## [{version}] - {date}")
            lines.append("")
            categories = parse_entries_by_category(content)
            lines.append(format_changelog_section(categories))
        else:
            # Unreleased section
            lines.append("## [Unreleased]")
            lines.append("")
            categories = parse_entries_by_category(content)
            lines.append(format_changelog_section(categories))
        
        # Add existing changelog sections
        if os.path.exists('CHANGELOG.md'):
            with open('CHANGELOG.md', 'r') as f:
                existing = f.read()
            
            # Extract everything after the header
            parts = existing.split('## [', 1)
            if len(parts) > 1:
                lines.append('## [' + parts[1])
    else:
        # Backfill mode: AI should have generated full changelog
        # Just ensure proper formatting
        lines.append(content)
    
    # Write the formatted changelog
    changelog_content = '\n'.join(lines)
    
    with open('CHANGELOG.md', 'w') as f:
        f.write(changelog_content)
    
    print(f"✅ Formatted changelog written ({len(changelog_content)} bytes)")

if __name__ == '__main__':
    main()
