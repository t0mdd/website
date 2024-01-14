import * as R from '../../node_modules/ramda/dist/ramda.js';

function almostEqual(x, y) {
  //gaffa tape for dealing with floating point rounding errors
  return Math.abs(x - y) < Math.pow(10, -12);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

class Colour {
  constructor({ hue, saturation, lightness, opacity }) {
    Object.assign(this, { hue, saturation, lightness, opacity });
  }

  get print() {
    return `hsl(${this.hue}, ${this.saturation}%,${this.lightness}%)`;
  }

  perturbHue(amount) {
    return new Colour({ ...this, hue: this.hue + amount });
  }

  randomHuePerturbation(size) {
    return this.perturbHue(2 * (Math.random() - 0.5) * size);
  }
}

const black = new Colour({ hue: 0, saturation: 0, lightness: 0, opacity: 1 });
const white = new Colour({
  hue: 0,
  saturation: 100,
  lightness: 100,
  opacity: 1,
});
const red = new Colour({ hue: 0, saturation: 100, lightness: 50, opacity: 1 });
const blue = new Colour({
  hue: 240,
  saturation: 100,
  lightness: 50,
  opacity: 1,
});
const purple = new Colour({
  hue: 300,
  saturation: 100,
  lightness: 50,
  opacity: 1,
});

class Canvas {
  constructor({ width, height, id }) {
    const element = Object.assign(document.createElement('canvas'), {
      id,
      width,
      height,
      style: 'border:1px solid #000000',
    });

    Object.assign(this, { element, context: element.getContext('2d') });
  }

  setWidth(newWidth) {
    this.element.width = newWidth;
  }

  setHeight(newHeight) {
    this.element.height = newHeight;
  }

  get centre() {
    return new Point(
      parseInt(this.element.width) / 2,
      parseInt(this.element.height) / 2
    );
  }

  get corners() {
    return [
      new Point(0, 0),
      new Point(this.element.width, 0),
      new Point(this.element.width, this.element.height),
      new Point(0, this.element.height),
    ];
  }

  splitIntoTriangles(splitCentre) {
    let c = this.element.corners;
    return c.map(
      (corner, index) =>
        new OrientedTriangle(corner, c[(index + 1) % 4], splitCentre)
    );
  }

  clear() {
    this.context.clearRect(0, 0, this.element.width, this.element.height);
  }
}

class LabelledSlider {
  constructor({
    id,
    className,
    labelText,
    min,
    step = 1,
    max,
    initialValue,
    valueProcessor = R.identity,
    onChange = () => {},
  }) {
    const labelElement = Object.assign(document.createElement('label'), {
      htmlFor: id,
      textContent: labelText,
    });

    const sliderElement = Object.assign(document.createElement('input'), {
      id,
      type: 'range',
      min,
      step,
      max,
      value: initialValue,
      className,
    });

    sliderElement.addEventListener('input', e => {
      this.value = +e.target.value;
      onChange(e);
    });

    Object.assign(this, {
      id,
      min,
      value: initialValue,
      max,
      step,
      labelText,
      sliderElement,
      labelElement,
      valueProcessor,
    });
  }

  set(prop, value) {
    if (prop === 'id') {
      this.id = this.labelElement.htmlFor = this.sliderElement.id = value;
    }
    if (prop === 'labelText') {
      this.labelText = this.labelElement.textContent = value;
    } else {
      this[prop] = this.sliderElement[prop] = value;
    }
  }

  #range() {
    return this.max - this.min;
  }

  get processedValue() {
    //console.log('value', this.value);
    return this.valueProcessor(this.value);
  }

  setRandomValue() {
    const randomSteps = Math.random() * (this.#range() / this.step + 1);
    this.value = this.slider.value = Math.floor(
      this.min + this.step * randomSteps
    );
  }

  appendToParent(parent) {
    parent.append(this.labelElement, this.sliderElement);
  }
}

class OrientedPolygon {
  //could extend to convexPolygon, then add area method
  constructor(...corners) {
    this.corners = corners;
  }

  get print() {
    return this.corners
      .map(c => c.print + '->')
      .reduce((total, current) => total + current)
      .slice(0, -2);
  }

  get numberOfCorners() {
    return this.corners.length;
  }

  get sides() {
    const { corners } = this;
    const nextCorners = [...corners.slice(1), corners[0]];
    return R.zip(corners, nextCorners).map(
      ([corner, nextCorner]) => new OrientedLineSegment(corner, nextCorner)
    );
  }

  get sideLengths() {
    return this.sides.map(side => side.length);
  }

  get angles() {
    let s = this.sides;
    let n = this.numberOfCorners;
    return s.map((side, index) =>
      side.angleBetween(s[(index + n - 1) % n].reverse)
    );
  }

  get minAngle() {
    return Math.min.apply(null, this.angles);
  }

  get perimeter() {
    return this.sides.reduce(
      (total, currentSide) => total + currentSide.length,
      0
    );
  }

  get reverse() {
    let c = this.corners;
    let newCorners = [c[0]].concat(c.slice(1).reverse());
    if (this.numberOfCorners == 3)
      return Reflect.construct(OrientedTriangle, newCorners);
    else return Reflect.construct(OrientedPolygon, newCorners);
  }

  shift(k) {
    let c = this.corners;
    let K = mod(k, this.numberOfCorners);
    return Reflect.construct(OrientedPolygon, c.slice(K).concat(c.slice(0, K)));
  }

  baryPoint(weights) {
    //weights is an array of numberOfCorners real numbers adding to 1
    let result = origin;
    for (let i = 0; i < this.numberOfCorners; i++)
      result = result.plus(this.corners[i].scale(weights[i]));
    return result;
  }

  boundaryContainsPoint(p) {
    this.sides
      .map(s => s.containsPoint(p))
      .reduce((total, current) => total || current, false);
  }

  interiorContainsPoint(p) {
    //p is assumed to be convex
    if (this.boundaryContainsPoint(p)) return false;
    else {
      let c = this.corners;
      let n = this.numberOfCorners;
      return c
        .map((current, i) =>
          p
            .minus(current)
            .between(
              c[mod(i + 1, n)].minus(current),
              c[mod(i - 1, n)].minus(current)
            )
        )
        .reduce((total, current) => total && current, true);
    }
  }

  drawInstructions({ fillColour, outlineColour, outlineThickness }) {
    return context => {
      // the polygon
      context.beginPath();
      context.moveTo(this.corners[0].x, this.corners[0].y);
      for (let i = 1; i < this.numberOfCorners; i++)
        context.lineTo(this.corners[i].x, this.corners[i].y);
      context.closePath();

      // the outline
      context.lineWidth = outlineThickness;
      context.strokeStyle = outlineColour.print;
      context.stroke();

      // the fill color
      context.fillStyle = fillColour.print;
      context.fill();
    };
  }
  /*
  split(line){
    //returns two regions with corner array elements starting and ending on the line
    let n = this.numberOfCorners;
    let s = this.sides;
    let corners = this.corners;
    let augmentedCorners = corners.slice();
    let intersectionPoints = [];
    function isNew(p){
      return !intersectionPoints.map(point => point.equals(p)).reduce((equalsAny,current)=>equalsAny||current,false);
    }
    s.forEach(function(current){
      let p = current.lineIntersection(line);
      if(p && isNew(p))
        intersectionPoints.push(p);
    });
    function endpointIndicesOfSegmentsContaining(p){
      let result = [];
      s.forEach(function(current,index){
        if(current.containsPoint(p))
          result.push([index,(index+1)%n]);
      });
      return result;
    }
    let intersectionPointIndices = [];
    for(let i=0; i<2; i++){
      let p = intersectionPoints[i];
      let segs = endpointIndicesOfSegmentsContaining(p);
      let newIndex;
      if(segs.length == 1){
        newIndex = segs[0][0]+1+i;
        if(newIndex < augmentedCorners.length)
          augmentedCorners.splice(newIndex,0,p);
        else
          augmentedCorners.push(p);
      }
      else{
        newIndex = segs[0][1] + i;
      }
      intersectionPointIndices.push(newIndex);
    }

    let firstRegion = augmentedCorners.slice(intersectionPointIndices[0],intersectionPointIndices[1]+1);
    let secondRegionInitial = augmentedCorners.slice(intersectionPointIndices[1]);
    let secondRegionFinal = augmentedCorners.slice(0,intersectionPointIndices[0]+1);
    let secondRegion = secondRegionInitial.concat(secondRegionFinal);
    return [Reflect.construct(OrientedPolygon,firstRegion),Reflect.construct(OrientedPolygon,secondRegion)];
  }

  regionOpposite(line,point){
    let regions = this.split(line);
    if(line.sameSide(regions[0].corners[1],point))
      return regions[1];
    else
      return regions[0];
  }
  */
}

class OrientedTriangle extends OrientedPolygon {
  get area() {
    const [s0, s1, s2] = this.sides;
    const sp = this.perimeter / 2;
    return Math.sqrt(
      sp * (sp - s0.length) * (sp - s1.length) * (sp - s2.length)
    );
  }
  get circumradius() {
    let s = this.sideLengths;
    return (s[0] * s[1] * s[2]) / (4 * this.area);
  }
  get circumcentre() {
    const [{ x: Ax, y: Ay }, { x: Bx, y: By }, { x: Cx, y: Cy }] = this.corners;
    let D = 2 * (Ax * (By - Cy) + Bx * (Cy - Ay) + Cx * (Ay - By));
    return new Point(
      ((Ax * Ax + Ay * Ay) * (By - Cy) +
        (Bx * Bx + By * By) * (Cy - Ay) +
        (Cx * Cx + Cy * Cy) * (Ay - By)) /
        D,
      ((Ax * Ax + Ay * Ay) * (Cx - Bx) +
        (Bx * Bx + By * By) * (Ax - Cx) +
        (Cx * Cx + Cy * Cy) * (Bx - Ax)) /
        D
    );
  }

  get circumcircle() {
    return new Circle(this.circumcentre, this.circumradius);
  }

  get centroid() {
    return this.baryPoint([1 / 3, 1 / 3, 1 / 3]);
  }

  get incentre() {
    let c = this.corners;
    let s = this.sideLengths;
    return c[0]
      .scale(s[1])
      .plus(c[1].scale(s[2]))
      .plus(c[2].scale(s[0]))
      .scale(1 / (s[0] + s[1] + s[2]));
  }

  get inradius() {
    let s = this.sideLengths;
    let sp = (s[0] + s[1] + s[2]) / 2; //semiperimeter
    return Math.sqrt(((sp - s[0]) * (sp - s[1]) * (sp - s[2])) / sp);
  }

  get incircle() {
    return new Circle(this.incentre, this.inradius);
  }

  get intriangle() {
    //corner i of the intriangle lies on side i of the outer triangle
    let c = this.corners;
    let k = this.incentre;
    let r = this.inradius;
    return Reflect.construct(
      OrientedTriangle,
      this.sides.map((current, index) =>
        k.plus(current.perpUnitVectorOpposite(c[(index + 2) % 3]).scale(r))
      )
    );
  }

  ratioTriangle(ratio) {
    return Reflect.construct(
      OrientedTriangle,
      this.sides.map(current => current.baryPoint(ratio))
    );
  }

  splitFromInnerPoint(p) {
    let c = this.corners;
    return c.map(
      (current, index) => new OrientedTriangle(current, c[(index + 1) % 3], p)
    );
  }
}

const notEqualTo = R.complement(R.equals);

class ComplexPolynomial {
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
      .reduce((sum, nextTerm) => sum.plus(nextTerm), origin);
  }
  toString() {
    return this.coefficients.every(R.equals(0))
      ? '0'
      : this.coefficients
          .map((coefficient, index) =>
            coefficient === 0
              ? ''
              : index === 0
              ? coefficient
              : `${coefficient !== 1 ? coefficient : ''}z${
                  index !== 1 ? `^${index}` : ''
                }`
          )
          .filter(notEqualTo(''))
          .toReversed()
          .join(' + ');
  }
}

// const pointFromPolarCoordinates = ({ r, theta }) =>
//   new Point(r * Math.cos(theta), r * Math.sin(theta));

class Point {
  constructor(x, y) {
    Object.assign(this, { x, y });
  }
  static fromPolarCoordinates = ({ r, theta }) =>
    new Point(r * Math.cos(theta), r * Math.sin(theta));

  static fromRealNumber = r => new Point(r, 0);

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
      : this.by(this.power((n > 0 ? R.subtract : R.add)(n, 1)));
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
  between(p, q) {
    return almostEqual(
      q.angleBetween(p),
      this.angleBetween(p) + q.angleBetween(this)
    );
  }
  get length() {
    const { x, y } = this;
    return Math.sqrt(x ** 2 + y ** 2);
  }
  get print() {
    return '(' + this.x + ',' + this.y + ')';
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
    if (x !== 0) return this.x / x;
    else return this.y / y;
  }
  distanceFrom(otherPoint) {
    return this.minus(otherPoint).length;
  }
  manhattanDistanceFrom(otherPoint) {
    let difference = this.minus(otherPoint);
    return Math.abs(difference.x) + Math.abs(difference.y);
  }
  hausdorffDistanceFrom(otherPoint) {
    let difference = this.minus(otherPoint);
    return Math.max(Math.abs(difference.x), Math.abs(difference.y));
  }
  drawInstructions({ colour }) {
    return context => {
      context.beginPath();
      context.arc(this.x, this.y, 1, 0, 2 * Math.PI, true);
      context.fillStyle = colour.print;
      context.fill();
    };
  }
}

const origin = new Point(0, 0);

function sameSign(x, y) {
  try {
    if (isNaN(x) || isNaN(y)) throw 'NON-REAL ARGUMENTS GIVEN';
    else if (x === 0 || y === 0) throw 'ZERO GIVEN';
  } catch (err) {
    console.error(err + ': sameSign(' + x + ',' + y + ')');
  }
  return x * y > 0;
}

class Line {
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
    let coeffMatrix = new Matrix(this.a, this.b, otherLine.a, otherLine.b);
    if (coeffMatrix.determinant != 0) {
      return coeffMatrix.inverse.byVector(new Point(-this.c, -otherLine.c));
    } else {
      return false;
    }
  }
}

function lineThroughPoints({ x: s, y: t }, { x: u, y: v }) {
  if (s === u) {
    //eqn is x=s
    return new Line({ a: -1, b: 0, c: s });
  } else {
    //eqn is y=mx+c
    let m = (t - v) / (s - u);
    let c = t - m * s;
    return new Line({ a: m, b: -1, c });
  }
}

class OrientedLineSegment {
  constructor(startPoint, endPoint) {
    Object.assign(this, { startPoint, endPoint });
  }
  get print() {
    return this.startPoint.print + '->' + this.endPoint.print;
  }
  get length() {
    return this.endPoint.minus(this.startPoint).length;
  }
  get reverse() {
    return new OrientedLineSegment(this.endPoint, this.startPoint);
  }
  get directionVector() {
    return this.endPoint.minus(this.startPoint);
  }
  get containingLine() {
    return lineThroughPoints(this.startPoint, this.endPoint);
  }
  containsPoint(point) {
    if (point.equals(this.startPoint)) return true;
    let segmentVector = this.endPoint.minus(this.startPoint);
    let relativePointVector = point.minus(this.startPoint);
    if (relativePointVector.parallelWith(segmentVector)) {
      let m = relativePointVector.parallelMultiplier(segmentVector);
      return 0 <= m && m <= 1;
    } else return false;
  }
  lineIntersection(line) {
    let p = this.containingLine.lineIntersection(line);
    if (p && this.containsPoint(p)) return p;
    else return false;
  }
  perpUnitVectorOpposite(opp) {
    const segmentVector = this.directionVector;
    let perpUnitVector = segmentVector
      .scale(1 / segmentVector.length)
      .rotateAboutOrigin(Math.PI / 2);

    if (
      !this.containingLine.sameSide(this.startPoint.plus(perpUnitVector), opp)
    )
      //startPoint isn't special, any point of the segment could have been used here to test if the right direction is used
      return perpUnitVector;
    else return perpUnitVector.scale(-1);
  }
  baryPoint(lambda) {
    return this.startPoint.scale(1 - lambda).plus(this.endPoint.scale(lambda));
  }
  get midPoint() {
    return this.baryPoint(0.5);
  }
  angleBetween(otherSegment) {
    try {
      if (!this.startPoint.equals(otherSegment.startPoint))
        throw 'SEGMENTS NOT BASED AT THE SAME POINT';
    } catch (err) {
      console.error(
        err + ': ' + this.print + '.angleBetween(' + otherSegment.print + ')'
      );
    }
    return this.directionVector.angleBetween(otherSegment.directionVector);
  }
  drawInstructions({ colour = black, thickness = 1 }) {
    return context => {
      context.beginPath();
      context.moveTo(this.startPoint.x, this.startPoint.y);
      context.lineTo(this.endPoint.x, this.endPoint.y);
      context.lineWidth = thickness;
      context.strokeStyle = colour.print;
      context.stroke();
    };
  }
}

class Circle {
  constructor(centre, radius) {
    this.centre = centre;
    this.radius = radius;
  }
  drawInstructions({ fillColour, outlineColour, outlineThickness }) {
    return context => {
      let c = this.centre;
      context.beginPath();
      context.arc(c.x, c.y, this.radius, 0, 2 * Math.PI, true);
      context.lineWidth = outlineThickness;
      context.strokeStyle = outlineColour.print;
      context.stroke();
      context.fillStyle = fillColour.print;
      context.fill();
    };
  }
}
class Matrix {
  constructor(a, b, c, d) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
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
  get inverse() {
    let intermediate = new Matrix(this.d, -this.b, -this.c, this.a);
    return intermediate.scale(1 / this.determinant);
  }
}
export {
  Canvas,
  LabelledSlider,
  OrientedPolygon,
  OrientedTriangle,
  OrientedLineSegment,
  Point,
  Colour,
  ComplexPolynomial,
  black,
  white,
  red,
  blue,
  purple,
  mod,
};
