const fs = require('fs').promises

/**
 * Loads employee data from the employees.json file
 * @returns {Promise<Array>} Array of employee objects
 */
async function loadEmployees() {
    const data = await fs.readFile('employees.json', 'utf8')
    return JSON.parse(data)
}

/**
 * Loads shift data from the shifts.json file
 * @returns {Promise<Array>} Array of shift objects
 */
async function loadShifts() {
    const data = await fs.readFile('shifts.json', 'utf8')
    return JSON.parse(data)
}

/**
 * Loads assignment data from the assignments.json file
 * @returns {Promise<Array>} Array of assignment objects
 */
async function loadAssignments() {
    const data = await fs.readFile('assignments.json', 'utf8')
    return JSON.parse(data)
}

/**
 * Loads configuration data from the config.json file
 * @returns {Promise<Object>} Configuration object containing maxDailyHours
 */
async function loadConfig() {
    const data = await fs.readFile('config.json', 'utf8')
    return JSON.parse(data)
}

/**
 * Saves employee data to the employees.json file
 * @param {Array} employees - Array of employee objects to save
 * @returns {Promise<void>}
 */
async function saveEmployees(employees) {
    await fs.writeFile('employees.json', JSON.stringify(employees, null, 4))
}

/**
 * Saves assignment data to the assignments.json file
 * @param {Array} assignments - Array of assignment objects to save
 * @returns {Promise<void>}
 */
async function saveAssignments(assignments) {
    await fs.writeFile('assignments.json', JSON.stringify(assignments, null, 4))
}

/**
 * Finds a single employee by their employee ID
 * @param {string} employeeId - The employee ID to search for
 * @returns {Promise<Object|null>} The employee object if found, null otherwise
 */
async function findEmployee(employeeId) {
    const employees = await loadEmployees()
    for (let i = 0; i < employees.length; i++) {
        if (employees[i].employeeId === employeeId) {
            return employees[i]
        }
    }
    return null
}

/**
 * Finds a single shift by its shift ID
 * @param {string} shiftId - The shift ID to search for
 * @returns {Promise<Object|null>} The shift object if found, null otherwise
 */
async function findShift(shiftId) {
    const shifts = await loadShifts()
    for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].shiftId === shiftId) {
            return shifts[i]
        }
    }
    return null
}

/**
 * Finds all shifts assigned to a sepecific employee
 * @param {string} employeeId - The employee ID to search for
 * @returns {Promise<Array>} Array of shift objects assigned to the employee
 */
async function findShiftsByEmployee(employeeId) {
    const assignments = await loadAssignments()
    const shifts = await loadShifts()
    const result = []
    
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId) {
            for (let j = 0; j < shifts.length; j++) {
                if (shifts[j].shiftId === assignments[i].shiftId) {
                    result.push(shifts[j])
                    break
                }
            }
        }
    }
    
    return result
}

/**
 * Finds all assignments for a specific employee on a specific date
 * @param {string} employeeId - The employee ID
 * @param {string} date - The date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of shift objects on that date
 */
async function findShiftsByEmployeeAndDate(employeeId, date) {
    const assignments = await loadAssignments()
    const shifts = await loadShifts()
    const result = []
    
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId) {
            for (let j = 0; j < shifts.length; j++) {
                if (shifts[j].shiftId === assignments[i].shiftId && shifts[j].date === date) {
                    result.push(shifts[j])
                    break
                }
            }
        }
    }
    
    return result
}

/**
 * Checks if a specific assignment already exists
 * @param {string} employeeId - The employee ID
 * @param {string} shiftId - The shift ID
 * @returns {Promise<boolean>} True if assignment exists, false otherwise
 */
async function assignmentExists(employeeId, shiftId) {
    const assignments = await loadAssignments()
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId && assignments[i].shiftId === shiftId) {
            return true
        }
    }
    return false
}

module.exports = {
    loadEmployees,
    loadShifts,
    loadAssignments,
    loadConfig,
    saveEmployees,
    saveAssignments,
    findEmployee,
    findShift,
    findShiftsByEmployee,
    findShiftsByEmployeeAndDate,
    assignmentExists
}