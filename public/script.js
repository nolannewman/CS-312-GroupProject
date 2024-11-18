document.addEventListener("DOMContentLoaded", () => {
    const audio = new Audio();
    const nowPlaying = document.querySelector(".now-playing p");
    const playButtons = document.querySelectorAll(".play-btn");
    const volumeSlider = document.querySelector("#volume");
    const progressBar = document.querySelector("#progress-bar");
    const elapsedTime = document.querySelector(".elapsed-time");
    const remainingTime = document.querySelector(".remaining-time");
    const prevBtn = document.querySelector("#prev-btn");
    const playBtn = document.querySelector("#play-btn");
    const pauseBtn = document.querySelector("#pause-btn");
    const nextBtn = document.querySelector("#next-btn");

    let currentSongIndex = null;
    let songs = [];

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
        progressBar.max = audio.duration || 0;
        progressBar.value = audio.currentTime || 0;
        elapsedTime.textContent = formatTime(audio.currentTime || 0);
        remainingTime.textContent = formatTime((audio.duration || 0) - (audio.currentTime || 0));
    };

    // Play a specific song
    const playSong = (index) => {
        if (index < 0 || index >= songs.length) return;

        const song = songs[index];
        if (audio.src !== `/music/${song.file_path}`) {
            audio.src = `/music/${song.file_path}`;
        }

        audio.play();
        currentSongIndex = index;
        nowPlaying.textContent = `Now Playing: ${song.title} by ${song.artist}`;
    };

    // Pause the current song
    const pauseSong = () => {
        audio.pause();
    };

    // Handle individual play button clicks
    playButtons.forEach((button, index) => {
        button.addEventListener("click", () => {
            if (currentSongIndex === index && !audio.paused) {
                pauseSong();
            } else {
                playSong(index);
            }
        });
    });

    // Volume control
    volumeSlider.addEventListener("input", (e) => {
        audio.volume = e.target.value;
    });

    // Reverse functionality
    prevBtn.addEventListener("click", () => {
        if (currentSongIndex !== null) {
            if (audio.currentTime > 5) {
                // Restart the current song if more than 5 seconds have elapsed
                audio.currentTime = 0;
            } else {
                // Play the previous song
                const prevIndex = currentSongIndex > 0 ? currentSongIndex - 1 : songs.length - 1;
                playSong(prevIndex);
            }
        }
    });

    // Play button (global control)
    playBtn.addEventListener("click", () => {
        if (currentSongIndex !== null) {
            playSong(currentSongIndex);
        }
    });

    // Pause button (global control)
    pauseBtn.addEventListener("click", pauseSong);

    // Next button
    nextBtn.addEventListener("click", () => {
        const nextIndex = (currentSongIndex + 1) % songs.length;
        playSong(nextIndex);
    });

    // Update progress bar and time indicators
    audio.addEventListener("timeupdate", updateProgress);

    // Seek functionality
    progressBar.addEventListener("input", (e) => {
        audio.currentTime = e.target.value;
    });

    // Fetch songs on page load
    fetchSongs();
});
