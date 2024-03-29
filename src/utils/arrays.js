import {
  append,
  curry,
  flatten,
  mathMod,
  pipe,
  repeat,
  reverse,
  splitAt,
  zipWith,
} from 'ramda';

export const rotateLeft = curry((numberOfPlaces, array) =>
  pipe(splitAt(mathMod(numberOfPlaces, array.length)), reverse, flatten)(array)
);

export const rotateRight = curry((numberOfPlaces, array) =>
  pipe(
    splitAt(array.length - mathMod(numberOfPlaces, array.length)),
    reverse,
    flatten
  )(array)
);

export const zipMany = (...arrays) =>
  arrays.reduce(
    (partiallyZipped, nextArray) => zipWith(append, nextArray, partiallyZipped),
    repeat([], arrays[0].length)
  );
