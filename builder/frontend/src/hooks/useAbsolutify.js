/**
 * useAbsolutify Hook
 * Handles absolutify/relativize technique for layout preservation
 */
export function useAbsolutify() {
  /**
   * Convert components to absolute positioning
   * Captures computed position and size from DOM
   */
  const absolutify = (components, canvasRef) => {
    if (!canvasRef.current) return components;

    return components.map(component => {
      const element = canvasRef.current.querySelector(`[data-component-id="${component.id}"]`);
      if (!element) return component;

      const rect = element.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();

      return {
        ...component,
        _absolutePosition: {
          top: rect.top - canvasRect.top,
          left: rect.left - canvasRect.left,
          width: rect.width,
          height: rect.height
        }
      };
    });
  };

  /**
   * Convert absolute values back to relative units
   * Converts px to %, rem, etc. for responsive design
   */
  const relativize = (components, canvasWidth = 1200) => {
    return components.map(component => {
      if (!component._absolutePosition) return component;

      const { top, left, width, height } = component._absolutePosition;

      return {
        ...component,
        position: {
          x: left > 0 ? `${(left / canvasWidth) * 100}%` : '0',
          y: top > 0 ? `${top}px` : '0'
        },
        size: {
          width: width > 0 ? `${(width / canvasWidth) * 100}%` : '100%',
          height: height > 0 ? `${height}px` : 'auto'
        },
        _absolutePosition: null // Clear absolute position after conversion
      };
    });
  };

  return { absolutify, relativize };
}
