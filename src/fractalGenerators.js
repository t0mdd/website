import { OrientedTriangle, black } from './utils/utils';

const broccoli = ({
  initialTriangle,
  baseStartBaryCoord,
  baseEndBaryCoord,
  heightFunction,
  initialColour,
  colourFunction,
  baseRatio,
  outlineEdges,
  iterations,
  drawFunction,
}) => {
  drawFunction(
    initialTriangle.drawInstructions({
      fillColour: initialColour,
      outlineColour: initialColour,
      outlineThickness: 0,
    })
  );
  const { corners, sides: initialBases } = initialTriangle;
  const upwardsUnitVectors = initialBases.map((base, index) =>
    base.perpUnitVectorOpposite(corners[(index + 2) % 3])
  );

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
    const newTriangle = new OrientedTriangle(
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
    const newBases = newTriangle.sides.slice(1);
    const newUpwardsUnitVectors = [
      newBases[0].perpUnitVectorOpposite(base.endPoint),
      newBases[1].perpUnitVectorOpposite(base.startPoint),
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

export { broccoli };
