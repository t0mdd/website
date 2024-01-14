import { useEffect, useRef, useState } from 'react';
import './App.css';
import {
  ComplexPolynomial,
  OrientedLineSegment,
  OrientedTriangle,
  Point,
  black,
  purple,
  blue,
  red,
  white,
  mod,
} from './utils/utils';
import Canvas from './components/Canvas';
import * as R from 'ramda';
import { broccoli } from './fractalGenerators';
import { broccoliSliders, complexPolynomialSliders } from './slidersData';

const maxDepth = 17;

const initialWidth = 500;
const initialHeight = 500;

// const fractalSlidersData = broccoliSliders({
//   maxDepth,
//   initialWidth,
//   initialHeight,
// });

const fractalSlidersData = complexPolynomialSliders;

function App() {
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const [unprocessedSliderValues, setUnprocessedSliderValues] = useState(
    Object.fromEntries(
      fractalSlidersData.map(({ id, initialValue }) => [id, initialValue])
    )
  );

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

  const samplePointsOfCircle = ({ radius, numberOfSamples }) =>
    R.range(0, numberOfSamples).map(i =>
      Point.fromPolarCoordinates({
        r: radius,
        theta: (2 * Math.PI * i) / numberOfSamples,
      })
    );

  // useEffect(() => setTimeout())

  const polynomial = new ComplexPolynomial(
    // ...R.range(0, 5).map(_ => Math.random())
    1,
    1,
    1,
    1,
    -1,
    1,
    -1
  );

  const { max, min, abs } = Math;

  const normalizePointForCanvas =
    ({ xMax, yMax, xMin, yMin }) =>
    ({ x, y }) => {
      const { width, height } = canvasDimensions;
      return (
        xMin !== undefined && yMin !== undefined
          ? new Point(
              (x / (xMax - xMin)) * (width / 2),
              (y / (yMax - yMin)) * (height / 2)
            )
          : new Point((x / xMax) * (width / 2), (y / yMax) * (height / 2))
      ).plus(new Point(width / 2, height / 2));
    };

  const linearApproximationOfCircleImageFromSamplePoints = ({
    samplePoints,
    f,
  }) => {
    const imagesOfSamplePoints = samplePoints.map(point =>
      polynomial.evaluateAt(point)
    );
    const { xMax, yMax, xMin, yMin } = imagesOfSamplePoints.reduce(
      ({ xMax, yMax, xMin, yMin }, { x, y }) => ({
        xMax: max(abs(xMax), abs(x)),
        yMax: max(abs(yMax), abs(y)),
        xMin: min(xMax, x),
        yMin: min(yMax, y),
      }),
      { xMax: 0, yMax: 0 }
    );
    const canvasBound = max(xMax, yMax);
    return R.zip(samplePoints, [...samplePoints.slice(1), samplePoints[0]]).map(
      ([start, end]) => {
        return new OrientedLineSegment(
          // normalizePointForCanvas({ xMax, yMax, xMin, yMin })(f(start)),
          // normalizePointForCanvas({ xMax, yMax, xMin, yMin })(f(end))

          // normalizePointForCanvas({ xMax, yMax })(f(start)),
          // normalizePointForCanvas({ xMax, yMax })(f(end))

          normalizePointForCanvas({ xMax: canvasBound, yMax: canvasBound })(
            f(start)
          ),
          normalizePointForCanvas({ xMax: canvasBound, yMax: canvasBound })(
            f(end)
          )
        );
      }
    );
  };

  // const triangle = new OrientedTriangle(
  //   new Point(250, 150),
  //   new Point(300, 300),
  //   new Point(200, 300)
  // );

  const axes = [
    new OrientedLineSegment(
      new Point(0, canvasDimensions.height / 2),
      new Point(canvasDimensions.width, canvasDimensions.height / 2)
    ),
    new OrientedLineSegment(
      new Point(canvasDimensions.width / 2, 0),
      new Point(canvasDimensions.width / 2, canvasDimensions.height)
    ),
  ];

  const colourScheme = [black, purple, blue, red, white];

  // useEffect(() => {
  //   if (canvasRef.current === undefined) return;
  //   // canvasRef.current.clear();

  //   for (const axis of axes) {
  //     canvasRef.current.draw(axis.drawInstructions({ colour: black }));
  //   }

  //   const circleImageApproximationSegments =
  //     linearApproximationOfCircleImageFromSamplePoints({
  //       f: polynomial.evaluateAt.bind(polynomial),
  //       samplePoints: samplePointsOfCircle({
  //         radius: processedSliderValues.domainRadius,
  //         numberOfSamples: 400,
  //       }),
  //     });
  //   let currentColourIndex = 0;
  //   for (const segment of circleImageApproximationSegments) {
  //     const currentColour =
  //       colourScheme[currentColourIndex % colourScheme.length];
  //     canvasRef.current.draw(
  //       segment.drawInstructions({
  //         colour: currentColour,
  //         thickness: 2,
  //       })
  //     );
  //     currentColourIndex++;
  //   }
  //   // const {
  //   //   depth,
  //   //   heightDecay,
  //   //   baseStartBaryCoord,
  //   //   baseEndBaryCoord,
  //   //   baseRatio,
  //   // } = processedSliderValues;

  //   // canvasRef.current.clear();

  //   // broccoli({
  //   //   initialTriangle: triangle,
  //   //   baseStartBaryCoord,
  //   //   baseEndBaryCoord,
  //   //   heightFunction: x => x * heightDecay,
  //   //   initialColour: black,
  //   //   colourFunction: x => x,
  //   //   baseRatio,
  //   //   outlineEdges: false,
  //   //   iterations: depth,
  //   //   drawFunction: canvasRef.current.draw,
  //   // });
  // }, [canvasRef, unprocessedSliderValues]);

  const requestRef = useRef();

  const sineWave = x => (Math.sin(x) + 1) / 2;

  const triangleWave = x => {
    const r = mod(x, 2);
    return r <= 1 ? r : 2 - r;
  };

  console.log(processedSliderValues);
  const animate = timestamp => {
    if (canvasRef.current === undefined) return;
    // canvasRef.current.clear();
    // for (const axis of axes) {
    //   canvasRef.current.draw(axis.drawInstructions({ colour: black }));
    // }
    // setAnimationDomainRadius(() => ((Math.sin(timestamp / 10e7) + 1) / 2) * 10);
    const radius =
      triangleWave((timestamp * processedSliderValues.speed) / 24000) *
      processedSliderValues.maxDomainRadius;
    const circleImageApproximationSegments =
      linearApproximationOfCircleImageFromSamplePoints({
        f: polynomial.evaluateAt.bind(polynomial),
        samplePoints: samplePointsOfCircle({
          radius,
          numberOfSamples: 400,
        }),
      });
    let currentColourIndex = 0;
    for (const segment of circleImageApproximationSegments) {
      const currentColour =
        colourScheme[currentColourIndex % colourScheme.length];

      canvasRef.current.draw(
        segment.drawInstructions({
          colour: currentColour,
          thickness: 2,
        })
      );
      currentColourIndex++;
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [processedSliderValues]);

  return (
    <div className='App'>
      <h1>BROCCOLI</h1>
      <main>
        <div>
          <Canvas
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            style={{ border: '1px solid #000000' }}
            ref={canvasRef}
          />
        </div>
        <div className='slider-panel'>
          {fractalSlidersData.map(({ id, labelText, min, max, step }) => (
            <>
              <label htmlFor={id}>{labelText}</label>
              <input
                type='range'
                min={min}
                max={max}
                step={step}
                value={unprocessedSliderValues[id]}
                onChange={handleSliderChange(id)}
              />
            </>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
