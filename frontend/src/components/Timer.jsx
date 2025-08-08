import { useState, useEffect, useRef } from "react";
import { getTimer, removeTimer } from "../utils/timer";
import { startTimer as startTimerAPI, stopTimer as stopTimerAPI } from "../services/api.js";
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { PlayArrow, Pause, Replay } from "@mui/icons-material";

const TimerContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-top: 1px solid #e2e8f0;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
`;

const TimeDisplay = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
  margin-right: 0.5rem;
  min-width: 65px;
  font-family: monospace;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.25rem;
  align-items: center;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
  font-size: 14px;

  ${(props) =>
    (props.primary &&
      css`
        background-color: #667eea;
        color: white;

        &:hover {
          background-color: #5a6fd8;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }

        &:disabled {
          background-color: #b8c1e9;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `) ||
    (props.secondary &&
      css`
        background-color: #ef476f;
        color: white;

        &:hover {
          background-color: #d63e64;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(239, 71, 111, 0.3);
        }

        &:disabled {
          background-color: #f498b9;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      `) ||
    (props.tertiary &&
      css`
        background-color: #06d6a0;
        color: white;

        &:hover {
          background-color: #05c091;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(6, 214, 160, 0.3);
        }
      `)}
`;

const Timer = ({ taskId, initialTime = 0, onTimeUpdate, onTimerComplete }) => {
  const [time, setTime] = useState(initialTime); // time in milliseconds
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);
  const suppressCompleteRef = useRef(false);
  const runBaselineRef = useRef(0); // tracks time value at start to compute elapsed delta

  // Initialize timer instance and cleanup on unmount
  useEffect(() => {
    if (!taskId) return;
    
    timerRef.current = getTimer(taskId);
    setTime(timerRef.current.getTimeSpent() || initialTime);
    setIsRunning(timerRef.current.isRunning());

    // Cleanup on unmount or taskId change only
    return () => {
      if (timerRef.current) {
        removeTimer(taskId);
      }
    };
  }, [taskId]); // Only depend on taskId, not initialTime

  // Update timer state when initialTime changes (without recreating timer)
  useEffect(() => {
    if (timerRef.current && !timerRef.current.isRunning()) {
      // Only update if timer is not running to avoid conflicts
      timerRef.current.timeSpent = initialTime;
      setTime(initialTime);
    }
  }, [initialTime]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((unit) => String(unit).padStart(2, "0"))
      .join(":");
  };

  const handleStart = async () => {
    if (!timerRef.current || isRunning) return;

    // Establish baseline so we can send only delta to backend on stop
    runBaselineRef.current = time;

    timerRef.current.start(
      time,
      (timeSpent) => {
        setTime(timeSpent);
        if (onTimeUpdate) {
          onTimeUpdate(taskId, timeSpent);
        }
      },
      async () => {
        setIsRunning(false);
        const currentTime = timerRef.current?.getTimeSpent() || time;
        const elapsedDelta = Math.max(0, currentTime - (runBaselineRef.current || 0));
        try {
          if (!suppressCompleteRef.current) {
            await stopTimerAPI(taskId, elapsedDelta);
          }
        } catch (error) {
          console.error('Error stopping timer (API):', error);
        } finally {
          // Always reset the suppression flag after a completion cycle
          suppressCompleteRef.current = false;
        }
        if (onTimerComplete) onTimerComplete(taskId, currentTime);
      }
    );
    setIsRunning(true);

    // Notify backend that the timer has started
    try {
      await startTimerAPI(taskId);
    } catch (error) {
      console.error('Error starting timer (API):', error);
      // Revert local timer state if backend start fails
      suppressCompleteRef.current = true; // prevent onComplete from sending stop
      timerRef.current.stop();
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    if (!timerRef.current) return;
    
    // Do not call API here; onComplete handler will handle persistence
    timerRef.current.stop();
    setIsRunning(false);
  };

  const handleReset = () => {
    if (!timerRef.current) return;
    // Suppress the onComplete side-effect since this is a reset
    suppressCompleteRef.current = true;
    timerRef.current.stop();
    setIsRunning(false);
    setTime(0);
    if (onTimeUpdate) onTimeUpdate(taskId, 0);
    // Persist reset to backend as stopped with 0 elapsed
    stopTimerAPI(taskId, 0).catch((error) => {
      console.error('Error resetting timer (API):', error);
    });
  };

  return (
    <TimerContainer>
      <TimeDisplay>{formatTime(time)}</TimeDisplay>
      <ButtonGroup>
        <Button primary onClick={handleStart} disabled={isRunning} title="Start Timer">
          <PlayArrow sx={{ fontSize: 16 }} />
        </Button>
        <Button secondary onClick={handleStop} disabled={!isRunning} title="Stop Timer">
          <Pause sx={{ fontSize: 16 }} />
        </Button>
        <Button tertiary onClick={handleReset} title="Reset Timer">
          <Replay sx={{ fontSize: 16 }} />
        </Button>
      </ButtonGroup>
    </TimerContainer>
  );
};

export default Timer;
