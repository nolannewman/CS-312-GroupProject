-- Create the Users table
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shuffle_enabled BOOLEAN DEFAULT FALSE,  -- Default shuffle mode is FALSE
    loop_enabled BOOLEAN DEFAULT FALSE      -- Default loop mode is FALSE
);

-- Create the Playlists table
CREATE TABLE Playlists (
    playlist_id SERIAL PRIMARY KEY,
    user_id INT,
    playlist_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE  -- On delete cascade ensures the playlist is deleted when the user is deleted
);

-- Create the Songs table
CREATE TABLE Songs (
    song_id SERIAL PRIMARY KEY,
    song_name VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    duration INT NOT NULL,  -- Duration in seconds
    genre VARCHAR(100)
);

-- Create the Playlist_Songs table to link playlists and songs
CREATE TABLE Playlist_Songs (
    playlist_id INT,
    song_id INT,
    position INT,  -- Position of the song in the playlist
    PRIMARY KEY (playlist_id, song_id),  -- Composite primary key
    FOREIGN KEY (playlist_id) REFERENCES Playlists(playlist_id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES Songs(song_id) ON DELETE CASCADE
);

-- -- Update shuffle mode for a user (example)
-- UPDATE Users
-- SET shuffle_enabled = TRUE
-- WHERE user_id = 1;

-- Update loop mode for a user (example)
-- UPDATE Users
-- SET loop_enabled = TRUE
-- WHERE user_id = 1;
