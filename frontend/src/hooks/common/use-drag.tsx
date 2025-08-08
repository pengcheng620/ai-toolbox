import { useState, useCallback, useEffect } from 'react';

type Axis = 'x' | 'y' | 'both';

export function useDrag(axis: Axis = 'both') {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = useCallback((event: MouseEvent) => {
    setIsDragging(true);
    setStartPosition({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  }, [position]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      const newX = event.clientX - startPosition.x;
      const newY = event.clientY - startPosition.y;

      setPosition((prevPosition) => ({
        x: axis === 'y' ? prevPosition.x : newX,
        y: axis === 'x' ? prevPosition.y : newY,
      }));
    }
  }, [isDragging, startPosition, axis]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    position,
    handleMouseDown,
  };
}