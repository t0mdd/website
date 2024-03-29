import * as R from 'ramda/dist/ramda.js';
import { Point } from './math.js';
import { OrientedTriangle } from './shapes.js';

export class Canvas {
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
    const c = this.element.corners;
    return c.map(
      (corner, index) =>
        new OrientedTriangle(corner, c[(index + 1) % 4], splitCentre)
    );
  }

  clear() {
    this.context.clearRect(0, 0, this.element.width, this.element.height);
  }
}

export class LabelledSlider {
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
    } else if (prop === 'labelText') {
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
