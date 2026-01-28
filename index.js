const fs = require('fs').promises
const prompt = require('prompt-sync')()

//all loading functons
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

//all save functions
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


//persistence layer functions
/**
 * Displays all employees in a formatted table
 * @returns {Promise<void>}
 */
async function showAllEmployees() {
    try {
        const employees = await loadEmployees()
        
        //for column width
        let maxNameLength = 20
        for (let i = 0; i < employees.length; i++) {
            if (employees[i].name.length > maxNameLength) {
                maxNameLength = employees[i].name.length
            }
        }
    
        console.log('\nEmployee ID Name' + ' '.repeat(maxNameLength - 4) + ' Phone')
        console.log('-----------' + ' ' + '-'.repeat(maxNameLength) + ' ---------')

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i]
            const nameSpaces = maxNameLength - emp.name.length
            console.log(emp.employeeId + ' '.repeat(12 - emp.employeeId.length) + emp.name + ' '.repeat(nameSpaces + 1) + emp.phone)
        }
    } catch (error) {
        console.log('Error loading employees:', error.message)
    }
}


/**
 * Generates the next available employee ID in sequence
 * @param {Array} employees - Array of existing employee objects
 * @returns {string} The next employee ID in format E###
 */
function getNextEmployeeId(employees) {
    //adding new employee  =  needs a new ID generation
    let maxId = 0
    
    for (let i = 0; i < employees.length; i++) {
        const idNum = parseInt(employees[i].employeeId.substring(1)) //substring(1) seperates the E (1 = first character) from the ID
        if (idNum > maxId) {
            maxId = idNum
        }
    }
    
    const nextId = maxId + 1
    //pad adds to a string to make it a 'target' length (pads the beginning)
    let newId = 'E' + String(nextId).padStart(3, '0')
    return newId
}


/**
 * Prompts user for employee information and adds a new employee to the system
 * @returns {Promise<void>}
 */
async function addNewEmployee() {
    try {
        const name = prompt('Enter employee name: ')
        const phone = prompt('Enter phone number: ')
        
        const employees = await loadEmployees()
        const newId = getNextEmployeeId(employees)
        const newEmployee = {
            employeeId: newId,
            name: name,
            phone: phone
        }
        
        employees.push(newEmployee)
        await saveEmployees(employees)
        
        console.log('Employee added...')
    } catch (error) {
        console.log('Error adding employee:', error.message)
    }
}

//helper functions (validate existence)
/**
 * Checks if an employee exists in the employee list
 * @param {string} employeeId - The employee ID to search for
 * @param {Array} employees - Array of employee objects
 * @returns {boolean} True if employee exists, false otherwise
 */
function employeeExists(employeeId, employees) {
    for (let i = 0; i < employees.length; i++) {
        if (employees[i].employeeId === employeeId) {
            return true
        }
    }
    return false
}

/**
 * Checks if a shift exists in the shift list
 * @param {string} shiftId - The shift ID to search for
 * @param {Array} shifts - Array of shift objects
 * @returns {boolean} True if shift exists, false otherwise
 */
function shiftExists(shiftId, shifts) {
    for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].shiftId === shiftId) {
            return true
        }
    }
    return false
}

/**
 * Checks if an assignment already exists for a given employee and shift
 * @param {string} employeeId - The employee ID
 * @param {string} shiftId - The shift ID
 * @param {Array} assignments - Array of assignment objects
 * @returns {boolean} True if assignment exists, false otherwise
 */
function assignmentExists(employeeId, shiftId, assignments) {
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId && assignments[i].shiftId === shiftId) {
            return true
        }
    }
    return false
}

/**
 * Assigns an employee to a shift after validating referential integrity
 * @returns {Promise<void>}
 */
async function assignShift() {
    try {
        const employeeId = prompt('Enter employee ID: ')
        const shiftId = prompt('Enter shift ID: ')
        
        const employees = await loadEmployees()
        const shifts = await loadShifts()
        const assignments = await loadAssignments()
        
        //existence checks (helpers)
        if (!employeeExists(employeeId, employees)) {
            console.log('Employee does not exist')
            return
        }
        if (!shiftExists(shiftId, shifts)) {
            console.log('Shift does not exist')
            return
        }
        if (assignmentExists(employeeId, shiftId, assignments)) {
            console.log('Employee already assigned to shift')
            return
        }
        
        // new assignment
        const newAssignment = {
            employeeId: employeeId,
            shiftId: shiftId
        }
        
        assignments.push(newAssignment)
        await saveAssignments(assignments)
        
        console.log('Shift Recorded')
    } catch (error) {
        console.log('Error assigning shift:', error.message)
    }
}



//helper function (sort of likr oop getter method for shift using ID)
/**
 * Retrieves a shift object by its ID
 * @param {string} shiftId - The shift ID to search for
 * @param {Array} shifts - Array of shift objects
 * @returns {Object|null} The shift object if found, null otherwise
 */
function getShiftById(shiftId, shifts) {
    for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].shiftId === shiftId) {
            return shifts[i]
        }
    }
    return null
}

/**
 * Displays an employee's schedule in CSV format sorted by date and time
 * @returns {Promise<void>}
 */
async function viewEmployeeSchedule() {
    try {
        const employeeId = prompt('Enter employee ID: ')
        
        const employees = await loadEmployees()
        const shifts = await loadShifts()
        const assignments = await loadAssignments()
        

        console.log('date,startTime,endTime')
        
        if (!employeeExists(employeeId, employees)) {
            return
        }
        
        const employeeAssignments = []
        for (let i = 0; i < assignments.length; i++) {
            if (assignments[i].employeeId === employeeId) {
                employeeAssignments.push(assignments[i])
            }
        }
        
        const scheduleItems = []
        for (let i = 0; i < employeeAssignments.length; i++) {
            const shift = getShiftById(employeeAssignments[i].shiftId, shifts)
            if (shift) {
                scheduleItems.push(shift)
            }
        }
        
        //sort 
        for (let i = 0; i < scheduleItems.length - 1; i++) {
            for (let j = 0; j < scheduleItems.length - i - 1; j++) {
                const current = scheduleItems[j].date + scheduleItems[j].startTime
                const next = scheduleItems[j + 1].date + scheduleItems[j + 1].startTime
                if (current > next) {
                    const temp = scheduleItems[j]
                    scheduleItems[j] = scheduleItems[j + 1]
                    scheduleItems[j + 1] = temp
                }
            }
        }
        
        for (let i = 0; i < scheduleItems.length; i++) {
            const shift = scheduleItems[i]
            console.log(shift.date + ',' + shift.startTime + ',' + shift.endTime)
        }
    } catch (error) {
        console.log('Error viewing schedule:', error.message)
    }
}


/**
 * Displays the main menu options to the user
 * @returns {void}
 */
function showMenu() {
    console.log('\n1. Show all employees')
    console.log('2. Add new employee')
    console.log('3. Assign employee to shift')
    console.log('4. View employee schedule')
    console.log('5. Exit')
}


/**
 * Main function that runs the menu-driven application loop
 * @returns {Promise<void>}
 */
async function main() {
    let loop = true
    
    while (loop) {
        showMenu()
        const choice = prompt('What is your choice? ')
        if (choice === '1') {
            await showAllEmployees()
        } else if (choice === '2') {
            await addNewEmployee()
        } else if (choice === '3') {
            await assignShift()
        } else if (choice === '4') {
            await viewEmployeeSchedule()
        } else if (choice === '5') {
            loop = false
        } else {
            console.log('Invalid choice, please try again')
        }
    }
}

main()
