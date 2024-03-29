import {
  equals,
  complement,
  subtract,
  add,
} from '../../node_modules/ramda/dist/ramda.js';

export const notEqualTo = complement(equals);

//for dealing with floating point rounding errors
export const almostEqual = (x, y) => Math.abs(x - y) < Math.pow(10, -12);

export const sameSign = (x, y) => {
  try {
    if (isNaN(x) || isNaN(y)) throw 'NON-REAL ARGUMENTS GIVEN';
    else if (x === 0 || y === 0) throw 'ZERO GIVEN';
  } catch (err) {
    console.error(err + ': sameSign(' + x + ',' + y + ')');
  }
  return x * y > 0;
};

export class Point {
  constructor(x, y) {
    Object.assign(this, { x, y });
  }

  static origin = new Point(0, 0);

  static fromPolarCoordinates = ({ r, theta }) =>
    new Point(r * Math.cos(theta), r * Math.sin(theta));

  static fromRealNumber = r => new Point(r, 0);

  static sum = points =>
    points.reduce(
      (partialSum, nextPoint) => partialSum.plus(nextPoint),
      Point.origin
    );

  get length() {
    return Math.hypot(this.x, this.y);
  }

  plus({ x, y }) {
    return new Point(this.x + x, this.y + y);
  }
  by({ x, y }) {
    //complex multiplication
    return new Point(this.x * x - this.y * y, this.x * y + this.y * x);
  }
  power(n) {
    //complex exponential (integers only)
    return n === 0
      ? new Point(1, 0)
      : this.by(this.power((n > 0 ? subtract : add)(n, 1)));
  }
  scale(factor) {
    return new Point(factor * this.x, factor * this.y);
  }
  minus({ x, y }) {
    return new Point(this.x - x, this.y - y);
  }
  dot({ x, y }) {
    return this.x * x + this.y * y;
  }
  det({ x, y }) {
    return this.x * y - this.y * x;
  }
  equals({ x, y }) {
    return this.x === x && this.y === y;
  }
  rotateAboutOrigin(theta) {
    return new Point(
      this.x * Math.cos(theta) - this.y * Math.sin(theta),
      this.x * Math.sin(theta) + this.y * Math.cos(theta)
    );
  }
  rotateAbout(centre, theta) {
    return this.minus(centre).rotateAboutOrigin(theta).plus(centre);
  }
  angleBetween(otherPoint) {
    return Math.acos(this.dot(otherPoint) / (this.length * otherPoint.length));
  }
  directedAngleBetween(otherPoint) {
    return Math.atan2(this.det(otherPoint), this.dot(otherPoint));
  }
  betweenVectors(p, q) {
    return almostEqual(
      q.angleBetween(p),
      this.angleBetween(p) + q.angleBetween(this)
    );
  }
  parallelWith({ x, y }) {
    return this.x === 0 && this.y === 0
      ? false
      : x !== 0 && y !== 0
      ? this.x / x === this.y / y
      : x !== 0
      ? this.y === 0
      : y !== 0
      ? this.x === 0
      : false;
  }
  parallelMultiplier({ x, y }) {
    return x !== 0 ? this.x / x : this.y / y;
  }
  distanceFrom(otherPoint) {
    return this.minus(otherPoint).length;
  }
  manhattanDistanceFrom(otherPoint) {
    const difference = this.minus(otherPoint);
    return Math.abs(difference.x) + Math.abs(difference.y);
  }
  hausdorffDistanceFrom(otherPoint) {
    const difference = this.minus(otherPoint);
    return Math.max(Math.abs(difference.x), Math.abs(difference.y));
  }
  drawInstructions({ colour }) {
    return context => {
      context.beginPath();
      context.arc(this.x, this.y, 1, 0, 2 * Math.PI, true);
      context.fillStyle = colour.toString();
      context.fill();
    };
  }
  toString() {
    return `(${this.x},${this.y})`;
  }
}

export class ComplexPolynomial {
  constructor(...coefficients) {
    this.coefficients = coefficients;
  }
  evaluateAt(complexNumber) {
    return this.coefficients
      .map((coefficient, index) =>
        (typeof complexNumber === 'number'
          ? Point.fromRealNumber(complexNumber)
          : complexNumber
        )
          .power(index)
          .scale(coefficient)
      )
      .reduce((sum, nextTerm) => sum.plus(nextTerm), Point.origin);
  }
  toString() {
    return this.coefficients.every(equals(0))
      ? '0'
      : this.coefficients
          .map((coefficient, index) =>
            coefficient === 0
              ? ''
              : index === 0
              ? coefficient
              : `${
                  coefficient === -1
                    ? '-'
                    : coefficient === 1
                    ? ''
                    : coefficient
                }z${index !== 1 ? `^${index}` : ''}`
          )
          .filter(notEqualTo(''))
          .toReversed()
          .reduce(
            (acc, term) =>
              acc === ''
                ? term
                : term[0] === '-'
                ? `${acc} - ${term.slice(1)}`
                : `${acc} + ${term}`,
            ''
          );
  }
}

export class Line {
  //0,0,0 does not represent a line
  constructor({ a, b, c }) {
    Object.assign(
      this,
      b !== 0 ? { a: -a / b, b: -1, c: -c / b } : { a: -1, b: 0, c: -c / a }
    );
  }
  sameSide({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    return this.b === -1
      ? sameSign(this.a * x1 - y1 + this.c, this.a * x2 - y2 + this.c)
      : sameSign(this.a * x1 + this.c, this.a * x2 + this.c);
  }
  lineIntersection({ otherLine }) {
    const coeffMatrix = new Matrix(this.a, this.b, otherLine.a, otherLine.b);
    return coeffMatrix.determinant != 0
      ? coeffMatrix.inverse().byVector(new Point(-this.c, -otherLine.c))
      : false;
  }
  toString() {
    return `${this.a}x + ${this.b}y + ${this.c} = 0`;
  }
}

export const lineThroughPoints = ({ x: s, y: t }, { x: u, y: v }) => {
  if (s === u) {
    //eqn is x=s
    return new Line({ a: -1, b: 0, c: s });
  } else {
    //eqn is y=mx+c
    const m = (t - v) / (s - u);
    const c = t - m * s;
    return new Line({ a: m, b: -1, c });
  }
};

export class Matrix {
  constructor(a, b, c, d) {
    Object.assign(this, { a, b, c, d });
  }
  get rowVectors() {
    return [new Point(this.a, this.b), new Point(this.c, this.d)];
  }
  get columnVectors() {
    return [new Point(this.a, this.c), new Point(this.b, this.d)];
  }
  get determinant() {
    return this.a * this.d - this.b * this.c;
  }
  inverse() {
    return new Matrix(this.d, -this.b, -this.c, this.a).scale(
      1 / this.determinant
    );
  }
  byVector(point) {
    return new Point(
      this.rowVectors[0].dot(point),
      this.rowVectors[1].dot(point)
    );
  }
  scale(factor) {
    return new Matrix(
      this.a * factor,
      this.b * factor,
      this.c * factor,
      this.d * factor
    );
  }
  toString() {
    return `${this.a}${this.b}\n${this.c}${this.d}`;
  }
}
