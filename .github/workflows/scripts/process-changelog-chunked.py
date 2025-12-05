#!/usr/bin/env python3
import sys
import os
import json
import subprocess
import re
import time

# Regex patterns used throughout
PATTERN_VERSION_TAG = r'tag:\s*(v\d+\.\d+\.\d+[^,)]*)'
PATTERN_BATCH_COMMENT = r'<!-- Batch \d+: Commits [a-f0-9]+\.\.[a-f0-9]+(?: \| VERSIONS: (.+?))? -->'
PATTERN_VERSION_COMMITS = r'(v\d+\.\d+\.\d+): ([a-f0-9,]+)'
PATTERN_BATCH_METADATA = r'<!-- Batch \d+: Commits ([a-f0-9]+)\.\.([a-f0-9]+)'

def estimate_tokens(text):
    """Rough estimate: 1 token ≈ 4 characters"""
    return len(text) // 4

def strip_batch_comment(text):
    """Remove batch metadata comment from text"""
    return re.sub(r'<!-- Batch.*?-->\n', '', text)

def extract_file_or_component(entry_text):
    """Extract the main file or component name from a changelog entry"""
    # Remove leading "- " and common prefixes
    text = entry_text.strip()
    if text.startswith('- '):
        text = text[2:].strip()
    
    # Extract file paths (e.g., "in helpers/logger.js", "to src/app.js")
    file_match = re.search(r'(?:in|to|from|for)\s+([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)', text)
    if file_match:
        return file_match.group(1)
    
    # Extract component names in backticks (e.g., "`TeamMatcher`", "`getTeamData()`")
    component_match = re.search(r'`([^`]+)`', text)
    if component_match:
        return component_match.group(1)
    
    # Extract class/function names (e.g., "Added getTeamMatchScore function")
    word_match = re.match(r'^(?:Added|Introduced|Created|Updated|Modified|Changed|Enhanced|Improved|Fixed|Resolved|Corrected|Removed|Deleted|Deprecated)\s+([a-zA-Z0-9_]+)', text, re.IGNORECASE)
    if word_match:
        return word_match.group(1)
    
    return None

def is_similar_entry(entry1, entry2):
    """Check if two entries are similar enough to be considered duplicates"""
    # Exact match
    if entry1 == entry2:
        return True
    
    # Extract file/component from both
    component1 = extract_file_or_component(entry1)
    component2 = extract_file_or_component(entry2)
    
    # If both reference the same file/component, check if they describe similar actions
    if component1 and component2 and component1 == component2:
        # Extract the action verbs
        text1 = entry1.lower()
        text2 = entry2.lower()
        
        # Common action groups
        add_verbs = ['added', 'introduced', 'created', 'implemented']
        change_verbs = ['updated', 'modified', 'changed', 'enhanced', 'improved', 'refactored', 'revised', 'adjusted']
        fix_verbs = ['fixed', 'resolved', 'corrected']
        remove_verbs = ['removed', 'deleted', 'eliminated']
        
        # Check if both entries use verbs from the same group
        for verb_group in [add_verbs, change_verbs, fix_verbs, remove_verbs]:
            has_verb1 = any(verb in text1 for verb in verb_group)
            has_verb2 = any(verb in text2 for verb in verb_group)
            if has_verb1 and has_verb2:
                return True
    
    return False

def consolidate_similar_entries(entries):
    """Consolidate multiple similar entries about the same file/component into one"""
    if len(entries) <= 1:
        return entries
    
    # Group entries by file/component
    groups = {}  # file/component -> [(index, entry, action_type)]
    ungrouped = []  # Entries without identifiable file/component
    
    for idx, entry in enumerate(entries):
        component = extract_file_or_component(entry)
        if component:
            if component not in groups:
                groups[component] = []
            
            # Determine action type
            text_lower = entry.lower()
            if any(verb in text_lower for verb in ['added', 'introduced', 'created', 'implemented']):
                action_type = 'add'
            elif any(verb in text_lower for verb in ['updated', 'modified', 'changed', 'enhanced', 'improved', 'refactored', 'revised', 'adjusted']):
                action_type = 'change'
            elif any(verb in text_lower for verb in ['fixed', 'resolved', 'corrected']):
                action_type = 'fix'
            elif any(verb in text_lower for verb in ['removed', 'deleted', 'eliminated']):
                action_type = 'remove'
            else:
                action_type = 'other'
            
            groups[component].append((idx, entry, action_type))
        else:
            ungrouped.append((idx, entry))
    
    # Build consolidated list
    result = []
    processed_indices = set()
    
    # Process each group
    for component, group_entries in groups.items():
        # Group by action type within this component
        by_action = {}
        for idx, entry, action_type in group_entries:
            if action_type not in by_action:
                by_action[action_type] = []
            by_action[action_type].append((idx, entry))
        
        # For each action type, if there are multiple entries, keep only the most descriptive one
        for action_type, action_entries in by_action.items():
            if len(action_entries) == 1:
                # Only one entry for this file+action, keep it
                idx, entry = action_entries[0]
                result.append((idx, entry))
                processed_indices.add(idx)
            else:
                # Multiple similar entries - keep the longest/most detailed one
                action_entries.sort(key=lambda x: len(x[1]), reverse=True)
                idx, entry = action_entries[0]
                result.append((idx, entry))
                for i, _ in action_entries:
                    processed_indices.add(i)
    
    # Add ungrouped entries
    for idx, entry in ungrouped:
        if idx not in processed_indices:
            result.append((idx, entry))
    
    # Sort by original index to maintain order
    result.sort(key=lambda x: x[0])
    
    return [entry for _, entry in result]

def parse_and_merge_entries(entry_blocks):
    """Parse multiple entry blocks and merge by category, removing duplicates and similar entries
    
    Returns: (formatted_text, commit_hashes_set)
    """
    categories = {}  # category -> list of unique entries
    commit_hashes = set()  # Track all commit hashes from batch metadata
    
    for entry_block in entry_blocks:
        # Extract commit hashes from batch metadata before processing
        batch_match = re.search(PATTERN_BATCH_METADATA, entry_block)
        if batch_match:
            commit_hashes.add(batch_match.group(1))  # start hash
            commit_hashes.add(batch_match.group(2))  # end hash
        
        # Also look for VERSIONS metadata to get individual commit hashes
        version_match = re.search(PATTERN_BATCH_COMMENT, entry_block)
        if version_match and version_match.group(1):
            # Extract hashes like "v0.6.2: abc123,def456"
            # Match format: "v0.6.2: abc1234,def5678 | v0.6.1: ghi9012"
            hash_matches = re.findall(r':\s*([a-f0-9,]+)', version_match.group(1))
            for hash_group in hash_matches:
                # Split comma-separated hashes
                hashes = [h.strip() for h in hash_group.split(',') if h.strip()]
                commit_hashes.update(hashes)
        
        # Strip batch metadata before processing entries
        entry_block = strip_batch_comment(entry_block)
        
        current_category = None
        for line in entry_block.split('\n'):
            line = line.strip()
            if line.startswith('### '):
                current_category = line[4:].strip()
                if current_category not in categories:
                    categories[current_category] = []
            elif line.startswith('- ') and current_category:
                # Check if this entry is similar to any existing entry
                is_duplicate = False
                for existing_entry in categories[current_category]:
                    if is_similar_entry(line, existing_entry):
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    categories[current_category].append(line)
    
    # Consolidate similar entries within each category
    for category in categories:
        categories[category] = consolidate_similar_entries(categories[category])
    
    # Format back to text
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
    
    # Add any non-standard categories
    for category, entries in categories.items():
        if category not in category_order and entries:
            lines.append(f"### {category}")
            lines.append("")
            for entry in entries:
                lines.append(entry)
            lines.append("")
    
    formatted_text = '\n'.join(lines).strip()
    return formatted_text, commit_hashes

def format_changelog(version_entries, unreleased_entries, tag_dates, current_version, date, is_release, existing_changelog='', version_commit_hashes=None, unreleased_commit_hashes=None):
    """Format the complete changelog from organized entries
    
    If existing_changelog is provided (update mode with processed commits),
    merges new entries into existing structure.
    Otherwise, builds complete changelog from scratch (backfill or first run).
    
    Args:
        version_commit_hashes: Dict mapping version tags to sets of commit hashes,
                              used to embed metadata even for versions without entries
        unreleased_commit_hashes: Set of commit hashes for unreleased commits
    """
    
    if version_commit_hashes is None:
        version_commit_hashes = {}
    if unreleased_commit_hashes is None:
        unreleased_commit_hashes = set()
    
    # Parse tag_dates into dict
    tag_to_date = {}
    if tag_dates:
        for line in tag_dates.strip().split('\n'):
            if ':' in line:
                tag, tag_date = line.split(':', 1)
                tag_to_date[tag.strip()] = tag_date.strip()
    
    # Check if we're merging with existing
    if existing_changelog and (version_entries or unreleased_entries):
        # Update mode: merge new entries into existing changelog
        return merge_changelog_entries(existing_changelog, version_entries, unreleased_entries, is_release, current_version, date)
    
    # Build the changelog from scratch
    lines = []
    
    # Header
    lines.append("# Changelog")
    lines.append("")
    lines.append("All notable changes to this project will be documented in this file.")
    lines.append("")
    lines.append("The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),")
    lines.append("and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).")
    lines.append("")
    
    # Unreleased section (if there are entries)
    if unreleased_entries:
        lines.append("## [Unreleased]")
        lines.append("")
        merged_unreleased, _ = parse_and_merge_entries(unreleased_entries)
        if merged_unreleased:
            # Embed commit hash metadata from our tracking set (source of truth)
            if unreleased_commit_hashes:
                hash_list = ','.join(sorted(unreleased_commit_hashes))
                lines.append(f"<!-- Processed commits: {hash_list} -->")
                lines.append("")
            lines.append(merged_unreleased)
            lines.append("")
    
    # Version sections (sorted newest first)
    all_versions = sorted(tag_to_date.keys(), key=lambda v: tag_to_date.get(v, ''), reverse=True)
    
    for version_tag in all_versions:
        version_date = tag_to_date.get(version_tag, date)
        lines.append(f"## [{version_tag}] - {version_date}")
        lines.append("")
        
        # Check if we have entries for this version
        if version_tag in version_entries:
            merged_version, _ = parse_and_merge_entries(version_entries[version_tag])
            if merged_version:
                # Embed commit hash metadata from our tracking dict (source of truth)
                if version_tag in version_commit_hashes and version_commit_hashes[version_tag]:
                    hash_list = ','.join(sorted(version_commit_hashes[version_tag]))
                    lines.append(f"<!-- Processed commits: {hash_list} -->")
                    lines.append("")
                lines.append(merged_version)
                lines.append("")
        elif version_tag in version_commit_hashes and version_commit_hashes[version_tag]:
            # We processed commits for this version but AI didn't return entries
            # This shouldn't happen in a proper backfill - it means the AI failed to extract entries
            # Embed metadata and add a note
            hash_list = ','.join(sorted(version_commit_hashes[version_tag]))
            lines.append(f"<!-- Processed commits: {hash_list} -->")
            lines.append("")
            lines.append("### Changed")
            lines.append("- Version release (no detailed changes extracted)")
            lines.append("")
        else:
            # No commits for this version at all (tag exists but no commits between this and next tag)
            lines.append("### Changed")
            lines.append("- Version release")
            lines.append("")
    
    return '\n'.join(lines)

def merge_changelog_entries(existing_changelog, version_entries, unreleased_entries, is_release, current_version, date):
    """Merge new entries into existing changelog structure"""
    
    lines = existing_changelog.split('\n')
    result = []
    i = 0
    
    # Copy header until first version section
    while i < len(lines):
        if lines[i].startswith('## ['):
            break
        result.append(lines[i])
        i += 1
    
    # Insert/update unreleased section
    if unreleased_entries:
        result.append("## [Unreleased]")
        result.append("")
        # Parse and merge entries to get metadata
        merged_unreleased, unreleased_hashes = parse_and_merge_entries(unreleased_entries)
        if merged_unreleased:
            # Embed commit hash metadata
            if unreleased_hashes:
                hash_list = ','.join(sorted(unreleased_hashes))
                result.append(f"<!-- Processed commits: {hash_list} -->")
                result.append("")
            result.append(merged_unreleased)
            result.append("")
    
    # If this is a release, add the new version section
    if is_release and current_version:
        result.append(f"## [{current_version}] - {date}")
        result.append("")
        if current_version in version_entries:
            # Parse and merge entries to get metadata
            merged_version, version_hashes = parse_and_merge_entries(version_entries[current_version])
            if merged_version:
                # Embed commit hash metadata
                if version_hashes:
                    hash_list = ','.join(sorted(version_hashes))
                    result.append(f"<!-- Processed commits: {hash_list} -->")
                    result.append("")
                result.append(merged_version)
                result.append("")
    
    # Copy remaining sections from existing changelog
    # Skip old [Unreleased] section if it existed
    while i < len(lines):
        line = lines[i]
        if line.startswith('## [Unreleased]'):
            # Skip until next version section
            i += 1
            while i < len(lines) and not lines[i].startswith('## ['):
                i += 1
            continue
        result.append(line)
        i += 1
    
    return '\n'.join(result)

def call_api(messages, token, retry_count=0, max_retries=5):
    """Call GitHub Models API with retry logic for rate limits"""
    
    request_data = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 16000
    }
    
    with open('api_request_temp.json', 'w') as f:
        json.dump(request_data, f)
    
    result = subprocess.run([
        'curl', '-s', '-w', '\nHTTP_CODE:%{http_code}',
        '-X', 'POST',
        '-H', f'Authorization: Bearer {token}',
        '-H', 'Content-Type: application/json',
        'https://models.inference.ai.azure.com/chat/completions',
        '--data-binary', '@api_request_temp.json'
    ], capture_output=True, text=True)
    
    # Parse response
    output = result.stdout
    http_code = '500'
    response_body = output
    
    if 'HTTP_CODE:' in output:
        parts = output.split('HTTP_CODE:')
        response_body = parts[0]
        http_code = parts[1].strip()
    
    # Handle rate limiting with retry
    if http_code == '429' and retry_count < max_retries:
        # Try to extract wait time from error message
        wait_time = 60  # Default to 60 seconds
        wait_match = re.search(r'wait (\d+) second', response_body)
        if wait_match:
            wait_time = int(wait_match.group(1)) + 2  # Add 2 second buffer
        
        print(f"  ⏳ Rate limit hit, waiting {wait_time} seconds (retry {retry_count + 1}/{max_retries})...")
        sys.stdout.flush()
        time.sleep(wait_time)
        
        return call_api(messages, token, retry_count + 1, max_retries)
    
    return http_code, response_body

def extract_processed_commits(changelog_path='CHANGELOG.md'):
    """Extract commit hashes that have already been processed from existing changelog
    
    Verifies that hashes still exist in git history to handle squashed/rebased commits.
    Looks for both new format (<!-- Processed commits: ... -->) and old batch format.
    """
    processed_hashes = set()
    
    if not os.path.exists(changelog_path):
        return processed_hashes
    
    try:
        with open(changelog_path, 'r') as f:
            content = f.read()
        
        candidate_hashes = set()
        
        # New format: <!-- Processed commits: abc123,def456,ghi789 -->
        processed_matches = re.findall(r'<!-- Processed commits: ([^>]+) -->', content)
        for match in processed_matches:
            hashes = match.split(',')
            for h in hashes:
                h = h.strip()
                if h:
                    candidate_hashes.add(h)
        
        # Old format (for backwards compatibility): <!-- Batch X: Commits abc123..def456 -->
        batch_matches = re.findall(PATTERN_BATCH_METADATA, content)
        for start_hash, end_hash in batch_matches:
            candidate_hashes.add(start_hash)
            candidate_hashes.add(end_hash)
        
        print(f"📋 Found {len(candidate_hashes)} commit hashes in existing changelog")
        sys.stdout.flush()
        
        # Verify each hash still exists in git history
        invalid_count = 0
        for commit_hash in candidate_hashes:
            # Check if commit exists: git cat-file -e <hash>^{commit}
            result = subprocess.run(
                ['git', 'cat-file', '-e', f'{commit_hash}^{{commit}}'],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                processed_hashes.add(commit_hash)
            else:
                invalid_count += 1
        
        if invalid_count > 0:
            print(f"⚠️  {invalid_count} commit(s) no longer exist (likely squashed/rebased)")
            print(f"   Will reprocess commits to update changelog")
        
        print(f"✅ {len(processed_hashes)} valid processed commits")
        sys.stdout.flush()
        
    except Exception as e:
        print(f"⚠️  Could not read existing changelog: {e}")
        sys.stdout.flush()
    
    return processed_hashes

def split_commits_by_marker(commits_text):
    """Split commits into individual commit blocks"""
    blocks = []
    current_block = []
    
    for line in commits_text.split('\n'):
        if line.startswith('=== COMMIT:'):
            if current_block:
                blocks.append('\n'.join(current_block))
            current_block = [line]
        else:
            current_block.append(line)
    
    if current_block:
        blocks.append('\n'.join(current_block))
    
    return blocks

def get_commit_hash_from_block(commit_block):
    """Extract the commit hash from a commit block"""
    lines = commit_block.split('\n')
    for line in lines:
        if line.startswith('=== COMMIT:'):
            parts = line.split('|')
            if len(parts) > 0:
                hash_part = parts[0].replace('=== COMMIT:', '').strip()
                return hash_part
    return None

def process_commits_in_batches(commit_blocks, token, version, tag_dates, date, commit_version_map):
    """Process commits in batches small enough to fit token limits"""
    # Target: ~6000 tokens per request to stay well under 8K limit
    max_chars_per_batch = 20000  # ~5000 tokens
    
    all_entries = []
    total_batches = 0
    
    # Calculate estimated batch count
    estimated_batches = (len(commit_blocks) * 10000) // max_chars_per_batch + 1
    
    i = 0
    while i < len(commit_blocks):
        total_batches += 1
        batch_commits = []
        batch_size = 0
        
        # Collect commits for this batch
        while i < len(commit_blocks) and batch_size < max_chars_per_batch:
            commit = commit_blocks[i]
            if batch_size + len(commit) < max_chars_per_batch:
                batch_commits.append(commit)
                batch_size += len(commit)
                i += 1
            else:
                break
        
        if not batch_commits:
            # Single commit too large, take it anyway with truncation
            commit = commit_blocks[i][:max_chars_per_batch]
            batch_commits.append(commit)
            i += 1
        
        # Progress indicator
        progress = (i / len(commit_blocks)) * 100
        print(f"\n{'='*60}")
        print(f"📦 Batch {total_batches} | Progress: {i}/{len(commit_blocks)} commits ({progress:.1f}%)")
        print(f"{'='*60}")
        print(f"  Commits in batch: {len(batch_commits)}, size: {batch_size:,} chars")
        sys.stdout.flush()
        
        # Process this batch
        batch_text = '\n\n'.join(batch_commits)
        entries = process_single_batch(batch_text, token, version, tag_dates, date, total_batches, commit_version_map)
        
        if entries:
            all_entries.extend(entries)
    
    return all_entries, total_batches

def build_commit_version_map(commits_text):
    """Build a map of commit hash -> version tag by analyzing git history order
    
    Logic: Commits AFTER a version tag (until the next tag) belong to that version.
    Commits before any tags are unreleased (None).
    
    Example (newest to oldest):
      Commit A (no tag) → None (unreleased)
      Commit B (tag v0.6.2) → v0.6.2
      Commit C (no tag) → v0.6.2 
      Commit D (tag v0.6.1) → v0.6.1
      Commit E (no tag) → v0.6.1
    """
    import re
    commit_to_version = {}
    
    lines = commits_text.split('\n')
    next_version = None  # The version that will apply to following commits
    
    # Process commits in order (newest to oldest as they appear in git log)
    for line in lines:
        if line.startswith('=== COMMIT:'):
            parts = line.split('|')
            if len(parts) > 0:
                hash_part = parts[0].replace('=== COMMIT:', '').strip()
                
                # Check if THIS commit has a tag
                has_tag = False
                if len(parts) >= 4:
                    refs_part = parts[3].replace('===', '').strip()
                    if refs_part and 'tag:' in refs_part:
                        # Extract version tags (v*.*.*)
                        tag_matches = re.findall(r'tag:\s*(v\d+\.\d+\.\d+[^,)]*)', refs_part)
                        if tag_matches:
                            # This commit is the tag point
                            tag_version = tag_matches[0].strip()
                            commit_to_version[hash_part] = tag_version
                            next_version = tag_version  # Apply to subsequent commits
                            has_tag = True
                
                # If this commit doesn't have a tag, use the next_version
                if not has_tag:
                    commit_to_version[hash_part] = next_version
    
    return commit_to_version

def process_single_batch(commits_text, token, version, tag_dates, date, batch_num, commit_version_map):
    """Process a single batch of commits and extract changelog entries"""
    
    # Extract commit hashes and determine their versions
    lines = commits_text.split('\n')
    first_hash = ""
    last_hash = ""
    commit_versions = {}  # Track which commits belong to which versions
    
    for line in lines:
        if line.startswith('=== COMMIT:'):
            parts = line.split('|')
            if len(parts) > 0:
                hash_part = parts[0].replace('=== COMMIT:', '').strip()
                if not first_hash:
                    first_hash = hash_part
                last_hash = hash_part
                
                # Get version from the pre-built map
                commit_version = commit_version_map.get(hash_part)
                if commit_version:
                    # Commit belongs to a released version
                    if commit_version not in commit_versions:
                        commit_versions[commit_version] = []
                    commit_versions[commit_version].append(hash_part[:7])
                # else: commit_version is None → unreleased commit (will have no VERSIONS metadata)
    
    batch_info = f"Commits {first_hash[:7]}..{last_hash[:7]}"
    if commit_versions:
        version_info = []
        for ver, hashes in sorted(commit_versions.items()):
            version_info.append(f"{ver}: {','.join(hashes)}")
        batch_info += f" | VERSIONS: {' | '.join(version_info)}"
    
    # Debug: show what we detected
    if commit_versions:
        print(f"  🏷️  Version mapping: {dict(commit_versions)}")
        sys.stdout.flush()
    else:
        print(f"  📝 No version tags found - entries will go to [Unreleased]")
        sys.stdout.flush()
    
    # Note: We track version info in metadata, but don't ask AI to split by version
    # We'll organize entries by version ourselves using commit_version_map
    
    prompt = f"""Extract detailed changelog entries from these commits.

Batch: {batch_info}
LAST RELEASED VERSION: {version}
Date: {date}

Commits in this batch:
{commits_text}

Instructions:
1. Extract MULTIPLE detailed entries from each commit (3-7 per commit typical)
2. Read the DIFF carefully - each file change often represents a separate entry
3. Be TECHNICAL and SPECIFIC: Include file/component names
4. Categories: Added, Changed, Deprecated, Removed, Fixed, Security
5. Format each entry as a simple bullet point starting with "- "
6. Group by category with headers like "### Added", "### Changed", etc.
7. DO NOT add version tags or prefixes to entries - just clean bullet points

Example output format:

### Added
- Added JWT token validation in auth middleware
- Introduced rate limiting for ESPN API provider

### Changed  
- Updated Express dependency to version 5.2.1
- Modified image cache to use LRU eviction strategy

### Fixed
- Fixed memory leak in thumbnail generation cleanup
- Resolved null pointer exception in team matching

Return ONLY the categorized bullet points, no explanations or extra text."""

    messages = [
        {
            "role": "system",
            "content": "You are a technical changelog entry extractor. Output ONLY categorized bullet points in Keep a Changelog format. Extract multiple detailed entries per commit."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]
    
    tokens = estimate_tokens(json.dumps(messages))
    print(f"  📊 Request size: ~{tokens:,} tokens")
    print(f"  🔄 Calling API...")
    sys.stdout.flush()
    
    http_code, response = call_api(messages, token)
    
    if http_code != '200':
        print(f"  ❌ API Error: HTTP {http_code}")
        print(f"  Response: {response[:500]}")
        sys.stdout.flush()
        return []
    
    try:
        data = json.loads(response)
        entries_text = data.get('choices', [{}])[0].get('message', {}).get('content', '')
        entry_count = len([line for line in entries_text.split('\n') if line.strip().startswith('-')])
        print(f"  ✅ Completed! Extracted ~{entry_count} changelog entries")
        sys.stdout.flush()
        
        # Add metadata header to track which commits these entries came from
        batch_header = f"<!-- Batch {batch_num}: {batch_info} -->\n"
        return [batch_header + entries_text]
    except Exception as e:
        print(f"  ⚠️  Error parsing batch {batch_num}: {e}")
        return []

def process_in_chunks():
    """Process changelog generation in multiple batches"""
    
    # Get environment variables
    token = os.environ.get('GITHUB_TOKEN', '')
    version = os.environ.get('VERSION', '')  # Current version (could be new release tag)
    last_tag = os.environ.get('LAST_TAG', '')  # Previous release tag
    branch = os.environ.get('BRANCH', '')
    date = os.environ.get('DATE', '')
    tag_dates = os.environ.get('TAG_DATES', '')
    
    # Determine if this is a release event (VERSION != LAST_TAG and VERSION is a tag)
    is_release = version and last_tag and version != last_tag and version.startswith('v')
    if is_release:
        print(f"🎉 Release detected: {version} (previous: {last_tag})")
    else:
        print(f"📝 Update mode: processing changes since {last_tag or 'beginning'}")
    sys.stdout.flush()
    
    # Read commits with diffs
    with open('commits_with_diffs.txt', 'r') as f:
        commits_with_diffs = f.read()
    
    print(f"Total commit history size: {len(commits_with_diffs)} chars")
    sys.stdout.flush()
    
    # Check for existing changelog and extract processed commits
    processed_hashes = extract_processed_commits('CHANGELOG.md')
    
    print("Splitting commits into processable batches...")
    sys.stdout.flush()
    
    # Split into individual commits
    all_commit_blocks = split_commits_by_marker(commits_with_diffs)
    print(f"Found {len(all_commit_blocks)} total commits in history")
    sys.stdout.flush()
    
    # Filter out already processed commits
    commit_blocks = []
    skipped_count = 0
    for block in all_commit_blocks:
        commit_hash = get_commit_hash_from_block(block)
        if commit_hash and commit_hash in processed_hashes:
            skipped_count += 1
        else:
            commit_blocks.append(block)
    
    if skipped_count > 0:
        print(f"⏭️  Skipping {skipped_count} already-processed commits")
        sys.stdout.flush()
    
    print(f"📝 Processing {len(commit_blocks)} new/unprocessed commits")
    sys.stdout.flush()
    
    if len(commit_blocks) == 0:
        print("✅ No new commits to process - changelog is up to date!")
        sys.stdout.flush()
        sys.exit(0)
    
    # Build commit-to-version mapping from the full history
    print("🗺️  Building commit-to-version map from git history...")
    sys.stdout.flush()
    commit_version_map = build_commit_version_map(commits_with_diffs)
    version_count = len(set(v for v in commit_version_map.values() if v))
    print(f"   Found {version_count} versions in commit history")
    sys.stdout.flush()
    
    # Process in batches
    all_entries, total_batches = process_commits_in_batches(commit_blocks, token, version, tag_dates, date, commit_version_map)
    
    print(f"\n{'='*60}")
    print(f"✅ Batch processing complete!")
    print(f"{'='*60}")
    print(f"  Total batches processed: {total_batches}")
    print(f"  Total commits analyzed: {len(commit_blocks)}")
    print(f"  Entry groups collected: {len(all_entries)}")
    print(f"\n🔧 Assembling final changelog...")
    sys.stdout.flush()
    
    # Organize entries by version by parsing the batch metadata
    print("🗂️  Organizing entries by version...")
    sys.stdout.flush()
    
    import re
    version_entries = {}  # version -> list of entry blocks
    version_commit_hashes = {}  # version -> set of commit hashes (for versions without entries)
    unreleased_commit_hashes = set()  # commit hashes for unreleased commits
    unreleased_entries = []
    
    # Special handling for release events: commits without version tags should go to VERSION, not Unreleased
    release_version = version if is_release else None
    if release_version:
        print(f"   Release mode: mapping untagged commits to {release_version}")
        sys.stdout.flush()
    
    # Build a mapping of which commits belong to which version for tracking
    for block in commit_blocks:
        commit_hash = get_commit_hash_from_block(block)
        if commit_hash:
            commit_ver = commit_version_map.get(commit_hash)
            if commit_ver:
                if commit_ver not in version_commit_hashes:
                    version_commit_hashes[commit_ver] = set()
                version_commit_hashes[commit_ver].add(commit_hash)
            else:
                # No version - unreleased
                unreleased_commit_hashes.add(commit_hash)
    
    for entry_block in all_entries:
        # Extract version info from the batch comment
        # Format: <!-- Batch X: Commits abc..def | VERSIONS: v0.6.2: hash1,hash2 | v0.6.1: hash3 -->
        match = re.search(PATTERN_BATCH_COMMENT, entry_block)
        
        # Strip batch comment before processing
        entry_text = strip_batch_comment(entry_block)
        
        if match and match.group(1):
            # Parse version mappings from metadata (our source of truth, not AI formatting)
            versions_str = match.group(1)
            # Extract version tags: "v0.6.2: hash1,hash2 | v0.6.1: hash3"
            version_matches = re.findall(PATTERN_VERSION_COMMITS, versions_str)
            
            if version_matches:
                # We know which versions these commits belong to from metadata
                # Add entries to ALL versions in this batch
                for version_tag, _ in version_matches:
                    if version_tag not in version_entries:
                        version_entries[version_tag] = []
                    version_entries[version_tag].append(entry_text)
            else:
                # Has VERSIONS marker but couldn't parse - treat as unreleased
                if release_version:
                    if release_version not in version_entries:
                        version_entries[release_version] = []
                    version_entries[release_version].append(entry_text)
                else:
                    unreleased_entries.append(entry_text)
        else:
            # No version metadata - these are unreleased commits
            if release_version:
                # Release mode: assign to release version
                if release_version not in version_entries:
                    version_entries[release_version] = []
                version_entries[release_version].append(entry_text)
            else:
                # Update mode: assign to unreleased
                unreleased_entries.append(entry_text)
    
    print(f"   Organized into {len(version_entries)} version sections + unreleased")
    sys.stdout.flush()
    
    # Format the complete changelog in Python instead of using AI for final assembly
    print("📝 Formatting final changelog structure...")
    sys.stdout.flush()
    
    # Read existing changelog if we processed some commits (update mode)
    existing_changelog = ''
    if os.path.exists('CHANGELOG.md') and len(processed_hashes) > 0:
        with open('CHANGELOG.md', 'r') as f:
            existing_changelog = f.read()
        print("   Merging with existing changelog...")
        sys.stdout.flush()
    
    changelog_content = format_changelog(
        version_entries, 
        unreleased_entries, 
        tag_dates, 
        version,
        date,
        is_release,
        existing_changelog,
        version_commit_hashes,
        unreleased_commit_hashes
    )
    
    # Write the final changelog
    with open('CHANGELOG.md', 'w') as f:
        f.write(changelog_content)
    
    line_count = len(changelog_content.split('\n'))
    entry_count = len([line for line in changelog_content.split('\n') if line.strip().startswith('-')])
    
    print(f"\n{'='*60}")
    print(f"🎉 CHANGELOG.md generated successfully!")
    print(f"{'='*60}")
    print(f"  Total lines: {line_count}")
    print(f"  Total entries: {entry_count}")
    print(f"  File size: {len(changelog_content):,} bytes")
    print(f"{'='*60}\n")
    sys.stdout.flush()
    return  # Exit early - no AI call needed
    
    # Read existing changelog if it exists
    existing_changelog = ""
    merge_note = ""
    if os.path.exists('CHANGELOG.md') and len(processed_hashes) > 0:
        with open('CHANGELOG.md', 'r') as f:
            existing_changelog = f.read()
        print("📝 Including existing changelog for merging...")
        sys.stdout.flush()
        merge_note = f"""

EXISTING CHANGELOG (keep all existing entries and metadata):
{existing_changelog}

MERGE INSTRUCTIONS: Add the new entries below to the appropriate sections in the existing changelog above.
Preserve ALL existing entries and their batch metadata comments."""
    
    # Determine mode for prompt instructions
    mode_info = ""
    if is_release:
        mode_info = f"\n- THIS IS A RELEASE EVENT: Converting changes to ## [{version}] - {date}"
    else:
        mode_info = "\n- THIS IS AN UPDATE: New changes go in ## [Unreleased]"
    
    # Now make one final call to organize these into a proper changelog structure
    prompt = f"""Organize these changelog entries into a complete CHANGELOG.md file.

Version info:
- LAST RELEASED VERSION: {last_tag or version}
- CURRENT VERSION: {version}
- Date: {date}{mode_info}

All version tags with dates (most recent first):
{tag_dates}
{merge_note}

Here are the changelog entries already ORGANIZED BY VERSION:
{combined_entries}

CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. The entries above are PRE-ORGANIZED into sections like:
   - "## [Unreleased] Entries:" 
   - "## [v0.6.2] Entries:"
   - "## [v0.5.1] Entries:"
   etc.

2. Your job is to:
   - Take entries from each section
   - Remove the "[vX.X.X]" prefix if present in individual entries  
   - Organize them by category (Added, Changed, Fixed, etc.)
   - Remove duplicates
   - Format properly with correct dates from "All version tags with dates"

3. Version assignment rules:
   - Entries under "## [Unreleased] Entries:" → place in ## [Unreleased] section at TOP
   - Entries under "## [v0.X.X] Entries:" → place in ## [v0.X.X] - DATE section
   - DO NOT move entries between versions - keep them where they are pre-assigned

4. Create version sections for EVERY tag in "All version tags with dates" above
   - If no entries exist for a version, add "### Changed\n- Version release"

5. Structure (in this order):
   # Changelog
   
   (header text)
   
   ## [Unreleased]  ← THIS FIRST if there are entries without tags
   
   ## [v0.6.2] - 2025-12-02
   
   ## [v0.6.1] - 2025-12-02
   
   (etc.)

6. Organize entries by category (Added, Changed, Fixed, etc.)
7. Remove duplicates
8. Include standard header:

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Return ONLY the complete formatted CHANGELOG.md:

Return ONLY the complete formatted CHANGELOG.md:"""

    messages = [
        {
            "role": "system",
            "content": "You are a changelog formatter. Organize pre-extracted entries into proper Keep a Changelog format. Keep all entries, remove duplicates, organize by category."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]
    
    tokens = estimate_tokens(json.dumps(messages))
    print(f"📊 Final formatting request: ~{tokens:,} tokens")
    print(f"🔄 Generating final changelog structure...")
    sys.stdout.flush()
    
    http_code, response = call_api(messages, token)
    
    if http_code != '200':
        print(f"API Error: HTTP {http_code}")
        print(response)
        sys.exit(1)
    
    try:
        data = json.loads(response)
        new_changelog = data.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        new_changelog = new_changelog.replace('```markdown', '').replace('```', '').strip()
        
        # If we had existing processed commits, we need to merge rather than replace
        if len(processed_hashes) > 0:
            print("🔀 Merging new entries with existing changelog...")
            sys.stdout.flush()
            # For now, just append the new entries (future: smarter merge)
            # The AI should have organized everything properly with the batch metadata
        
        with open('CHANGELOG.md', 'w') as f:
            f.write(new_changelog)
        
        # Count sections
        line_count = len(new_changelog.split('\n'))
        entry_count = len([line for line in new_changelog.split('\n') if line.strip().startswith('-')])
        
        print(f"\n{'='*60}")
        print(f"🎉 CHANGELOG.md generated successfully!")
        print(f"{'='*60}")
        print(f"  Total lines: {line_count}")
        print(f"  Total entries: {entry_count}")
        print(f"  File size: {len(new_changelog):,} bytes")
        print(f"{'='*60}\n")
        sys.stdout.flush()
        
    except Exception as e:
        print(f"Error: {e}")
        print(f"Response preview: {response[:500]}")
        sys.exit(1)

if __name__ == '__main__':
    process_in_chunks()
