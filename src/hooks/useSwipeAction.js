import { useState, useCallback } from 'react';

export function useSwipeAction({ onSwipeRight, onSwipeLeft, maxOffset = 110, threshold = 65 }) {
  const [touchOffset, setTouchOffset] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = useCallback((e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartX === null) return;
    const diff = e.touches[0].clientX - touchStartX;
    if (Math.abs(diff) < maxOffset) {
      setTouchOffset(diff);
    }
  }, [touchStartX, maxOffset]);

  const handleTouchEnd = useCallback(() => {
    if (touchOffset > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (touchOffset < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    setTouchOffset(0);
    setTouchStartX(null);
    setIsSwiping(false);
  }, [touchOffset, threshold, onSwipeRight, onSwipeLeft]);

  return {
    touchOffset,
    isSwiping,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
