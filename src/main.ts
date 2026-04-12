const svg = document.querySelector('svg')!;
const ns = 'http://www.w3.org/2000/svg';

// ============== Layout Constants ==============
// Chart 1: Fare Structures (cost vs trips)
const LEFT = 100, RIGHT = 850, TOP = 70, BOTTOM = 510;
const WIDTH = RIGHT - LEFT;   // 750
const HEIGHT = BOTTOM - TOP;  // 440
const MAX_TRIPS = 100, MAX_COST = 300;
const FARE = MAX_COST / MAX_TRIPS; // $3/trip (fixed slope)

// Charts 2 & 3: Rider distributions (same height, generous space before titles)
const DIST_HEIGHT = 180;
const TITLE2_Y = 650, TOP2 = 672, BOTTOM2 = TOP2 + DIST_HEIGHT;
const TITLE3_Y = 930, TOP3 = 952, BOTTOM3 = TOP3 + DIST_HEIGHT;

// Distribution parameters

const COLORS = {
  perTrip:       '#94a3b8',
  unlimited:     '#2563eb',
  unlimitedDark: '#1d4ed8',
  fareCap:       '#0d9668',
  fareCapDark:   '#0a7c55',
  agency:        '#e67e22',
  agencyDark:    '#b35c13',
  dist:          '#475569',
};

// ============== Coordinate Transforms ==============
function tx(trips: number): number { return LEFT + trips * WIDTH / MAX_TRIPS; }
function ty(cost: number): number  { return BOTTOM - cost * HEIGHT / MAX_COST; }

function projectToTrips(mx: number, my: number): number {
  const dx = WIDTH, dy = -HEIGHT;
  const t = ((mx - LEFT) * dx + (my - BOTTOM) * dy) / (dx * dx + dy * dy);
  return Math.max(1, Math.min(MAX_TRIPS - 1, t * MAX_TRIPS));
}

// ============== Distribution Math ==============

// Normal CDF via error function approximation (Abramowitz & Stegun 7.1.26)
function normalCDF(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327; // 1/sqrt(2π)
  const p = d * Math.exp(-0.5 * z * z) *
    (t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))));
  return z >= 0 ? 1 - p : p;
}

// Fare cap histogram weight (matches Lean `histWeight`):
//   riders(n) = mf(n) * (1 - cmf(min(q*n, C))) + surv(n) * max(0, cmf(min(q*(n+1), C)) - cmf(q*n))
// where mf/surv come from a normal on maxTrips, cmf from a normal on budget.
function histWeight(
  n: number, fare: number, cap: number,
  tripsMu: number, tripsSigma: number,
  budgetMu: number, budgetSigma: number,
): number {
  // maxTrips mass/survival (continuous normal — no discretization)
  const mf = normalCDF(n + 0.5, tripsMu, tripsSigma) - normalCDF(n - 0.5, tripsMu, tripsSigma);
  const surv = 1 - normalCDF(n + 0.5, tripsMu, tripsSigma);
  // budget cumulative mass
  const cmf = (x: number) => normalCDF(x, budgetMu, budgetSigma);
  return mf * (1 - cmf(Math.min(fare * n, cap))) +
    surv * Math.max(0, cmf(Math.min(fare * (n + 1), cap)) - cmf(fare * n));
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

// ============== Shared Distribution Chart Builder ==============
// Charts 2 and 3 have identical structure: title, axes, stacked areas,
// threshold guide, mode dot, and region labels.
function buildDistChart(opts: {
  prefix: string;
  title: string;
  titleY: number;
  top: number;
  bottom: number;
  color: string;
  colorDark: string;
}): SVGGElement {
  const g = document.createElementNS(ns, 'g');
  const { prefix, titleY, top, bottom, color, colorDark } = opts;

  g.appendChild(createText(475, titleY, opts.title, { cls: 'title', anchor: 'middle' }));

  // Axes
  g.appendChild(createLine(LEFT, bottom, RIGHT + 10, bottom, { cls: 'axis', width: 1.8 }));
  g.appendChild(createLine(LEFT, bottom, LEFT, top - 8, { cls: 'axis', width: 1.8 }));
  g.appendChild(createArrow(RIGHT + 18, bottom, 'right'));
  g.appendChild(createArrow(LEFT, top - 16, 'up'));

  // Tick marks and labels
  for (let t = 0; t <= MAX_TRIPS; t += 10) {
    const x = tx(t);
    g.appendChild(createLine(x, bottom, x, bottom + 7, { stroke: '#555', width: 1 }));
    g.appendChild(createText(x, bottom + 20, String(t),
      { cls: 'tick-label', anchor: 'middle' }));
  }

  // Axis labels
  g.appendChild(createText((LEFT + RIGHT) / 2, bottom + 42,
    'Trips per Month', { cls: 'axis-label', anchor: 'middle' }));
  const yAxisLabel = createText(0, 0, 'Rides', { cls: 'axis-label' });
  yAxisLabel.setAttribute('transform', `translate(50,${(top + bottom) / 2 + 15}) rotate(-90)`);
  g.appendChild(yAxisLabel);

  // Stacked areas + curve
  g.appendChild(createPolygon('0,0', { fill: COLORS.perTrip, opacity: 0.35, id: `${prefix}Grey` }));
  g.appendChild(createPolygon('0,0', { fill: color, opacity: 0.35, id: `${prefix}Color` }));
  g.appendChild(createPolyline('0,0', { stroke: COLORS.dist, width: 2, id: `${prefix}Curve` }));

  // Threshold guide + mode dot (colored to match chart)
  g.appendChild(createLine(0, top, 0, bottom,
    { stroke: color, width: 1.2, dash: '3,4', id: `${prefix}Guide`, opacity: 0.7 }));
  g.appendChild(createCircle(0, 0, 7,
    { fill: color, stroke: 'white', sw: 2, id: `${prefix}MeanDot`, cls: 'vertex' }));

  // Region labels
  g.appendChild(createText(0, 0, '',
    { cls: 'region-sub', fill: '#666', id: `${prefix}GreyLabel`, anchor: 'middle' }));
  g.appendChild(createText(0, 0, '',
    { cls: 'region-sub', fill: colorDark, id: `${prefix}ColorLabel`, anchor: 'middle' }));

  return g;
}

// ============== Build Chart 1: Fare Structures ==============

const chart1 = document.createElementNS(ns, 'g');

chart1.appendChild(createText(475, 30,
  'Transit Fare Structures: Prepaid Unlimited vs. Fare Capping',
  { cls: 'title', anchor: 'middle' }));
chart1.appendChild(createText(475, 50,
  'Drag the dots to explore different thresholds and rider distributions. Values are illustrative, not recommendations.',
  { cls: 'subtitle', anchor: 'middle' }));

for (let c = 30; c <= MAX_COST; c += 30) {
  chart1.appendChild(createLine(LEFT, ty(c), RIGHT, ty(c), { cls: 'grid', width: 0.7 }));
}

chart1.appendChild(createLine(LEFT, BOTTOM, RIGHT + 10, BOTTOM, { cls: 'axis', width: 1.8 }));
chart1.appendChild(createLine(LEFT, BOTTOM, LEFT, TOP - 8, { cls: 'axis', width: 1.8 }));
chart1.appendChild(createArrow(RIGHT + 18, BOTTOM, 'right'));
chart1.appendChild(createArrow(LEFT, TOP - 16, 'up'));

for (let t = 0; t <= MAX_TRIPS; t += 10) {
  const x = tx(t);
  chart1.appendChild(createLine(x, BOTTOM, x, BOTTOM + 7, { stroke: '#555', width: 1 }));
  chart1.appendChild(createText(x, BOTTOM + 20, String(t), { cls: 'tick-label', anchor: 'middle' }));
}
chart1.appendChild(createText((LEFT + RIGHT) / 2, BOTTOM + 42,
  'Trips per Month', { cls: 'axis-label', anchor: 'middle' }));

for (let c = 0; c <= MAX_COST; c += 30) {
  const y = ty(c);
  chart1.appendChild(createLine(LEFT - 7, y, LEFT, y, { stroke: '#555', width: 1 }));
  chart1.appendChild(createText(LEFT - 12, y + 4, '$' + c, { cls: 'tick-label', anchor: 'end' }));
}
const yLabel = createText(0, 0, 'Total Cost', { cls: 'axis-label' });
yLabel.setAttribute('transform', `translate(38,${(TOP + BOTTOM) / 2 + 30}) rotate(-90)`);
chart1.appendChild(yLabel);

// Chart 1 dynamic elements
chart1.appendChild(createPolygon('0,0', { fill: COLORS.agency, opacity: 0.18, id: 'agencySurplus' }));
chart1.appendChild(createPolygon('0,0', { fill: COLORS.unlimited, opacity: 0.18, id: 'unlimitedSurplus' }));
const fcSurplus = document.createElementNS(ns, 'polygon');
fcSurplus.setAttribute('points', '0,0');
fcSurplus.setAttribute('fill', 'url(#crosshatch)');
fcSurplus.setAttribute('stroke', 'none');
fcSurplus.setAttribute('id', 'fareCapSurplus');
chart1.appendChild(fcSurplus);

chart1.appendChild(createLine(LEFT, BOTTOM, RIGHT, TOP,
  { stroke: COLORS.perTrip, width: 2.2, dash: '7,5', id: 'perTripLine' }));
chart1.appendChild(createLine(LEFT, 0, RIGHT, 0,
  { stroke: COLORS.unlimited, width: 2.5, id: 'unlimitedLine' }));
chart1.appendChild(createPolyline('0,0',
  { stroke: COLORS.fareCap, width: 2.5, id: 'fareCapLine' }));

chart1.appendChild(createLine(0, 0, 0, 0,
  { stroke: COLORS.unlimited, width: 1, dash: '3,4', id: 'beGuide', opacity: 0.5 }));
chart1.appendChild(createLine(0, 0, 0, 0,
  { stroke: COLORS.fareCap, width: 1, dash: '3,4', id: 'capGuide', opacity: 0.5 }));

chart1.appendChild(createCircle(0, 0, 7,
  { fill: COLORS.unlimited, stroke: 'white', sw: 2, id: 'beDot', cls: 'vertex' }));
chart1.appendChild(createCircle(0, 0, 25,
  { fill: 'transparent', id: 'beDotHit', cls: 'vertex' }));
chart1.appendChild(createCircle(0, 0, 7,
  { fill: COLORS.fareCap, stroke: 'white', sw: 2, id: 'capDot', cls: 'vertex' }));
chart1.appendChild(createCircle(0, 0, 25,
  { fill: 'transparent', id: 'capDotHit', cls: 'vertex' }));

chart1.appendChild(createText(0, 0, '', { cls: 'region-label', fill: COLORS.agencyDark, id: 'agLabel', anchor: 'middle' }));
chart1.appendChild(createText(0, 0, '', { cls: 'region-label', id: 'stripLabel1', anchor: 'middle' }));
chart1.appendChild(createText(0, 0, '', { cls: 'region-sub', id: 'stripLabel2', anchor: 'middle' }));
chart1.appendChild(createText(0, 0, '', { cls: 'region-label', fill: COLORS.dist, id: 'ixLabel1', anchor: 'middle' }));
chart1.appendChild(createText(0, 0, '', { cls: 'region-sub', fill: COLORS.dist, id: 'ixLabel2', anchor: 'middle' }));

chart1.appendChild(createText(0, 0, '', { cls: 'annotation', fill: COLORS.unlimitedDark, id: 'beAnno1', anchor: 'end' }));
chart1.appendChild(createText(0, 0, '', { cls: 'annotation', fill: COLORS.unlimitedDark, id: 'beAnno2', anchor: 'end' }));
chart1.appendChild(createText(0, 0, '', { cls: 'annotation', fill: COLORS.fareCapDark, id: 'capAnno1', anchor: 'start' }));
chart1.appendChild(createText(0, 0, '', { cls: 'annotation', fill: COLORS.fareCapDark, id: 'capAnno2', anchor: 'start' }));

chart1.appendChild(createText(0, 0, '', { cls: 'value-label', fill: COLORS.unlimited, id: 'ulVal' }));
chart1.appendChild(createText(0, 0, '', { cls: 'value-label', fill: COLORS.fareCap, id: 'fcVal' }));

svg.appendChild(chart1);

// ============== Legend ==============
const lg = document.createElementNS(ns, 'g');
lg.setAttribute('transform', 'translate(115,575)');

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

// ============== Build Charts 2 & 3 (disabled — ridership model not ready) ==============

/* DISABLED: ridership model not ready
svg.appendChild(buildDistChart({
  prefix: 'c2', title: 'With Fare Cap', titleY: TITLE2_Y,
  top: TOP2, bottom: BOTTOM2,
  color: COLORS.fareCap, colorDark: COLORS.fareCapDark,
}));

svg.appendChild(buildDistChart({
  prefix: 'c3', title: 'With Unlimited Pass', titleY: TITLE3_Y,
  top: TOP3, bottom: BOTTOM3,
  color: COLORS.unlimited, colorDark: COLORS.unlimitedDark,
}));
*/


// ============== State ==============
const state = {
  beTrips: 30,   // break-even point (unlimited pass price = beTrips * FARE)
  capTrips: 50,  // cap point (fare cap amount = capTrips * FARE)
  distMode: 12,  // mode (peak) of the base rider distribution
};

type DotKey = 'be' | 'cap' | 'mean';
let dragging: DotKey | null = null;

// ============== Core Update ==============
function updateGraph(): void {
  const beTrips  = state.beTrips;
  const capTrips = state.capTrips;
  const unlimitedP = beTrips * FARE;
  const fareCapAmt = capTrips * FARE;

  const beX = tx(beTrips),  beY = ty(unlimitedP);
  const capX = tx(capTrips), capY = ty(fareCapAmt);

  // ---- Chart 1: Fare Structures ----
  setAttrs('perTripLine', { x1: LEFT, y1: BOTTOM, x2: RIGHT, y2: TOP });
  setAttrs('unlimitedLine', { y1: beY, y2: beY });
  document.getElementById('fareCapLine')!.setAttribute('points',
    `${LEFT},${BOTTOM} ${capX},${capY} ${RIGHT},${capY}`);

  document.getElementById('agencySurplus')!.setAttribute('points',
    `${LEFT},${beY} ${beX},${beY} ${LEFT},${BOTTOM}`);

  // The two surplus triangles:
  //   Unlimited: (beX,beY) → (RIGHT,TOP) → (RIGHT,beY)
  //   Fare cap:  (capX,capY) → (RIGHT,TOP) → (RIGHT,capY)
  // Cross-hatch = their intersection (the smaller/upper triangle).
  // The non-overlapping strip is a trapezoid, colored by whichever
  // policy has the lower threshold.
  const upperX = Math.max(beX, capX), upperY = Math.min(beY, capY);
  const lowerX = Math.min(beX, capX), lowerY = Math.max(beY, capY);
  document.getElementById('fareCapSurplus')!.setAttribute('points',
    `${upperX},${upperY} ${RIGHT},${TOP} ${RIGHT},${upperY}`);
  document.getElementById('unlimitedSurplus')!.setAttribute('points',
    `${lowerX},${lowerY} ${upperX},${upperY} ${RIGHT},${upperY} ${RIGHT},${lowerY}`);
  document.getElementById('unlimitedSurplus')!.setAttribute('fill',
    beTrips <= capTrips ? COLORS.unlimited : COLORS.fareCap);

  setAttrs('beGuide',  { x1: beX, x2: beX, y1: beY, y2: BOTTOM });
  setAttrs('capGuide', { x1: capX, x2: capX, y1: capY, y2: BOTTOM });
  setAttrs('beDot',  { cx: beX, cy: beY });
  setAttrs('beDotHit',  { cx: beX, cy: beY });
  setAttrs('capDot', { cx: capX, cy: capY });
  setAttrs('capDotHit', { cx: capX, cy: capY });

  setText('ulVal', '$' + Math.round(unlimitedP), RIGHT + 8, beY - 4);
  setText('fcVal', '$' + Math.round(fareCapAmt), RIGHT + 8, capY - 4);

  // Chart 1 region labels — use shared upper/lower geometry
  const agW = beX - LEFT;
  if (agW > 60) {
    setText('agLabel', 'Agency surplus', (LEFT * 2 + beX) / 3, (beY * 2 + BOTTOM) / 3);
    setVis('agLabel', true);
  } else { setVis('agLabel', false); }

  // Trapezoid (non-overlapping surplus for whichever policy has the lower threshold)
  const stripH = lowerY - upperY;
  const stripPolicy = beTrips <= capTrips ? 'unlimited pass' : 'fare cap';
  const stripColor = beTrips <= capTrips ? COLORS.unlimitedDark : COLORS.fareCapDark;
  if (stripH > 35 && RIGHT - lowerX > 100) {
    const lx = lowerX + (RIGHT - lowerX) * 0.5, ly = (lowerY + upperY) / 2;
    setText('stripLabel1', 'Rider surplus', lx, ly - 5);
    setText('stripLabel2', `(${stripPolicy} only)`, lx, ly + 10);
    document.getElementById('stripLabel1')!.setAttribute('fill', stripColor);
    document.getElementById('stripLabel2')!.setAttribute('fill', stripColor);
    setVis('stripLabel1', true); setVis('stripLabel2', true);
  } else { setVis('stripLabel1', false); setVis('stripLabel2', false); }

  // Intersection triangle (cross-hatch — both policies provide surplus)
  if (RIGHT - upperX > 100 && upperY - TOP > 40) {
    const lx = (upperX + RIGHT * 2) / 3, ly = (upperY * 2 + TOP) / 3;
    setText('ixLabel1', 'Rider surplus', lx, ly - 5);
    setText('ixLabel2', '(fare cap & unlimited pass)', lx, ly + 10);
    setVis('ixLabel1', true); setVis('ixLabel2', true);
  } else { setVis('ixLabel1', false); setVis('ixLabel2', false); }

  if (beX > LEFT + 40 && beX < RIGHT - 30) {
    setText('beAnno1', 'Break-even', beX - 8, beY - 12);
    setText('beAnno2', '(' + Math.round(beTrips) + ' trips)', beX - 8, beY);
    setVis('beAnno1', true); setVis('beAnno2', true);
  } else { setVis('beAnno1', false); setVis('beAnno2', false); }

  if (capX > LEFT + 40 && capX < RIGHT - 30) {
    setText('capAnno1', 'Cap reached', capX + 8, capY - 12);
    setText('capAnno2', '(' + Math.round(capTrips) + ' trips)', capX + 8, capY);
    setVis('capAnno1', true); setVis('capAnno2', true);
  } else { setVis('capAnno1', false); setVis('capAnno2', false); }

  setText('legPt', `Pay-per-ride ($${FARE.toFixed(2)}/trip)`);
  setText('legUl', `Unlimited pass ($${Math.round(unlimitedP)}/mo)`);
  setText('legFc', `Fare cap ($${Math.round(fareCapAmt)}/mo)`);

  // ---- Charts 2 & 3: Rider Distribution (disabled — model not ready) ----
  //
  // Key invariants (to honor when re-enabling):
  //
  // 1. Both fare-capped riders past the threshold and unlimited pass
  //    holders (anywhere in the distribution) face 0 marginal cost, so
  //    both must exhibit the same tail behavior — distribution is based
  //    solely on the likelihood of desiring N trips, and not on cost.
  //    The difference is only how riders enter the 0-marginal-cost regime:
  //      - Fare cap: automatic hard cutoff at capTrips (not a choice).
  //      - Unlimited pass: smooth sigmoid at beTrips (rider chooses to buy).
  //
  // 2. Lower thresholds of either policy mean Pareto-cheaper transit,
  //    which attracts more total riders (price elasticity).
  //
  // 3. Monthly vs pay-per-ride is a choice. Riders will not exactly
  //    transition around the break-even point, but will smoothly
  //    transition because of uncertainty in advance about how many trips
  //    will be taken.
  //
  // 4. Changing the fare cap slider should not affect pre-fare-cap rider
  //    behavior, only post-fare-cap rider behavior.
  //
  // 5. Changing either policy slider should not affect the other
  //    ridership graph.

  /* DISABLED: ridership model not ready

  // Distribution parameters: maxTrips ~ Normal(tripsMu, tripsSigma),
  // budget ~ Normal(budgetMu, budgetSigma), conditioned on budget ≥ fare * workTrips.
  // Budget is the binding constraint for most riders (more time than money).
  const tripsMu = state.distMode * 2;  // riders generally want more trips than they can afford
  const tripsSigma = 20;
  const budgetMu = state.distMode * FARE;  // budget affords ~distMode trips under PPR
  const budgetSigma = 25;

  const N = MAX_TRIPS;  // one sample per integer trip count

  // Chart 2: Fare cap — closed-form histWeight from Lean model.
  // Grey = budget-bound (paying per trip), Green = cap-covered (0 marginal cost).
  // A rider is cap-covered when budget ≥ cap, which is captured by the
  // histWeight formula automatically — but for coloring we split:
  //   grey(n) = riders whose budget < cap and take n trips
  //   color(n) = riders whose budget ≥ cap and take n trips (only possible when M = n)
  const fcGrey: number[] = [];
  const fcColor: number[] = [];

  // Chart 3: Unlimited pass — riders choose PPR vs pass based on expected trips.
  // Sharp per-rider decision convolved with perturbation kernel gives smooth
  // population-level purchase probability: Φ((n - beTrips) / σ_perturbation).
  // See PrepaidPassAnalysis.lean "Smooth transition (perturbation model)".
  //
  // Three components at each trip count n:
  //   PPR riders (b < P): staircase truncated at b* = P
  //   Pass holders (b ≥ P): take M trips → mf(n) * (1 - cmf(P))
  //   Color split: smoothed by perturbation-derived purchase probability
  const perturbationSigma = 5;  // trip uncertainty from perturbation kernel
  const ulGrey: number[] = [];
  const ulColor: number[] = [];

  let peakDensity = 0;

  for (let n = 0; n <= N; n++) {
    // Chart 2: histWeight gives total riders at trip count n.
    // Vertical split at capTrips: below = grey (per-trip), above = green (capped).
    // This is exact: for n > capTrips, fare*n > cap so only cap-covered riders remain.
    // Multiply by n: Y axis is rides (n * riders(n)), so area = total ridership.
    const h = n * histWeight(n, FARE, fareCapAmt, tripsMu, tripsSigma, budgetMu, budgetSigma);
    if (n <= capTrips) {
      fcGrey.push(h);
      fcColor.push(0);
    } else {
      fcGrey.push(0);
      fcColor.push(h);
    }

    // Chart 3: Unlimited pass — sharp model for totals, smooth color split.
    // PPR riders (b < P): staircase truncated at P.
    // Pass holders (b ≥ P): take M trips → mf(n) * (1 - cmf(P)).
    const mfN = normalCDF(n + 0.5, tripsMu, tripsSigma) - normalCDF(n - 0.5, tripsMu, tripsSigma);
    const survN = 1 - normalCDF(n + 0.5, tripsMu, tripsSigma);
    const cmf = (x: number) => normalCDF(x, budgetMu, budgetSigma);
    const qn = FARE * n;
    const pprTimeBound = mfN * Math.max(0, cmf(unlimitedP) - cmf(qn));
    const pprBudgetBound = survN * Math.max(0, cmf(Math.min(FARE * (n + 1), unlimitedP)) - cmf(qn));
    const passHolders = mfN * (1 - cmf(unlimitedP));
    const hTotal = n * (pprTimeBound + pprBudgetBound + passHolders);
    // Smooth color split: perturbation kernel blurs the sharp decision boundary
    const passPurchaseProb = normalCDF(n, beTrips, perturbationSigma);
    ulGrey.push(hTotal * (1 - passPurchaseProb));
    ulColor.push(hTotal * passPurchaseProb);

    peakDensity = Math.max(peakDensity,
      fcGrey[n] + fcColor[n],
      ulGrey[n] + ulColor[n]);
  }

  // Shared y-scale so both charts are directly comparable
  const yScale = peakDensity > 0 ? DIST_HEIGHT * 0.85 / peakDensity : 1;

  // Build stacked area polygons and total curve
  function buildAreas(
    grey: number[], color: number[], len: number, bottom: number,
    greyId: string, colorId: string, curveId: string
  ): void {
    let greyPts = `${LEFT},${bottom}`;
    for (let i = 0; i <= len; i++) {
      greyPts += ` ${tx(i)},${bottom - grey[i] * yScale}`;
    }
    greyPts += ` ${RIGHT},${bottom}`;
    document.getElementById(greyId)!.setAttribute('points', greyPts);

    let colorPts = '';
    for (let i = 0; i <= len; i++) {
      colorPts += `${i > 0 ? ' ' : ''}${tx(i)},${bottom - grey[i] * yScale}`;
    }
    for (let i = len; i >= 0; i--) {
      colorPts += ` ${tx(i)},${bottom - (grey[i] + color[i]) * yScale}`;
    }
    document.getElementById(colorId)!.setAttribute('points', colorPts);

    let curvePts = '';
    for (let i = 0; i <= len; i++) {
      if (i > 0) curvePts += ' ';
      curvePts += `${tx(i)},${bottom - (grey[i] + color[i]) * yScale}`;
    }
    document.getElementById(curveId)!.setAttribute('points', curvePts);
  }

  buildAreas(fcGrey, fcColor, N, BOTTOM2, 'c2Grey', 'c2Color', 'c2Curve');
  buildAreas(ulGrey, ulColor, N, BOTTOM3, 'c3Grey', 'c3Color', 'c3Curve');

  // Guides
  setAttrs('c2Guide', { x1: capX, x2: capX });
  setAttrs('c3Guide', { x1: beX, x2: beX });

  // Mode dots — positioned at distMode on x-axis, on the total curve
  const clampedIdx = Math.max(0, Math.min(N, Math.round(state.distMode)));
  setAttrs('c2MeanDot', {
    cx: tx(state.distMode),
    cy: BOTTOM2 - (fcGrey[clampedIdx] + fcColor[clampedIdx]) * yScale
  });
  setAttrs('c3MeanDot', {
    cx: tx(state.distMode),
    cy: BOTTOM3 - (ulGrey[clampedIdx] + ulColor[clampedIdx]) * yScale
  });

  // Region percentages
  let fcGreyMass = 0, fcMass = 0;
  let ulGreyMass = 0, ulMass = 0;
  for (let i = 0; i <= N; i++) {
    fcGreyMass += fcGrey[i];
    fcMass += fcGrey[i] + fcColor[i];
    ulGreyMass += ulGrey[i];
    ulMass += ulGrey[i] + ulColor[i];
  }
  const fcGreyPct = fcMass > 0 ? Math.round(fcGreyMass / fcMass * 100) : 0;
  const ulGreyPct = ulMass > 0 ? Math.round(ulGreyMass / ulMass * 100) : 0;

  // Region labels — chart 2 (fare cap)
  const c2LabelY = BOTTOM2 - 15;
  if (capX - LEFT > 80) {
    setText('c2GreyLabel', `${fcGreyPct}% per-trip`, (LEFT + capX) / 2, c2LabelY);
    setVis('c2GreyLabel', true);
  } else { setVis('c2GreyLabel', false); }
  if (RIGHT - capX > 80) {
    setText('c2ColorLabel', `${100 - fcGreyPct}% capped`, (capX + RIGHT) / 2, c2LabelY);
    setVis('c2ColorLabel', true);
  } else { setVis('c2ColorLabel', false); }

  // Region labels — chart 3 (unlimited pass)
  const c3LabelY = BOTTOM3 - 15;
  if (beX - LEFT > 80) {
    setText('c3GreyLabel', `${ulGreyPct}% per-trip`, (LEFT + beX) / 2, c3LabelY);
    setVis('c3GreyLabel', true);
  } else { setVis('c3GreyLabel', false); }
  if (RIGHT - beX > 80) {
    setText('c3ColorLabel', `${100 - ulGreyPct}% pass holders`, (beX + RIGHT) / 2, c3LabelY);
    setVis('c3ColorLabel', true);
  } else { setVis('c3ColorLabel', false); }

  END DISABLED */
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

const beDotHitEl = document.getElementById('beDotHit')!;
const capDotHitEl = document.getElementById('capDotHit')!;

beDotHitEl.addEventListener('mousedown', startDrag('be'));
beDotHitEl.addEventListener('touchstart', startDrag('be'), { passive: false });
capDotHitEl.addEventListener('mousedown', startDrag('cap'));
capDotHitEl.addEventListener('touchstart', startDrag('cap'), { passive: false });
/* DISABLED: ridership model not ready
const c2MeanDotEl = document.getElementById('c2MeanDot')!;
const c3MeanDotEl = document.getElementById('c3MeanDot')!;
c2MeanDotEl.addEventListener('mousedown', startDrag('mean'));
c2MeanDotEl.addEventListener('touchstart', startDrag('mean'), { passive: false });
c3MeanDotEl.addEventListener('mousedown', startDrag('mean'));
c3MeanDotEl.addEventListener('touchstart', startDrag('mean'), { passive: false });
*/

function onMove(evt: MouseEvent | TouchEvent): void {
  if (!dragging) return;
  evt.preventDefault();
  const pos = getPos(evt);

  if (dragging === 'be' || dragging === 'cap') {
    const trips = projectToTrips(pos.x, pos.y);
    if (dragging === 'be') {
      state.beTrips = trips;
    } else {
      state.capTrips = trips;
    }
    state.beTrips = Math.max(1, Math.min(MAX_TRIPS - 1, state.beTrips));
    state.capTrips = Math.max(1, Math.min(MAX_TRIPS - 1, state.capTrips));
  }
  /* DISABLED: ridership model not ready
  } else if (dragging === 'mean') {
    const trips = ((pos.x - LEFT) / WIDTH) * MAX_TRIPS;
    state.distMode = Math.max(2, Math.min(MAX_TRIPS * 0.7, trips));
  }
  */

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
