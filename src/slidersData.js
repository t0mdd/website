const broccoliSliders = ({ maxDepth, initialWidth, initialHeight }) => [
  {
    id: 'heightDecay',
    labelText: 'Height Decay',
    min: 300,
    max: 1000 - 1,
    initialValue: 463,
    valueProcessor: d => 1 - d / 1000,
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
  },
  {
    id: 'baseRatio',
    labelText: 'Altitude skew',
    min: 0,
    step: 1 / 1000,
    max: 1,
    initialValue: 0.637,
  },
  {
    id: 'depth',
    labelText: 'Depth:',
    min: 1,
    max: maxDepth,
    initialValue: 11,
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
  // {
  //   id: 'firstCornerX',
  //   labelText: 'First corner X',
  //   min: 0,
  //   max: initialWidth,
  //   initialValue: initialWidth / 2,
  // },
  // {
  //   id: 'firstCornerY',
  //   labelText: 'First corner Y',
  //   min: 0,
  //   max: initialHeight,
  //   initialValue: (initialHeight * 3) / 8,
  // },
  // {
  //   id: 'secondCornerX',
  //   labelText: 'Second corner X',
  //   min: 0,
  //   max: initialWidth,
  //   initialValue: (initialWidth * 3) / 8,
  // },
  // {
  //   id: 'secondCornerY',
  //   labelText: 'Second corner Y',
  //   min: 0,
  //   max: initialHeight,
  //   initialValue: (initialHeight * 5) / 8,
  // },
  // {
  //   id: 'thirdCornerX',
  //   labelText: 'Third corner X',
  //   min: 0,
  //   max: initialWidth,
  //   initialValue: (initialWidth * 5) / 8,
  // },
  // {
  //   id: 'thirdCornerY',
  //   labelText: 'Third corner Y',
  //   min: 0,
  //   max: initialHeight,
  //   initialValue: (initialHeight * 5) / 8,
  // },
];

const complexPolynomialSliders = [
  {
    id: 'speed',
    labelText: 'Speed',
    min: 0,
    max: 5,
    step: 1 / 100,
    initialValue: 1,
  },
  {
    id: 'thickness',
    labelText: 'Thickness',
    min: 1,
    max: 10,
    step: 1,
    initialValue: 2,
  },
  {
    id: 'maxDomainRadius',
    labelText: 'Max domain radius',
    min: 0,
    max: 10,
    step: 1 / 100,
    initialValue: 3,
  },
];

// {
//   id: ,
//   labelText: ,
//   min: ,
//   max: ,
//   step: ,
//   initialValue: ,
// },

export { broccoliSliders, complexPolynomialSliders };
