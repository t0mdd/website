import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Point } from '../utils/utils';

export default forwardRef(({ width, height, style }, ref) => {
  const canvasRef = useRef();

  useImperativeHandle(ref, () => ({
    clear() {
      canvasRef.current.getContext('2d').clearRect(0, 0, width, height);
    },
    draw(drawInstructions) {
      return drawInstructions(canvasRef.current.getContext('2d'));
    },
  }));

  return (
    <canvas
      width={width}
      height={height}
      style={style}
      ref={canvasRef}
    ></canvas>
  );
});
