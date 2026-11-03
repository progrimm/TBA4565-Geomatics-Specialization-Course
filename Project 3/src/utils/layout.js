// Tiled pane layout, like a tiling terminal (Terminator): a binary tree whose leaves are
// panes and whose inner nodes split their area in two. Pure functions; every change
// returns a new tree, so React sees a new value.

/**
 * @typedef {{type: 'pane', id: string}} PaneNode
 * @typedef {{type: 'split', id: string, direction: 'row' | 'column', ratio: number,
 *   children: [LayoutNode, LayoutNode]}} SplitNode
 *   row = side by side (the first child left), column = stacked (the first child on top);
 *   ratio = the first child's share of the split's size.
 * @typedef {PaneNode | SplitNode} LayoutNode
 * @typedef {{x: number, y: number, w: number, h: number}} Rect - fractions of the whole area.
 */

/**
 * A layout with one pane.
 * @param {string} paneId
 * @returns {PaneNode}
 */
export function createLayout(paneId) {
  return { type: 'pane', id: paneId };
}

/**
 * Pane ids in reading order (depth first, first child first).
 * @param {LayoutNode} node
 * @returns {string[]}
 */
export function paneIds(node) {
  return node.type === 'pane' ? [node.id] : node.children.flatMap(paneIds);
}

/**
 * Split a pane in two; the new pane goes right of it (row) or below it (column).
 * @param {LayoutNode} node
 * @param {string} paneId - the pane to split.
 * @param {'row' | 'column'} direction
 * @param {string} newId - id of the new pane (must be unused).
 * @returns {LayoutNode} the same tree if paneId is not in it.
 */
export function splitPane(node, paneId, direction, newId) {
  if (node.type === 'pane') {
    if (node.id !== paneId) return node;
    return {
      type: 'split',
      id: `split-${newId}`,
      direction,
      ratio: 0.5,
      children: [node, createLayout(newId)],
    };
  }
  const children = node.children.map((child) => splitPane(child, paneId, direction, newId));
  return children.every((child, i) => child === node.children[i]) ? node : { ...node, children };
}

/**
 * Close a pane: its sibling takes the whole area of their split.
 * @param {LayoutNode} node
 * @param {string} paneId
 * @returns {LayoutNode} the same tree if paneId is not in it or is the last pane.
 */
export function closePane(node, paneId) {
  if (node.type === 'pane') return node;
  const index = node.children.findIndex((child) => child.type === 'pane' && child.id === paneId);
  if (index !== -1) return node.children[1 - index];
  const children = node.children.map((child) => closePane(child, paneId));
  return children.every((child, i) => child === node.children[i]) ? node : { ...node, children };
}

/**
 * Move a divider.
 * @param {LayoutNode} node
 * @param {string} splitId
 * @param {number} ratio - the first child's share, clamped to [minFraction, 1 − minFraction].
 * @param {number} minFraction - smallest share either side of a split may get.
 * @returns {LayoutNode}
 */
export function setRatio(node, splitId, ratio, minFraction) {
  if (node.type === 'pane') return node;
  if (node.id === splitId) {
    const clamped = Math.min(1 - minFraction, Math.max(minFraction, ratio));
    return clamped === node.ratio ? node : { ...node, ratio: clamped };
  }
  const children = node.children.map((child) => setRatio(child, splitId, ratio, minFraction));
  return children.every((child, i) => child === node.children[i]) ? node : { ...node, children };
}

/**
 * Where each pane and divider goes, as fractions of the whole area. Panes are listed flat,
 * so the UI can render them in one keyed list: a pane keeps its identity (and its WebGL
 * view) when the tree around it changes.
 * @param {LayoutNode} root
 * @param {{stacked?: boolean}} [options] - stacked: every split stacks vertically (narrow screens).
 * @returns {{panes: {id: string, rect: Rect}[],
 *   dividers: {splitId: string, direction: 'row' | 'column', ratio: number, bounds: Rect}[]}}
 *   A divider sits at `ratio` across its split's `bounds` (along x for row, y for column).
 */
export function computeLayout(root, { stacked = false } = {}) {
  const panes = [];
  const dividers = [];
  const visit = (node, rect) => {
    if (node.type === 'pane') {
      panes.push({ id: node.id, rect });
      return;
    }
    const direction = stacked ? 'column' : node.direction;
    const { x, y, w, h } = rect;
    const { ratio } = node;
    if (direction === 'row') {
      visit(node.children[0], { x, y, w: w * ratio, h });
      visit(node.children[1], { x: x + w * ratio, y, w: w * (1 - ratio), h });
    } else {
      visit(node.children[0], { x, y, w, h: h * ratio });
      visit(node.children[1], { x, y: y + h * ratio, w, h: h * (1 - ratio) });
    }
    dividers.push({ splitId: node.id, direction, ratio, bounds: rect });
  };
  visit(root, { x: 0, y: 0, w: 1, h: 1 });
  return { panes, dividers };
}
