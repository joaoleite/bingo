const os = require('os');

function getNetworkIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

/**
 * Validates room name
 * @param {string} room - Room name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateRoomName(room) {
    if (!room || typeof room !== 'string') return false;
    if (room.length > 50 || room.length < 1) return false;
    // Allow only alphanumeric, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(room)) return false;
    return true;
}

/**
 * Sanitizes room name
 * @param {string} room - Room name to sanitize
 * @returns {string} - Sanitized room name or 'public' as fallback
 */
function sanitizeRoomName(room) {
    if (!room || typeof room !== 'string') return 'public';
    // Remove any non-alphanumeric characters except _ and -
    const sanitized = room.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitized.length === 0) return 'public';
    return sanitized.substring(0, 50); // Limit length
}

/**
 * Validates bingo number
 * @param {number} number - Number to validate
 * @returns {boolean} - True if valid (1-75), false otherwise
 */
function validateBingoNumber(number) {
    const num = parseInt(number);
    return !isNaN(num) && num >= 1 && num <= 75;
}

module.exports = {
    getNetworkIP,
    validateRoomName,
    sanitizeRoomName,
    validateBingoNumber
};
