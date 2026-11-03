import { describe, it, expect } from 'vitest';
import {
  closePane,
  computeLayout,
  createLayout,
  paneIds,
  setRatio,
  splitPane,
} from '../src/utils/layout.js';

/** Four panes: a | b on top of c | d, made by splitting like a user would. */
function grid() {
  let tree = createLayout('a');
  tree = splitPane(tree, 'a', 'column', 'c');
  tree = splitPane(tree, 'a', 'row', 'b');
  return splitPane(tree, 'c', 'row', 'd');
}

const area = ({ w, h }) => w * h;

describe('splitPane', () => {
  it('puts the new pane right of or below the split pane', () => {
    expect(paneIds(splitPane(createLayout('a'), 'a', 'row', 'b'))).toEqual(['a', 'b']);
    expect(paneIds(grid())).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns the same tree for an unknown pane', () => {
    const tree = grid();
    expect(splitPane(tree, 'x', 'row', 'e')).toBe(tree);
  });
});

describe('closePane', () => {
  it('lets the sibling take the area', () => {
    const tree = closePane(grid(), 'b');
    expect(paneIds(tree)).toEqual(['a', 'c', 'd']);
    const { panes } = computeLayout(tree);
    expect(panes.find((pane) => pane.id === 'a').rect).toEqual({ x: 0, y: 0, w: 1, h: 0.5 });
  });

  it('never closes the last pane', () => {
    const tree = createLayout('a');
    expect(closePane(tree, 'a')).toBe(tree);
  });

  it('keeps untouched subtrees as the same objects', () => {
    const tree = grid();
    expect(closePane(tree, 'd').children[0]).toBe(tree.children[0]);
  });
});

describe('setRatio', () => {
  it('moves a divider and clamps it', () => {
    const tree = splitPane(createLayout('a'), 'a', 'row', 'b');
    expect(setRatio(tree, tree.id, 0.3, 0.1).ratio).toBe(0.3);
    expect(setRatio(tree, tree.id, 0.01, 0.1).ratio).toBe(0.1);
    expect(setRatio(tree, tree.id, 2, 0.1).ratio).toBe(0.9);
  });

  it('returns the same tree when nothing changes', () => {
    const tree = grid();
    expect(setRatio(tree, 'no-such-split', 0.3, 0.1)).toBe(tree);
    expect(setRatio(tree, tree.id, 0.5, 0.1)).toBe(tree);
  });
});

describe('computeLayout', () => {
  it('tiles the whole area without overlap', () => {
    const { panes, dividers } = computeLayout(setRatio(grid(), 'split-c', 0.3, 0.1));
    expect(panes.map((pane) => pane.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(panes.reduce((sum, pane) => sum + area(pane.rect), 0)).toBeCloseTo(1);
    expect(panes.find((pane) => pane.id === 'c').rect).toEqual({ x: 0, y: 0.3, w: 0.5, h: 0.7 });
    expect(dividers).toHaveLength(3);
  });

  it('stacks every split on narrow screens', () => {
    const { panes, dividers } = computeLayout(grid(), { stacked: true });
    expect(panes.every((pane) => pane.rect.x === 0 && pane.rect.w === 1)).toBe(true);
    expect(dividers.every((divider) => divider.direction === 'column')).toBe(true);
    expect(panes.reduce((sum, pane) => sum + area(pane.rect), 0)).toBeCloseTo(1);
  });
});
