import { OrientedPolygon, OrientedTriangle, black } from './utils/utils';

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
      outlineColour: initialColour,
      outlineThickness: 0,
    })
  );
  const { corners, sides: initialBases } = initialPolygon;
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
    //   .baryPoint(baseRatio)
    //   .plus(upwardsUnitVector.scale(heightFunction(base.length)));
    const newQuadrilateral = alternateOrientation
      ? new OrientedPolygon(
          base.baryPoint(baseStartBaryCoord),
          base.baryPoint(baseEndBaryCoord),
          base
            .baryPoint(baseRatio2)
            .plus(upwardsUnitVector.scale(heightFunction2(base.length))),
          base
            .baryPoint(baseRatio1)
            .plus(upwardsUnitVector.scale(heightFunction1(base.length)))
        )
      : new OrientedPolygon(
          base.baryPoint(baseEndBaryCoord),
          base.baryPoint(baseStartBaryCoord),
          base
            .baryPoint(baseRatio1)
            .plus(upwardsUnitVector.scale(heightFunction1(base.length))),
          base
            .baryPoint(baseRatio2)
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

    // console.log(newBases.map(base => base.print));
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
      outlineColour: initialColour,
      outlineThickness: 0,
    })
  );
  const { corners, sides: initialBases } = initialTriangle;
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
      .baryPoint(baseRatio)
      .plus(upwardsUnitVector.scale(heightFunction(base.length)));
    const newTriangle = alternateOrientation
      ? new OrientedTriangle(
          base.baryPoint(baseStartBaryCoord),
          base.baryPoint(baseEndBaryCoord),
          thirdCorner
        )
      : new OrientedTriangle(
          base.baryPoint(baseEndBaryCoord),
          base.baryPoint(baseStartBaryCoord),
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

export { broccoli, broccoliQuad };
