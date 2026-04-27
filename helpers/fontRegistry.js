const fontkit = require('fontkit');
const { registerFont } = require('canvas');
const fs = require('fs');
const logger = require('./logger');

const fontRegistry = {};

function loadFont(fileName, fontName) {
    let filepath = null;
    const checkpaths = [
        './assets/fonts/custom/',
        './assets/fonts/default/'
    ]
    for (path of checkpaths) {
        if (fs.existsSync(`${path}${fileName}`)) {
            filepath = `${path}${fileName}`
            break;
        }
    }
    if (!filepath) {
        logger.warn(`Font file '${fileName}' not found. Falling back to default font`);
        return;
    }
    const font = fontkit.openSync(filepath);
    const isItalic = font.subfamilyName.toLowerCase().includes('italic');
    const isBold = font.subfamilyName.toLowerCase().includes('bold');

    registerFont(filepath, {family: fontName});

    fontRegistry[fontName] = [
            isItalic ? 'italic' : '',
            isBold ? 'bold' : '',
            ].filter(Boolean).join(' ')

}

module.exports = {
    fontRegistry,
    loadFont
}