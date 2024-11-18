require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();

// Configure PostgreSQL connection
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

// Route: Render the homepage
app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM songs ORDER BY id ASC");
        const songs = result.rows;

        // Render the EJS template with the songs
        res.render("index", { songs });
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
