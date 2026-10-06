import React, { useState, useEffect, useRef } from 'react';

interface GachaNumberTextProps {
  value: string;
  className?: string;
}

/**
 * Smooth Gacha / Slot-Machine Digit Scrambler
 * Randomly cycles each numeric digit (0-9) independently and locks in left-to-right
 * whenever the target `value` string changes. Non-digit characters ('Rp', '.', ',', ':')
 * remain steady so layout width never shifts.
 */
export const GachaNumberText: React.FC<GachaNumberTextProps> = ({
  value,
  className = '',
}) => {
  const [displayText, setDisplayText] = useState<string>(value);
  const prevValueRef = useRef<string>(value);

  useEffect(() => {
    if (prevValueRef.current === value) {
      setDisplayText(value);
      return;
    }
    prevValueRef.current = value;

    const chars = value.split('');
    // Collect indices of numeric digits
    const digitPositions = chars
      .map((ch, idx) => (/\d/.test(ch) ? idx : -1))
      .filter((idx) => idx !== -1);

    if (digitPositions.length === 0) {
      setDisplayText(value);
      return;
    }

    let animationFrameId: number;
    let startTime: number | null = null;
    const baseDurationMs = 320;
    const staggerPerDigitMs = 45;
    const totalDurationMs =
      baseDurationMs + digitPositions.length * staggerPerDigitMs;

    let lastTickTime = 0;
    const tickIntervalMs = 28; // ~35fps crisp digit shuffle inside 120Hz RAF loop

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed >= totalDurationMs) {
        setDisplayText(value);
        return;
      }

      if (timestamp - lastTickTime >= tickIntervalMs) {
        lastTickTime = timestamp;

        const nextChars = chars.map((targetChar, charIdx) => {
          if (!/\d/.test(targetChar)) return targetChar;

          const digitOrder = digitPositions.indexOf(charIdx);
          const lockTime = baseDurationMs + digitOrder * staggerPerDigitMs;

          if (elapsed >= lockTime) {
            return targetChar;
          }

          // Smooth gacha random digit 0-9
          const randomDigit = Math.floor(Math.random() * 10);
          return String(randomDigit);
        });

        setDisplayText(nextChars.join(''));
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  return <span className={className}>{displayText}</span>;
};
