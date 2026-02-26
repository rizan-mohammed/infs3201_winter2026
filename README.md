# Employee Scheduling System - Assignment 2

## Description
Employee scheduling system with 3-tier architecture that manages employee shifts and enforces daily hour limitations.

## Installation
```bash
npm install
```

## Running the Application
```bash
node index.js
```

## Features
- View all employees
- Add new employees
- Assign employees to shifts with automatic validation
- View employee schedules
- Enforces maximum daily hours limit (configurable in config.json)

## File Structure
- **index.js** - Presentation layer (user interface)
- **business.js** - Business logic layer
- **persistence.js** - Data persistence layer
- **config.json** - System configuration (max daily hours)
- **employees.json** - Employee data
- **shifts.json** - Shift data
- **assignments.json** - Assignment data

## Configuration
Maximum daily hours can be adjusted in `config.json`:
```json
{
    "maxDailyHours": 9
}
```

## Architecture
This application uses a 3-tier closed architecture:
- Presentation layer handles user input/output
- Business layer handles validation and business rules
- Persistence layer handles all file operations
