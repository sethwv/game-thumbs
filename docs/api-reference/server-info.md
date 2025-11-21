---
layout: default
title: Server Info
parent: API Reference
nav_order: 10
---

# Server Info

**Endpoint:** `/info`

Returns server version and git information.

---

## Examples

```
GET /info
```

---

## Output

```json
{
  "name": "Game Thumbs API",
  "git": {
    "branch": "main",
    "commit": "a1b2c3d",
    "tag": "v0.0.1"
  }
}
```

If the working tree has uncommitted changes, `dirty: true` will be included in the git object. If not in a git repository, the `git` field will be `null`.
