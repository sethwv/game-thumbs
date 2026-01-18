// ------------------------------------------------------------------------------
// athleteComposite.js
// Helper for creating composite images of multiple athletes (for doubles teams)
// ------------------------------------------------------------------------------

const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

/**
 * Creates a composite image with multiple athlete headshots side-by-side
 * @param {Array} athletes - Array of athlete objects with logo/logoAlt URLs
 * @param {number} width - Width of the composite image
 * @param {number} height - Height of the composite image
 * @returns {Promise<Buffer>} PNG buffer of the composite image
 */
async function createAthleteComposite(athletes, width = 1600, height = 1600) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparency
    ctx.clearRect(0, 0, width, height);
    
    const athleteCount = athletes.length;
    const spacing = 5; // 5px gap between athletes
    const totalSpacing = spacing * (athleteCount - 1);
    const availableWidth = width - totalSpacing;
    const slotWidth = availableWidth / athleteCount;
    
    for (let i = 0; i < athleteCount; i++) {
        const athlete = athletes[i];
        const x = i * (slotWidth + spacing);
        
        try {
            // Try to load the athlete's primary logo (headshot)
            let imageUrl = athlete.logo;
            let imageBuffer;
            
            try {
                const response = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 10000,
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Referer': 'https://www.espn.com/'
                    }
                });
                imageBuffer = Buffer.from(response.data);
            } catch (error) {
                // Headshot failed, try logoAlt (flag)
                if (athlete.logoAlt) {
                    const response = await axios.get(athlete.logoAlt, {
                        responseType: 'arraybuffer',
                        timeout: 10000,
                        headers: { 
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Referer': 'https://www.espn.com/'
                        }
                    });
                    imageBuffer = Buffer.from(response.data);
                } else {
                    throw error;
                }
            }
            
            const image = await loadImage(imageBuffer);
            
            // Calculate dimensions to maximize size while maintaining aspect ratio
            // Target: fill 95% of available height
            const aspectRatio = image.width / image.height;
            let drawWidth, drawHeight;
            
            // Prioritize height to make athletes as large as possible
            drawHeight = height * 0.95;
            drawWidth = drawHeight * aspectRatio;
            
            // If width exceeds slot, scale down
            if (drawWidth > slotWidth) {
                drawWidth = slotWidth;
                drawHeight = drawWidth / aspectRatio;
            }
            
            // Center in slot
            const drawX = x + (slotWidth - drawWidth) / 2;
            const drawY = (height - drawHeight) / 2;
            
            ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
            
        } catch (error) {
            // If image fails to load, skip this athlete (will show empty space)
            continue;
        }
    }
    
    return canvas.toBuffer('image/png');
}

/**
 * Merges multiple athlete objects into a single "team" object for doubles
 * @param {Array} athletes - Array of resolved athlete objects
 * @param {string} sport - Sport name for color palette
 * @returns {Object} Merged team object with composite logo
 */
async function mergeAthletesIntoTeam(athletes, sport = 'tennis') {
    if (!athletes || athletes.length === 0) {
        throw new Error('No athletes provided for merging');
    }
    
    // If only one athlete, return as-is
    if (athletes.length === 1) {
        return athletes[0];
    }
    
    // Create composite logo
    const compositeLogoBuffer = await createAthleteComposite(athletes);
    
    // Create data URL from buffer for use as logo
    const compositeLogoDataUrl = `data:image/png;base64,${compositeLogoBuffer.toString('base64')}`;
    
    // Merge names with "/"
    const fullName = athletes.map(a => a.name).join('/');
    const city = athletes.map(a => a.city).join('/');
    const abbreviation = athletes.map(a => a.abbreviation).join('');
    
    // Use first athlete's colors and other properties
    const merged = {
        id: athletes.map(a => a.id).join('+'),
        slug: athletes.map(a => a.slug).join('+'),
        city: city,
        name: fullName,
        fullName: athletes.map(a => a.fullName).join(' / '),
        abbreviation: abbreviation,
        conference: null,
        division: null,
        logo: compositeLogoDataUrl,
        logoAlt: null, // No fallback for composite
        color: athletes[0].color,
        alternateColor: athletes[0].alternateColor,
        _isComposite: true,
        _athletes: athletes
    };
    
    return merged;
}

module.exports = {
    createAthleteComposite,
    mergeAthletesIntoTeam
};
