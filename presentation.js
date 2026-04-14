const express = require("express")
const handlebars = require("express-handlebars")
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

//  Constants 

const SESSION_DURATION     = 5 * 60 * 1000   // 5 minutes
const TFA_DURATION         = 3 * 60 * 1000   // 3 minutes
const SUSPICIOUS_THRESHOLD = 3
const LOCK_THRESHOLD       = 10
const MAX_FILE_SIZE        = 2 * 1024 * 1024  // 2 MB
const MAX_DOCS_PER_EMPLOYEE = 5
const UPLOADS_DIR          = path.join(__dirname, "uploads")

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
 * Manually parses a multipart/form-data request to extract a single file upload.
 * @param {Object} req - Express request object
 * @returns {Promise<Object|null>} Object with originalName, data, mimetype, size — or null
 */
function parseFileUpload(req) {
    return new Promise(function (resolve, reject) {
        const chunks = []
        req.on("data", function (chunk) { chunks.push(chunk) })
        req.on("end", function () {
            const body = Buffer.concat(chunks)
            const contentType = req.headers["content-type"] || ""
            const boundaryMatch = contentType.match(/boundary=(.+)$/)
            if (!boundaryMatch) { resolve(null); return }

            const boundary = "--" + boundaryMatch[1]
            const boundaryBuf = Buffer.from(boundary)
            const parts = []
            let start = 0

            for (let i = 0; i <= body.length - boundaryBuf.length; i++) {
                let match = true
                for (let j = 0; j < boundaryBuf.length; j++) {
                    if (body[i + j] !== boundaryBuf[j]) { match = false; break }
                }
                if (match) {
                    if (start > 0) parts.push(body.slice(start, i - 2))
                    start = i + boundaryBuf.length + 2
                }
            }

            for (let p = 0; p < parts.length; p++) {
                const part = parts[p]
                let sepIndex = -1
                for (let i = 0; i < part.length - 3; i++) {
                    if (part[i] === 13 && part[i+1] === 10 && part[i+2] === 13 && part[i+3] === 10) {
                        sepIndex = i; break
                    }
                }
                if (sepIndex === -1) continue

                const headerStr = part.slice(0, sepIndex).toString()
                const fileData  = part.slice(sepIndex + 4)

                const nameMatch     = headerStr.match(/name="([^"]+)"/)
                const filenameMatch = headerStr.match(/filename="([^"]+)"/)
                const mimeMatch     = headerStr.match(/Content-Type:\s*(.+)/)

                if (filenameMatch && nameMatch && nameMatch[1] === "document") {
                    resolve({
                        originalName: filenameMatch[1],
                        data: fileData,
                        mimetype: mimeMatch ? mimeMatch[1].trim() : "application/octet-stream",
                        size: fileData.length
                    })
                    return
                }
            }
            resolve(null)
        })
        req.on("error", reject)
    })
}



/**
 * Logs every request to the security_log collection.
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
 * GET /login - Renders the login form with an optional message.
 */
app.get("/login", function (req, res) {
    const message = req.query.message || ""
    res.render("login", { message: message })
})

/**
 * POST /login - Validates credentials. On success sends a 2FA code.
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
 * GET /2fa - Renders the 2FA code entry page.
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
 * POST /2fa - Validates the 2FA code. On success creates a session.
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
 * GET /logout - Deletes the session and redirects to /login.
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
 * GET / - Lists all employees.
 */
app.get("/", requireAuth, async function (req, res) {
    const employees = await persistence.getAllEmployees()
    res.render("employeeList", { employees: employees })
})

/**
 * GET /employee/:id - Shows employee details, shifts, and documents.
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
    res.render("employeeDetails", { employee: employee, shifts: shifts, documents: docs })
})

/**
 * GET /edit/:id - Shows the edit form pre-filled with employee data.
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
 * POST /edit/:id - Validates and saves updated employee name and phone.
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
 * POST /employee/:id/upload - Handles PDF document upload for an employee.
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

    const file = await parseFileUpload(req)

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

    const uniqueName = Date.now() + "_" + file.originalName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath   = path.join(UPLOADS_DIR, uniqueName)
    fs.writeFileSync(filePath, file.data)

    await persistence.saveDocumentRecord(id, uniqueName, file.originalName)
    res.redirect("/employee/" + id)
})

/**
 * GET /document/:docId - Serves a protected employee PDF (auth required).
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
 * Starts the Express server on port 8000.
 */
function startServer() {
    app.listen(8001, function () {
        console.log("Server running at http://127.0.0.1:8000")
    })
}

module.exports = { startServer }