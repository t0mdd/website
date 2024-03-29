import { Fragment, useEffect, useRef, useState } from 'react';
import Canvas from '../components/Canvas';
import { equals, assoc, pipe, update, adjust, identity, multiply } from 'ramda';
import { Point } from '../utils/math';
import { black, white } from '../utils/colours';
import {
  OrientedLineSegment,
  OrientedPolygon,
  OrientedTriangle,
} from '../utils/shapes';

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

const broccoliQuad = ({
  initialPolygon,
  initialUpwardsUnitNormals,
  baseStartBaryCoord,
  baseEndBaryCoord,
  heightFunction1,
  heightFunction2,
  initialColour,
  colourFunction,
  baseRatio1,
  baseRatio2,
  outlineEdges,
  iterations,
  drawFunction,
  alternateOrientation,
}) => {
  drawFunction(
    initialPolygon.drawInstructions({
      fillColour: initialColour,
      outlineColour: outlineEdges ? black : initialColour,
      outlineThickness: 0,
    })
  );
  const { sides: initialBases } = initialPolygon;
  // const upwardsUnitVectors = initialBases.map((base, index) =>
  //   base.perpUnitVectorOpposite(corners[(index + 2) % 3])
  // );
  initialBases.forEach((base, index) =>
    drawRestFromBase({
      base,
      upwardsUnitVector: initialUpwardsUnitNormals[index],
      lastColour: initialColour,
      iterationsLeft: iterations - 1,
    })
  );

  function drawRestFromBase({
    base,
    upwardsUnitVector,
    lastColour,
    iterationsLeft,
  }) {
    if (iterationsLeft === 0) return;

    // const thirdCorner = base
    //   .pointFromBarycentricCoordinates(baseRatio)
    //   .plus(upwardsUnitVector.scale(heightFunction(base.length)));
    const newQuadrilateral = alternateOrientation
      ? new OrientedPolygon(
          base.pointFromBarycentricCoordinates(baseStartBaryCoord),
          base.pointFromBarycentricCoordinates(baseEndBaryCoord),
          base
            .pointFromBarycentricCoordinates(baseRatio2)
            .plus(upwardsUnitVector.scale(heightFunction2(base.length))),
          base
            .pointFromBarycentricCoordinates(baseRatio1)
            .plus(upwardsUnitVector.scale(heightFunction1(base.length)))
        )
      : new OrientedPolygon(
          base.pointFromBarycentricCoordinates(baseEndBaryCoord),
          base.pointFromBarycentricCoordinates(baseStartBaryCoord),
          base
            .pointFromBarycentricCoordinates(baseRatio1)
            .plus(upwardsUnitVector.scale(heightFunction1(base.length))),
          base
            .pointFromBarycentricCoordinates(baseRatio2)
            .plus(upwardsUnitVector.scale(heightFunction2(base.length)))
        );

    const newColour = colourFunction(lastColour);
    drawFunction(
      newQuadrilateral.drawInstructions({
        fillColour: newColour,
        outlineColour: outlineEdges ? black : newColour,
        outlineThickness: 0,
      })
    );
    const [virtualBase, ...newBases] = newQuadrilateral.sides;
    const newAngles = newQuadrilateral.angles;
    // console.log(newAngles);
    const level = iterations - iterationsLeft;
    const unitVectorRotations = alternateOrientation
      ? baseStartBaryCoord < baseEndBaryCoord // might need to replace with 'if convex'
        ? [
            newAngles[1] * (level % 2 === 0 ? 1 : -1),
            2 * Math.PI - newAngles[2] - newAngles[1],
            newAngles[0] * (level % 2 === 0 ? -1 : 1),
          ]
        : [
            Math.PI - newAngles[1] * (level % 2 === 0 ? 1 : -1),
            newAngles[1] + Math.PI - newAngles[2],
            Math.PI - newAngles[0] * (level % 2 === 0 ? -1 : 1),
          ]
      : baseStartBaryCoord < baseEndBaryCoord // might need to replace with 'if convex'
      ? [
          Math.PI - newAngles[1],
          2 * Math.PI - newAngles[2] - newAngles[1],
          Math.PI + newAngles[0],
        ]
      : [newAngles[1], newAngles[1] + Math.PI - newAngles[2], -newAngles[0]];
    const virtualBaseUpwardsUnitVector = upwardsUnitVector.scale(-1);
    // consider the case when the new quad is not convex
    const newUpwardsUnitVectors =
      // baseStartBaryCoord < baseEndBaryCoord
      //   ? [
      //       newBases[0].perpUnitVectorOpposite(virtualBase.startPoint),
      //       newBases[1].perpUnitVectorOpposite(virtualBase.endPoint),
      //       newBases[2].perpUnitVectorOpposite(virtualBase.endPoint),
      //     ]
      //   :
      [
        virtualBaseUpwardsUnitVector.rotateAboutOrigin(unitVectorRotations[0]),
        virtualBaseUpwardsUnitVector.rotateAboutOrigin(unitVectorRotations[1]),
        virtualBaseUpwardsUnitVector.rotateAboutOrigin(unitVectorRotations[2]),
      ];

    // console.log(newBases.map(base => base.toString()));
    newBases.forEach((newBase, index) =>
      drawRestFromBase({
        base: newBase,
        upwardsUnitVector: newUpwardsUnitVectors[index],
        lastColour: newColour,
        iterationsLeft: iterationsLeft - 1,
      })
    );
  }
};

const broccoli = ({
  initialTriangle,
  initialUpwardsUnitNormals,
  baseStartBaryCoord,
  baseEndBaryCoord,
  heightFunction,
  initialColour,
  colourFunction,
  baseRatio,
  outlineEdges,
  iterations,
  drawFunction,
  alternateOrientation,
}) => {
  drawFunction(
    initialTriangle.drawInstructions({
      fillColour: initialColour,
      outlineColour: outlineEdges ? black : initialColour,
      outlineThickness: 0,
    })
  );
  const initialBases = initialTriangle.sides;
  const upwardsUnitVectors = initialUpwardsUnitNormals;
  initialBases.forEach((base, index) =>
    drawRestFromBase({
      base,
      upwardsUnitVector: upwardsUnitVectors[index],
      heightFunction,
      lastColour: initialColour,
      iterationsLeft: iterations - 1,
    })
  );

  function drawRestFromBase({
    base,
    upwardsUnitVector,
    heightFunction,
    lastColour,
    iterationsLeft,
  }) {
    if (iterationsLeft === 0) return;

    const thirdCorner = base
      .pointFromBarycentricCoordinates(baseRatio)
      .plus(upwardsUnitVector.scale(heightFunction(base.length)));
    const newTriangle = alternateOrientation
      ? new OrientedTriangle(
          base.pointFromBarycentricCoordinates(baseStartBaryCoord),
          base.pointFromBarycentricCoordinates(baseEndBaryCoord),
          thirdCorner
        )
      : new OrientedTriangle(
          base.pointFromBarycentricCoordinates(baseEndBaryCoord),
          base.pointFromBarycentricCoordinates(baseStartBaryCoord),
          thirdCorner
        );
    const newColour = colourFunction(lastColour);
    drawFunction(
      newTriangle.drawInstructions({
        fillColour: newColour,
        outlineColour: outlineEdges ? black : newColour,
        outlineThickness: 0,
      })
    );

    const [virtualBase, ...newBases] = newTriangle.sides;
    const newAngles = newTriangle.angles;
    const level = iterations - iterationsLeft;
    const unitVectorRotations = alternateOrientation
      ? baseStartBaryCoord < baseEndBaryCoord
        ? [
            newAngles[1] * (level % 2 === 0 ? 1 : -1),
            newAngles[0] * (level % 2 === 0 ? -1 : 1),
          ]
        : [
            Math.PI - newAngles[1] * (level % 2 === 0 ? 1 : -1),
            Math.PI - newAngles[0] * (level % 2 === 0 ? -1 : 1),
          ]
      : baseStartBaryCoord < baseEndBaryCoord
      ? [Math.PI - newAngles[1], Math.PI + newAngles[0]]
      : [newAngles[1], -newAngles[0]];
    const virtualBaseUpwardsUnitVector = upwardsUnitVector.scale(-1);
    const newUpwardsUnitVectors = [
      virtualBaseUpwardsUnitVector.rotateAboutOrigin(unitVectorRotations[0]),
      virtualBaseUpwardsUnitVector.rotateAboutOrigin(unitVectorRotations[1]),
    ];

    newBases.forEach((newBase, index) =>
      drawRestFromBase({
        base: newBase,
        upwardsUnitVector: newUpwardsUnitVectors[index],
        heightFunction,
        lastColour: newColour,
        iterationsLeft: iterationsLeft - 1,
      })
    );
  }
};

const Darkbroccoli = () => {
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const [checkboxValues, setCheckboxValues] = useState({
    quadMode: false,
    darkMode: true,
    alternateOrientation: false,
  });

  const fractalSlidersData = [
    {
      id: 'heightDecay',
      labelText: 'Height Decay',
      min: 300,
      max: 1000 - 1,
      initialValue: 463,
      valueProcessor: d => 1 - d / 1000,
    },
    {
      id: 'heightDecay2',
      labelText: 'Height Decay 2',
      min: 300,
      max: 1000 - 1,
      initialValue: 463,
      valueProcessor: d => 1 - d / 1000,
      hidden: !checkboxValues.quadMode,
    },
    {
      id: 'baseStartBaryCoord',
      labelText: 'Base start',
      min: 1 / 1000,
      max: 1 - 1 / 1000,
      step: 1 / 1000,
      initialValue: 0.445,
    },
    {
      id: 'baseEndBaryCoord',
      labelText: 'Base end',
      min: 1 / 1000,
      max: 1 - 1 / 1000,
      step: 1 / 1000,
      initialValue: 0.961,
      // if it is equal to baseStartBaryCoord it causes problems when calculating perpendicular to degenerate side
      valueProcessor: x => x + 10e-5,
    },
    {
      id: 'baseRatio',
      labelText: 'Altitude skew',
      min: 1 / 1000,
      step: 1 / 1000,
      max: 1,
      initialValue: 1 / 3,
    },
    {
      id: 'baseRatio2',
      labelText: 'Altitude skew 2',
      min: 1 / 1000,
      step: 1 / 1000,
      max: 1,
      initialValue: 0.637,
      // if it is equal to baseRatio it causes problems when calculating perpendicular to degenerate side
      valueProcessor: x => x + 10e-5,
      hidden: !checkboxValues.quadMode,
    },
    {
      id: 'depth',
      labelText: 'Depth:',
      min: 1,
      max: maxDepth,
      initialValue: 5,
    },
    // {
    //   id: 'initialHue',
    //   labelText: 'Initial Hue',
    //   min: 0,
    //   max: 360,
    //   initialValue: 170,
    // },
    // {
    //   id: 'colourVariation',
    //   labelText: 'Colour Variation',
    //   min: 0,
    //   max: 40,
    //   initialValue: 10,
    // },
  ];

  const initialSliderValues = Object.fromEntries(
    fractalSlidersData.map(({ id, initialValue }) => [id, initialValue])
  );

  const handleCheckboxChange =
    name =>
    ({ target: { checked } }) => {
      setCheckboxValues(assoc(name, checked));
      if (name === 'quadMode') {
        setUnprocessedSliderValues(assoc('depth', 4));
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
      setUnprocessedSliderValues(assoc(id, value));

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
          heightFunction1: multiply(heightDecay),
          heightFunction2: multiply(heightDecay2),
          initialColour: checkboxValues.darkMode ? black : undefined,
          colourFunction: identity,
          baseRatio1: baseRatio,
          baseRatio2,
          outlineEdges: true,
          iterations: depth,
          drawFunction: canvasRef.current.draw,
          alternateOrientation: checkboxValues.alternateOrientation,
        })
      : broccoli({
          initialTriangle: new OrientedTriangle(...basePolygonCorners),
          initialUpwardsUnitNormals: basePolygonUpwardsUnitNormals,
          baseStartBaryCoord,
          baseEndBaryCoord,
          heightFunction: multiply(heightDecay),
          initialColour: checkboxValues.darkMode ? black : undefined,
          colourFunction: identity,
          baseRatio,
          outlineEdges: true,
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
      distancesFromBaseCorners.findIndex(equals(minDistanceFromBaseCorner))
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
      setBasePolygonCorners(update(grabbedCornerIndex, newCornerCoordinates));
      setBasePolygonUpwardsUnitNormals(
        pipe(
          adjust(adjacentCornerIndices[0], normal =>
            normal.rotateAboutOrigin(incidentSideRotations[0])
          ),
          adjust(adjacentCornerIndices[1], normal =>
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
            htmlFor='quadMode'
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
            htmlFor='darkMode'
            className='checkbox-label'
          >
            DARK MODE
            <input
              id='darkMode'
              type='checkbox'
              checked={checkboxValues.darkMode}
              onChange={handleCheckboxChange('darkMode')}
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
