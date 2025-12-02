// ------------------------------------------------------------------------------
// info.js
// Route to get server information including git details
// ------------------------------------------------------------------------------

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
    path: "/info",
    method: "get",
    handler: async (req, res) => {
        try {
            const info = {
                name: 'Game Thumbs API',
                git: getGitInfo()
            };

            res.json(info);
        } catch (error) {
            res.status(500).json({ 
                error: 'Failed to retrieve server information',
                message: error.message 
            });
        }
    }
};

// ------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------

function getGitInfo() {
    try {
        // Check if we're in a git repository
        const isGitRepo = fs.existsSync(path.join(__dirname, '..', '.git'));
        
        if (!isGitRepo) {
            return null;
        }

        const info = {
            branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
            commit: execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(),
            tag: getLatestTag()
        };

        // Only include dirty flag if working tree is dirty
        if (isWorkingTreeDirty()) {
            info.dirty = true;
        }

        return info;
    } catch (error) {
        return null;
    }
}

function getLatestTag() {
    try {
        return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch (error) {
        return null;
    }
}

function isWorkingTreeDirty() {
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
        return status.length > 0;
    } catch (error) {
        return false;
    }
}

// ------------------------------------------------------------------------------
