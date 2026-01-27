const fs = require('fs').promises
const prompt = require('prompt-sync')()


async function showAllEmployees(){}
async function addNewEmployee(){}
async function assignShift(){}
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


