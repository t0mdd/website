import { Point, Matrix, lineThroughPoints } from './math';
import { black } from './colours';
import { product, prop, sum, zip } from 'ramda';
import { rotateLeft, rotateRight, zipMany } from './arrays';

export class OrientedPolygon {
  //could extend to convexPolygon, then add area method
  constructor(...corners) {
    this.corners = corners;
  }

  get sides() {
    return zip(this.corners, rotateLeft(1, this.corners)).map(
      ([corner, nextCorner]) => new OrientedLineSegment(corner, nextCorner)
    );
  }

  // angles[i] = angle at corner i
  get angles() {
    return zip(rotateRight(1, this.sides), this.sides).map(
      ([incomingSide, outgoingSide]) =>
        outgoingSide.angleBetween(incomingSide.reverse())
    );
  }

  get minAngle() {
    return Math.min(...this.angles);
  }

  get perimeter() {
    return sum(this.sides.map(prop('length')));
  }

  // shift(k) {
  //   return new this.constructor(...rotateLeft(k, this.corners));
  // }

  reverse() {
    return new this.constructor(
      ...this.corners[0],
      ...this.corners.slice(1).toReversed()
    );
  }

  pointFromBarycentricCoordinates(weights) {
    // weights is an array of corners.length real numbers summing to 1
    // console.log(zip(this.corners, weights));
    return Point.sum(
      zip(this.corners, weights).map(([corner, weight]) => corner.scale(weight))
    );
  }

  boundaryContainsPoint(point) {
    return this.sides.some(side => side.containsPoint(point));
  }

  interiorContainsPoint(point) {
    //p is assumed to be convex
    return this.boundaryContainsPoint(point)
      ? false
      : zipMany(
          rotateRight(1, this.corners),
          this.corners,
          rotateLeft(1, this.corners)
        ).every(([previousCorner, currentCorner, nextCorner]) =>
          point
            .minus(currentCorner)
            .betweenVectors(
              nextCorner.minus(currentCorner),
              previousCorner.minus(currentCorner)
            )
        );
  }

  containsPoint(point) {
    return (
      this.boundaryContainsPoint(point) || this.interiorContainsPoint(point)
    );
  }

  drawInstructions({ fillColour, outlineColour, outlineThickness }) {
    return context => {
      context.beginPath();
      context.moveTo(this.corners[0].x, this.corners[0].y);
      this.corners.slice(1).forEach(({ x, y }) => context.lineTo(x, y));
      context.closePath();

      if (outlineColour || outlineThickness || fillColour) {
        context.lineWidth = outlineThickness ?? 1;
        context.strokeStyle = (outlineColour ?? fillColour ?? black).toString();
        context.stroke();
      }

      if (fillColour) {
        context.fillStyle = fillColour.toString();
        context.fill();
      }
    };
  }

  toString() {
    return this.corners.join('->');
  }
  /*
  split(line){
    //returns two regions with corner array elements starting and ending on the line
    const n = this.corners.length;
    const s = this.sides;
    const corners = this.corners;
    const augmentedCorners = corners.slice();
    const intersectionPoints = [];
    function isNew(p){
      return !intersectionPoints.map(point => point.equals(p)).reduce((equalsAny,current)=>equalsAny||current,false);
    }
    s.forEach(function(current){
      const p = current.lineIntersection(line);
      if(p && isNew(p))
        intersectionPoints.push(p);
    });
    function endpointIndicesOfSegmentsContaining(p){
      const result = [];
      s.forEach(function(current,index){
        if(current.containsPoint(p))
          result.push([index,(index+1)%n]);
      });
      return result;
    }
    const intersectionPointIndices = [];
    for(const i=0; i<2; i++){
      const p = intersectionPoints[i];
      const segs = endpointIndicesOfSegmentsContaining(p);
      const newIndex;
      if(segs.length === 1){
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

    const firstRegion = augmentedCorners.slice(intersectionPointIndices[0],intersectionPointIndices[1]+1);
    const secondRegionInitial = augmentedCorners.slice(intersectionPointIndices[1]);
    const secondRegionFinal = augmentedCorners.slice(0,intersectionPointIndices[0]+1);
    const secondRegion = secondRegionInitial.concat(secondRegionFinal);
    return [Reflect.construct(OrientedPolygon,firstRegion),Reflect.construct(OrientedPolygon,secondRegion)];
  }

  regionOpposite(line,point){
    const regions = this.split(line);
    if(line.sameSide(regions[0].corners[1],point))
      return regions[1];
    else
      return regions[0];
  }
  */
}

export class OrientedTriangle extends OrientedPolygon {
  get area() {
    const semiperimeter = this.perimeter / 2;
    return Math.sqrt(
      semiperimeter *
        product(this.sides.map(side => semiperimeter - side.length))
    );
  }
  get circumradius() {
    return product(this.sides.map(prop('length'))) / (4 * this.area);
  }
  get circumcentre() {
    const [{ x: Ax, y: Ay }, { x: Bx, y: By }, { x: Cx, y: Cy }] = this.corners;
    const D = 2 * (Ax * (By - Cy) + Bx * (Cy - Ay) + Cx * (Ay - By));
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
    return this.pointFromBarycentricCoordinates([1 / 3, 1 / 3, 1 / 3]);
  }

  get incentre() {
    return Point.sum(
      zip(this.corners, rotateLeft(1, this.sides)).map(
        ([corner, oppositeSide]) => corner.scale(oppositeSide.length)
      )
    ).scale(1 / this.perimeter);
  }

  get inradius() {
    const semiperimeter = this.perimeter / 2;
    return Math.sqrt(
      product(this.sides.map(side => semiperimeter - side.length)) /
        semiperimeter
    );
  }

  get incircle() {
    return new Circle(this.incentre, this.inradius);
  }

  get intriangle() {
    // ordered so that corner i of the intriangle lies on side i of the outer triangle
    return new OrientedTriangle(
      ...zip(this.sides, rotateRight(1, this.corners)).map(
        ([side, oppositeCorner]) =>
          this.incentre.plus(
            side.perpUnitVectorOpposite(oppositeCorner.scale(this.inradius))
          )
      )
    );
  }

  ratioTriangle(ratio) {
    return new OrientedTriangle(
      ...this.sides.map(side => side.pointFromBarycentricCoordinates(ratio))
    );
  }

  splitFromInnerPoint(innerPoint) {
    return this.sides.map(
      ({ startPoint, endPoint }) =>
        new OrientedTriangle(startPoint, innerPoint, endPoint)
    );
  }

  cartesianToBarycentric({ x, y }) {
    // lifted from wikipedia
    const [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }] = this.corners;

    const T = new Matrix(x1 - x3, x2 - x3, y1 - y3, y2 - y3);

    const { x: lambda1, y: lambda2 } = T.inverse().byVector(
      new Point(x - x3, y - y3)
    );
    return [lambda1, lambda2, 1 - lambda1 - lambda2];
  }
}

export class OrientedLineSegment {
  constructor(startPoint, endPoint) {
    Object.assign(this, { startPoint, endPoint });
  }
  get length() {
    return this.endPoint.minus(this.startPoint).length;
  }
  get directionVector() {
    return this.endPoint.minus(this.startPoint);
  }
  get containingLine() {
    return lineThroughPoints(this.startPoint, this.endPoint);
  }
  get midPoint() {
    return this.pointFromBarycentricCoordinates(0.5);
  }
  reverse() {
    return new OrientedLineSegment(this.endPoint, this.startPoint);
  }
  containsPoint(point) {
    if (point.equals(this.startPoint)) return true;
    const segmentVector = this.endPoint.minus(this.startPoint);
    const relativePointVector = point.minus(this.startPoint);
    if (relativePointVector.parallelWith(segmentVector)) {
      const m = relativePointVector.parallelMultiplier(segmentVector);
      return 0 <= m && m <= 1;
    } else return false;
  }
  lineIntersection(line) {
    const p = this.containingLine.lineIntersection(line);
    return p && this.containsPoint(p) ? p : false;
  }
  perpUnitVectorOpposite(point) {
    if (this.directionVector.length === 0) {
      // console.error(
      //   `perpUnitVectorOpposite called on zero length line segment: ${this}`
      // );
    }
    const segmentVector = this.directionVector;
    const perpUnitVector = segmentVector
      .scale(1 / segmentVector.length)
      .rotateAboutOrigin(Math.PI / 2);
    return !this.containingLine.sameSide(
      this.startPoint.plus(perpUnitVector),
      point
    )
      ? //startPoint isn't special, any point of the segment could have been used here to test if the right direction is used
        perpUnitVector
      : perpUnitVector.scale(-1);
  }
  pointFromBarycentricCoordinates(lambda) {
    return this.startPoint.scale(1 - lambda).plus(this.endPoint.scale(lambda));
  }
  angleBetween(otherSegment) {
    // try {
    if (!this.startPoint.equals(otherSegment.startPoint)) {
      // console.log(
      //   `SEGMENTS NOT BASED AT THE SAME POINT: ${this}.angleBetween(${otherSegment})`
      // );
    }
    // } catch (err) {
    //   console.error(
    //     err + ': ' + this.toString() + '.angleBetween(' + otherSegment.toString() + ')'
    //   );
    // }
    return this.directionVector.angleBetween(otherSegment.directionVector);
  }
  directedAngleBetween(otherSegment) {
    // try {
    if (!this.startPoint.equals(otherSegment.startPoint)) {
      // console.log(
      //   `SEGMENTS NOT BASED AT THE SAME POINT: ${this}.angleBetween(${otherSegment})`
      // );
    }
    // } catch (err) {
    //   console.error(
    //     err + ': ' + this.toString() + '.angleBetween(' + otherSegment.toString() + ')'
    //   );
    // }
    return this.directionVector.directedAngleBetween(
      otherSegment.directionVector
    );
  }
  drawInstructions({ colour = black, thickness = 1 }) {
    return context => {
      context.beginPath();
      context.moveTo(this.startPoint.x, this.startPoint.y);
      context.lineTo(this.endPoint.x, this.endPoint.y);
      context.lineWidth = thickness;
      context.strokeStyle = colour.toString();
      context.stroke();
    };
  }
  toString() {
    return `${this.startPoint}->${this.endPoint}`;
  }
}

export class Circle {
  constructor(centre, radius) {
    this.centre = centre;
    this.radius = radius;
  }
  get circumference() {
    return 2 * Math.PI * this.radius;
  }
  get area() {
    return Math.PI * this.radius ** 2;
  }
  drawInstructions({ fillColour, outlineColour, outlineThickness }) {
    return context => {
      context.beginPath();
      context.arc(
        this.centre.x,
        this.centre.y,
        this.radius,
        0,
        2 * Math.PI,
        true
      );
      context.lineWidth = outlineThickness;
      context.strokeStyle = outlineColour.toString();
      context.stroke();
      context.fillStyle = fillColour.toString();
      context.fill();
    };
  }
}
