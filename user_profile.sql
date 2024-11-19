CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    date_joined TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shuffle_enabled BOOLEAN DEFAULT FALSE, 
    loop_enabled BOOLEAN DEFAULT FALSE
);
CREATE TABLE Playlists (
    playlist_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    playlist_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
CREATE TABLE Songs (
    song_id INT PRIMARY KEY AUTO_INCREMENT,
    song_name VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    duration INT NOT NULL,  -- Duration in seconds
    genre VARCHAR(100)
);
CREATE TABLE Playlist_Songs (
    playlist_id INT,
    song_id INT,
    position INT,  -- Position of the song in the playlist
    FOREIGN KEY (playlist_id) REFERENCES Playlists(playlist_id),
    FOREIGN KEY (song_id) REFERENCES Songs(song_id),
    PRIMARY KEY (playlist_id, song_id)
);

-- add this to database
-- -- Update shuffle mode for a user
--UPDATE Users
--SET shuffle_enabled = TRUE
--WHERE user_id = 1;

-- -- Update loop mode for a user
--UPDATE Users
--SET loop_enabled = TRUE
--WHERE user_id = 1;

