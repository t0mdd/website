import { Fragment, useEffect, useRef, useState } from 'react';
import { broccoliSliders } from '../slidersData';
import {
  OrientedLineSegment,
  OrientedPolygon,
  OrientedTriangle,
  Point,
  black,
} from '../utils/utils';
import { broccoli, broccoliQuad } from '../fractalGenerators';
import Canvas from '../components/Canvas';
import * as R from 'ramda';

const maxDepth = 15;

const initialWidth = 500;
const initialHeight = 500;

const initialTriangleCorners = [
  new Point(150, 150),
  new Point(350, 150),
  new Point(350, 350),
];

const initialTriangleUpwardsUnitNormals = [
  new Point(0, -1),
  new Point(1, 0),
  new Point(-1 / 2 ** 0.5, 1 / 2 ** 0.5),
];

const initialQuadCorners = [
  new Point(150, 150),
  new Point(350, 150),
  new Point(350, 350),
  new Point(150, 350),
];

const initialQuadUpwardsUnitNormals = [
  new Point(0, -1),
  new Point(1, 0),
  new Point(0, 1),
  new Point(-1, 0),
];

const Darkbroccoli = () => {
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const [checkboxValues, setCheckboxValues] = useState({
    quadMode: false,
    alternateOrientation: false,
  });

  const fractalSlidersData = broccoliSliders({
    maxDepth,
    initialWidth,
    initialHeight,
    quadMode: checkboxValues.quadMode,
  });

  const initialSliderValues = Object.fromEntries(
    fractalSlidersData.map(({ id, initialValue }) => [id, initialValue])
  );

  const handleCheckboxChange =
    name =>
    ({ target: { checked } }) => {
      setCheckboxValues(R.assoc(name, checked));
      if (name === 'quadMode') {
        setBasePolygonCorners(
          checked ? initialQuadCorners : initialTriangleCorners
        );
        setBasePolygonUpwardsUnitNormals(
          checked
            ? initialQuadUpwardsUnitNormals
            : initialTriangleUpwardsUnitNormals
        );
      }
    };

  const [unprocessedSliderValues, setUnprocessedSliderValues] =
    useState(initialSliderValues);

  const processedSliderValues = Object.fromEntries(
    fractalSlidersData.map(({ id, valueProcessor }) => [
      id,
      (valueProcessor ?? (x => +x))(+unprocessedSliderValues[id]),
    ])
  );

  const handleSliderChange =
    id =>
    ({ target: { value } }) =>
      setUnprocessedSliderValues(R.assoc(id, value));

  const [basePolygonCorners, setBasePolygonCorners] = useState(
    initialTriangleCorners
  );

  const [basePolygonUpwardsUnitNormals, setBasePolygonUpwardsUnitNormals] =
    useState(initialTriangleUpwardsUnitNormals);

  const canvasRef = useRef();

  useEffect(() => {
    if (canvasRef.current === undefined) return;
    // canvasRef.current.clear();

    // if there are new sliders add their values

    const {
      depth,
      heightDecay,
      heightDecay2,
      baseStartBaryCoord,
      baseEndBaryCoord,
      baseRatio,
      baseRatio2,
    } = processedSliderValues;

    canvasRef.current.clear();

    checkboxValues.quadMode
      ? broccoliQuad({
          initialPolygon: new OrientedPolygon(...basePolygonCorners),
          initialUpwardsUnitNormals: basePolygonUpwardsUnitNormals,
          baseStartBaryCoord,
          baseEndBaryCoord,
          heightFunction1: x => x * heightDecay,
          heightFunction2: x => x * heightDecay2,
          initialColour: black,
          colourFunction: x => x,
          baseRatio1: baseRatio,
          baseRatio2,
          outlineEdges: false,
          iterations: depth,
          drawFunction: canvasRef.current.draw,
          alternateOrientation: checkboxValues.alternateOrientation,
        })
      : broccoli({
          initialTriangle: new OrientedTriangle(...basePolygonCorners),
          initialUpwardsUnitNormals: basePolygonUpwardsUnitNormals,
          baseStartBaryCoord,
          baseEndBaryCoord,
          heightFunction: x => x * heightDecay,
          initialColour: black,
          colourFunction: x => x,
          baseRatio,
          outlineEdges: false,
          iterations: depth,
          drawFunction: canvasRef.current.draw,
          alternateOrientation: checkboxValues.alternateOrientation,
        });
  }, [canvasRef, unprocessedSliderValues, checkboxValues, basePolygonCorners]);

  const cursorPointerThresholdDistance = 10;

  const [grabbedCornerIndex, setGrabbedCornerIndex] = useState();

  const grabCorner = e => {
    const clickLocation = canvasRef.current.relativeMouseCoordinates(e);
    const distancesFromBaseCorners = basePolygonCorners.map(corner =>
      corner.distanceFrom(clickLocation)
    );
    const minDistanceFromBaseCorner = Math.min(...distancesFromBaseCorners);
    if (minDistanceFromBaseCorner > cursorPointerThresholdDistance) return;
    setGrabbedCornerIndex(
      distancesFromBaseCorners.findIndex(R.equals(minDistanceFromBaseCorner))
    );
  };

  const handleMouseMove = e => {
    if (grabbedCornerIndex === undefined) {
      // change cursor to a pointer or default depending on how close it is to a base polygon corner
      const mouseLocation = canvasRef.current.relativeMouseCoordinates(e);
      const distancesFromBaseCorners = basePolygonCorners.map(corner =>
        corner.distanceFrom(mouseLocation)
      );
      const minDistanceFromBaseCorner = Math.min(...distancesFromBaseCorners);
      canvasRef.current.setStyle(
        'cursor',
        minDistanceFromBaseCorner > cursorPointerThresholdDistance
          ? 'default'
          : 'pointer'
      );
    } else {
      const oldCornerCoordinates = basePolygonCorners[grabbedCornerIndex];
      const newCornerCoordinates =
        canvasRef.current.relativeMouseCoordinates(e);
      const adjacentCornerIndices = checkboxValues.quadMode
        ? [(grabbedCornerIndex + 3) % 4, (grabbedCornerIndex + 1) % 4]
        : [(grabbedCornerIndex + 2) % 3, (grabbedCornerIndex + 1) % 3];
      const adjacentCorners = [
        basePolygonCorners[adjacentCornerIndices[0]],
        basePolygonCorners[adjacentCornerIndices[1]],
      ];
      const oldIncidentSides = [
        new OrientedLineSegment(adjacentCorners[0], oldCornerCoordinates),
        new OrientedLineSegment(adjacentCorners[1], oldCornerCoordinates),
      ];
      const newIncidentSides = [
        new OrientedLineSegment(adjacentCorners[0], newCornerCoordinates),
        new OrientedLineSegment(adjacentCorners[1], newCornerCoordinates),
      ];
      const incidentSideRotations = [
        newIncidentSides[0].directedAngleBetween(oldIncidentSides[0]),
        newIncidentSides[1].directedAngleBetween(oldIncidentSides[1]),
      ];
      setBasePolygonCorners(R.update(grabbedCornerIndex, newCornerCoordinates));
      setBasePolygonUpwardsUnitNormals(
        R.pipe(
          R.adjust(adjacentCornerIndices[0], normal =>
            normal.rotateAboutOrigin(incidentSideRotations[0])
          ),
          R.adjust(adjacentCornerIndices[1], normal =>
            normal.rotateAboutOrigin(incidentSideRotations[1])
          )
        )
      );
    }
  };

  const releaseCorner = () => setGrabbedCornerIndex(undefined);

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
            onMouseDown={grabCorner}
            onMouseMove={handleMouseMove}
            onMouseUp={releaseCorner}
          />
        </div>
        <div className='control-panel'>
          <label
            htmlFor='shapeMode'
            className='checkbox-label'
          >
            QUAD MODE
            <input
              id='quadMode'
              type='checkbox'
              checked={checkboxValues.quadMode}
              onChange={handleCheckboxChange('quadMode')}
            />
          </label>
          <label
            htmlFor='shapeMode'
            className='checkbox-label'
          >
            Alternate orientation
            <input
              id='alternateOrientation'
              type='checkbox'
              checked={checkboxValues.alternateOrientation}
              onChange={handleCheckboxChange('alternateOrientation')}
            />
          </label>
          <div className='slider-panel'>
            {fractalSlidersData.map(
              ({ id, labelText, min, max, step, hidden }) =>
                hidden || (
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
                )
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Darkbroccoli;
