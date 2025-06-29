// Timer logic for start, stop, and reset
let timerId;
let timeLeft;
let running = false;
let onUpdateCallback;
let onCompleteCallback;

/**
 * Starts the timer.
 * @param {number} duration - The duration of the timer in milliseconds.
 * @param {function} onUpdate - Callback function called every second with the remaining time.
 * @param {function} onComplete - Callback function called when the timer completes.
 */
export function startTimer(duration, onUpdate, onComplete) {
  if (running) {
    console.warn("Timer is already running.");
    return;
  }
  running = true;
  timeLeft = duration;
  onUpdateCallback = onUpdate;
  onCompleteCallback = onComplete;

  timerId = setInterval(() => {
    timeLeft -= 1000;
    if (onUpdateCallback) {
      onUpdateCallback(timeLeft);
    }

    if (timeLeft <= 0) {
      clearInterval(timerId);
      running = false;
      if (onCompleteCallback) {
        onCompleteCallback();
      }
    }
  }, 1000);
}

/**
 * Stops the timer.
 */
export function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    running = false;
    timerId = null;
  }
}

/**
 * Resets the timer.
 */
export function resetTimer() {
  stopTimer();
  timeLeft = 0;
  if (onUpdateCallback) {
    onUpdateCallback(timeLeft);
  }
}

/**
 * Gets the current remaining time.
 * @returns {number} The remaining time in milliseconds.
 */
export function getRemainingTime() {
  return timeLeft;
}

/**
 * Checks if the timer is currently running.
 * @returns {boolean} True if the timer is running, false otherwise.
 */
export function isTimerRunning() {
  return running;
}
