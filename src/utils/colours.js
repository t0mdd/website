export class Colour {
  constructor({ hue, saturation, lightness, opacity }) {
    Object.assign(this, { hue, saturation, lightness, opacity });
  }

  toString() {
    return `hsl(${this.hue}, ${this.saturation}%,${this.lightness}%)`;
  }

  perturbHue(amount) {
    return new Colour({ ...this, hue: this.hue + amount });
  }

  randomHuePerturbation(size) {
    return this.perturbHue(2 * (Math.random() - 0.5) * size);
  }
}

export const black = new Colour({
  hue: 0,
  saturation: 0,
  lightness: 0,
  opacity: 1,
});
export const white = new Colour({
  hue: 0,
  saturation: 100,
  lightness: 100,
  opacity: 1,
});
export const red = new Colour({
  hue: 0,
  saturation: 100,
  lightness: 50,
  opacity: 1,
});
export const yellow = new Colour({
  hue: 60,
  saturation: 100,
  lightness: 50,
  opacity: 1,
});
export const green = new Colour({
  hue: 120,
  saturation: 100,
  lightness: 50,
  opacity: 1,
});
export const orange = new Colour({
  hue: 30,
  saturation: 100,
  lightness: 50,
  opacity: 1,
});
export const blue = new Colour({
  hue: 240,
  saturation: 100,
  lightness: 50,
  opacity: 1,
});
export const purple = new Colour({
  hue: 300,
  saturation: 100,
  lightness: 50,
  opacity: 1,
});

export const toColour = {
  red,
  orange,
  yellow,
  green,
  blue,
  purple,
  black,
  white,
};
