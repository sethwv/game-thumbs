# Unraid Deployment Integration

This setup allows your Unraid server to report deployments to GitHub when you force-update containers.

## Setup Instructions

### 1. Create GitHub Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Save the token securely

### 2. Method 1: Using CA Auto Update Plugin (Recommended)

If you have the Community Applications Auto Update plugin:

1. Save `unraid-update-hook.sh` to `/boot/config/scripts/github-deploy-hook.sh`
2. Make it executable: `chmod +x /boot/config/scripts/github-deploy-hook.sh`
3. Edit the script and add your GitHub token
4. In CA Auto Update settings:
   - Enable notifications
   - Set Post-Update Script: `/boot/config/scripts/github-deploy-hook.sh`
   
The script will run automatically after any container update.

### 3. Method 2: Docker Template Extra Parameters

In Unraid's Docker container template for game-thumbs:

1. Click on the container → Edit
2. Toggle "Advanced View"
3. Add to "Post Arguments":
   ```
   && /boot/config/scripts/github-deploy-hook.sh
   ```
4. Set environment variables in the template:
   ```
   GITHUB_TOKEN=your_token_here
   SERVER_NAME=Unraid-Main
   SERVER_URL=https://your-server.com
   ```

### 4. Method 3: Simple Manual Webhook

Just run this command after updating your container:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/sethwv/game-thumbs/dispatches" \
  -d '{"event_type":"deployment-success","client_payload":{"environment":"production","version":"latest","status":"success","server_name":"Unraid-Main"}}'
```

You can save this as an alias or script for easy access.

### 5. Method 4: Docker Compose

If you're using docker-compose on Unraid, add this to your compose file:

```yaml
version: '3.8'
services:
  game-thumbs:
    image: your-registry/game-thumbs:latest
    # ... other config ...
    labels:
      - "com.centurylinklabs.watchtower.lifecycle.post-update=/boot/config/scripts/github-deploy-hook.sh"
```

## What You'll See in GitHub

After setup, your GitHub repository will show:
- **Deployments tab**: Full history of container updates
- **Environment status**: Production (or custom environment) deployment status
- **Deployment timeline**: When containers were updated and success/failure status

## Troubleshooting

- **Permission denied**: Ensure the script has execute permissions: `chmod +x /path/to/script`
- **No deployments showing**: Check GitHub token has `repo` scope
- **Script not running**: Check Unraid syslog for errors: `tail -f /var/log/syslog`
