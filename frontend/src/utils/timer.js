// Timer class for per-task timer instances
class TaskTimer {
  constructor(taskId) {
    this.taskId = taskId;
    this.timerId = null;
    this.timeSpent = 0; // Track time spent (counting up)
    this.running = false;
    this.onUpdateCallback = null;
    this.onCompleteCallback = null;
  }

  /**
   * Starts the timer.
   * @param {number} initialTime - The initial time spent in milliseconds.
   * @param {function} onUpdate - Callback function called every second with the current time spent.
   * @param {function} onComplete - Callback function called when the timer is manually stopped.
   */
  start(initialTime = 0, onUpdate, onComplete) {
    if (this.running) {
      console.warn(`Timer for task ${this.taskId} is already running.`);
      return;
    }
    
    this.running = true;
    this.timeSpent = initialTime;
    this.onUpdateCallback = onUpdate;
    this.onCompleteCallback = onComplete;

    this.timerId = setInterval(() => {
      this.timeSpent += 1000; // Increment by 1 second
      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.timeSpent);
      }
    }, 1000);
  }

  /**
   * Stops the timer.
   */
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.running = false;
      this.timerId = null;
      
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    }
  }

  /**
   * Resets the timer.
   */
  reset() {
    this.stop();
    this.timeSpent = 0;
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.timeSpent);
    }
  }

  /**
   * Gets the current time spent.
   * @returns {number} The time spent in milliseconds.
   */
  getTimeSpent() {
    return this.timeSpent;
  }

  /**
   * Checks if the timer is currently running.
   * @returns {boolean} True if the timer is running, false otherwise.
   */
  isRunning() {
    return this.running;
  }

  /**
   * Cleanup method to be called when timer is no longer needed.
   */
  cleanup() {
    this.stop();
    this.onUpdateCallback = null;
    this.onCompleteCallback = null;
  }
}

// Timer registry to manage multiple timer instances
const timerRegistry = new Map();

/**
 * Gets or creates a timer instance for a specific task.
 * @param {string} taskId - The task ID.
 * @returns {TaskTimer} The timer instance for the task.
 */
export function getTimer(taskId) {
  if (!timerRegistry.has(taskId)) {
    timerRegistry.set(taskId, new TaskTimer(taskId));
  }
  return timerRegistry.get(taskId);
}

/**
 * Removes a timer instance for a specific task.
 * @param {string} taskId - The task ID.
 */
export function removeTimer(taskId) {
  const timer = timerRegistry.get(taskId);
  if (timer) {
    timer.cleanup();
    timerRegistry.delete(taskId);
  }
}

/**
 * Gets all active timers.
 * @returns {Map} Map of taskId to timer instances.
 */
export function getActiveTimers() {
  return new Map([...timerRegistry.entries()].filter(([, timer]) => timer.isRunning()));
}

/**
 * Cleanup all timers (useful for app cleanup).
 */
export function cleanupAllTimers() {
  timerRegistry.forEach(timer => timer.cleanup());
  timerRegistry.clear();
}

// Legacy API compatibility (for gradual migration)
let defaultTimer = null;

export function startTimer(duration, onUpdate, onComplete) {
  console.warn("startTimer is deprecated. Use getTimer(taskId).start() instead.");
  if (!defaultTimer) {
    defaultTimer = new TaskTimer('default');
  }
  defaultTimer.start(duration, onUpdate, onComplete);
}

export function stopTimer() {
  console.warn("stopTimer is deprecated. Use getTimer(taskId).stop() instead.");
  if (defaultTimer) {
    defaultTimer.stop();
  }
}

export function resetTimer() {
  console.warn("resetTimer is deprecated. Use getTimer(taskId).reset() instead.");
  if (defaultTimer) {
    defaultTimer.reset();
  }
}

export function getRemainingTime() {
  console.warn("getRemainingTime is deprecated. Use getTimer(taskId).getTimeSpent() instead.");
  return defaultTimer ? defaultTimer.getTimeSpent() : 0;
}

export function isTimerRunning() {
  console.warn("isTimerRunning is deprecated. Use getTimer(taskId).isRunning() instead.");
  return defaultTimer ? defaultTimer.isRunning() : false;
}
