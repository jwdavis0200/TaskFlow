import React, { useState, useEffect } from "react";
import {
  startTimer,
  stopTimer,
  resetTimer,
  isTimerRunning,
  getRemainingTime,
} from "../utils/timer";
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { PlayArrow, Pause, Replay } from "@mui/icons-material";

const TimerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
`;

const TimeDisplay = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #343a40;
  margin-bottom: 0.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;

  ${(props) =>
    (props.primary &&
      css`
        background-color: #4361ee;
        color: white;

        &:hover {
          background-color: #3a56d4;
        }

        &:disabled {
          background-color: #b8c1e9;
          cursor: not-allowed;
        }
      `) ||
    (props.secondary &&
      css`
        background-color: #ef476f;
        color: white;

        &:hover {
          background-color: #d63e64;
        }

        &:disabled {
          background-color: #f498b9;
          cursor: not-allowed;
        }
      `) ||
    (props.tertiary &&
      css`
        background-color: #06d6a0;
        color: white;

        &:hover {
          background-color: #05c091;
        }
      `)}
`;

const Timer = ({ taskId, initialTime = 0, onTimeUpdate, onTimerComplete }) => {
  const [time, setTime] = useState(initialTime); // time in milliseconds
  const [isRunning, setIsRunning] = useState(isTimerRunning());

  useEffect(() => {
    setTime(initialTime);
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
    if (!isRunning) {
      startTimer(
        getRemainingTime() || time,
        (remainingTime) => {
          setTime(remainingTime);
          if (onTimeUpdate) {
            onTimeUpdate(taskId, remainingTime);
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
    }
  };

  const handleStop = () => {
    stopTimer();
    setIsRunning(false);
  };

  const handleReset = () => {
    resetTimer();
    setTime(0);
    setIsRunning(false);
    if (onTimeUpdate) {
      onTimeUpdate(taskId, 0);
    }
  };

  return (
    <TimerContainer>
      <TimeDisplay>Time Spent: {formatTime(time)}</TimeDisplay>
      <ButtonGroup>
        <Button primary onClick={handleStart} disabled={isRunning}>
          <PlayArrow fontSize="small" /> Start
        </Button>
        <Button secondary onClick={handleStop} disabled={!isRunning}>
          <Pause fontSize="small" /> Stop
        </Button>
        <Button tertiary onClick={handleReset}>
          <Replay fontSize="small" /> Reset
        </Button>
      </ButtonGroup>
    </TimerContainer>
  );
};

export default Timer;
