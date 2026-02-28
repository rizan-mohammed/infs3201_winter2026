const persistence = require('./persistance')

/**
 * Computes the duration of a shift in hours
 * Generated using: Claude Sonnet 4.5
 * Prompt: "Write a function that takes two time strings in HH:MM format (like 11:00 and 13:30)
 * and returns the duration in hours as a decimal number (like 2.5)"
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {number} Duration in hours as a decimal number
 */
function computeShiftDuration(startTime, endTime) {
    const startParts = startTime.split(':')
    const endParts = endTime.split(':')
    const startHours = parseInt(startParts[0])
    const startMinutes = parseInt(startParts[1])
    const endHours = parseInt(endParts[0])
    const endMinutes = parseInt(endParts[1])
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes
    const durationMinutes = endTotalMinutes - startTotalMinutes
    return durationMinutes / 60
}

/**
 * Gets all employees from the system
 * @returns {Promise<Array>} Array of all employee objects
 */
async function getAllEmployees() {
    return await persistence.loadEmployees()
}

/**
 * Generates the next available employee ID in sequence
 * @returns {Promise<string>} The next employee ID in format E###
 */
async function getNextEmployeeId() {
    const employees = await persistence.loadEmployees()
    let maxId = 0
    for (let i = 0; i < employees.length; i++) {
        const idNum = parseInt(employees[i].employeeId.substring(1))
        if (idNum > maxId) {
            maxId = idNum
        }
    }
    return 'E' + String(maxId + 1).padStart(3, '0')
}

/**
 * Adds a new employee to the system
 * @param {string} name - Employee name
 * @param {string} phone - Employee phone number
 * @returns {Promise<Object>} Object containing success status and the new employee or error message
 */
async function addEmployee(name, phone) {
    try {
        const newId = await getNextEmployeeId()
        const newEmployee = {
            employeeId: newId,
            name: name,
            phone: phone
        }
        await persistence.insertEmployee(newEmployee)
        return { success: true, employee: newEmployee }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

/**
 * Updates an existing employee's details after validating inputs
 * @param {string} employeeId - The employee ID to update
 * @param {string} name - The new name (will be trimmed)
 * @param {string} phone - The new phone number (will be trimmed)
 * @returns {Promise<Object>} Object containing success status and errors array if validation failed
 */
async function updateEmployee(employeeId, name, phone) {
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
        await persistence.updateEmployee(employeeId, trimmedName, trimmedPhone)
        return { success: true }
    } catch (error) {
        return { success: false, errors: [error.message] }
    }
}

/**
 * Gets the schedule for a specific employee sorted by date and start time
 * @param {string} employeeId - The employee ID
 * @returns {Promise<Object>} Object containing employee existence status and sorted shifts array
 */
async function getEmployeeSchedule(employeeId) {
    const employee = await persistence.findEmployee(employeeId)
    if (!employee) {
        return { exists: false, shifts: [] }
    }

    const shifts = await persistence.findShiftsByEmployee(employeeId)

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
    computeShiftDuration,
    getAllEmployees,
    getNextEmployeeId,
    addEmployee,
    updateEmployee,
    getEmployeeSchedule
}