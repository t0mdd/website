import { Fragment, useEffect, useRef, useState } from 'react';
import Canvas from '../components/Canvas';
import { equals, assoc, update, zip } from 'ramda';
import { Point } from '../utils/math';
import { Colour, black, green, white } from '../utils/colours';
import {
  OrientedLineSegment,
  OrientedPolygon,
  OrientedTriangle,
} from '../utils/shapes';
import { rotateLeft, rotateRight } from '../utils/arrays';
import { Tree } from '../utils/tree';
import { random } from 'mathjs';

const maxDepth = 10;

const initialWidth = 500;
const initialHeight = 500;

const initialTriangleCorners = [
  new Point(50, 50),
  new Point(450, 150),
  new Point(250, 450),
];

const initialQuadrilateralCorners = [
  new Point(100, 100),
  new Point(400, 100),
  new Point(400, 400),
  new Point(100, 400),
];

const initialInnerQuadrilateralCorners = [
  new Point(200, 200),
  new Point(300, 200),
  new Point(300, 300),
  new Point(200, 300),
];

// const initialBarycentricCoordinates = [
//   [1 / 2, 1 / 6, 1 / 6, 1 / 6],
//   [1 / 6, 1 / 2, 1 / 6, 1 / 6],
//   [1 / 6, 1 / 6, 1 / 2, 1 / 6],
//   [1 / 6, 1 / 6, 1 / 6, 1 / 2],
// ];

// I think we gotta investigate what weights are equivalent to this result and see if theres some canonical or normalized form
const quadrilateralCartesianToBarycentric = ({ quadrilateral, point }) => {
  const allTriangulations = [
    new OrientedTriangle(...quadrilateral.corners.slice(0, 3)),
    new OrientedTriangle(...rotateLeft(1, quadrilateral.corners).slice(0, 3)),
    new OrientedTriangle(...rotateLeft(2, quadrilateral.corners).slice(0, 3)),
    new OrientedTriangle(...rotateLeft(3, quadrilateral.corners).slice(0, 3)),
  ];
  const containingTriangleIndex = allTriangulations.findIndex(triangle =>
    triangle.interiorContainsPoint(point)
  );
  const containingTriangleBarycentricCoordinates =
    allTriangulations[containingTriangleIndex].cartesianToBarycentric(point);
  return rotateRight(containingTriangleIndex, [
    ...containingTriangleBarycentricCoordinates,
    0,
  ]);
};

const makeHuePertubationSeedTree = () => {
  return Tree.make({
    depth: maxDepth,
    childrenPerNode: 3,
    nodeValue: () => random(-1, 1),
  });
};

const huePertubationSeedTree = makeHuePertubationSeedTree();

const BarycentricSplit = () => {
  const [canvasDimensions, setCanvasDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const [checkboxValues, setCheckboxValues] = useState({
    quadMode: false,
    alternateOrientation: false,
    outlineEdges: false,
    fillInterior: true,
  });

  const fractalSlidersData = [
    {
      id: 'depth',
      labelText: 'Depth:',
      min: 1,
      max: maxDepth,
      initialValue: 5,
      hidden: !checkboxValues.outlineEdges && !checkboxValues.fillInterior,
    },

    {
      id: 'outlineThickness',
      labelText: 'Line thickness:',
      min: 1,
      max: 5,
      initialValue: 1,
      hidden: !checkboxValues.outlineEdges,
    },

    {
      id: 'initialHue',
      labelText: 'Initial Hue',
      min: 0,
      max: 360,
      initialValue: 270,
      hidden: !checkboxValues.fillInterior,
    },
    {
      id: 'hueVariation',
      labelText: 'Colour Variation',
      min: 0,
      max: 40,
      initialValue: 10,
      hidden: !checkboxValues.fillInterior,
    },
  ];

  const initialSliderValues = Object.fromEntries(
    fractalSlidersData.map(({ id, initialValue }) => [id, initialValue])
  );

  const handleCheckboxChange =
    name =>
    ({ target: { checked } }) => {
      setCheckboxValues(assoc(name, checked));
      if (name === 'quadMode') {
        setBasePolygonCorners(
          checked ? initialQuadrilateralCorners : initialTriangleCorners
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

  const basePolygon = new OrientedPolygon(...basePolygonCorners);

  const baseTriangle = new OrientedTriangle(...basePolygonCorners);

  const [innerPolygonCorners, setInnerPolygonCorners] = useState(
    initialInnerQuadrilateralCorners
  );

  const [initialTriangleSplitPoint, setInitialTriangleSplitPoint] = useState(
    new Point(250, 200)
  );

  const initialTriangleSplitPointBarycentricCoordinates =
    baseTriangle.cartesianToBarycentric(initialTriangleSplitPoint);

  // const barycentricCoordinates = innerPolygonCorners.map(innerCorner =>
  //   quadrilateralCartesianToBarycentric({
  //     quadrilateral: basePolygon,
  //     point: innerCorner,
  //   })
  // );

  // console.log(barycentricCoordinates);

  const canvasRef = useRef();

  const barycentricSplitTriangle = ({
    triangle,
    barycentricCoordinates,
    numberOfIterations,
    drawFunction,
    fillColour,
    outlineColour,
    outlineThickness,
    hueVariation,
    huePertubationSeedTree,
  }) => {
    if (numberOfIterations === 1) {
      drawFunction(
        triangle.drawInstructions({
          fillColour,
          outlineColour,
          outlineThickness,
        })
      );
      return;
    }
    const splitPoint = triangle.pointFromBarycentricCoordinates(
      barycentricCoordinates
    );
    const innerTriangles = triangle.splitFromInnerPoint(splitPoint);
    for (const [innerTriangle, childHuePertubationSeedTree] of zip(
      innerTriangles,
      huePertubationSeedTree.children
    )) {
      barycentricSplitTriangle({
        triangle: innerTriangle,
        barycentricCoordinates,
        numberOfIterations: numberOfIterations - 1,
        drawFunction,
        fillColour: fillColour?.perturbHue?.(
          hueVariation * huePertubationSeedTree.value
        ),
        outlineColour,
        outlineThickness,
        hueVariation,
        huePertubationSeedTree: childHuePertubationSeedTree,
      });
    }
  };

  const barycentricSplit = ({
    quadrilateral,
    barycentricCoordinates,
    colour,
    // colourSeed,
    hueVariation,
    showEdges,
    numberOfIterations,
    drawFunction,
  }) => {
    // console.log(barycentricCoordinates, quadrilateral);
    const innerCenterQuadrilateral = new OrientedPolygon(
      ...barycentricCoordinates.map(coords =>
        quadrilateral.pointFromBarycentricCoordinates(coords)
      )
    );
    const innerQuadrilaterals = [
      innerCenterQuadrilateral,
      ...zip(quadrilateral.sides, innerCenterQuadrilateral.sides).map(
        ([
          { startPoint: outerStart, endPoint: outerEnd },
          { startPoint: innerStart, endPoint: innerEnd },
        ]) => new OrientedPolygon(innerEnd, innerStart, outerStart, outerEnd)
      ),
    ];
    for (const innerQuadrilateral of innerQuadrilaterals) {
      // let subSeed = colourSeed.children[i];
      // let newColour = colour.perturbHue(hueVariation * subSeed.value);
      const newColour = white;
      if (numberOfIterations === 1) {
        drawFunction(
          innerQuadrilateral.drawInstructions({
            fillColour: newColour,
            outlineColour: showEdges ? black : newColour,
            outlineThickness: 1,
          })
        );
      } else
        barycentricSplit({
          quadrilateral: innerQuadrilateral,
          barycentricCoordinates,
          colour: newColour,
          // subSeed,
          hueVariation,
          showEdges,
          numberOfIterations: numberOfIterations - 1,
          drawFunction,
        });
    }
  };

  useEffect(() => {
    if (canvasRef.current === undefined) return;
    // canvasRef.current.clear();

    // if there are new sliders add their values

    const { depth, initialHue, hueVariation, outlineThickness } =
      processedSliderValues;

    canvasRef.current.clear();

    barycentricSplitTriangle({
      triangle: baseTriangle,
      numberOfIterations: depth,
      barycentricCoordinates: initialTriangleSplitPointBarycentricCoordinates,
      drawFunction: canvasRef.current.draw,
      fillColour: !checkboxValues.fillInterior
        ? undefined
        : new Colour({
            hue: initialHue,
            saturation: 100,
            lightness: 50,
          }),
      outlineColour: !checkboxValues.outlineEdges ? undefined : black,
      outlineThickness: !checkboxValues.outlineEdges
        ? undefined
        : outlineThickness,
      hueVariation,
      huePertubationSeedTree,
    });
    // barycentricSplit({
    //   quadrilateral: new OrientedPolygon(...basePolygonCorners),
    //   barycentricCoordinates,
    //   colour: white,
    //   // colourSeed,
    //   // hueVariation,
    //   showEdges: true,
    //   numberOfIterations: depth,
    //   drawFunction: canvasRef.current.draw,
    // });
  }, [
    canvasRef,
    unprocessedSliderValues,
    checkboxValues,
    basePolygonCorners,
    // innerPolygonCorners,
    initialTriangleSplitPoint,
  ]);

  const cursorPointerThresholdDistance = 10;

  const [grabbedCornerIndex, setGrabbedCornerIndex] = useState();
  const [grabbedCornerType, setGrabbedCornerType] = useState();

  const [grabbedBaseTriangleCornerIndex, setGrabbedBaseTriangleCornerIndex] =
    useState();
  const [grabbedPointType, setGrabbedPointType] = useState();

  const grabCorner = e => {
    const clickLocation = canvasRef.current.relativeMouseCoordinates(e);

    const distancesFromBaseCorners = basePolygonCorners.map(corner =>
      corner.distanceFrom(clickLocation)
    );
    const minDistanceFromBaseCorner = Math.min(...distancesFromBaseCorners);

    if (minDistanceFromBaseCorner <= cursorPointerThresholdDistance) {
      setGrabbedBaseTriangleCornerIndex(
        distancesFromBaseCorners.findIndex(equals(minDistanceFromBaseCorner))
      );
      setGrabbedPointType('triangleBaseCorner');
    } else if (
      initialTriangleSplitPoint.distanceFrom(clickLocation) <=
      cursorPointerThresholdDistance
    ) {
      setGrabbedBaseTriangleCornerIndex(undefined);
      setGrabbedPointType('initialTriangleSplitPoint');
    }
    // const clickLocation = canvasRef.current.relativeMouseCoordinates(e);

    // const distancesFromBaseCorners = basePolygonCorners.map(corner =>
    //   corner.distanceFrom(clickLocation)
    // );
    // const minDistanceFromBaseCorner = Math.min(...distancesFromBaseCorners);

    // const distancesFromInnerCorners = innerPolygonCorners.map(corner =>
    //   corner.distanceFrom(clickLocation)
    // );
    // const minDistanceFromInnerCorner = Math.min(...distancesFromInnerCorners);

    // if (minDistanceFromBaseCorner <= cursorPointerThresholdDistance) {
    //   setGrabbedCornerIndex(
    //     distancesFromBaseCorners.findIndex(equals(minDistanceFromBaseCorner))
    //   );
    //   setGrabbedCornerType('outer');
    // }
    // if (minDistanceFromInnerCorner <= cursorPointerThresholdDistance) {
    //   setGrabbedCornerIndex(
    //     distancesFromInnerCorners.findIndex(equals(minDistanceFromInnerCorner))
    //   );
    //   setGrabbedCornerType('inner');
    // }
  };

  const handleMouseMove = e => {
    const mouseLocation = canvasRef.current.relativeMouseCoordinates(e);
    // if (
    //   mouseLocation.x < -100 ||
    //   mouseLocation.y < -100 ||
    //   mouseLocation.x > canvasDimensions.width + 100 ||
    //   mouseLocation.y > canvasDimensions.height + 100
    // ) {
    //   releaseCorner();
    //   return;
    // }
    if (grabbedPointType === undefined) {
      // change cursor to a pointer or default depending on how close it is to a base polygon corner
      const distancesFromBaseCorners = basePolygonCorners.map(corner =>
        corner.distanceFrom(mouseLocation)
      );
      const minDistanceFromGrabbablePoint = Math.min(
        initialTriangleSplitPoint.distanceFrom(mouseLocation),
        ...distancesFromBaseCorners
      );
      canvasRef.current.setStyle(
        'cursor',
        minDistanceFromGrabbablePoint > cursorPointerThresholdDistance
          ? 'default'
          : 'pointer'
      );
    } else {
      const newCornerCoordinates =
        canvasRef.current.relativeMouseCoordinates(e);
      if (grabbedPointType === 'initialTriangleSplitPoint') {
        setInitialTriangleSplitPoint(newCornerCoordinates);
      } else if (grabbedPointType === 'triangleBaseCorner') {
        setBasePolygonCorners(
          update(grabbedBaseTriangleCornerIndex, newCornerCoordinates)
        );
      }
    }
    // if (grabbedCornerIndex === undefined) {
    //   // change cursor to a pointer or default depending on how close it is to a base polygon corner
    //   const mouseLocation = canvasRef.current.relativeMouseCoordinates(e);
    //   const distancesFromBaseAndInnerCorners = [
    //     ...basePolygonCorners,
    //     ...innerPolygonCorners,
    //   ].map(corner => corner.distanceFrom(mouseLocation));
    //   const minDistanceFromBaseOrInnerCorner = Math.min(
    //     ...distancesFromBaseAndInnerCorners
    //   );
    //   canvasRef.current.setStyle(
    //     'cursor',
    //     minDistanceFromBaseOrInnerCorner > cursorPointerThresholdDistance
    //       ? 'default'
    //       : 'pointer'
    //   );
    // } else {
    //   const newCornerCoordinates =
    //     canvasRef.current.relativeMouseCoordinates(e);
    //   (grabbedCornerType === 'outer'
    //     ? setBasePolygonCorners
    //     : setInnerPolygonCorners)(
    //     update(grabbedCornerIndex, newCornerCoordinates)
    //   );
    // }
  };

  const releaseCorner = () => {
    setGrabbedCornerIndex(undefined);
    setGrabbedPointType(undefined);
    setGrabbedBaseTriangleCornerIndex(undefined);
  };

  return (
    <div className='App'>
      <h1>SPLIT</h1>
      <main onMouseMove={handleMouseMove}>
        <div>
          <Canvas
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            style={{ border: '1px solid #000000' }}
            ref={canvasRef}
            onMouseDown={grabCorner}
            onMouseUp={releaseCorner}
          />
        </div>
        <div className='control-panel'>
          <label
            htmlFor='outlineEdgesCheckbox'
            className='checkbox-label'
          >
            Outline edges
            <input
              id='outlineEdgesCheckbox'
              type='checkbox'
              checked={checkboxValues.outlineEdges}
              onChange={handleCheckboxChange('outlineEdges')}
            />
          </label>
          <label
            htmlFor='fillInteriorCheckbox'
            className='checkbox-label'
          >
            Fill interior
            <input
              id='fillInteriorCheckbox'
              type='checkbox'
              checked={checkboxValues.fillInterior}
              onChange={handleCheckboxChange('fillInterior')}
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

export default BarycentricSplit;
