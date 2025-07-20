import React, { useState, useEffect, useRef } from "react";
import { getTimer, removeTimer } from "../utils/timer";
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

  const handleStart = () => {
    if (!timerRef.current || isRunning) return;

    timerRef.current.start(
      time,
      (timeSpent) => {
        setTime(timeSpent);
        if (onTimeUpdate) {
          onTimeUpdate(taskId, timeSpent);
        }
      },
      () => {
        setIsRunning(false);
        if (onTimerComplete) {
          onTimerComplete(taskId);
        }
      }
    );
    setIsRunning(true);
  };

  const handleStop = () => {
    if (!timerRef.current) return;
    
    const currentTime = timerRef.current.getTimeSpent();
    timerRef.current.stop();
    setIsRunning(false);
    
    // Update the database with the current time when stopping
    if (onTimeUpdate) {
      onTimeUpdate(taskId, currentTime);
    }
    
    // Call completion callback to update task status
    if (onTimerComplete) {
      onTimerComplete(taskId);
    }
  };

  const handleReset = () => {
    if (!timerRef.current) return;
    
    timerRef.current.reset();
    setTime(0);
    setIsRunning(false);
    if (onTimeUpdate) {
      onTimeUpdate(taskId, 0);
    }
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
