import { range } from 'ramda';

export class Tree {
  constructor({ value, children } = {}) {
    Object.assign(this, { value, children });
  }

  static make = ({ depth, childrenPerNode, nodeValue }) => {
    return new Tree({
      value: nodeValue instanceof Function ? nodeValue({ depth }) : nodeValue,
      children:
        depth === 1
          ? undefined
          : range(0, childrenPerNode).map(() =>
              Tree.make({ depth: depth - 1, childrenPerNode, nodeValue })
            ),
    });
  };

  map(f) {
    return new Tree({
      value: f(this.value),
      children: this?.children?.map(child => child.map(f)),
    });
  }
}
