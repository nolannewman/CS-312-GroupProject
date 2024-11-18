-- CREATE DATABASE music_player;

-- make songs table
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    genre VARCHAR(100),
    release_year INT,
    file_path VARCHAR(255) NOT NULL
);

DELETE FROM songs;

-- populate data
INSERT INTO songs (title, artist, album, genre, release_year, file_path)
VALUES
('Expensive', 'Yarin Primak', 'Expensive', 'Pop', 2024, 'expensive.mp3'),
('September Story', 'Romeo', 'September Story', 'Cinematic', 2023, 'september_story.mp3'),
('End of an Era', 'Romeo', 'End of an Era', 'Cinematic', 2024, 'end_of_an_era.mp3'),
('Land of Freedom', 'Romeo', 'End of an Era', 'Cinematic', 2024, 'land_of_freedom.mp3'),
('Funky Cat', 'IamDayLight', 'Funky Cat', 'Funky', 2023, 'funky_cat.mp3'),
('Escape', 'Resovibe', 'Street Knowledge', 'Electronic', 2024, '.mp3'),
('Better Than Ever', 'Vic Sage', 'Better Than Ever', 'Hip Hop', 2022, 'better_than_ever.mp3'),
('Taito', 'Magiksolo', 'Tokyo', 'Lofi', 2024, 'taito.mp3'),
('All in Your Stride', 'Abe', 'All in Your Stride', 'Acoustic', 2022, 'all_in_your_stride.mp3'),
('Wanted', 'Bobby Quick', 'Wanted', 'Country', 2024, 'wanted.mp3');

SELECT * FROM songs;


