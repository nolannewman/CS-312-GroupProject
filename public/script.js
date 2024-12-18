document.addEventListener("DOMContentLoaded", () => {
    const audio = new Audio();
    const nowPlaying = document.querySelector(".now-playing p");
    const recommendationElement = document.querySelector(".recommendation p");
    const songsList = document.querySelector(".songs ul");
    const recentlyPlayedList = document.getElementById("recentlyPlayed");
    const playBtn = document.querySelector("#play-btn");
    const pauseBtn = document.querySelector("#pause-btn");
    const prevBtn = document.querySelector("#prev-btn");
    const nextBtn = document.querySelector("#next-btn");
    const progressBar = document.querySelector("#progress-bar");
    const elapsedTime = document.querySelector(".elapsed-time");
    const remainingTime = document.querySelector(".remaining-time");
    const volumeSlider = document.querySelector("#volume");

    let currentSongIndex = null;
    let songs = [];
    let isPlaying = false;

    // Fetch songs from the server
    const fetchSongs = async () => {
        try {
            const res = await fetch("/api/songs");
            songs = await res.json();
        } catch (error) {
            console.error("Error fetching songs:", error);
        }
    };

    // Format time as m:ss
    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
    };

    // Update progress bar and time indicators
    const updateProgress = () => {
        if (audio.duration) {
            progressBar.max = audio.duration;
            progressBar.value = audio.currentTime;
            elapsedTime.textContent = formatTime(audio.currentTime);
            remainingTime.textContent = formatTime(audio.duration - audio.currentTime);
        }
    };

    // Update Recently Played dynamically
    const refreshRecentlyPlayed = async () => {
        try {
            const res = await fetch("/api/recently-played");
            const recentlyPlayed = await res.json();
            recentlyPlayedList.innerHTML = recentlyPlayed
                .slice(0, 5)
                .map((title) => `<li>${title}</li>`)
                .join("");
        } catch (error) {
            console.error("Error fetching Recently Played:", error);
        }
    };

    // Handle like and dislike button clicks
    const handleLikeDislike = async (action, songId, button) => {
        try {
            const response = await fetch(`/api/songs/${songId}/${action}`, { method: "POST" });
            if (response.ok) {
                const otherButton = action === "like"
                    ? button.nextElementSibling // Dislike button
                    : button.previousElementSibling; // Like button

                // Toggle the shading state
                if (button.classList.contains("active")) {
                    button.classList.remove("active");
                } else {
                    button.classList.add("active");
                    otherButton.classList.remove("active");
                }
            } else {
                const data = await response.json();
                alert(data.error || `Failed to ${action} song`);
            }
        } catch (error) {
            console.error(`Error performing ${action}:`, error);
        }
    };

    // Event delegation for like/dislike buttons
    songsList.addEventListener("click", (event) => {
        if (event.target.classList.contains("like-btn")) {
            const songId = event.target.getAttribute("data-id");
            handleLikeDislike("like", songId, event.target);
        }

        if (event.target.classList.contains("dislike-btn")) {
            const songId = event.target.getAttribute("data-id");
            handleLikeDislike("dislike", songId, event.target);
        }
    });

    // Play a specific song
    const playSong = (index) => {
        if (index < 0 || index >= songs.length) return;

        const song = songs[index];
        if (audio.src !== `/music/${song.file_path}`) {
            audio.src = `/music/${song.file_path}`;
            currentSongIndex = index;
            nowPlaying.textContent = `Now Playing: ${song.title} by ${song.artist}`;
        }

        audio.play();
        isPlaying = true;
        playBtn.style.display = "none";
        pauseBtn.style.display = "inline-block";

        fetch("/play", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: song.title }),
        }).then(() => {
            refreshRecentlyPlayed();
            fetchRecommendation(song.id);
        });
    };

    // Pause the current song
    const pauseSong = () => {
        audio.pause();
        isPlaying = false;
        playBtn.style.display = "inline-block";
        pauseBtn.style.display = "none";
    };

    // Play the next song
    const playNextSong = () => {
        if (songs.length > 0) {
            const nextIndex = (currentSongIndex + 1) % songs.length;
            playSong(nextIndex);
        }
    };

    // Play the previous song
    const playPrevSong = () => {
        if (currentSongIndex !== null) {
            if (audio.currentTime > 5) {
                audio.currentTime = 0; // Restart current song if more than 5 seconds have played
            } else {
                const prevIndex = currentSongIndex > 0 ? currentSongIndex - 1 : songs.length - 1;
                playSong(prevIndex);
            }
        }
    };

    // Fetch recommendation for the next song
    const fetchRecommendation = async (currentSongId) => {
        try {
            const res = await fetch(`/api/recommendation?currentSongId=${currentSongId}`);
            const recommendedSong = await res.json();
            recommendationElement.textContent = recommendedSong
                ? `Next Recommendation: ${recommendedSong.title} by ${recommendedSong.artist}`
                : "No recommendation available";
        } catch (error) {
            console.error("Error fetching recommendation:", error);
        }
    };

    // Trigger fetching recommendation after a song ends
    audio.addEventListener("ended", () => {
        playNextSong(); // Automatically play the next song
    });

    // Update progress bar during playback
    audio.addEventListener("timeupdate", updateProgress);

    // Handle progress bar seek
    progressBar.addEventListener("input", (e) => {
        audio.currentTime = e.target.value;
    });

    // Handle volume control
    volumeSlider.addEventListener("input", (e) => {
        audio.volume = e.target.value;
    });

    // Button event listeners
    playBtn.addEventListener("click", () => {
        if (currentSongIndex === null && songs.length > 0) {
            playSong(0); // Start with the first song if none is playing
        } else {
            audio.play();
            isPlaying = true;
            playBtn.style.display = "none";
            pauseBtn.style.display = "inline-block";
        }
    });

    pauseBtn.addEventListener("click", pauseSong);
    nextBtn.addEventListener("click", playNextSong);
    prevBtn.addEventListener("click", playPrevSong);

    // Initialize the app
    const initializeApp = async () => {
        await fetchSongs();
        await refreshRecentlyPlayed();
    };
// Handle song rating
songsList.addEventListener("click", (event) => {
    if (event.target.classList.contains("rating-btn")) {
        const songId = event.target.closest(".rating-buttons").getAttribute("data-id");
        const rating = event.target.getAttribute("data-rating");

        fetch(`/api/songs/${songId}/rate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ rating }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.message) {
                    alert(data.message);
                    location.reload(); // Reload to reflect updated ratings
                } else {
                    alert(data.error || "Failed to submit rating");
                }
            })
            .catch((error) => {
                console.error("Error submitting rating:", error);
            });
    }
});
// Handle artist rating
songsList.addEventListener("click", (event) => {
    if (event.target.classList.contains("artist-rating-btn")) {
        const artistRatingButtons = event.target.parentElement.querySelectorAll(".artist-rating-btn");
        const artist = event.target.closest(".artist-rating-buttons").getAttribute("data-artist");
        const rating = event.target.getAttribute("data-rating");

        // Remove 'active' class from all buttons
        artistRatingButtons.forEach((button) => button.classList.remove("active"));

        // Add 'active' class to the clicked button
        event.target.classList.add("active");

        // Send the rating to the server
        fetch(`/api/artists/${encodeURIComponent(artist)}/rate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ rating }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.message) {
                    alert(`${data.message}. Average Rating: ${data.averageRating}`);
                } else {
                    alert(data.error || "Failed to submit rating");
                }
            })
            .catch((error) => {
                console.error("Error submitting artist rating:", error);
            });
    }
});

    initializeApp();
});
