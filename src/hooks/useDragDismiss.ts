import { useRef, useState, type CSSProperties } from 'react';

/**
 * Swipe-down-to-dismiss for mobile bottom-sheet modals. Attach the
 * returned handlers to the drag area (the modal header, where the
 * visual handle pill lives) and the style to the sheet element so it
 * follows the finger and snaps back if the drag is too short.
 */
export function useDragDismiss(onDismiss: () => void, threshold = 90) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    setDragY(dy > 0 ? dy : 0); // downward only
  }

  function onTouchEnd() {
    if (dragY > threshold) onDismiss();
    setDragY(0);
    startY.current = null;
  }

  const sheetStyle: CSSProperties | undefined =
    dragY > 0
      ? { transform: `translateY(${dragY}px)`, transition: 'none' }
      : undefined;

  return {
    dragHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    sheetStyle,
  };
}
