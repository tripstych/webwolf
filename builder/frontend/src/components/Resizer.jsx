import { useRef, useState } from 'react';

export default function Resizer({ component, onChange }) {
  const resizeRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(component.size.width) || 300;
    const startHeight = component.size.height.includes('px')
      ? parseInt(component.size.height)
      : 100;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes('e')) {
        newWidth = Math.max(100, startWidth + deltaX);
      }
      if (direction.includes('s')) {
        newHeight = Math.max(50, startHeight + deltaY);
      }

      onChange({
        ...component,
        size: {
          width: `${newWidth}px`,
          height: `${newHeight}px`
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleHandle = (e, direction) => {
    handleMouseDown(e, direction);
  };

  return (
    <>
      {/* Bottom-right resize handle */}
      <div
        onMouseDown={(e) => handleHandle(e, 'se')}
        className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full cursor-se-resize hover:bg-blue-600 transition-colors"
        style={{
          transform: 'translate(50%, 50%)',
          zIndex: 10
        }}
        title="Resize"
      />

      {/* Right edge resize handle */}
      <div
        onMouseDown={(e) => handleHandle(e, 'e')}
        className="absolute top-1/2 right-0 w-1 h-12 bg-blue-400 cursor-ew-resize hover:bg-blue-600 transition-colors"
        style={{
          transform: 'translate(50%, -50%)',
          zIndex: 10
        }}
      />

      {/* Bottom edge resize handle */}
      <div
        onMouseDown={(e) => handleHandle(e, 's')}
        className="absolute bottom-0 left-1/2 h-1 w-12 bg-blue-400 cursor-ns-resize hover:bg-blue-600 transition-colors"
        style={{
          transform: 'translate(-50%, 50%)',
          zIndex: 10
        }}
      />
    </>
  );
}
