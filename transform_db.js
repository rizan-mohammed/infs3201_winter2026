const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])
const { MongoClient, ObjectId } = require('mongodb')

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
 * Step 1 - Adds an empty employees array to every shift document
 * @returns {Promise<void>}
 */
async function addEmptyEmployeeArrays() {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let shifts = db.collection('shifts')
    await shifts.updateMany({}, { $set: { employees: [] } })
    console.log('Step 1 done - empty employees arrays added to all shifts')
}

/**
 * Step 2 - Reads all assignments and embeds employee ObjectIds into shifts
 * @returns {Promise<void>}
 */
async function embedEmployeesInShifts() {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')
    let assignments = db.collection('assignments')
    let shifts = db.collection('shifts')
    let employees = db.collection('employees')

    let allAssignments = await assignments.find().toArray()

    for (let i = 0; i < allAssignments.length; i++) {
        let assignment = allAssignments[i]

        let employeeResult = await employees.find({ employeeId: assignment.employeeId }).toArray()
        let employee = employeeResult[0]
        if (!employee) {
            console.log('Employee not found for assignment:', assignment)
            continue
        }

        let shiftResult = await shifts.find({ shiftId: assignment.shiftId }).toArray()
        let shift = shiftResult[0]
        if (!shift) {
            console.log('Shift not found for assignment:', assignment)
            continue
        }

        await shifts.updateOne(
            { _id: shift._id },
            { $push: { employees: employee._id } }
        )
    }

    console.log('Step 2 done - employee ObjectIds embedded into shifts')
}

/**
 * Step 3 - Removes employeeId from employees, shiftId from shifts, drops assignments collection
 * Commands used if done manually in Compass:
 *   db.employees.updateMany({}, { $unset: { employeeId: "" } })
 *   db.shifts.updateMany({}, { $unset: { shiftId: "" } })
 *   db.assignments.drop()
 * @returns {Promise<void>}
 */
async function removeUnnecessaryFields() {
    await connectDatabase()
    let db = client.db('infs3201_winter2026')

    await db.collection('employees').updateMany({}, { $unset: { employeeId: '' } })
    console.log('Step 3a done - employeeId removed from employees')

    await db.collection('shifts').updateMany({}, { $unset: { shiftId: '' } })
    console.log('Step 3b done - shiftId removed from shifts')

    await db.collection('assignments').drop()
    console.log('Step 3c done - assignments collection dropped')
}

/**
 * Main function that runs all transformation steps in order
 * @returns {Promise<void>}
 */
async function main() {
    try {
        console.log('Starting database transformation...')
        console.log('Make sure you have backed up your database in Compass before continuing!')
        console.log('')

        await addEmptyEmployeeArrays()
        await embedEmployeesInShifts()
        await removeUnnecessaryFields()

        console.log('')
        console.log('Transformation complete!')
    } catch (error) {
        console.log('Error during transformation:', error.message)
    } finally {
        if (client) {
            await client.close()
        }
    }
}

main()
