const prompt = require('prompt-sync')()
const business = require('./business')

/**
 * Displays the main menu options to the user
 * @returns {void}
 */
function showMenu() {
    console.log('\n1. Show all employees')
    console.log('2. Add new employee')
    // console.log('3. Assign employee to shift')
    console.log('3. View employee schedule')
    console.log('4. Exit')
}

/**
 * Displays all employees in a formatted table
 * @returns {Promise<void>}
 */
async function showAllEmployees() {
    try {
        const employees = await business.getAllEmployees()
        
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
 * Prompts user for employe information and adds a new employee
 * @returns {Promise<void>}
 */
async function addNewEmployee() {
    try {
        const name = prompt('Enter employee name: ')
        const phone = prompt('Enter phone number: ')
        
        const result = await business.addEmployee(name, phone)
        
        if (result.success) {
            console.log('Employee added...')
        } else {
            console.log('Error adding employee:', result.error)
        }
    } catch (error) {
        console.log('Error adding employee:', error.message)
    }
}

// "We will not be implementing this feature in Assignment 3, and the database design right now doesn’t support it well 
// (it might be brought back in during Assignment 4). "
// /**
//  * Prompts user for employee and shift IDs and assigns the employee to the shift
//  * @returns {Promise<void>}
//  */
// async function assignShift() {
//     try {
//         const employeeId = prompt('Enter employee ID: ')
//         const shiftId = prompt('Enter shift ID: ')
        
//         const result = await business.assignEmployeeToShift(employeeId, shiftId)
//         console.log(result.message)
//     } catch (error) {
//         console.log('Error assigning shift:', error.message)
//     }
// }

/**
 * Prompts user for employee ID and displays their schedule in CSV format
 * @returns {Promise<void>}
 */
async function viewEmployeeSchedule() {
    try {
        const employeeId = prompt('Enter employee ID: ')
        
        console.log('date,startTime,endTime')
        
        const result = await business.getEmployeeSchedule(employeeId)
        
        if (!result.exists) {
            return
        }
        
        for (let i = 0; i < result.shifts.length; i++) {
            const shift = result.shifts[i]
            console.log(shift.date + ',' + shift.startTime + ',' + shift.endTime)
        }
    } catch (error) {
        console.log('Error viewing schedule:', error.message)
    }
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
        } 
        // else if (choice === '3') {
        //     await assignShift()
        // } 
        else if (choice === '3') {
            await viewEmployeeSchedule()
        } else if (choice === '4') {
            loop = false
        } else {
            console.log('Invalid choice, please try again')
        }
    }
}

main()