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
  toColour,
  mod,
} from './utils/utils';
import Canvas from './components/Canvas';
import * as R from 'ramda';
import { broccoli } from './fractalGenerators';
import { broccoliSliders, complexPolynomialSliders } from './slidersData';
import { simplify } from 'mathjs';

const maxDepth = 15;

const initialWidth = 500;
const initialHeight = 500;

const slidersData = mode =>
  mode === 'complexPolynomial'
    ? complexPolynomialSliders
    : mode === 'broccoli'
    ? broccoliSliders({
        maxDepth,
        initialWidth,
        initialHeight,
      })
    : undefined;

const initialSliderValues = mode =>
  Object.fromEntries(
    slidersData(mode).map(({ id, initialValue }) => [id, initialValue])
  );

const header = mode =>
  mode === 'complexPolynomial' ? '???????' : 'DARKBROCCOLI';

function App() {
  const [mode, setMode] = useState('complexPolynomial');

  const handleModeClick = mode => () => {
    setMode(mode);
    canvasRef.current.clear();
    setUnprocessedSliderValues(initialSliderValues(mode));
  };

  const fractalSlidersData = slidersData(mode);

  const [canvasDimensions, setCanvasDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const [unprocessedSliderValues, setUnprocessedSliderValues] = useState(
    initialSliderValues(mode)
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

  const [coefficientsString, setCoefficientsString] =
    useState('1 1 1 1 -1 1 -1');

  const handleCoefficientsStringChange = ({ target: { value } }) => {
    if (value.trimStart().split(/\s+/g).length >= 10) return;
    canvasRef.current.clear();
    setCoefficientsString(value);
  };

  const coefficients = coefficientsString
    .trim()
    .split(/\s+/g)
    .map(coeffientString => +coeffientString)
    .filter(R.complement(isNaN));

  const polynomial = new ComplexPolynomial(
    // ...R.range(0, 5).map(_ => Math.random())
    ...coefficients
  );

  console.log('' + polynomial.toString());

  const polynomialHTML = polynomial
    .toString()
    .toString() // returning a number for constant polynomials for some reason
    .replace(/z\^(\d+)/g, (_, power) => `<var>z<sup>${power}</sup></var>`);

  const [colourSchemeString, setColourSchemeString] = useState(
    'black purple blue red white'
  );

  const handleColourSchemeStringChange = ({ target: { value } }) =>
    setColourSchemeString(value);

  const requestRef = useRef();

  let animate;

  if (mode === 'complexPolynomial') {
    const samplePointsOfCircle = ({ radius, numberOfSamples }) =>
      R.range(0, numberOfSamples).map(i =>
        Point.fromPolarCoordinates({
          r: radius,
          theta: (2 * Math.PI * i) / numberOfSamples,
        })
      );

    // useEffect(() => setTimeout())

    // FANCY COEFFICIENT INPUT (IN PROGRESS)
    // const [polynomialString, setPolynomialString] = useState(
    //   '1 + z + z^2 + z^3 - z^4 + z^5 - z^6'
    // );

    // const handlePolynomialStringChange = ({ target: { value } }) =>
    //   setPolynomialString(value);

    // const fromString = polynomialString => {
    //   console.log(
    //     simplify(polynomialString, { exactFractions: false }).toString()
    //   );
    //   console.log(
    //     simplify('1 - z^4 + z^5 - z^6 + z^2 - 7 * z^2 - z^8').toString()
    //   );
    // };

    // fromString('1 + z + z^2 + z^3 - z^4 + z^5 - z^6 + z^2 - 7z^2 - z^8');
    // END OF FANCY COEFFICIENT INPUT

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
      return R.zip(samplePoints, [
        ...samplePoints.slice(1),
        samplePoints[0],
      ]).map(([start, end]) => {
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
      });
    };

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

    const colourScheme = colourSchemeString
      .trim()
      .split(/\s+/g)
      .map(colour => toColour[colour])
      .filter(R.identity);

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

    const sineWave = x => (Math.sin(x) + 1) / 2;

    const triangleWave = x => {
      const r = mod(x, 2);
      return r <= 1 ? r : 2 - r;
    };
    animate = timestamp => {
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
            thickness: processedSliderValues.thickness,
          })
        );
        currentColourIndex++;
      }
      requestRef.current = requestAnimationFrame(animate);
    };
  }
  useEffect(() => {
    if (mode !== 'broccoli') return;
    if (canvasRef.current === undefined) return;
    // canvasRef.current.clear();
    const triangle = new OrientedTriangle(
      new Point(250, 150),
      new Point(300, 300),
      new Point(200, 300)
    );
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

  useEffect(() => {
    if (mode !== 'complexPolynomial') return;
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [processedSliderValues]);

  return (
    <div className='App'>
      <h1>{header(mode)}</h1>

      <nav>
        <a onClick={handleModeClick('broccoli')}>{header('broccoli')}</a>
        <a onClick={handleModeClick('complexPolynomial')}>
          {header('complexPolynomial')}
        </a>
      </nav>

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
          {mode === 'complexPolynomial' && (
            <>
              <p dangerouslySetInnerHTML={{ __html: polynomialHTML }}></p>
              <label for='coefficientsInput'>
                Coefficients:{' '}
                <input
                  id='coefficientsInput'
                  value={coefficientsString}
                  onChange={handleCoefficientsStringChange}
                />
              </label>
              <label for='colourSchemeInput'>
                Colour scheme:{' '}
                <input
                  id='colourSchemeInput'
                  value={colourSchemeString}
                  onChange={handleColourSchemeStringChange}
                />
              </label>
              <button onClick={canvasRef.current?.clear}>Clear</button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
