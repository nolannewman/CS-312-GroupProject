require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const path = require("path");
const PgSession = require("connect-pg-simple")(session);

const app = express();

// PostgreSQL Pools
const authPool = new Pool({
    connectionString: process.env.AUTH_URL,
    ssl: process.env.AUTH_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
});

// Set up EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management
app.use(
    session({
        store: new PgSession({
            pool: authPool, // Use the correct pool for sessions
            tableName: 'session', // Explicitly use the "session" table
        }),
        secret: process.env.SESSION_SECRET || "default_secret",
        resave: false,
        saveUninitialized: false,
    })
);


// Passport configuration
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const result = await authPool.query('SELECT * FROM public.users WHERE email = $1', [username]);
            if (result.rows.length === 0) {
                return done(null, false, { message: 'Invalid email.' });
            }

            const user = result.rows[0];
            const isValid = await bcrypt.compare(password, user.password); // Use "password" for comparison
            if (!isValid) {
                return done(null, false, { message: 'Invalid password.' });
            }

            return done(null, user);
        } catch (err) {
            console.error('Error in authentication strategy:', err);
            return done(err);
        }
    })
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const result = await authPool.query("SELECT * FROM public.users WHERE id = $1", [id]);
        if (result.rows.length === 0) return done(null, false);
        return done(null, result.rows[0]);
    } catch (err) {
        return done(err);
    }
});

app.use(passport.initialize());
app.use(passport.session());

// Route: Render the homepage
app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM songs ORDER BY id ASC");
        const songs = result.rows;

        res.render("index", { songs, user: req.user });
    } catch (error) {
        console.error("Error fetching songs:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Route: Serve MP3 files
app.get("/music/:filename", (req, res) => {
    const filePath = path.join(__dirname, "music", req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error serving file:", err);
            res.status(404).send("File not found");
        }
    });
});

// API: Fetch songs as JSON
app.get("/api/songs", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM songs ORDER BY id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching songs:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Authentication Routes

// Sign Up page
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Handle Sign Up
app.post('/signup', async (req, res) => {
    const { email, username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await authPool.query(
            'INSERT INTO public.users (email, username, password) VALUES ($1, $2, $3)',
            [email, username, hashedPassword]
        );

        // Send a styled success message
        res.status(201).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sign Up Success</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <div class="container">
                    <div class="success-message">
                        <h1>Success!</h1>
                        <p>User registered successfully.</p>
                        <a href="/signin" class="btn">Sign In</a>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error('Error registering user:', err.message);
        res.status(400).send('Error registering user. Maybe email is already taken.');
    }
});

// Sign In page
app.get("/signin", (req, res) => {
    res.render("signin");
});

// Handle Sign In
app.post(
    "/signin",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/signin",
    })
);

// Logout
app.get("/logout", (req, res) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect("/");
    });
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).send("An error occurred while logging out.");
            }
            res.redirect("/signin"); // Redirect to the sign-in page after logout
        });
    });
});
