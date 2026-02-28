const express = require('express')
const exphbs = require('express-handlebars')
const business = require('./business')
const persistence = require('./persistance')

const app = express()
const PORT = 8001

app.engine('hbs', exphbs.engine({ extname: '.hbs', defaultLayout: false }))
app.set('view engine', 'hbs')
app.set('views', './views')

app.use(express.urlencoded({ extended: false }))

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
        return res.send(errors.join('<br>'))
    }

    const result = await business.addEmployee(name, phone)

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
        const employeeId = req.params.id
        const employee = await persistence.findEmployee(employeeId)

        if (!employee) {
            return res.send('Employee not found.')
        }

        const scheduleResult = await business.getEmployeeSchedule(employeeId)
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
        const employee = await persistence.findEmployee(req.params.id)

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
    const employeeId = req.params.id
    const name = req.body.name || ''
    const phone = req.body.phone || ''

    const result = await business.updateEmployee(employeeId, name, phone)

    if (!result.success) {
        return res.send(result.errors.join('<br>'))
    }

    res.redirect('/')
})

app.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT)
})