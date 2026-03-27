const persistence = require('./persistance')

/**
 * Gets all employees from the system
 * @returns {Promise<Array>} Array of all employee objects
 */
async function getAllEmployees() {
    return await persistence.loadEmployees()
}

/**
 * Adds a new employee to the system
 * @param {string} name - Employee name
 * @param {string} phone - Employee phone number
 * @returns {Promise<Object>} Object containing success status and the new employee or error message
 */
async function addEmployee(name, phone) {
    try {
        const newEmployee = { name: name, phone: phone }
        await persistence.insertEmployee(newEmployee)
        return { success: true, employee: newEmployee }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

/**
 * Updates an existing employee's details after validating inputs
 * @param {string} id - The employee ObjectId string
 * @param {string} name - The new name (will be trimmed)
 * @param {string} phone - The new phone number (will be trimmed)
 * @returns {Promise<Object>} Object containing success status and errors array if validation failed
 */
async function updateEmployee(id, name, phone) {
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    const errors = []

    if (trimmedName === '') {
        errors.push('Name must not be empty.')
    }

    const phoneRegex = /^\d{4}-\d{4}$/
    if (!phoneRegex.test(trimmedPhone)) {
        errors.push('Phone number must be in the format ####-#### (4 digits, dash, 4 digits).')
    }

    if (errors.length > 0) {
        return { success: false, errors: errors }
    }

    try {
        await persistence.updateEmployeeById(id, trimmedName, trimmedPhone)
        return { success: true }
    } catch (error) {
        return { success: false, errors: [error.message] }
    }
}

/**
 * Gets the schedule for a specific employee sorted by date and start time
 * @param {string} id - The employee ObjectId string
 * @returns {Promise<Object>} Object containing employee existence status and sorted shifts array
 */
async function getEmployeeSchedule(id) {
    const employee = await persistence.findEmployeeById(id)
    if (!employee) {
        return { exists: false, shifts: [] }
    }

    const shifts = await persistence.findShiftsByEmployee(id)

    for (let i = 0; i < shifts.length - 1; i++) {
        for (let j = 0; j < shifts.length - i - 1; j++) {
            const current = shifts[j].date + shifts[j].startTime
            const next = shifts[j + 1].date + shifts[j + 1].startTime
            if (current > next) {
                const temp = shifts[j]
                shifts[j] = shifts[j + 1]
                shifts[j + 1] = temp
            }
        }
    }

    return { exists: true, shifts: shifts }
}

module.exports = {
    getAllEmployees,
    addEmployee,
    updateEmployee,
    getEmployeeSchedule
}