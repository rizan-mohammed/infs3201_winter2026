const crypto = require("crypto")



/**
 * Validates that a phone number matches the format: 4 digits, dash, 4 digits
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidPhone(phoneNumber) {
    if (phoneNumber.length !== 9) {
        return false
    }
    for (let i = 0; i < 4; i += 1) {
        const charCode = phoneNumber.charCodeAt(i)
        if (charCode < 48 || charCode > 57) {
            return false
        }
    }
    if (phoneNumber.charAt(4) !== "-") {
        return false
    }
    for (let i = 5; i < 9; i += 1) {
        const charCode = phoneNumber.charCodeAt(i)
        if (charCode < 48 || charCode > 57) {
            return false
        }
    }
    return true
}



/**
 * Checks if a shift start time is before noon (12:00)
 * @param {string} startTime - The start time in HH:MM format
 * @returns {boolean} True if before noon, false otherwise
 */
function isBeforeNoon(startTime) {
    const parts = startTime.split(":")
    const hour = parseInt(parts[0], 10)
    return hour < 12
}

/**
 * Calculates the duration of a shift in hours.
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {number} Duration as a decimal number (e.g. 2.5 for 2h 30m)
 */
function computeShiftDuration(startTime, endTime) {
    const startParts = startTime.split(":")
    const endParts = endTime.split(":")
    const startInHours = Number(startParts[0]) + Number(startParts[1]) / 60
    const endInHours = Number(endParts[0]) + Number(endParts[1]) / 60
    return endInHours - startInHours
}


/**
 * Hashes a password using SHA-256
 * @param {string} plainTextPassword - The plain text password
 * @returns {string} The hex encoded SHA-256 hash
 */
function hashPassword(plainTextPassword) {
    return crypto.createHash("sha256").update(plainTextPassword).digest("hex")
}

/**
 * Generates a cryptographically secure random session ID
 * @returns {string} A random 64-character hex string
 */
function generateSessionId() {
    return crypto.randomBytes(32).toString("hex")
}

/**
 * Generates a cryptographically secure random 6-digit 2FA code
 * @returns {string} A zero-padded 6-digit numeric string
 */
function generate2FACode() {
    const code = crypto.randomInt(0, 1000000)
    return String(code).padStart(6, "0")
}

module.exports = {
    isValidPhone,
    isBeforeNoon,
    computeShiftDuration,
    hashPassword,
    generateSessionId,
    generate2FACode
}