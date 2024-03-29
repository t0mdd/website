import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Point } from '../utils/math';

export default forwardRef(({ width, height, ...otherProps }, ref) => {
  const canvasRef = useRef();

  useImperativeHandle(ref, () => ({
    clear() {
      canvasRef.current.getContext('2d').clearRect(0, 0, width, height);
    },
    draw(drawInstructions) {
      return drawInstructions(canvasRef.current.getContext('2d'));
    },
    relativeMouseCoordinates({ clientX, clientY }) {
      const { left, top } = canvasRef.current.getBoundingClientRect();
      return new Point(clientX - left, clientY - top);
    },
    setStyle(key, value) {
      canvasRef.current.style[key] = value;
    },
  }));

  return (
    <canvas
      width={width}
      height={height}
      ref={canvasRef}
      {...otherProps}
    ></canvas>
  );
});
