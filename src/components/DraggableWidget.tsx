import { useState, useRef, useCallback, type ReactNode } from 'react';

interface DraggableWidgetProps {
  children: ReactNode;
  /** 初始 x 位置（像素，从右边算） */
  initialRight?: number;
  /** 初始 y 位置（像素，从下边算） */
  initialBottom?: number;
  /** z-index */
  zIndex?: number;
  /** 拖动结束时回调，返回是否真的拖动了（用于区分点击） */
  onMoved?: (moved: boolean) => void;
}

/**
 * 可拖动的浮动小组件容器
 * 拖动任意区域即可移动，点击不会触发拖动（距离 < 5px）
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    movedRef.current = false;
    setDragging(true);
  }, [pos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      movedRef.current = true;
    }
    setPos({
      x: startRef.current.posX + dx,
      y: startRef.current.posY + dy,
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    if (onMoved) onMoved(movedRef.current);
  }, [onMoved]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
