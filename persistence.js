const mongodb = require("mongodb")

let client = undefined

/**
 * Returns a singleton connected MongoDB client.
 * @returns {Promise<mongodb.MongoClient>} Connected MongoDB client
 */
async function getClient() {
    if (!client) {
        client = new mongodb.MongoClient("mongodb+srv://60306369_db_user:<Bing%213344>@infs3201-winter2026.3e2mbls.mongodb.net/?appName=infs3201-winter2026")
        await client.connect()
        console.log("Connected to MongoDB")
    }
    return client
}

/**
 * Returns the infs3201_winter2026 database.
 * @returns {Promise<mongodb.Db>}
 */
async function getDb() {
    const c = await getClient()
    return c.db("infs3201_winter2026")
}


/**
 * Retrieves all employees from the employees collection.
 * @returns {Promise<Array<Object>>} Array of employee objects
 */
async function getAllEmployees() {
    const db = await getDb()
    const result = await db.collection("employees").find().toArray()
    for (let i = 0; i < result.length; i += 1) {
        result[i]._id = result[i]._id.toString()
    }
    return result
}

/**
 * Retrieves a single employee by their string ID.
 * @param {string} id - The employee's MongoDB _id as a hex string
 * @returns {Promise<Object|null>} Employee object with _id as string, or null
 */
async function getEmployeeById(id) {
    const db = await getDb()
    const result = await db.collection("employees").findOne({ _id: new mongodb.ObjectId(id) })
    if (result) result._id = result._id.toString()
    return result
}

/**
 * Updates an employee's name and phone number in the database.
 * @param {string} id - The employee's MongoDB _id as a hex string
 * @param {string} name - The new name
 * @param {string} phone - The new phone number
 * @returns {Promise<void>}
 */
async function updateEmployee(id, name, phone) {
    const db = await getDb()
    await db.collection("employees").updateOne(
        { _id: new mongodb.ObjectId(id) },
        { $set: { name: name, phone: phone } }
    )
}

//  Shifts 

/**
 * Retrieves all shifts whose embedded employees[] array contains the given employee ObjectId.
 * @param {string} employeeId - The employee's _id as a hex string
 * @returns {Promise<Array<Object>>} Array of matching shift objects
 */
async function getShiftsForEmployee(employeeId) {
    const db = await getDb()
    const empObjectId = new mongodb.ObjectId(employeeId)
    const shifts = await db.collection("shifts").find({ employees: empObjectId }).toArray()

    shifts.sort(function (a, b) {
        if (a.date < b.date) return -1
        if (a.date > b.date) return 1
        if (a.startTime < b.startTime) return -1
        if (a.startTime > b.startTime) return 1
        return 0
    })

    return shifts
}

//  Users 

/**
 * Retrieves a user document by username.
 * @param {string} username - The username to look up
 * @returns {Promise<Object|null>} User document, or null if not found
 */
async function getUserByUsername(username) {
    const db = await getDb()
    return await db.collection("users").findOne({ username: username })
}

/**
 * Increments the failed login attempt counter for a user.
 * @param {string} username - The username whose counter to increment
 * @returns {Promise<number>} The new total failed attempt count
 */
async function incrementFailedAttempts(username) {
    const db = await getDb()
    const result = await db.collection("users").findOneAndUpdate(
        { username: username },
        { $inc: { failedAttempts: 1 } },
        { returnDocument: "after" }
    )
    if (!result) return 0
    return result.failedAttempts
}

/**
 * Resets the failed login attempt counter for a user to zero.
 * @param {string} username - The username to reset
 * @returns {Promise<void>}
 */
async function resetFailedAttempts(username) {
    const db = await getDb()
    await db.collection("users").updateOne(
        { username: username },
        { $set: { failedAttempts: 0 } }
    )
}

/**
 * Locks a user account so they cannot log in.
 * @param {string} username - The username to lock
 * @returns {Promise<void>}
 */
async function lockAccount(username) {
    const db = await getDb()
    await db.collection("users").updateOne(
        { username: username },
        { $set: { locked: true } }
    )
}


/**
 * Creates a new session in the sessions collection.
 * @param {string} sessionId - The unique session ID
 * @param {string} username - The logged in username
 * @param {number} expiry - The expiry timestamp in milliseconds
 * @returns {Promise<void>}
 */
async function createSession(sessionId, username, expiry) {
    const db = await getDb()
    await db.collection("sessions").insertOne({
        sessionId: sessionId,
        username: username,
        expiry: expiry
    })
}

/**
 * Returns a session document by sessionId if it has not expired.
 * @param {string} sessionId - The session ID to look up
 * @returns {Promise<Object|null>} The session object or null if not found or expired
 */
async function getSession(sessionId) {
    const db = await getDb()
    const session = await db.collection("sessions").findOne({ sessionId: sessionId })
    if (!session) return null
    if (Date.now() > session.expiry) {
        await deleteSession(sessionId)
        return null
    }
    return session
}

/**
 * Updates the expiry time of an existing session.
 * @param {string} sessionId - The session ID to update
 * @param {number} expiry - The new expiry timestamp in milliseconds
 * @returns {Promise<void>}
 */
async function updateSessionExpiry(sessionId, expiry) {
    const db = await getDb()
    await db.collection("sessions").updateOne(
        { sessionId: sessionId },
        { $set: { expiry: expiry } }
    )
}

/**
 * Deletes a session from the sessions collection.
 * @param {string} sessionId - The session ID to delete
 * @returns {Promise<void>}
 */
async function deleteSession(sessionId) {
    const db = await getDb()
    await db.collection("sessions").deleteOne({ sessionId: sessionId })
}


/**
 * Stores a 2FA token for a user, replacing any existing token for that user.
 * @param {string} username - The username this token belongs to
 * @param {string} code - The 6-digit 2FA code
 * @param {number} expiry - The expiry timestamp in milliseconds
 * @returns {Promise<void>}
 */
async function store2FAToken(username, code, expiry) {
    const db = await getDb()
    await db.collection("tfa_tokens").deleteMany({ username: username })
    await db.collection("tfa_tokens").insertOne({
        username: username,
        code: code,
        expiry: expiry
    })
}

/**
 * Retrieves a valid 2FA token for a user if it has not expired.
 * @param {string} username - The username to look up
 * @returns {Promise<Object|null>} The token document or null if not found or expired
 */
async function get2FAToken(username) {
    const db = await getDb()
    const token = await db.collection("tfa_tokens").findOne({ username: username })
    if (!token) return null
    if (Date.now() > token.expiry) {
        await db.collection("tfa_tokens").deleteOne({ username: username })
        return null
    }
    return token
}

/**
 * Deletes a 2FA token for a user after it has been used.
 * @param {string} username - The username whose token to delete
 * @returns {Promise<void>}
 */
async function delete2FAToken(username) {
    const db = await getDb()
    await db.collection("tfa_tokens").deleteOne({ username: username })
}


//Security Log 

/**
 * Inserts a security log entry into the security_log collection.
 * @param {string} username - The username if known, or "unknown"
 * @param {string} url - The URL that was accessed
 * @param {string} method - The HTTP method used (GET, POST)
 * @returns {Promise<void>}
 */
async function logAccess(username, url, method) {
    const db = await getDb()
    await db.collection("security_log").insertOne({
        timestamp: new Date(),
        username: username,
        url: url,
        method: method
    })
}



/**
 * Returns all document records stored for a given employee.
 * @param {string} employeeId - The employee's _id as a hex string
 * @returns {Promise<Array<Object>>} Array of document record objects
 */
async function getDocumentsForEmployee(employeeId) {
    const db = await getDb()
    return await db.collection("employee_documents").find({ employeeId: employeeId }).toArray()
}

/**
 * Saves a document record for an employee in the database.
 * @param {string} employeeId - The employee's _id as a hex string
 * @param {string} filename - The stored filename on disk
 * @param {string} originalName - The original uploaded filename
 * @returns {Promise<void>}
 */
async function saveDocumentRecord(employeeId, filename, originalName) {
    const db = await getDb()
    await db.collection("employee_documents").insertOne({
        employeeId: employeeId,
        filename: filename,
        originalName: originalName,
        uploadedAt: new Date()
    })
}

/**
 * Returns a single document record by its MongoDB ObjectId.
 * @param {string} docId - The document ObjectId as a hex string
 * @returns {Promise<Object|null>} The document record or null if not found
 */
async function getDocumentById(docId) {
    const db = await getDb()
    return await db.collection("employee_documents").findOne({ _id: new mongodb.ObjectId(docId) })
}

module.exports = {
    getClient,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    getShiftsForEmployee,
    getUserByUsername,
    incrementFailedAttempts,
    resetFailedAttempts,
    lockAccount,
    createSession,
    getSession,
    updateSessionExpiry,
    deleteSession,
    store2FAToken,
    get2FAToken,
    delete2FAToken,
    logAccess,
    getDocumentsForEmployee,
    saveDocumentRecord,
    getDocumentById
}