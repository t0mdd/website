import { Fragment, useEffect, useRef, useState } from 'react';
import { complexPolynomialSliders } from '../slidersData';
import * as R from 'ramda';
import {
  ComplexPolynomial,
  OrientedLineSegment,
  Point,
  mod,
  toColour,
  white,
} from '../utils/utils';
import Canvas from '../components/Canvas';

const initialWidth = 500;
const initialHeight = 500;

const fractalSlidersData = complexPolynomialSliders;

const initialSliderValues = Object.fromEntries(
  fractalSlidersData.map(({ id, initialValue }) => [id, initialValue])
);

const Homotopy = () => {
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

  // console.log('' + polynomial.toString());

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

  // const axes = [
  //   new OrientedLineSegment(
  //     new Point(0, canvasDimensions.height / 2),
  //     new Point(canvasDimensions.width, canvasDimensions.height / 2)
  //   ),
  //   new OrientedLineSegment(
  //     new Point(canvasDimensions.width / 2, 0),
  //     new Point(canvasDimensions.width / 2, canvasDimensions.height)
  //   ),
  // ];

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

  // const sineWave = x => (Math.sin(x) + 1) / 2;

  const triangleWave = x => {
    const r = mod(x, 2);
    return r <= 1 ? r : 2 - r;
  };

  const radiusRef = useRef(0);
  const radiusAdjustmentRef = useRef(1);

  const animate = timestamp => {
    if (canvasRef.current === undefined) return;
    // canvasRef.current.clear();
    // for (const axis of axes) {
    //   canvasRef.current.draw(axis.drawInstructions({ colour: black }));
    // }
    // setAnimationDomainRadius(() => ((Math.sin(timestamp / 10e7) + 1) / 2) * 10);

    radiusRef.current +=
      (5 * processedSliderValues.speed * radiusAdjustmentRef.current) / 1000;
    if (radiusRef.current >= processedSliderValues.maxDomainRadius)
      radiusAdjustmentRef.current = -1;
    if (radiusRef.current <= 0) radiusAdjustmentRef.current = 1;

    const circleImageApproximationSegments =
      linearApproximationOfCircleImageFromSamplePoints({
        f: polynomial.evaluateAt.bind(polynomial),
        samplePoints: samplePointsOfCircle({
          radius: radiusRef.current,
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
    // const clearingRadius =
    //   triangleWave(((timestamp - 4000) * processedSliderValues.speed) / 24000) *
    //   processedSliderValues.maxDomainRadius;
    // const clearingCircleImageApproximationSegments =
    //   linearApproximationOfCircleImageFromSamplePoints({
    //     f: polynomial.evaluateAt.bind(polynomial),
    //     samplePoints: samplePointsOfCircle({
    //       radius: clearingRadius,
    //       numberOfSamples: 400,
    //     }),
    //   });
    // for (const segment of clearingCircleImageApproximationSegments) {
    //   canvasRef.current.draw(
    //     segment.drawInstructions({
    //       colour: white,
    //       thickness: processedSliderValues.thickness,
    //     })
    //   );
    // }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [processedSliderValues]);

  const clearCanvas = () => canvasRef.current?.clear();

  return (
    <div className='App'>
      <h1>???????</h1>

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
          <p dangerouslySetInnerHTML={{ __html: polynomialHTML }}></p>
          <label htmlFor='coefficientsInput'>
            Coefficients:{' '}
            <input
              id='coefficientsInput'
              value={coefficientsString}
              onChange={handleCoefficientsStringChange}
            />
          </label>
          <label htmlFor='colourSchemeInput'>
            Colour scheme:{' '}
            <input
              id='colourSchemeInput'
              value={colourSchemeString}
              onChange={handleColourSchemeStringChange}
            />
          </label>
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
          <button onClick={clearCanvas}>Clear</button>
        </div>
      </main>
    </div>
  );
};

export default Homotopy;
