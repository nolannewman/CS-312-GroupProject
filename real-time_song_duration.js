let songDuration = getSongDuration(songId); // Fetch song duration in seconds
let elapsedTime = 0; // Track elapsed time
let remainingTime = songDuration;

function updateProgressBar() {
    let progress = (elapsedTime / songDuration) * 100; // Percentage of the song played
    updateProgressUI(progress);

    // Update time indicators
    let remainingTime = songDuration - elapsedTime;
    updateTimeIndicators(elapsedTime, remainingTime);
}

function updateProgressUI(progress) {
    // Update the progress bar with the given progress percentage
    document.getElementById('progress-bar').style.width = progress + '%';
}

function updateTimeIndicators(elapsedTime, remainingTime) {
    let elapsedMinutes = Math.floor(elapsedTime / 60);
    let elapsedSeconds = elapsedTime % 60;
    let remainingMinutes = Math.floor(remainingTime / 60);
    let remainingSeconds = remainingTime % 60;

    // Update the time display for elapsed and remaining time
    document.getElementById('elapsed-time').innerText = `${elapsedMinutes}:${elapsedSeconds}`;
    document.getElementById('remaining-time').innerText = `${remainingMinutes}:${remainingSeconds}`;
}

// Simulate the passage of time (e.g., each second)
setInterval(() => {
    if (elapsedTime < songDuration) {
        elapsedTime++;
        updateProgressBar();
    }
}, 1000);
// Toggles shuffle mode on or off for the user
function toggleShuffle() {
    let currentShuffleSetting = getUserShuffleSetting();
    let newShuffleSetting = !currentShuffleSetting;
    updateUserShuffleSetting(newShuffleSetting); // Update the shuffle setting in the database
}

// Toggles loop mode on or off for the user
function toggleLoop() {
    let currentLoopSetting = getUserLoopSetting();
    let newLoopSetting = !currentLoopSetting;
    updateUserLoopSetting(newLoopSetting); // Update the loop setting in the database
}

function updateUserShuffleSetting(newSetting) {
    // Update shuffle_enabled field for the user in the database
}

function updateUserLoopSetting(newSetting) {
    // Update loop_enabled field for the user in the database
}
