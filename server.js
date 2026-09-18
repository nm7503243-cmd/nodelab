const express = require("express");
const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");

const app = express();
const PORT = 3000;

const USERS_FILE = path.join(__dirname, "users.json");
const AUDIT_FILE = path.join(__dirname, "audit.log");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------
// File helper functions
// -----------------------------

function readUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, "utf8");

        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading users.json:", error);
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(users, null, 2),
        "utf8"
    );
}

// -----------------------------
// EventEmitter
// -----------------------------

const userEvents = new EventEmitter();

userEvents.on("signup", (user) => {
    const timestamp = new Date().toISOString();

    const message =
        `[${timestamp}] SIGNUP - User registered: ${user.email}\n`;

    fs.appendFileSync(AUDIT_FILE, message, "utf8");

    console.log(message.trim());
});

userEvents.on("login", (user) => {
    const timestamp = new Date().toISOString();

    const message =
        `[${timestamp}] LOGIN - User authenticated: ${user.email}\n`;

    fs.appendFileSync(AUDIT_FILE, message, "utf8");

    console.log(message.trim());
});

// -----------------------------
// Sign Up
// -----------------------------

app.post("/signup", (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    const users = readUsers();

    const existingUser = users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: "An account with this email already exists."
        });
    }

    const newUser = {
        name,
        email,
        password
    };

    users.push(newUser);
    saveUsers(users);

    userEvents.emit("signup", newUser);

    res.status(201).json({
        success: true,
        message: "Account created successfully."
    });
});

// -----------------------------
// Log In
// -----------------------------

app.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    const users = readUsers();

    const user = users.find(
        user =>
            user.email.toLowerCase() === email.toLowerCase() &&
            user.password === password
    );

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password."
        });
    }

    userEvents.emit("login", user);

    res.json({
        success: true,
        message: "Login successful.",
        name: user.name
    });
});

// -----------------------------
// Start server
// -----------------------------

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
