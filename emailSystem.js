/**
 * Logs an email message to the console in a standardized format.
 * @param {string} type - The type of email (e.g., "EMAIL SENT", "EMAIL SENT - WARNING")
 * @param {string} recipientEmail - The recipient's email address
 * @param {string} subject - The subject line of the email
 * @param {string} body - The body content of the email
 */
function logEmail(type, recipientEmail, subject, body) {
    console.log("=== " + type + " ===")
    console.log("  To      :", recipientEmail)
    console.log("  Subject :", subject)
    console.log("  Body    :", body)
    console.log("")
}

/**
 * Sends a 2FA verification code to the user's email address.
 * @param {string} recipientEmail - The recipient's email address
 * @param {string} verificationCode - The 6-digit verification code
 */
function send2FACode(recipientEmail, verificationCode) {
    logEmail(
        "EMAIL SENT",
        recipientEmail,
        "Your Login Verification Code",
        "Your 2FA code is " + verificationCode + ". This code expires in 3 minutes."
    )
}

/**
 * Sends a suspicious activity warning email to the user.
 * @param {string} recipientEmail - The recipient's email address
 */
function sendSuspiciousActivityEmail(recipientEmail) {
    logEmail(
        "EMAIL SENT - WARNING",
        recipientEmail,
        "Suspicious Login Activity Detected",
        "Multiple failed login attempts were detected on your account. If this was not you, contact your administrator immediately."
    )
}

/**
 * Sends an account locked notification email to the user.
 * @param {string} recipientEmail - The recipient's email address
 */
function sendAccountLockedEmail(recipientEmail) {
    logEmail(
        "EMAIL SENT - LOCKED",
        recipientEmail,
        "Your Account Has Been Locked",
        "Your account has been locked due to too many failed login attempts. Please contact your administrator to regain access."
    )
}

module.exports = {
    send2FACode,
    sendSuspiciousActivityEmail,
    sendAccountLockedEmail
}