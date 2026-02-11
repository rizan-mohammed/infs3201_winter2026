const persistence = require('./persistance')

/**
 * Computes the duraction of a shift in hours
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
    const durationHours = durationMinutes / 60
    
    return durationHours
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
    
    const nextId = maxId + 1
    let newId = 'E' + String(nextId).padStart(3, '0')
    return newId
}

/**
 * Adds a new employee to the system
 * @param {string} name - Employee name
 * @param {string} phone - Employee phone number
 * @returns {Promise<Object>} Object containing success status and the new employee or error message
 */
async function addEmployee(name, phone) {
    try {
        const employees = await persistence.loadEmployees()
        const newId = await getNextEmployeeId()
        
        const newEmployee = {
            employeeId: newId,
            name: name,
            phone: phone
        }
        
        employees.push(newEmployee)
        await persistence.saveEmployees(employees)
        
        return { success: true, employee: newEmployee }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

/**
 * Validates if an employee can be assigned to a shift based on daily hour limits
 * @param {string} employeeId - The employee ID
 * @param {string} shiftId - The shift ID
 * @returns {Promise<Object>} Object containing canAssign boolean and reason if false
 */
async function validateShiftAssignment(employeeId, shiftId) {
    const employee = await persistence.findEmployee(employeeId)
    if (!employee) {
        return { canAssign: false, reason: 'Employee does not exist' }
    }
    
    const shift = await persistence.findShift(shiftId)
    if (!shift) {
        return { canAssign: false, reason: 'Shift does not exist' }
    }
    
    const exists = await persistence.assignmentExists(employeeId, shiftId)
    if (exists) {
        return { canAssign: false, reason: 'Employee already assigned to shift' }
    }
    
    const config = await persistence.loadConfig()
    const maxDailyHours = config.maxDailyHours
    
    const existingShifts = await persistence.findShiftsByEmployeeAndDate(employeeId, shift.date)
    
    let totalHours = 0
    for (let i = 0; i < existingShifts.length; i++) {
        const duration = computeShiftDuration(existingShifts[i].startTime, existingShifts[i].endTime)
        totalHours = totalHours + duration
    }
    
    const newShiftDuration = computeShiftDuration(shift.startTime, shift.endTime)
    const projectedTotal = totalHours + newShiftDuration
    
    if (projectedTotal > maxDailyHours) {
        return { 
            canAssign: false, 
            reason: 'Assignment would exceed maximum daily hours of ' + maxDailyHours + ' (would be ' + projectedTotal + ' hours)' 
        }
    }
    
    return { canAssign: true }
}

/**
 * Assigns an employee to a shift
 * @param {string} employeeId - The employee ID
 * @param {string} shiftId - The shift ID
 * @returns {Promise<Object>} Object containing success status and message
 */
async function assignEmployeeToShift(employeeId, shiftId) {
    const validation = await validateShiftAssignment(employeeId, shiftId)
    
    if (!validation.canAssign) {
        return { success: false, message: validation.reason }
    }
    
    try {
        const assignments = await persistence.loadAssignments()
        const newAssignment = {
            employeeId: employeeId,
            shiftId: shiftId
        }
        
        assignments.push(newAssignment)
        await persistence.saveAssignments(assignments)
        
        return { success: true, message: 'Shift Recorded' }
    } catch (error) {
        return { success: false, message: error.message }
    }
}

/**
 * Gets the schedule for a specific employee sorted by date and time
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
    validateShiftAssignment,
    assignEmployeeToShift,
    getEmployeeSchedule
}