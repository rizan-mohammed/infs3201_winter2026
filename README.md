# Assignment 4 - Employee Scheduling System

## Test User Credentials

| Username | Password |
|----------|----------|
| admin    | admin123 |
| user1    | pass1234 |

## How to create users in MongoDB Compass

Insert the following documents into the `users` collection in your `infs3201_winter2026` database:

```json
{ "username": "admin", "password": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9" }
{ "username": "user1", "password": "bd94dcda26fccb4e68d6a31f9b5aac0b571ae266d822620e901ef7ebe3a11d4f" }
```

Passwords are stored as SHA256 hashes (no salt required as per assignment spec).

## Running the app

```
npm install
node index.js
```

Open http://localhost:8001 — you will be redirected to the login page.
