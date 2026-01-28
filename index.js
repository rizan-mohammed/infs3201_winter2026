//DELETE BEFORE SUBMISSION
//notes: whats left??? TO-DO: 
//employee schedules
//assign shifts
//theres some helper functions left too
//get shift (by id)
//get next emp id
//chech if shift / emp or assignment exist 

const fs = require('fs').promises
const prompt = require('prompt-sync')()

//all loading functons
async function loadEmployees() {
    const data = await fs.readFile('employees.json', 'utf8')
    return JSON.parse(data)
}
async function loadShifts() {
    const data = await fs.readFile('shifts.json', 'utf8')
    return JSON.parse(data)
}
async function loadAssignments() {
    const data = await fs.readFile('assignments.json', 'utf8')
    return JSON.parse(data)
}

//all save functions
async function saveEmployees(employees) {
    await fs.writeFile('employees.json', JSON.stringify(employees, null, 4))
}
async function saveAssignments(assignments) {
    await fs.writeFile('assignments.json', JSON.stringify(assignments, null, 4))
}


//persistence layer functions

async function showAllEmployees() {
    try {
        const employees = await loadEmployees()
        
        //for column width

        //delete before final submission
        //note: y is this even necessary?
        //pretty output ig
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


function getNextEmployeeId(employees) {
    //adding new employee  =  new ID generation
    //delete before submission
    //note: i like the seperate function better
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


async function addNewEmployee() {
    try {
        const name = prompt('Enter employee name: ')
        const phone = prompt('Enter phone number: ')
        
        const employees = await loadEmployees()
        //delete before final submission
        // note:/ i could either make a new function to do the IDs or put that logic here 
        // and it would do it each time i need to add an employee
        //idk whuch one i prefer yet
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
function employeeExists(employeeId, employees) {
    for (let i = 0; i < employees.length; i++) {
        if (employees[i].employeeId === employeeId) {
            return true
        }
    }
    return false
}

function shiftExists(shiftId, shifts) {
    for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].shiftId === shiftId) {
            return true
        }
    }
    return false
}

function assignmentExists(employeeId, shiftId, assignments) {
    for (let i = 0; i < assignments.length; i++) {
        if (assignments[i].employeeId === employeeId && assignments[i].shiftId === shiftId) {
            return true
        }
    }
    return false
}

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
function getShiftById(shiftId, shifts) {
    for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].shiftId === shiftId) {
            return shifts[i]
        }
    }
    return null
}
async function viewEmployeeSchedule(){}


function showMenu() {
    console.log('\n1. Show all employees')
    console.log('2. Add new employee')
    console.log('3. Assign employee to shift')
    console.log('4. View employee schedule')
    console.log('5. Exit')
}


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





