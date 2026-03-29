const svg = document.querySelector('svg')!;
const ns = 'http://www.w3.org/2000/svg';

// ============== Layout Constants ==============
const LEFT = 100, RIGHT = 850, TOP = 70, BOTTOM = 510;
const WIDTH = RIGHT - LEFT;   // 750
const HEIGHT = BOTTOM - TOP;  // 440
const MAX_TRIPS = 70, MAX_COST = 210;
const FARE = MAX_COST / MAX_TRIPS; // $3/trip (fixed slope)
const MIN_TRIP_GAP = 3; // minimum trip gap between the two dots

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

// Project a mouse position onto the per-trip diagonal, returning a trip count.
// The diagonal goes from (LEFT, BOTTOM) to (RIGHT, TOP).
function projectToTrips(mx: number, my: number): number {
  const dx = WIDTH, dy = -HEIGHT;
  const t = ((mx - LEFT) * dx + (my - BOTTOM) * dy) / (dx * dx + dy * dy);
  return Math.max(1, Math.min(MAX_TRIPS - 1, t * MAX_TRIPS));
}

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
  'Drag the dots along the diagonal to explore different thresholds. Values are illustrative, not recommendations.',
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

// Per-trip line (fixed slope)
svg.appendChild(createLine(LEFT, BOTTOM, RIGHT, TOP,
  { stroke: COLORS.perTrip, width: 2.2, dash: '7,5', id: 'perTripLine' }));

// Unlimited pass line (horizontal, moves with break-even dot)
svg.appendChild(createLine(LEFT, 0, RIGHT, 0,
  { stroke: COLORS.unlimited, width: 2.5, id: 'unlimitedLine' }));

// Fare cap line (diagonal then horizontal, elbow at cap dot)
svg.appendChild(createPolyline('0,0',
  { stroke: COLORS.fareCap, width: 2.5, id: 'fareCapLine' }));

// Vertical dashed guides
svg.appendChild(createLine(0, 0, 0, 0,
  { stroke: COLORS.unlimited, width: 1, dash: '3,4', id: 'beGuide', opacity: 0.5 }));
svg.appendChild(createLine(0, 0, 0, 0,
  { stroke: COLORS.fareCap, width: 1, dash: '3,4', id: 'capGuide', opacity: 0.5 }));

// Draggable dots ON the diagonal (these are the handles)
svg.appendChild(createCircle(0, 0, 7,
  { fill: COLORS.unlimited, stroke: 'white', sw: 2, id: 'beDot', cls: 'vertex' }));
svg.appendChild(createCircle(0, 0, 7,
  { fill: COLORS.fareCap, stroke: 'white', sw: 2, id: 'capDot', cls: 'vertex' }));

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

// ============== State ==============
// Two trip-count values defining where the dots sit on the diagonal.
// Invariant: 1 <= beTrips < capTrips <= MAX_TRIPS - 1
const state = {
  beTrips: 30,   // break-even point (unlimited pass price = beTrips * FARE)
  capTrips: 50,  // cap point (fare cap amount = capTrips * FARE)
};

type DotKey = 'be' | 'cap';
let dragging: DotKey | null = null;

// ============== Core Update ==============
function updateGraph(): void {
  const beTrips  = state.beTrips;
  const capTrips = state.capTrips;

  const unlimitedP = beTrips * FARE;
  const fareCapAmt = capTrips * FARE;

  // Pixel positions of the two dots (on the diagonal)
  const beX = tx(beTrips),  beY = ty(unlimitedP);
  const capX = tx(capTrips), capY = ty(fareCapAmt);

  // --- Lines ---
  // Per-trip line is static (fixed slope), but set explicitly for clarity
  setAttrs('perTripLine', { x1: LEFT, y1: BOTTOM, x2: RIGHT, y2: TOP });

  // Unlimited pass: horizontal at the break-even dot's y
  setAttrs('unlimitedLine', { y1: beY, y2: beY });

  // Fare cap: follows per-trip diagonal to cap dot, then horizontal
  document.getElementById('fareCapLine')!.setAttribute('points',
    `${LEFT},${BOTTOM} ${capX},${capY} ${RIGHT},${capY}`);

  // --- Surplus regions ---
  document.getElementById('agencySurplus')!.setAttribute('points',
    `${LEFT},${beY} ${beX},${beY} ${LEFT},${BOTTOM}`);
  document.getElementById('unlimitedSurplus')!.setAttribute('points',
    `${beX},${beY} ${RIGHT},${TOP} ${RIGHT},${beY}`);
  document.getElementById('fareCapSurplus')!.setAttribute('points',
    `${capX},${capY} ${RIGHT},${TOP} ${RIGHT},${capY}`);

  // --- Guides ---
  setAttrs('beGuide',  { x1: beX, x2: beX, y1: beY, y2: BOTTOM });
  setAttrs('capGuide', { x1: capX, x2: capX, y1: capY, y2: BOTTOM });

  // --- Draggable dot positions ---
  setAttrs('beDot',  { cx: beX, cy: beY });
  setAttrs('capDot', { cx: capX, cy: capY });

  // --- Value labels next to horizontal lines (right edge) ---
  setText('ulVal', '$' + Math.round(unlimitedP), RIGHT + 8, beY - 4);
  setText('fcVal', '$' + Math.round(fareCapAmt), RIGHT + 8, capY - 4);

  // --- Region labels ---
  // Agency surplus (orange triangle, left of break-even)
  const agW = beX - LEFT;
  if (agW > 60) {
    const cx = (LEFT * 2 + beX) / 3;
    const cy = (beY * 2 + BOTTOM) / 3;
    setText('agLabel', 'Agency surplus', cx, cy);
    setVis('agLabel', true);
  } else {
    setVis('agLabel', false);
  }

  // Unlimited rider surplus — in the strip between the two horizontal lines
  const stripH = beY - capY;
  if (stripH > 35 && RIGHT - beX > 100) {
    const lx = beX + (RIGHT - beX) * 0.5;
    const ly = (beY + capY) / 2;
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
  const blueH = capY - TOP;
  if (blueW > 100 && blueH > 40) {
    const lx = (capX + RIGHT * 2) / 3;
    const ly = (capY * 2 + TOP) / 3;
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
    setText('beAnno1', 'Break-even', beX - 8, beY - 12);
    setText('beAnno2', '(' + Math.round(beTrips) + ' trips)', beX - 8, beY);
    setVis('beAnno1', true);
    setVis('beAnno2', true);
  } else {
    setVis('beAnno1', false);
    setVis('beAnno2', false);
  }

  // --- Cap-reached annotation ---
  if (capX > LEFT + 40 && capX < RIGHT - 30) {
    setText('capAnno1', 'Cap reached', capX + 8, capY - 12);
    setText('capAnno2', '(' + Math.round(capTrips) + ' trips)', capX + 8, capY);
    setVis('capAnno1', true);
    setVis('capAnno2', true);
  } else {
    setVis('capAnno1', false);
    setVis('capAnno2', false);
  }

  // --- Legend text ---
  setText('legPt', `Pay-per-ride ($${FARE.toFixed(2)}/trip)`);
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

function startDrag(key: DotKey): (evt: Event) => void {
  return (evt: Event) => {
    dragging = key;
    evt.preventDefault();
  };
}

const beDotEl = document.getElementById('beDot') as unknown as SVGCircleElement;
const capDotEl = document.getElementById('capDot') as unknown as SVGCircleElement;

beDotEl.addEventListener('mousedown', startDrag('be'));
beDotEl.addEventListener('touchstart', startDrag('be'), { passive: false });
capDotEl.addEventListener('mousedown', startDrag('cap'));
capDotEl.addEventListener('touchstart', startDrag('cap'), { passive: false });

function onMove(evt: MouseEvent | TouchEvent): void {
  if (!dragging) return;
  evt.preventDefault();
  const pos = getPos(evt);

  // Project mouse position onto the diagonal to get trip count
  const trips = projectToTrips(pos.x, pos.y);

  if (dragging === 'be') {
    state.beTrips = Math.min(trips, state.capTrips - MIN_TRIP_GAP);
  } else {
    state.capTrips = Math.max(trips, state.beTrips + MIN_TRIP_GAP);
  }

  // Clamp to valid range
  state.beTrips = Math.max(1, Math.min(MAX_TRIPS - MIN_TRIP_GAP - 1, state.beTrips));
  state.capTrips = Math.max(state.beTrips + MIN_TRIP_GAP, Math.min(MAX_TRIPS - 1, state.capTrips));

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
