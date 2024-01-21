import { Fragment, useEffect, useRef, useState } from 'react';
import { broccoliSliders } from '../slidersData';
import { OrientedTriangle, Point, black } from '../utils/utils';
import { broccoli } from '../fractalGenerators';
import Canvas from '../components/Canvas';
import * as R from 'ramda';

const maxDepth = 15;

const initialWidth = 500;
const initialHeight = 500;

const fractalSlidersData = broccoliSliders({
  maxDepth,
  initialWidth,
  initialHeight,
});

const initialSliderValues = Object.fromEntries(
  fractalSlidersData.map(({ id, initialValue }) => [id, initialValue])
);

const triangle = new OrientedTriangle(
  new Point(250, 150),
  new Point(300, 300),
  new Point(200, 300)
);

const Darkbroccoli = () => {
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const [unprocessedSliderValues, setUnprocessedSliderValues] =
    useState(initialSliderValues);

  const processedSliderValues = Object.fromEntries(
    fractalSlidersData.map(({ id, valueProcessor }) => [
      id,
      (valueProcessor ?? (x => +x))(unprocessedSliderValues[id]),
    ])
  );

  const handleSliderChange =
    id =>
    ({ target: { value } }) =>
      setUnprocessedSliderValues(R.assoc(id, value));

  const canvasRef = useRef();

  useEffect(() => {
    if (canvasRef.current === undefined) return;
    // canvasRef.current.clear();
    const {
      depth,
      heightDecay,
      baseStartBaryCoord,
      baseEndBaryCoord,
      baseRatio,
    } = processedSliderValues;

    canvasRef.current.clear();

    broccoli({
      initialTriangle: triangle,
      baseStartBaryCoord,
      baseEndBaryCoord,
      heightFunction: x => x * heightDecay,
      initialColour: black,
      colourFunction: x => x,
      baseRatio,
      outlineEdges: false,
      iterations: depth,
      drawFunction: canvasRef.current.draw,
    });
  }, [canvasRef, unprocessedSliderValues]);

  return (
    <div className='App'>
      <h1>DARKBROCCOLI</h1>

      <main>
        <div>
          <Canvas
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            style={{ border: '1px solid #000000' }}
            ref={canvasRef}
          />
        </div>
        <div className='control-panel'>
          <div className='slider-panel'>
            {fractalSlidersData.map(({ id, labelText, min, max, step }) => (
              <Fragment key={id}>
                <label htmlFor={id}>{labelText}</label>
                <input
                  type='range'
                  min={min}
                  max={max}
                  step={step}
                  value={unprocessedSliderValues[id]}
                  onChange={handleSliderChange(id)}
                />
              </Fragment>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Darkbroccoli;
