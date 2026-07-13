import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

interface DraggableWidgetProps {
  children: ReactNode;
  initialRight?: number;
  initialBottom?: number;
  zIndex?: number;
  onMoved?: (moved: boolean) => void;
}

/**
 * 可拖动的浮动小组件容器
 * 使用 document 级别事件监听，鼠标移再快也不会脱离
 */
export default function DraggableWidget({
  children,
  initialRight = 24,
  initialBottom = 24,
  zIndex = 30,
  onMoved,
}: DraggableWidgetProps) {
  const [pos, setPos] = useState({ x: -initialRight, y: -initialBottom });
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const movedRef = useRef(false);
  const draggingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    movedRef.current = false;
    draggingRef.current = true;
    setDragging(true);
  }, [pos]);

  // document 级别监听，鼠标移到哪都跟得住
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        movedRef.current = true;
      }
      setPos({
        x: startRef.current.posX + dx,
        y: startRef.current.posY + dy,
      });
    };

    const handleUp = () => {
      draggingRef.current = false;
      setDragging(false);
      if (onMoved) onMoved(movedRef.current);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, onMoved]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        right: 0,
        bottom: 0,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        zIndex,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  );
}
