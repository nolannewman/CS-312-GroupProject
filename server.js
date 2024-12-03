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

// Add a new playlist
app.post("/api/playlists", (req, res) => {
    const { name } = req.body;
    if (!req.session.playlists) {
        req.session.playlists = [];
    }

    if (!name || req.session.playlists.some((playlist) => playlist.name === name)) {
        return res.status(400).json({ error: "Invalid or duplicate playlist name" });
    }

    req.session.playlists.push({ name, songs: [] });
    res.status(201).json({ message: "Playlist created successfully" });
});

// Add song to a playlist
app.post("/api/playlists/:name", (req, res) => {
    const { name } = req.params;
    const { song } = req.body;

    if (!req.session.playlists) {
        return res.status(400).json({ error: "No playlists available" });
    }

    const playlist = req.session.playlists.find((playlist) => playlist.name === name);
    if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
    }

    if (!song || playlist.songs.includes(song)) {
        return res.status(400).json({ error: "Invalid or duplicate song" });
    }

    playlist.songs.push(song);
    res.status(200).json({ message: "Song added to playlist" });
});

// Fetch playlists
app.get("/api/playlists", (req, res) => {
    res.json(req.session.playlists || []);
});

// Delete a playlist
app.delete("/api/playlists/:name", (req, res) => {
    const { name } = req.params;

    if (!req.session.playlists) {
        return res.status(400).json({ error: "No playlists available" });
    }

    req.session.playlists = req.session.playlists.filter((playlist) => playlist.name !== name);
    res.status(200).json({ message: "Playlist deleted successfully" });
});

// Fetch playlists for homepage
app.get("/", async (req, res) => {
    try {
        const playlists = req.session.playlists || [];
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
        res.render("index", { songs, recentlyPlayed, playlists, user: req.user, query });
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

// Profile Page Route
app.get("/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/signin");
    }

    try {
        const songsResult = await pool.query("SELECT * FROM songs ORDER BY id ASC");
        const songs = songsResult.rows;

        const recentlyPlayed = req.session.recentlyPlayed || [];
        const user = req.user;

        res.render("profile", {
            user,
            recentlyPlayed,
            songs,
        });
    } catch (error) {
        console.error("Error fetching profile data:", error);
        res.status(500).send("Internal Server Error");
    }
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
// POST: Like a song
app.post("/api/songs/:id/like", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("UPDATE songs SET likes = likes + 1 WHERE id = $1 RETURNING *", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Song not found" });
        }

        res.json({ message: "Song liked successfully", song: result.rows[0] });
    } catch (error) {
        console.error("Error liking song:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST: Dislike a song
app.post("/api/songs/:id/dislike", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("UPDATE songs SET dislikes = dislikes + 1 WHERE id = $1 RETURNING *", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Song not found" });
        }

        res.json({ message: "Song disliked successfully", song: result.rows[0] });
    } catch (error) {
        console.error("Error disliking song:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// POST: Submit a rating
app.post("/api/songs/:id/rate", async (req, res) => {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user?.id; // Ensure user is authenticated

    if (!userId) {
        return res.status(401).json({ error: "User must be logged in to rate songs." });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5." });
    }

    try {
        // Check if the user has already rated the song
        const existingRating = await pool.query(
            "SELECT * FROM user_song_ratings WHERE user_id = $1 AND song_id = $2",
            [userId, id]
        );

        if (existingRating.rows.length > 0) {
            // Update the rating
            await pool.query(
                "UPDATE user_song_ratings SET rating = $1 WHERE user_id = $2 AND song_id = $3",
                [rating, userId, id]
            );
        } else {
            // Insert a new rating
            await pool.query(
                "INSERT INTO user_song_ratings (user_id, song_id, rating) VALUES ($1, $2, $3)",
                [userId, id, rating]
            );
        }

        // Update the average rating in the songs table
        const updatedRating = await pool.query(
            `UPDATE songs 
             SET rating = (
                 SELECT ROUND(AVG(rating)::NUMERIC, 2)
                 FROM user_song_ratings WHERE song_id = $1
             )
             WHERE id = $1 RETURNING rating`,
            [id]
        );

        res.json({ message: "Rating submitted successfully", rating: updatedRating.rows[0].rating });
    } catch (error) {
        console.error("Error submitting rating:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST: Submit a rating for an artist
app.post("/api/artists/:artist/rate", async (req, res) => {
    const { artist } = req.params; // Artist name from the URL
    const { rating } = req.body;
    const userId = req.user?.id; // Ensure the user is logged in

    if (!userId) {
        return res.status(401).json({ error: "User must be logged in to rate artists." });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5." });
    }

    try {
        // Check if the user has already rated this artist
        const existingRating = await pool.query(
            "SELECT * FROM user_artist_ratings WHERE user_id = $1 AND artist = $2",
            [userId, artist]
        );

        if (existingRating.rows.length > 0) {
            // Update the rating
            await pool.query(
                "UPDATE user_artist_ratings SET rating = $1 WHERE user_id = $2 AND artist = $3",
                [rating, userId, artist]
            );
        } else {
            // Insert a new rating
            await pool.query(
                "INSERT INTO user_artist_ratings (user_id, artist, rating) VALUES ($1, $2, $3)",
                [userId, artist, rating]
            );
        }

        // Calculate the new average rating for the artist
        const aggregatedRating = await pool.query(
            `SELECT ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating
             FROM user_artist_ratings
             WHERE artist = $1`,
            [artist]
        );

        res.json({
            message: `Successfully rated artist: ${artist}`,
            averageRating: aggregatedRating.rows[0].avg_rating,
        });
    } catch (error) {
        console.error("Error submitting artist rating:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
app.get("/top-songs", async (req, res) => {
    try {
        // Fetch top-rated songs
        const topRated = await pool.query(
            `SELECT id, title, artist, album, genre, release_year, rating 
             FROM songs 
             WHERE rating IS NOT NULL 
             ORDER BY rating DESC 
             LIMIT 10`
        );

        // Fetch top-played songs (assumes there's a `play_count` column in the `songs` table)
        const topPlayed = await pool.query(
            `SELECT id, title, artist, album, genre, release_year, play_count 
             FROM songs 
             WHERE play_count IS NOT NULL 
             ORDER BY play_count DESC 
             LIMIT 10`
        );

        res.render("top-songs", {
            topRated: topRated.rows,
            topPlayed: topPlayed.rows,
            user: req.user || null,
        });
    } catch (error) {
        console.error("Error fetching top songs:", error);
        res.status(500).send("Internal Server Error");
    }
});
// Increment play count when a song is played
app.post("/play", async (req, res) => {
    const { title } = req.body;
    if (title) {
        addToRecentlyPlayed(req.session, title);

        // Increment play count in the database
        try {
            await pool.query("UPDATE songs SET play_count = play_count + 1 WHERE title = $1", [title]);
        } catch (error) {
            console.error("Error incrementing play count:", error);
        }
    }
    res.status(200).json({ message: "Recently Played updated" });
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
