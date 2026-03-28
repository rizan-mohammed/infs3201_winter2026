const express = require('express')
const exphbs = require('express-handlebars')
const crypto = require('crypto')
const business = require('./business')
const persistence = require('./persistance')
const fileUpload = require('express-fileupload')

const app = express()
const PORT = 8001
const SESSION_DURATION = 5 * 60 * 1000

app.engine('hbs', exphbs.engine({ extname: '.hbs', defaultLayout: false }))
app.set('view engine', 'hbs')
app.set('views', './views')

app.use(express.urlencoded({ extended: false }))
app.use(fileUpload())
app.use(express.static('public'))

/**
 * Hashes a password string using SHA256
 * @param {string} password - The plain text password
 * @returns {string} The SHA256 hex hash
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * Parses the session cookie and returns session data if valid and not expired
 * @param {Object} req - The Express request object
 * @returns {Object|null} The session data or null if invalid or expired
 */
function getSession(req) {
    const cookie = req.headers.cookie
    if (!cookie) return null

    let sessionData = null
    const parts = cookie.split(';')
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim()
        if (part.startsWith('session=')) {
            try {
                sessionData = JSON.parse(decodeURIComponent(part.substring(8)))
            } catch (e) {
                return null
            }
        }
    }

    if (!sessionData) return null
    if (Date.now() > sessionData.expiresAt) return null

    return sessionData
}

/**
 * Sets a session cookie on the response with a 5 minute expiry
 * @param {Object} res - The Express response object
 * @param {string} username - The username to store in the session
 * @returns {void}
 */
function setSession(res, username) {
    const expiresAt = Date.now() + SESSION_DURATION
    const sessionData = { username: username, expiresAt: expiresAt }
    const cookieValue = encodeURIComponent(JSON.stringify(sessionData))
    res.setHeader('Set-Cookie', 'session=' + cookieValue + '; HttpOnly; Max-Age=300')
}

/**
 * Clears the session cookie from the browser
 * @param {Object} res - The Express response object
 * @returns {void}
 */
function clearSession(res) {
    res.setHeader('Set-Cookie', 'session=; HttpOnly; Max-Age=0')
}

/**
 * Middleware that logs every request to the security_log collection
 * @param {Object} req - The Express request object
 * @param {Object} res - The Express response object
 * @param {Function} next - The next middleware function
 * @returns {Promise<void>}
 */
async function securityLogMiddleware(req, res, next) {
    const session = getSession(req)
    const username = session ? session.username : 'unauthenticated'
    await persistence.insertSecurityLog({
        timestamp: new Date(),
        username: username,
        url: req.url,
        method: req.method
    })
    next()
}

/**
 * Middleware that checks if the user has a valid session
 * Redirects to /login if not authenticated
 * Extends session by 5 minutes on every visit
 * @param {Object} req - The Express request object
 * @param {Object} res - The Express response object
 * @param {Function} next - The next middleware function
 * @returns {void}
 */
function authMiddleware(req, res, next) {
    const session = getSession(req)
    if (!session) {
        return res.redirect('/login?message=Please+log+in+to+continue')
    }
    setSession(res, session.username)
    next()
}

app.use(securityLogMiddleware)

/**
 * GET /login - Shows the login page with optional message
 * @returns {void}
 */
app.get('/login', (req, res) => {
    res.render('login', { message: req.query.message || null })
})

/**
 * POST /login - Validates credentials and starts a session
 * @returns {Promise<void>}
 */
app.post('/login', async (req, res) => {
    const username = (req.body.username || '').trim()
    const password = req.body.password || ''
    const hashed = hashPassword(password)

    const user = await persistence.findUserByUsername(username)

    if (!user || user.password !== hashed) {
        return res.redirect('/login?message=Invalid+username+or+password')
    }

    setSession(res, username)
    res.redirect('/')
})

/**
 * GET /logout - Clears the session and redirects to login
 * @returns {void}
 */
app.get('/logout', (req, res) => {
    clearSession(res)
    res.redirect('/login?message=You+have+been+logged+out')
})

app.use(authMiddleware)

/**
 * GET / - Shows the landing page with a list of all employees
 * @returns {Promise<void>}
 */
app.get('/', async (req, res) => {
    try {
        const employees = await business.getAllEmployees()
        res.render('index', { employees: employees })
    } catch (error) {
        res.send('Error loading employees: ' + error.message)
    }
})

/**
 * GET /employee/add - Shows the add employee form
 * @returns {void}
 */
app.get('/employee/add', (req, res) => {
    res.render('add-employee')
})

/**
 * POST /employee/add - Validates and adds a new employee then redirects (PRG pattern)
 * @returns {Promise<void>}
 */
app.post('/employee/add', async (req, res) => {
    const name = (req.body.name || '').trim()
    const phone = (req.body.phone || '').trim()
    const errors = []

    if (name === '') {
        errors.push('Name must not be empty.')
    }

    const phoneRegex = /^\d{4}-\d{4}$/
    if (!phoneRegex.test(phone)) {
        errors.push('Phone number must be in the format ####-#### (4 digits, dash, 4 digits).')
    }

    if (errors.length > 0) {
        return res.send(errors.join('<br>') + '<br><br><a href="/employee/add">Go back</a>')
    }

    let photoFilename = null
    if (req.files && req.files.photo) {
        const photo = req.files.photo
        photoFilename = Date.now() + '_' + photo.name
        await photo.mv('public/uploads/' + photoFilename)
    }

    const result = await business.addEmployee(name, phone, photoFilename)
    if (!result.success) {
        return res.send('Error adding employee: ' + result.error)
    }

    res.redirect('/')
})

/**
 * GET /employee/:id - Shows employee details and shift schedule
 * @returns {Promise<void>}
 */
app.get('/employee/:id', async (req, res) => {
    try {
        const employee = await persistence.findEmployeeById(req.params.id)
        if (!employee) {
            return res.send('Employee not found.')
        }

        const scheduleResult = await business.getEmployeeSchedule(req.params.id)
        const shifts = scheduleResult.shifts

        for (let i = 0; i < shifts.length; i++) {
            const hour = parseInt(shifts[i].startTime.split(':')[0])
            shifts[i].isMorning = hour < 12
        }

        res.render('employee-details', { employee: employee, shifts: shifts })
    } catch (error) {
        res.send('Error loading employee: ' + error.message)
    }
})

/**
 * GET /employee/:id/edit - Shows edit form pre-filled with existing employee data
 * @returns {Promise<void>}
 */
app.get('/employee/:id/edit', async (req, res) => {
    try {
        const employee = await persistence.findEmployeeById(req.params.id)
        if (!employee) {
            return res.send('Employee not found.')
        }
        res.render('edit-employee', { employee: employee })
    } catch (error) {
        res.send('Error loading employee: ' + error.message)
    }
})

/**
 * POST /employee/:id/edit - Validates and updates employee then redirects (PRG pattern)
 * @returns {Promise<void>}
 */
app.post('/employee/:id/edit', async (req, res) => {
    const id = req.params.id
    const name = req.body.name || ''
    const phone = req.body.phone || ''

    let photoFilename = null
    if (req.files && req.files.photo) {
        const photo = req.files.photo
        photoFilename = Date.now() + '_' + photo.name
        await photo.mv('public/uploads/' + photoFilename)
    }

    const result = await business.updateEmployee(id, name, phone, photoFilename)
    if (!result.success) {
        return res.send(result.errors.join('<br>') + '<br><br><a href="/employee/' + id + '/edit">Go back</a>')
    }

    res.redirect('/')
})

app.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT)
})