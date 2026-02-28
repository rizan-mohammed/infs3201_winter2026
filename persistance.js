const { MongoClient } = require('mongodb')
const fs = require('fs').promises

let client = undefined

/**
 * Connects to the MongoDB database if not already connected
 * @returns {Promise<void>}
 */
async function connectDatabase() {
    if (!client) {
        client = new MongoClient('mongodb+srv://rizan-mohammed:raifah123@infs3201-winter2026.hjdo7u9.mongodb.net/')
        await client.connect()
    }
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
 * Retrieves all employees from the database
 * @returns {Promise<Array>} Array of all employee objects
 */
async function loadEmployees() {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let employees = db.collection('employees')
    let result = await employees.find()
    return await result.toArray()
}

/**
 * Finds a single employee by their employee ID
 * @param {string} employeeId - The employee ID to search for
 * @returns {Promise<Object|null>} The employee object if found, null otherwise
 */
async function findEmployee(employeeId) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let employees = db.collection('employees')
    let result = await employees.find({ employeeId: employeeId })
    let resultData = await result.toArray()
    return resultData[0] || null
}

/**
 * Inserts a new employee into the database
 * @param {Object} employeeData - The employee object to insert
 * @returns {Promise<void>}
 */
async function insertEmployee(employeeData) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let employees = db.collection('employees')
    await employees.insertOne(employeeData)
}

/**
 * Updates an existing employee's name and phone number
 * @param {string} employeeId - The employee ID to update
 * @param {string} name - The new name
 * @param {string} phone - The new phone number
 * @returns {Promise<void>}
 */
async function updateEmployee(employeeId, name, phone) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let employees = db.collection('employees')
    await employees.updateOne({ employeeId: employeeId }, { $set: { name: name, phone: phone } })
}

/**
 * Finds a single shift by its shift ID
 * @param {string} shiftId - The shift ID to search for
 * @returns {Promise<Object|null>} The shift object if found, null otherwise
 */
async function findShift(shiftId) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let shifts = db.collection('shifts')
    let result = await shifts.find({ shiftId: shiftId })
    let resultData = await result.toArray()
    return resultData[0] || null
}

/**
 * Finds all shifts assigned to a specific employee
 * @param {string} employeeId - The employee ID to search for
 * @returns {Promise<Array>} Array of shift objects assigned to the employee
 */
async function findShiftsByEmployee(employeeId) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let assignments = db.collection('assignments')
    let shifts = db.collection('shifts')

    let assignmentResult = await assignments.find({ employeeId: employeeId })
    let assignmentData = await assignmentResult.toArray()

    let result = []
    for (let i = 0; i < assignmentData.length; i++) {
        let shiftResult = await shifts.find({ shiftId: assignmentData[i].shiftId })
        let shiftData = await shiftResult.toArray()
        if (shiftData[0]) {
            result.push(shiftData[0])
        }
    }

    return result
}

/**
 * Finds all shifts assigned to a specific employee on a specific date
 * @param {string} employeeId - The employee ID
 * @param {string} date - The date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of shift objects on that date
 */
async function findShiftsByEmployeeAndDate(employeeId, date) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let assignments = db.collection('assignments')
    let shifts = db.collection('shifts')

    let assignmentResult = await assignments.find({ employeeId: employeeId })
    let assignmentData = await assignmentResult.toArray()

    let result = []
    for (let i = 0; i < assignmentData.length; i++) {
        let shiftResult = await shifts.find({ shiftId: assignmentData[i].shiftId, date: date })
        let shiftData = await shiftResult.toArray()
        if (shiftData[0]) {
            result.push(shiftData[0])
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
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let assignments = db.collection('assignments')
    let result = await assignments.find({ employeeId: employeeId, shiftId: shiftId })
    let resultData = await result.toArray()
    return resultData.length > 0
}

module.exports = {
    loadConfig,
    loadEmployees,
    findEmployee,
    insertEmployee,
    updateEmployee,
    findShift,
    findShiftsByEmployee,
    findShiftsByEmployeeAndDate,
    assignmentExists
}