const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])
const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs').promises

let client = undefined

/**
 * Connects to the MongoDB database if not already connected
 * @returns {Promise<void>}
 */
async function connectDatabase() {
    if (!client) {
        client = new MongoClient('mongodb+srv://rizan-mohammed:raifah123@infs3201-winter2026.hjdo7u9.mongodb.net/')
        try {
            await client.connect()
        } catch (error) {
            client = undefined
            throw error
        }
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
 * Finds a single employee by their MongoDB ObjectId
 * @param {string} id - The employee ObjectId string
 * @returns {Promise<Object|null>} The employee object if found, null otherwise
 */
async function findEmployeeById(id) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let employees = db.collection('employees')
    let result = await employees.find({ _id: new ObjectId(id) })
    let resultData = await result.toArray()
    return resultData[0] || null
}

/**
 * Inserts a new employee into the database
 * @param {Object} employeeData - The employee object to insert
 * @returns {Promise<Object>} The result object containing the inserted id
 */
async function insertEmployee(employeeData) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let employees = db.collection('employees')
    let result = await employees.insertOne(employeeData)
    return result
}

/**
 * Updates an existing employee's name and phone number by ObjectId
 * @param {string} id - The employee ObjectId string
 * @param {string} name - The new name
 * @param {string} phone - The new phone number
 * @returns {Promise<void>}
 */
async function updateEmployeeById(id, name, phone) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let employees = db.collection('employees')
    await employees.updateOne({ _id: new ObjectId(id) }, { $set: { name: name, phone: phone } })
}

/**
 * Finds all shifts assigned to a specific employee using their ObjectId
 * @param {string} id - The employee ObjectId string
 * @returns {Promise<Array>} Array of shift objects assigned to the employee
 */
async function findShiftsByEmployee(id) {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let shifts = db.collection('shifts')
    let result = await shifts.find({ employees: new ObjectId(id) })
    return await result.toArray()
}

module.exports = {
    loadConfig,
    loadEmployees,
    findEmployeeById,
    insertEmployee,
    updateEmployeeById,
    findShiftsByEmployee
}