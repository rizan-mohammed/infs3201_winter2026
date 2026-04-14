const express = require("express")
const handlebars = require("express-handlebars")
const fileUpload = require("express-fileupload")
const path = require("path")
const fs = require("fs")
const persistence = require("./persistence")
const businessLogic = require("./business")
const emailSystem = require("./emailSystem")

const app = express()

app.engine("hbs", handlebars.engine({ extname: "hbs", defaultLayout: false }))
app.set("view engine", "hbs")
app.set("views", "./views")

app.use(express.urlencoded({ extended: false }))
app.use(fileUpload())


const SESSION_DURATION      = 5 * 60 * 1000   // 5 minutes
const TFA_DURATION          = 3 * 60 * 1000   // 3 minutes
const SUSPICIOUS_THRESHOLD  = 3
const LOCK_THRESHOLD        = 10
const MAX_FILE_SIZE         = 2 * 1024 * 1024  // 2 MB
const MAX_DOCS_PER_EMPLOYEE = 5
const UPLOADS_DIR           = path.join(__dirname, "uploads")

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR)
}

/**
 * Parses cookies from the request header into a key-value object.
 * @param {Object} req - Express request object
 * @returns {Object} Cookie name/value pairs
 */
function parseCookies(req) {
    const cookies = {}
    const header = req.headers.cookie
    if (!header) return cookies
    const parts = header.split(";")
    for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i].trim()
        const eqIndex = part.indexOf("=")
        if (eqIndex > 0) {
            const key = part.substring(0, eqIndex).trim()
            const value = part.substring(eqIndex + 1).trim()
            cookies[key] = value
        }
    }
    return cookies
}
 

/**
 * Logs every request to the security_log collection.
 * Identifies the current user from the session cookie if present.
 */
app.use(async function (req, res, next) {
    try {
        const cookies = parseCookies(req)
        const sessionId = cookies.sessionId
        let username = "unknown"
        if (sessionId) {
            const session = await persistence.getSession(sessionId)
            if (session) username = session.username
        }
        await persistence.logAccess(username, req.url, req.method)
    } catch (err) {
        console.error("Security log error:", err)
    }
    next()
})


/**
 * Protects routes from unauthenticated access.
 * Validates the session cookie and refreshes its expiry on success.
 */
async function requireAuth(req, res, next) {
    const cookies = parseCookies(req)
    const sessionId = cookies.sessionId
    if (!sessionId) {
        res.redirect("/login?message=Please+log+in+to+continue")
        return
    }
    const session = await persistence.getSession(sessionId)
    if (!session) {
        res.redirect("/login?message=Your+session+has+expired+please+log+in+again")
        return
    }
    const newExpiry = Date.now() + SESSION_DURATION
    await persistence.updateSessionExpiry(sessionId, newExpiry)
    res.setHeader("Set-Cookie", "sessionId=" + sessionId + "; HttpOnly; Max-Age=300")
    next()
}


/**
 * GET /login
 * Renders the login form with an optional message.
 */
app.get("/login", function (req, res) {
    const message = req.query.message || ""
    res.render("login", { message: message })
})

/**
 * POST /login
 * Validates credentials. On success resets failed attempts and sends 2FA code.
 * Handles suspicious activity warnings and account locking.
 */
app.post("/login", async function (req, res) {
    const username = req.body.username.trim()
    const password = req.body.password.trim()
    const hashed   = businessLogic.hashPassword(password)

    const user = await persistence.getUserByUsername(username)

    if (!user) {
        res.redirect("/login?message=Invalid+username+or+password")
        return
    }

    if (user.locked) {
        res.redirect("/login?message=Your+account+has+been+locked+please+contact+an+administrator")
        return
    }

    if (user.password !== hashed) {
        const attempts = await persistence.incrementFailedAttempts(username)

        if (attempts >= LOCK_THRESHOLD) {
            await persistence.lockAccount(username)
            emailSystem.sendAccountLockedEmail(user.email)
            res.redirect("/login?message=Your+account+has+been+locked+due+to+too+many+failed+attempts")
            return
        }

        if (attempts >= SUSPICIOUS_THRESHOLD) {
            emailSystem.sendSuspiciousActivityEmail(user.email)
        }

        res.redirect("/login?message=Invalid+username+or+password")
        return
    }

    await persistence.resetFailedAttempts(username)
    const code   = businessLogic.generate2FACode()
    const expiry = Date.now() + TFA_DURATION
    await persistence.store2FAToken(username, code, expiry)
    emailSystem.send2FACode(user.email, code)

    res.setHeader("Set-Cookie", "pendingUser=" + username + "; HttpOnly; Max-Age=180")
    res.redirect("/2fa")
})

/**
 * GET /2fa
 * Renders the 2FA code entry page.
 * Redirects to /login if no pending user cookie is found.
 */
app.get("/2fa", function (req, res) {
    const cookies = parseCookies(req)
    if (!cookies.pendingUser) {
        res.redirect("/login")
        return
    }
    const message = req.query.message || ""
    res.render("tfa", { message: message })
})

/**
 * POST /2fa
 * Validates the entered 2FA code. On success creates a session and logs the user in.
 */
app.post("/2fa", async function (req, res) {
    const cookies  = parseCookies(req)
    const username = cookies.pendingUser

    if (!username) {
        res.redirect("/login")
        return
    }

    const enteredCode = req.body.code.trim()
    const token       = await persistence.get2FAToken(username)

    if (!token || token.code !== enteredCode) {
        res.redirect("/2fa?message=Invalid+or+expired+code+please+try+again")
        return
    }

    await persistence.delete2FAToken(username)

    const sessionId = businessLogic.generateSessionId()
    const expiry    = Date.now() + SESSION_DURATION
    await persistence.createSession(sessionId, username, expiry)

    res.setHeader("Set-Cookie", [
        "pendingUser=; HttpOnly; Max-Age=0",
        "sessionId=" + sessionId + "; HttpOnly; Max-Age=300"
    ])
    res.redirect("/")
})

/**
 * GET /logout
 * Deletes the session from the database, clears the cookie, redirects to /login.
 */
app.get("/logout", async function (req, res) {
    const cookies   = parseCookies(req)
    const sessionId = cookies.sessionId
    if (sessionId) {
        await persistence.deleteSession(sessionId)
    }
    res.setHeader("Set-Cookie", "sessionId=; HttpOnly; Max-Age=0")
    res.redirect("/login?message=You+have+been+logged+out")
})

//Protected Routes 

/**
 * GET /
 * Landing page — lists all employees.
 */
app.get("/", requireAuth, async function (req, res) {
    const employees = await persistence.getAllEmployees()
    res.render("index", { employees: employees })
})

/**
 * GET /employee/:id
 * Shows employee details, their shifts, and uploaded documents.
 */
app.get("/employee/:id", requireAuth, async function (req, res) {
    const id       = req.params.id
    const employee = await persistence.getEmployeeById(id)

    if (!employee) {
        res.send("Employee not found")
        return
    }

    const shifts = await persistence.getShiftsForEmployee(id)
    for (let i = 0; i < shifts.length; i += 1) {
        shifts[i].highlight = businessLogic.isBeforeNoon(shifts[i].startTime)
    }

    const docs = await persistence.getDocumentsForEmployee(id)
    res.render("employee-details", { employee: employee, shifts: shifts, documents: docs })
})

/**
 * GET /edit/:id
 * Shows the edit form pre-filled with the employee's current details.
 */
app.get("/edit/:id", requireAuth, async function (req, res) {
    const employee = await persistence.getEmployeeById(req.params.id)
    if (!employee) {
        res.redirect("/")
        return
    }
    res.render("editEmployee", { employee: employee })
})

/**
 * POST /edit/:id
 * Validates and saves updated employee name and phone.
 */
app.post("/edit/:id", requireAuth, async function (req, res) {
    const id    = req.params.id
    const name  = req.body.name.trim()
    const phone = req.body.phone.trim()

    if (name.length === 0) {
        res.send("Name cannot be empty")
        return
    }
    if (!businessLogic.isValidPhone(phone)) {
        res.send("Phone number must be in the format: 4 digits, a dash, then 4 digits (e.g. 5555-0101)")
        return
    }

    await persistence.updateEmployee(id, name, phone)
    res.redirect("/")
})

/**
 * POST /employee/:id/upload
 * Handles PDF document upload for an employee.
 * Enforces PDF-only, 2 MB limit, and 5 document maximum.
 */
app.post("/employee/:id/upload", requireAuth, async function (req, res) {
    const id       = req.params.id
    const employee = await persistence.getEmployeeById(id)

    if (!employee) {
        res.send("Employee not found")
        return
    }

    const existingDocs = await persistence.getDocumentsForEmployee(id)
    if (existingDocs.length >= MAX_DOCS_PER_EMPLOYEE) {
        res.send("Maximum of " + MAX_DOCS_PER_EMPLOYEE + " documents allowed per employee")
        return
    }

    const file = req.files ? req.files.document : null

    if (!file) {
        res.send("No file uploaded")
        return
    }
    if (file.mimetype !== "application/pdf") {
        res.send("Only PDF files are allowed")
        return
    }
    if (file.size > MAX_FILE_SIZE) {
        res.send("File must be 2MB or smaller")
        return
    }

    const uniqueName = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath   = path.join(UPLOADS_DIR, uniqueName)
    await file.mv(filePath)

    await persistence.saveDocumentRecord(id, uniqueName, file.name)
    res.redirect("/employee/" + id)
})

/**
 * GET /document/:docId
 * Serves a protected employee PDF — only accessible to logged-in users.
 * Files are not on a public static route.
 */
app.get("/document/:docId", requireAuth, async function (req, res) {
    const doc = await persistence.getDocumentById(req.params.docId)

    if (!doc) {
        res.send("Document not found")
        return
    }

    const filePath = path.join(UPLOADS_DIR, doc.filename)
    if (!fs.existsSync(filePath)) {
        res.send("File not found on server")
        return
    }

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "inline; filename=\"" + doc.originalName + "\"")
    const fileData = fs.readFileSync(filePath)
    res.send(fileData)
})

/**
 * Starts the Express server on port 8001
 */
function startServer() {
    app.listen(8001, function () {
        console.log("Server running at http://127.0.0.1:8001")
    })
}

module.exports = { startServer }