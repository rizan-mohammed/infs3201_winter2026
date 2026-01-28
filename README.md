# Employee Shift Management System

INFS3201 - Web Technologies II

## Setup Instructions

1. Install Node.js if you haven't already
2. Navigate to the project directory
3. Install dependencies:
```
   npm install
```

## Running the Application
```
node index.js
```

## Features

1. **Show all employees** - Displays a formatted table of all employees
2. **Add new employee** - Add a new employee with auto-generated ID
3. **Assign employee to shift** - Assign an existing employee to a shift with validation
4. **View employee schedule** - View all shifts for a specific employee in CSV format
5. **Exit** - Exit the application

## Data Files

- `employees.json` - Employee information
- `shifts.json` - Shift timing information
- `assignments.json` - Employee-to-shift assignments

## Code Standards

- 4-space indentation
- Camel case variables
- Function declarations (not arrow functions)
- Traditional for/while loops (no array methods like map, filter, forEach)
- Async/await with fs/promises for file operations
