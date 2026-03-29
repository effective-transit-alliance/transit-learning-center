const svg = document.querySelector('svg')!;
const ns = 'http://www.w3.org/2000/svg';

// ============== Layout Constants ==============
const LEFT = 100, RIGHT = 850, TOP = 70, BOTTOM = 510;
const WIDTH = RIGHT - LEFT;   // 750
const HEIGHT = BOTTOM - TOP;  // 440
const MAX_TRIPS = 70, MAX_COST = 210;
const MIN_GAP = 15; // minimum pixel gap between draggable vertices

const COLORS = {
  perTrip:       '#94a3b8',
  unlimited:     '#0d9668',
  unlimitedDark: '#0a7c55',
  fareCap:       '#2563eb',
  fareCapDark:   '#1d4ed8',
  agency:        '#e67e22',
  agencyDark:    '#b35c13',
};

// ============== Coordinate Transforms ==============
function tx(trips: number): number { return LEFT + trips * WIDTH / MAX_TRIPS; }
function ty(cost: number): number  { return BOTTOM - cost * HEIGHT / MAX_COST; }
function costFromY(y: number): number { return (BOTTOM - y) * MAX_COST / HEIGHT; }

// ============== SVG Helpers ==============
function createLine(
  x1: number, y1: number, x2: number, y2: number,
  opts: { stroke?: string; width?: number; dash?: string;
          id?: string; cls?: string; opacity?: number } = {}
): SVGLineElement {
  const el = document.createElementNS(ns, 'line');
  el.setAttribute('x1', String(x1));
  el.setAttribute('y1', String(y1));
  el.setAttribute('x2', String(x2));
  el.setAttribute('y2', String(y2));
  if (opts.stroke) el.setAttribute('stroke', opts.stroke);
  el.setAttribute('stroke-width', String(opts.width ?? 1));
  if (opts.dash) el.setAttribute('stroke-dasharray', opts.dash);
  if (opts.id) el.setAttribute('id', opts.id);
  if (opts.cls) el.setAttribute('class', opts.cls);
  if (opts.opacity !== undefined) el.setAttribute('opacity', String(opts.opacity));
  return el;
}

function createCircle(
  cx: number, cy: number, r: number,
  opts: { fill?: string; stroke?: string; sw?: number;
          id?: string; cls?: string } = {}
): SVGCircleElement {
  const el = document.createElementNS(ns, 'circle');
  el.setAttribute('cx', String(cx));
  el.setAttribute('cy', String(cy));
  el.setAttribute('r', String(r));
  if (opts.fill) el.setAttribute('fill', opts.fill);
  if (opts.stroke) el.setAttribute('stroke', opts.stroke);
  if (opts.sw !== undefined) el.setAttribute('stroke-width', String(opts.sw));
  if (opts.id) el.setAttribute('id', opts.id);
  if (opts.cls) el.setAttribute('class', opts.cls);
  return el;
}

function createText(
  x: number, y: number, text: string,
  opts: { cls?: string; anchor?: string; fill?: string; id?: string } = {}
): SVGTextElement {
  const el = document.createElementNS(ns, 'text');
  el.setAttribute('x', String(x));
  el.setAttribute('y', String(y));
  if (opts.cls) el.setAttribute('class', opts.cls);
  if (opts.anchor) el.setAttribute('text-anchor', opts.anchor);
  if (opts.fill) el.setAttribute('fill', opts.fill);
  if (opts.id) el.setAttribute('id', opts.id);
  el.textContent = text;
  return el;
}

function createPolygon(
  points: string,
  opts: { fill?: string; opacity?: number; id?: string } = {}
): SVGPolygonElement {
  const el = document.createElementNS(ns, 'polygon');
  el.setAttribute('points', points);
  if (opts.fill) el.setAttribute('fill', opts.fill);
  if (opts.opacity !== undefined) el.setAttribute('fill-opacity', String(opts.opacity));
  el.setAttribute('stroke', 'none');
  if (opts.id) el.setAttribute('id', opts.id);
  return el;
}

function createPolyline(
  points: string,
  opts: { stroke?: string; width?: number; id?: string } = {}
): SVGPolylineElement {
  const el = document.createElementNS(ns, 'polyline');
  el.setAttribute('points', points);
  el.setAttribute('fill', 'none');
  if (opts.stroke) el.setAttribute('stroke', opts.stroke);
  el.setAttribute('stroke-width', String(opts.width ?? 1));
  if (opts.id) el.setAttribute('id', opts.id);
  return el;
}

function createArrow(x: number, y: number, dir: 'up' | 'right'): SVGPolygonElement {
  const el = document.createElementNS(ns, 'polygon');
  el.setAttribute('points', dir === 'up'
    ? `${x - 4},${y + 8} ${x + 4},${y + 8} ${x},${y}`
    : `${x - 8},${y - 4} ${x - 8},${y + 4} ${x},${y}`);
  el.setAttribute('class', 'axis-arrow');
  return el;
}

function setAttrs(id: string, attrs: Record<string, number | string>): void {
  const el = document.getElementById(id)!;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
}

function setText(id: string, text: string, x?: number, y?: number): void {
  const el = document.getElementById(id)!;
  el.textContent = text;
  if (x !== undefined) el.setAttribute('x', String(x));
  if (y !== undefined) el.setAttribute('y', String(y));
}

function setVis(id: string, visible: boolean): void {
  document.getElementById(id)!.setAttribute('visibility', visible ? 'visible' : 'hidden');
}

// ============== Build Static Elements ==============

// Title and instructions
svg.appendChild(createText(475, 30,
  'Transit Fare Structures: Prepaid Unlimited vs. Fare Capping',
  { cls: 'title', anchor: 'middle' }));
svg.appendChild(createText(475, 50,
  'Drag the colored dots on the right edge to explore different scenarios. Values are illustrative, not recommendations.',
  { cls: 'subtitle', anchor: 'middle' }));

// Grid lines
for (let c = 30; c <= MAX_COST; c += 30) {
  svg.appendChild(createLine(LEFT, ty(c), RIGHT, ty(c), { cls: 'grid', width: 0.7 }));
}

// Axes
svg.appendChild(createLine(LEFT, BOTTOM, RIGHT + 10, BOTTOM, { cls: 'axis', width: 1.8 }));
svg.appendChild(createLine(LEFT, BOTTOM, LEFT, TOP - 8, { cls: 'axis', width: 1.8 }));
svg.appendChild(createArrow(RIGHT + 18, BOTTOM, 'right'));
svg.appendChild(createArrow(LEFT, TOP - 16, 'up'));

// X-axis ticks and label
for (let t = 0; t <= MAX_TRIPS; t += 10) {
  const x = tx(t);
  svg.appendChild(createLine(x, BOTTOM, x, BOTTOM + 7, { stroke: '#555', width: 1 }));
  svg.appendChild(createText(x, BOTTOM + 20, String(t), { cls: 'tick-label', anchor: 'middle' }));
}
svg.appendChild(createText((LEFT + RIGHT) / 2, BOTTOM + 45,
  'Trips per Month', { cls: 'axis-label', anchor: 'middle' }));

// Y-axis ticks and label
for (let c = 0; c <= MAX_COST; c += 30) {
  const y = ty(c);
  svg.appendChild(createLine(LEFT - 7, y, LEFT, y, { stroke: '#555', width: 1 }));
  svg.appendChild(createText(LEFT - 12, y + 4, '$' + c, { cls: 'tick-label', anchor: 'end' }));
}
const yLabel = createText(0, 0, 'Total Cost', { cls: 'axis-label' });
yLabel.setAttribute('transform', `translate(38,${(TOP + BOTTOM) / 2 + 30}) rotate(-90)`);
svg.appendChild(yLabel);

// ============== Dynamic Elements ==============

// Surplus regions (drawn first = behind everything)
svg.appendChild(createPolygon('0,0', { fill: COLORS.agency, opacity: 0.18, id: 'agencySurplus' }));
svg.appendChild(createPolygon('0,0', { fill: COLORS.unlimited, opacity: 0.18, id: 'unlimitedSurplus' }));
svg.appendChild(createPolygon('0,0', { fill: COLORS.fareCap, opacity: 0.22, id: 'fareCapSurplus' }));

// Cost lines
svg.appendChild(createLine(LEFT, BOTTOM, RIGHT, TOP,
  { stroke: COLORS.perTrip, width: 2.2, dash: '7,5', id: 'perTripLine' }));
svg.appendChild(createLine(LEFT, 0, RIGHT, 0,
  { stroke: COLORS.unlimited, width: 2.5, id: 'unlimitedLine' }));
svg.appendChild(createPolyline('0,0',
  { stroke: COLORS.fareCap, width: 2.5, id: 'fareCapLine' }));

// Vertical dashed guides at break-even and cap points
svg.appendChild(createLine(0, 0, 0, 0,
  { stroke: COLORS.unlimited, width: 1, dash: '3,4', id: 'beGuide', opacity: 0.5 }));
svg.appendChild(createLine(0, 0, 0, 0,
  { stroke: COLORS.fareCap, width: 1, dash: '3,4', id: 'capGuide', opacity: 0.5 }));

// Intersection dots
svg.appendChild(createCircle(0, 0, 4.5,
  { fill: COLORS.unlimited, stroke: 'white', sw: 1.5, id: 'beDot' }));
svg.appendChild(createCircle(0, 0, 4.5,
  { fill: COLORS.fareCap, stroke: 'white', sw: 1.5, id: 'capDot' }));

// Draggable vertices on the right edge
svg.appendChild(createCircle(RIGHT, 0, 8,
  { fill: COLORS.perTrip, stroke: 'white', sw: 2, id: 'ptVtx', cls: 'vertex' }));
svg.appendChild(createCircle(RIGHT, 0, 8,
  { fill: COLORS.fareCap, stroke: 'white', sw: 2, id: 'fcVtx', cls: 'vertex' }));
svg.appendChild(createCircle(RIGHT, 0, 8,
  { fill: COLORS.unlimited, stroke: 'white', sw: 2, id: 'ulVtx', cls: 'vertex' }));

// Text labels (all positioned dynamically)
svg.appendChild(createText(0, 0, '', { cls: 'region-label', fill: COLORS.agencyDark, id: 'agLabel', anchor: 'middle' }));
svg.appendChild(createText(0, 0, '', { cls: 'region-label', fill: COLORS.unlimitedDark, id: 'ulLabel1', anchor: 'middle' }));
svg.appendChild(createText(0, 0, '', { cls: 'region-sub', fill: COLORS.unlimitedDark, id: 'ulLabel2', anchor: 'middle' }));
svg.appendChild(createText(0, 0, '', { cls: 'region-label', fill: COLORS.fareCapDark, id: 'fcLabel1', anchor: 'middle' }));
svg.appendChild(createText(0, 0, '', { cls: 'region-sub', fill: COLORS.fareCapDark, id: 'fcLabel2', anchor: 'middle' }));

svg.appendChild(createText(0, 0, '', { cls: 'annotation', fill: COLORS.unlimitedDark, id: 'beAnno1', anchor: 'end' }));
svg.appendChild(createText(0, 0, '', { cls: 'annotation', fill: COLORS.unlimitedDark, id: 'beAnno2', anchor: 'end' }));
svg.appendChild(createText(0, 0, '', { cls: 'annotation', fill: COLORS.fareCapDark, id: 'capAnno1', anchor: 'start' }));
svg.appendChild(createText(0, 0, '', { cls: 'annotation', fill: COLORS.fareCapDark, id: 'capAnno2', anchor: 'start' }));

svg.appendChild(createText(0, 0, '', { cls: 'value-label', fill: COLORS.perTrip, id: 'ptVal' }));
svg.appendChild(createText(0, 0, '', { cls: 'value-label', fill: COLORS.unlimited, id: 'ulVal' }));
svg.appendChild(createText(0, 0, '', { cls: 'value-label', fill: COLORS.fareCap, id: 'fcVal' }));

// Legend
const lg = document.createElementNS(ns, 'g');
lg.setAttribute('transform', 'translate(115,580)');

const lgBg = document.createElementNS(ns, 'rect');
lgBg.setAttribute('x', '-8'); lgBg.setAttribute('y', '-16');
lgBg.setAttribute('width', '680'); lgBg.setAttribute('height', '42');
lgBg.setAttribute('rx', '6'); lgBg.setAttribute('class', 'legend-bg');
lg.appendChild(lgBg);

lg.appendChild(createLine(5, 5, 32, 5, { stroke: COLORS.perTrip, width: 2.2, dash: '7,5' }));
lg.appendChild(createText(40, 9, '', { cls: 'legend-text', id: 'legPt' }));
lg.appendChild(createLine(225, 5, 252, 5, { stroke: COLORS.unlimited, width: 2.5 }));
lg.appendChild(createText(260, 9, '', { cls: 'legend-text', id: 'legUl' }));
lg.appendChild(createLine(455, 5, 482, 5, { stroke: COLORS.fareCap, width: 2.5 }));
lg.appendChild(createText(490, 9, '', { cls: 'legend-text', id: 'legFc' }));
svg.appendChild(lg);

// ============== Vertex State ==============
// In pixel-y: lower y = higher cost.
// Ordering invariant: perTrip.y < fareCap.y < unlimited.y
//   (total at 70 trips > fare cap > unlimited price)
interface VertexState { el: SVGCircleElement; y: number; }

const verts = {
  perTrip:   { el: document.getElementById('ptVtx') as unknown as SVGCircleElement, y: ty(210) },
  fareCap:   { el: document.getElementById('fcVtx') as unknown as SVGCircleElement, y: ty(150) },
  unlimited: { el: document.getElementById('ulVtx') as unknown as SVGCircleElement, y: ty(90) },
};

type VertKey = keyof typeof verts;
let dragging: VertKey | null = null;

// ============== Core Update ==============
function updateGraph(): void {
  const ptY = verts.perTrip.y;
  const fcY = verts.fareCap.y;
  const ulY = verts.unlimited.y;

  // Derive dollar values
  const totalAt70   = costFromY(ptY);
  const perTripFare = totalAt70 / MAX_TRIPS;
  const fareCapAmt  = costFromY(fcY);
  const unlimitedP  = costFromY(ulY);

  // Derived trip counts
  const beTrips  = perTripFare > 0 ? unlimitedP / perTripFare : MAX_TRIPS;
  const capTrips = perTripFare > 0 ? fareCapAmt / perTripFare : MAX_TRIPS;
  const beX  = tx(beTrips);
  const capX = tx(capTrips);

  // --- Lines ---
  setAttrs('perTripLine', { x2: RIGHT, y2: ptY });
  setAttrs('unlimitedLine', { y1: ulY, y2: ulY });
  document.getElementById('fareCapLine')!.setAttribute('points',
    `${LEFT},${BOTTOM} ${capX},${fcY} ${RIGHT},${fcY}`);

  // --- Surplus regions ---
  document.getElementById('agencySurplus')!.setAttribute('points',
    `${LEFT},${ulY} ${beX},${ulY} ${LEFT},${BOTTOM}`);
  document.getElementById('unlimitedSurplus')!.setAttribute('points',
    `${beX},${ulY} ${RIGHT},${ptY} ${RIGHT},${ulY}`);
  document.getElementById('fareCapSurplus')!.setAttribute('points',
    `${capX},${fcY} ${RIGHT},${ptY} ${RIGHT},${fcY}`);

  // --- Guides and dots ---
  setAttrs('beGuide',  { x1: beX, x2: beX, y1: ulY, y2: BOTTOM });
  setAttrs('capGuide', { x1: capX, x2: capX, y1: fcY, y2: BOTTOM });
  setAttrs('beDot',  { cx: beX, cy: ulY });
  setAttrs('capDot', { cx: capX, cy: fcY });

  // --- Vertex positions ---
  verts.perTrip.el.setAttribute('cy', String(ptY));
  verts.fareCap.el.setAttribute('cy', String(fcY));
  verts.unlimited.el.setAttribute('cy', String(ulY));

  // --- Right-edge value labels ---
  setText('ptVal', '$' + Math.round(totalAt70), RIGHT + 12, ptY + 4);
  setText('fcVal', '$' + Math.round(fareCapAmt), RIGHT + 12, fcY + 4);
  setText('ulVal', '$' + Math.round(unlimitedP), RIGHT + 12, ulY + 4);

  // --- Region labels ---
  // Agency surplus (orange triangle, left of break-even)
  const agW = beX - LEFT;
  if (agW > 60) {
    const cx = (LEFT * 2 + beX) / 3;
    const cy = (ulY * 2 + BOTTOM) / 3;
    setText('agLabel', 'Agency surplus', cx, cy);
    setVis('agLabel', true);
  } else {
    setVis('agLabel', false);
  }

  // Unlimited rider surplus — place in the strip between the two horizontal lines
  const stripH = ulY - fcY;
  if (stripH > 35 && RIGHT - beX > 100) {
    const lx = beX + (RIGHT - beX) * 0.5;
    const ly = (ulY + fcY) / 2;
    setText('ulLabel1', 'Rider surplus', lx, ly - 5);
    setText('ulLabel2', '(unlimited pass)', lx, ly + 10);
    setVis('ulLabel1', true);
    setVis('ulLabel2', true);
  } else {
    setVis('ulLabel1', false);
    setVis('ulLabel2', false);
  }

  // Fare cap rider surplus — inside the blue triangle
  const blueW = RIGHT - capX;
  const blueH = fcY - ptY;
  if (blueW > 100 && blueH > 40) {
    const lx = (capX + RIGHT * 2) / 3;
    const ly = (fcY * 2 + ptY) / 3;
    setText('fcLabel1', 'Rider surplus', lx, ly - 5);
    setText('fcLabel2', '(fare cap & unlimited pass)', lx, ly + 10);
    setVis('fcLabel1', true);
    setVis('fcLabel2', true);
  } else {
    setVis('fcLabel1', false);
    setVis('fcLabel2', false);
  }

  // --- Break-even annotation ---
  if (beX > LEFT + 40 && beX < RIGHT - 30) {
    setText('beAnno1', 'Break-even', beX - 8, ulY - 12);
    setText('beAnno2', '(' + Math.round(beTrips) + ' trips)', beX - 8, ulY);
    setVis('beAnno1', true);
    setVis('beAnno2', true);
  } else {
    setVis('beAnno1', false);
    setVis('beAnno2', false);
  }

  // --- Cap-reached annotation ---
  if (capX > LEFT + 40 && capX < RIGHT - 30) {
    setText('capAnno1', 'Cap reached', capX + 8, fcY - 12);
    setText('capAnno2', '(' + Math.round(capTrips) + ' trips)', capX + 8, fcY);
    setVis('capAnno1', true);
    setVis('capAnno2', true);
  } else {
    setVis('capAnno1', false);
    setVis('capAnno2', false);
  }

  // --- Legend text ---
  setText('legPt', `Pay-per-ride ($${perTripFare.toFixed(2)}/trip)`);
  setText('legUl', `Unlimited pass ($${Math.round(unlimitedP)}/mo)`);
  setText('legFc', `Fare cap ($${Math.round(fareCapAmt)}/mo)`);
}

// ============== Drag Interaction ==============
function getPos(evt: MouseEvent | TouchEvent): { x: number; y: number } {
  const CTM = svg.getScreenCTM()!;
  let cx: number, cy: number;
  if ('touches' in evt && evt.touches.length > 0) {
    cx = evt.touches[0].clientX;
    cy = evt.touches[0].clientY;
  } else {
    cx = (evt as MouseEvent).clientX;
    cy = (evt as MouseEvent).clientY;
  }
  return { x: (cx - CTM.e) / CTM.a, y: (cy - CTM.f) / CTM.d };
}

function startDrag(key: VertKey): (evt: Event) => void {
  return (evt: Event) => {
    dragging = key;
    evt.preventDefault();
  };
}

for (const key of ['perTrip', 'fareCap', 'unlimited'] as VertKey[]) {
  verts[key].el.addEventListener('mousedown', startDrag(key));
  verts[key].el.addEventListener('touchstart', startDrag(key), { passive: false });
}

function onMove(evt: MouseEvent | TouchEvent): void {
  if (!dragging) return;
  evt.preventDefault();
  const pos = getPos(evt);

  // Update dragged vertex (x is locked to RIGHT)
  verts[dragging].y = Math.max(TOP + 5, Math.min(BOTTOM - 5, pos.y));

  // Enforce ordering: perTrip.y < fareCap.y < unlimited.y
  if (dragging === 'perTrip') {
    if (verts.perTrip.y + MIN_GAP > verts.fareCap.y)
      verts.fareCap.y = verts.perTrip.y + MIN_GAP;
    if (verts.fareCap.y + MIN_GAP > verts.unlimited.y)
      verts.unlimited.y = verts.fareCap.y + MIN_GAP;
  } else if (dragging === 'unlimited') {
    if (verts.unlimited.y - MIN_GAP < verts.fareCap.y)
      verts.fareCap.y = verts.unlimited.y - MIN_GAP;
    if (verts.fareCap.y - MIN_GAP < verts.perTrip.y)
      verts.perTrip.y = verts.fareCap.y - MIN_GAP;
  } else {
    if (verts.fareCap.y - MIN_GAP < verts.perTrip.y)
      verts.perTrip.y = verts.fareCap.y - MIN_GAP;
    if (verts.fareCap.y + MIN_GAP > verts.unlimited.y)
      verts.unlimited.y = verts.fareCap.y + MIN_GAP;
  }

  // Re-clamp after propagation
  verts.perTrip.y = Math.max(TOP + 5, verts.perTrip.y);
  verts.unlimited.y = Math.min(BOTTOM - 5, verts.unlimited.y);

  updateGraph();
}

svg.addEventListener('mousemove', onMove);
svg.addEventListener('touchmove', onMove, { passive: false });
svg.addEventListener('mouseup', () => { dragging = null; });
svg.addEventListener('mouseleave', () => { dragging = null; });
svg.addEventListener('touchend', () => { dragging = null; });
svg.addEventListener('touchcancel', () => { dragging = null; });

// ============== Initialize ==============
updateGraph();
