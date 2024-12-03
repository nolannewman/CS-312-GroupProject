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
            pool: pool,
            tableName: "session",
        }),
        secret: process.env.SESSION_SECRET || "default_secret",
        resave: false,
        saveUninitialized: true,
    })
);

// Passport configuration
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const result = await pool.query("SELECT * FROM public.users WHERE email = $1", [username]);
            if (result.rows.length === 0) {
                return done(null, false, { message: "Invalid email." });
            }

            const user = result.rows[0];
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return done(null, false, { message: "Invalid password." });
            }

            return done(null, user);
        } catch (err) {
            console.error("Error in authentication strategy:", err);
            return done(err);
        }
    })
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query("SELECT * FROM public.users WHERE id = $1", [id]);
        if (result.rows.length === 0) return done(null, false);
        return done(null, result.rows[0]);
    } catch (err) {
        return done(err);
    }
});

app.use(passport.initialize());
app.use(passport.session());

// Helper function to manage recently played queue
function addToRecentlyPlayed(session, songTitle) {
    if (!session.recentlyPlayed) {
        session.recentlyPlayed = [];
    }
    session.recentlyPlayed = [songTitle, ...session.recentlyPlayed.filter((t) => t !== songTitle)].slice(0, 5);
}

// Route: Render the homepage with optional search functionality
app.get("/", async (req, res) => {
    try {
        const { query } = req.query;
        let result;

        if (query) {
            result = await pool.query(
                `SELECT * FROM songs
                WHERE LOWER(title) LIKE LOWER($1)
                   OR LOWER(album) LIKE LOWER($1)
                   OR LOWER(artist) LIKE LOWER($1)
                   OR LOWER(genre) LIKE LOWER($1)
                ORDER BY id ASC`,
                [`%${query}%`]
            );
        } else {
            result = await pool.query("SELECT * FROM songs ORDER BY id ASC");
        }

        const songs = result.rows;
        const recentlyPlayed = req.session.recentlyPlayed || [];
        res.render("index", { songs, recentlyPlayed, user: req.user, query });
    } catch (error) {
        console.error("Error fetching songs:", error);
        res.status(500).send("Internal Server Error");
    }
});

// POST: Handle playing a song
app.post("/play", (req, res) => {
    const { title } = req.body;
    if (title) {
        addToRecentlyPlayed(req.session, title);
    }
    res.status(200).json({ message: "Recently Played updated" });
});

// API: Fetch Recently Played
app.get("/api/recently-played", (req, res) => {
    res.json(req.session.recentlyPlayed || []);
});

// API: Fetch all songs as JSON
app.get("/api/songs", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM songs ORDER BY id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching songs:", error);
        res.status(500).send("Internal Server Error");
    }
});

// API: Fetch recommended song
app.get("/api/recommendation", async (req, res) => {
    const { currentSongId } = req.query;

    if (!currentSongId) {
        return res.status(400).json({ error: "Current song ID is required" });
    }

    try {
        const currentSongResult = await pool.query("SELECT * FROM songs WHERE id = $1", [currentSongId]);
        if (currentSongResult.rows.length === 0) {
            return res.status(404).json({ error: "Current song not found" });
        }

        const currentSong = currentSongResult.rows[0];
        const recommendationResult = await pool.query(
            `SELECT * FROM songs
             WHERE (genre = $1 OR artist = $2) AND id != $3
             ORDER BY RANDOM() LIMIT 1`,
            [currentSong.genre, currentSong.artist, currentSongId]
        );

        const recommendedSong =
            recommendationResult.rows.length > 0
                ? recommendationResult.rows[0]
                : (
                      await pool.query("SELECT * FROM songs WHERE id != $1 ORDER BY RANDOM() LIMIT 1", [currentSongId])
                  ).rows[0];

        res.json(recommendedSong);
    } catch (error) {
        console.error("Error fetching recommendation:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Authentication Routes

// Sign Up page
app.get("/signup", (req, res) => {
    res.render("signup");
});

// Handle Sign Up
app.post("/signup", async (req, res) => {
    const { email, username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "INSERT INTO public.users (email, username, password) VALUES ($1, $2, $3)",
            [email, username, hashedPassword]
        );

        res.redirect("/signin");
    } catch (err) {
        console.error("Error registering user:", err.message);
        res.status(400).send("Error registering user. Maybe email is already taken.");
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
    req.logout((err) => {
        if (err) return next(err);
        res.redirect("/");
    });
});

// Serve MP3/WAV files
app.get("/music/:filename", (req, res) => {
    const filePath = path.join(__dirname, "music", req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error serving file:", err);
            res.status(404).send("File not found");
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
