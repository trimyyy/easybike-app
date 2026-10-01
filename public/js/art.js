// Grafiken der Weboberfläche: Linien-Icons, Fahrrad-Illustrationen und Radfarben.
//
// Alle Elemente entstehen mit createElementNS – ohne innerHTML und ohne
// style-Attribute, weil die Seiten eine strenge Content-Security-Policy haben.
// Die Grafiken enthalten keine festen Farben: Striche und Flächen nutzen
// currentColor, das Stylesheet färbt sie über CSS-Klassen (auch im Dark Mode).
// Einzige Ausnahme sind die Radfarben in BIKE_COLORS, die die Seite als
// CSS-Variable setzt.
//
// Die Icon-Pfade sind nach Lucide (https://lucide.dev) nachgebaut.
// Lizenz von Lucide:
//
//   ISC License
//
//   Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as
//   part of Feather (MIT). All other copyright (c) for Lucide are held by
//   Lucide Contributors 2022.
//
//   Permission to use, copy, modify, and/or distribute this software for any
//   purpose with or without fee is hereby granted, provided that the above
//   copyright notice and this permission notice appear in all copies.
//
//   THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
//   WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
//   MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
//   ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
//   WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
//   ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
//   OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Erzeugt ein SVG-Element. Attribute mit dem Wert undefined werden weggelassen.
function createSvgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      element.setAttribute(name, String(value));
    }
  }
  return element;
}

// Mit Beschriftung ist die Grafik ein Bild, ohne ist sie rein dekorativ
function applyLabel(element, label) {
  if (label) {
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', label);
  } else {
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('focusable', 'false');
  }
}

// ---------------------------------------------------------------------------
// Icons: Raster 24 × 24, Strichstärke 2.
// Ein Eintrag ist ein Pfad (String) oder [Elementname, Attribute].

const ICONS = {
  'bike': [
    ['circle', { cx: 18.5, cy: 17.5, r: 3.5 }],
    ['circle', { cx: 5.5, cy: 17.5, r: 3.5 }],
    ['circle', { cx: 15, cy: 5, r: 1 }],
    'M12 17.5V14l-3-3 4-3 2 3h2',
  ],
  'map-pin': [
    'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
    ['circle', { cx: 12, cy: 10, r: 3 }],
  ],
  'clock': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    'M12 6v6l4 2',
  ],
  'calendar': [
    'M8 2v4',
    'M16 2v4',
    ['rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }],
    'M3 10h18',
  ],
  'filter': [
    'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  ],
  'sort': [
    'm21 16-4 4-4-4',
    'M17 20V4',
    'm3 8 4-4 4 4',
    'M7 4v16',
  ],
  'x': [
    'M18 6 6 18',
    'm6 6 12 12',
  ],
  'check': [
    'M20 6 9 17l-5-5',
  ],
  'chevron-down': [
    'm6 9 6 6 6-6',
  ],
  'chevron-up': [
    'm18 15-6-6-6 6',
  ],
  'arrow-up': [
    'm5 12 7-7 7 7',
    'M12 19V5',
  ],
  'arrow-down': [
    'M12 5v14',
    'm19 12-7 7-7-7',
  ],
  'arrow-right': [
    'M5 12h14',
    'm12 5 7 7-7 7',
  ],
  'arrow-left': [
    'm12 19-7-7 7-7',
    'M19 12H5',
  ],
  'info': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    'M12 16v-4',
    'M12 8h.01',
  ],
  'alert': [
    'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
    'M12 9v4',
    'M12 17h.01',
  ],
  'wrench': [
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  ],
  'terminal': [
    'm4 17 6-6-6-6',
    'M12 19h8',
  ],
  'braces': [
    'M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1',
    'M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1',
  ],
  'reset': [
    'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8',
    'M3 3v5h5',
  ],
  'search-x': [
    'm13.5 8.5-5 5',
    'm8.5 8.5 5 5',
    ['circle', { cx: 11, cy: 11, r: 8 }],
    'm21 21-4.3-4.3',
  ],
  'euro': [
    'M4 10h12',
    'M4 14h9',
    'M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2',
  ],
  'menu': [
    'M4 6h16',
    'M4 12h16',
    'M4 18h16',
  ],
  'store': [
    'm2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7',
    'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8',
    'M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4',
    'M2 7h20',
    'M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7',
  ],
  'key': [
    'm15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4',
    'm21 2-9.6 9.6',
    ['circle', { cx: 7.5, cy: 15.5, r: 5.5 }],
  ],
  'timer': [
    'M10 2h4',
    'm12 14 3-3',
    ['circle', { cx: 12, cy: 14, r: 8 }],
  ],
  'circle-check': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    'm9 12 2 2 4-4',
  ],
  'circle-pause': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    'M10 15V9',
    'M14 15V9',
  ],
  'sparkles': [
    'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
    'M20 3v4',
    'M22 5h-4',
    'M4 17v2',
    'M5 18H3',
  ],
};

export function createIcon(name, { size = 20, label } = {}) {
  const icon = createSvgElement('svg', {
    'class': 'icon',
    'viewBox': '0 0 24 24',
    'width': size,
    'height': size,
    'fill': 'none',
    'stroke': 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  applyLabel(icon, label);

  // hasOwn statt "in": Namen wie "constructor" sind keine Icons
  if (!Object.hasOwn(ICONS, name)) {
    console.warn(`Unbekanntes Icon "${name}"`);
    return icon;
  }

  for (const shape of ICONS[name]) {
    const [tag, attributes] = typeof shape === 'string' ? ['path', { d: shape }] : shape;
    icon.append(createSvgElement(tag, attributes));
  }
  return icon;
}

// Ersetzt Platzhalter wie <span data-icon="clock" data-size="16" class="x"></span>
// (oder <svg data-icon="…">) durch das Icon. Klassen bleiben erhalten; ein
// aria-label bzw. data-label am Platzhalter wird zur Beschriftung.
export function hydrateIcons(root = document) {
  for (const placeholder of root.querySelectorAll('svg[data-icon], span[data-icon]')) {
    const size = Number(placeholder.getAttribute('data-size'));
    const label = placeholder.getAttribute('aria-label') || placeholder.getAttribute('data-label');
    const icon = createIcon(placeholder.getAttribute('data-icon'), {
      size: Number.isFinite(size) && size > 0 ? size : 20,
      label: label || undefined,
    });
    for (const className of placeholder.classList) {
      icon.classList.add(className);
    }
    placeholder.replaceWith(icon);
  }
}

// ---------------------------------------------------------------------------
// Fahrrad-Illustrationen: Seitenansicht im viewBox 160 × 100, Fahrtrichtung
// nach rechts, Boden bei y ≈ 92. Winkel in Grad, 0 = nach vorne (rechts),
// 90 = nach oben.

const REAR_HUB = [38, 66];
const FRONT_HUB = [122, 66];
const WHEEL_RADIUS = 22;
const FENDER_RADIUS = 25.5;
// So viel breiter ist die Kontur (bike-frame-outline) als der Rahmen darüber
const OUTLINE_EXTRA = 1.8;

// Diese Klassen sind Flächen, alle anderen reine Striche
const FILLED_CLASSES = new Set(['bike-shadow', 'bike-hub', 'bike-battery', 'bike-bolt']);

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Zahl kurz ausgeben (höchstens zwei Nachkommastellen)
function formatNumber(value) {
  return String(Math.round(value * 100) / 100);
}

// Punkt im Abstand `length` von `from` in Richtung `angle`
function polar([x, y], angle, length) {
  const radians = toRadians(angle);
  return [x + Math.cos(radians) * length, y - Math.sin(radians) * length];
}

// Punkt auf der Strecke von a nach b (t = 0 … 1)
function lerp([ax, ay], [bx, by], t) {
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

// Sitzrohr und Lenkachse: Gerade durch `origin`, um `angle` Grad zur
// Waagrechten nach hinten geneigt. Liefert ihren Punkt in der Höhe y.
function lineAtHeight(origin, angle, y) {
  return [origin[0] - (origin[1] - y) / Math.tan(toRadians(angle)), y];
}

// Pfadangabe aus Befehlen und Punkten, z. B. path('M', a, 'L', b)
function path(...segments) {
  return segments
    .map(segment => (typeof segment === 'string'
      ? segment
      : `${formatNumber(segment[0])} ${formatNumber(segment[1])}`))
    .join(' ');
}

// Eine Form der Illustration ist [Klasse, Elementname, Attribute]
function strokedPath(className, width, ...segments) {
  return [className, 'path', { 'd': path(...segments), 'stroke-width': width }];
}

function part(width, ...segments) {
  return strokedPath('bike-part', width, ...segments);
}

function accent(width, ...segments) {
  return strokedPath('bike-accent', width, ...segments);
}

// Rahmenrohr (noch ohne Klasse, siehe frame)
function tube(width, ...segments) {
  return { d: path(...segments), width };
}

// Rahmen: zuerst alle Konturen, direkt darüber dieselben Pfade als Rahmen.
// So überdeckt keine Kontur ein anderes Rohr.
function frame(tubes) {
  return [
    ...tubes.map(({ d, width }) => (
      ['bike-frame-outline', 'path', { 'd': d, 'stroke-width': formatNumber(width + OUTLINE_EXTRA) }]
    )),
    ...tubes.map(({ d, width }) => ['bike-frame', 'path', { 'd': d, 'stroke-width': width }]),
  ];
}

function shadow() {
  return ['bike-shadow', 'ellipse', { cx: 80, cy: 91.6, rx: 62, ry: 2.6 }];
}

// Reifen, Felge und auf Wunsch Stollen (Mountainbike) und Bremsscheibe
function wheel([cx, cy], { tire = 3.4, knobs = false, disc = false } = {}) {
  const shapes = [['bike-wheel', 'circle', { cx, cy, 'r': WHEEL_RADIUS, 'stroke-width': tire }]];

  if (knobs) {
    // Kurze Striche knapp außerhalb des Reifens, gleichmäßig verteilt
    const radius = WHEEL_RADIUS + tire / 2 + 0.1;
    const period = (2 * Math.PI * radius) / 34;
    shapes.push(['bike-wheel', 'circle', {
      cx,
      cy,
      'r': formatNumber(radius),
      'stroke-width': 2.2,
      'stroke-linecap': 'butt',
      'stroke-dasharray': `${formatNumber(period * 0.46)} ${formatNumber(period * 0.54)}`,
    }]);
  }

  const rimRadius = WHEEL_RADIUS - tire / 2 - 1.7;
  shapes.push(['bike-rim', 'circle', { cx, cy, 'r': formatNumber(rimRadius), 'stroke-width': 1.3 }]);
  if (disc) {
    shapes.push(['bike-rim', 'circle', { cx, cy, 'r': 5.2, 'stroke-width': 1.3 }]);
  }
  return shapes;
}

function hub([cx, cy]) {
  return ['bike-hub', 'circle', { cx, cy, r: 2.4 }];
}

// Schutzblech als Kreisbogen um die Nabe, von Winkel `from` bis `to` (gegen den Uhrzeigersinn)
function fender(center, from, to) {
  const start = polar(center, from, FENDER_RADIUS);
  const end = polar(center, to, FENDER_RADIUS);
  const largeArc = to - from > 180 ? 1 : 0;
  return accent(2.2, 'M', start, `A ${FENDER_RADIUS} ${FENDER_RADIUS} 0 ${largeArc} 0`, end);
}

// Äußere Tangente an zwei Kreise (Kette zwischen Kettenblatt und Ritzel).
// side = 1 liefert das obere, side = -1 das untere Kettentrum.
function chainTangent(from, fromRadius, to, toRadius, side) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const distance = Math.hypot(dx, dy);
  const [ex, ey] = [dx / distance, dy / distance];
  const cos = (fromRadius - toRadius) / distance;
  const sin = Math.sqrt(1 - cos * cos);
  const normal = [ex * cos - ey * sin * side, ey * cos + ex * sin * side];
  return [
    [from[0] + fromRadius * normal[0], from[1] + fromRadius * normal[1]],
    [to[0] + toRadius * normal[0], to[1] + toRadius * normal[1]],
  ];
}

const CHAINRING_RADIUS = 6;
const COG_RADIUS = 3;

// Kette und Ritzel liegen hinter dem Rahmen
function chain(bb) {
  const [upperStart, upperEnd] = chainTangent(bb, CHAINRING_RADIUS, REAR_HUB, COG_RADIUS, 1);
  const [lowerStart, lowerEnd] = chainTangent(bb, CHAINRING_RADIUS, REAR_HUB, COG_RADIUS, -1);
  return [
    part(1.3, 'M', upperStart, 'L', upperEnd, 'M', lowerStart, 'L', lowerEnd),
    ['bike-part', 'circle', { 'cx': REAR_HUB[0], 'cy': REAR_HUB[1], 'r': COG_RADIUS, 'stroke-width': 1.4 }],
  ];
}

// Kettenblatt, Kurbel und Pedal liegen vor dem Rahmen
function crank(bb) {
  const pedal = polar(bb, -55, 10);
  return [
    ['bike-part', 'circle', { 'cx': bb[0], 'cy': bb[1], 'r': CHAINRING_RADIUS, 'stroke-width': 2 }],
    part(3, 'M', bb, 'L', pedal),
    part(2.8, 'M', [pedal[0] - 3, pedal[1]], 'L', [pedal[0] + 3, pedal[1]]),
  ];
}

// Sattelstütze vom Sitzrohr aus in dessen Richtung; liefert auch den Sattelpunkt
function seatpost(seatTop, angle, length) {
  const top = polar(seatTop, 180 - angle, length);
  return { shape: part(2.6, 'M', seatTop, 'L', top), top };
}

// Sattel als schmale, gefüllt wirkende Form: hinten breit, vorne spitz.
// Die Form ist dünner als der Strich, dadurch entsteht keine Lücke.
function saddle([x, y], { back = 6.2, nose = 6.6, height = 1.4 } = {}) {
  return part(2.2,
    'M', [x - back, y - 1.2],
    'L', [x - back - 0.2, y - 1.2 - height],
    'Q', [x - 1.5, y - 2.4 - height], [x + nose, y - 1.6],
    'Q', [x, y - 1], [x - back, y - 1.2],
    'Z');
}

// Gabelschaft über dem Steuerrohr, dann der Vorbau nach vorne zur Lenkerklemme
function stem(headTop, steererTop, clamp) {
  return part(2.6, 'M', headTop, 'L', steererTop, 'L', clamp);
}

// Lenker in Seitenansicht: von der Klemme in einem flachen Bogen nach hinten,
// am Ende der etwas dickere Griff
function handlebar([x, y], { reach, rise, grip = 4 }) {
  const bend = [x - reach, y - rise];
  const gripEnd = [x - reach - grip, y - rise + 0.8];
  return [
    part(2.8, 'M', [x, y], 'Q', [x - reach * 0.3, y - rise * 1.4], bend, 'L', gripEnd),
    part(3.8, 'M', lerp(bend, gripEnd, 0.15), 'L', gripEnd),
  ];
}

// ---------------------------------------------------------------------------
// Die einzelnen Typen. Jede Funktion liefert die Formen in Zeichenreihenfolge.

// Neutrales Standardrad: klassischer Diamantrahmen ohne Zubehör
function drawStandardBike() {
  const bb = [72, 70];
  const seat = y => lineAtHeight(bb, 73, y);
  const steer = y => lineAtHeight(FRONT_HUB, 72, y);
  const seatTop = seat(36);
  const headTop = steer(32.5);
  const headBottom = steer(44);
  const steererTop = steer(29.5);
  const clamp = polar(steererTop, 15, 6);
  const post = seatpost(seatTop, 73, 7.5);

  return [
    shadow(),
    ...wheel(REAR_HUB),
    ...wheel(FRONT_HUB),
    ...chain(bb),
    ...frame([
      tube(3.6, 'M', REAR_HUB, 'L', bb, 'L', steer(42.5)),
      tube(3, 'M', REAR_HUB, 'L', seat(38.5)),
      tube(3.6, 'M', bb, 'L', seatTop, 'L', steer(35)),
      tube(5, 'M', headTop, 'L', headBottom),
      tube(3.2, 'M', headBottom, 'L', FRONT_HUB),
    ]),
    post.shape,
    saddle(post.top),
    stem(headTop, steererTop, clamp),
    ...handlebar(clamp, { reach: 4.5, rise: 2.2, grip: 3.5 }),
    hub(REAR_HUB),
    hub(FRONT_HUB),
    ...crank(bb),
  ];
}

// Citybike: tiefer Einstieg, Korb vorne, Schutzbleche, aufrechter Lenker
function drawCitybike() {
  const bb = [72, 70];
  const seat = y => lineAtHeight(bb, 70, y);
  // Lenkachse etwas hinter der Nabe: die Gabel ist nach vorne gebogen
  const steer = y => lineAtHeight([FRONT_HUB[0] - 3.8, FRONT_HUB[1]], 68, y);
  const seatTop = seat(39);
  const headTop = steer(30.5);
  const headBottom = steer(42);
  // Hoher Vorbau, der Lenker schwingt weit nach hinten
  const steererTop = steer(27.5);
  const clamp = polar(steererTop, 50, 4.5);
  const post = seatpost(seatTop, 70, 10.5);

  // Korb über dem Vorderrad: oben breiter als unten
  const basketTop = 23;
  const basketBottom = 36.5;
  const basket = {
    topLeft: [116, basketTop],
    topRight: [140, basketTop],
    bottomRight: [138, basketBottom],
    bottomLeft: [118, basketBottom],
  };
  const basketLeftAt = t => lerp(basket.topLeft, basket.bottomLeft, t);
  const basketRightAt = t => lerp(basket.topRight, basket.bottomRight, t);
  const slats = [0.25, 0.5, 0.75].map(t => [
    lerp(basket.topLeft, basket.topRight, t),
    lerp(basket.bottomLeft, basket.bottomRight, t),
  ]);

  return [
    shadow(),
    ...wheel(REAR_HUB),
    ...wheel(FRONT_HUB),
    fender(REAR_HUB, 62, 195),
    fender(FRONT_HUB, 12, 138),
    ...chain(bb),
    ...frame([
      tube(3.4, 'M', REAR_HUB, 'L', bb),
      tube(3, 'M', REAR_HUB, 'L', seat(41)),
      tube(3.6, 'M', bb, 'L', seatTop),
      // Tiefer Einstieg: zwei geschwungene Rohre vom Steuerrohr hinunter
      tube(3.6, 'M', steer(34.5), 'C', [98.5, 42.5], [86, 59.5], seat(59.5)),
      tube(3.6, 'M', steer(40.5), 'C', [101, 50], [90, 68.5], bb),
      tube(5, 'M', headTop, 'L', headBottom),
      tube(3.2, 'M', headBottom, 'L', steer(56), 'Q', steer(63.5), FRONT_HUB),
    ]),
    post.shape,
    saddle(post.top, { back: 6.4, nose: 5.4, height: 2 }),
    stem(headTop, steererTop, clamp),
    ...handlebar(clamp, { reach: 8, rise: 2.6, grip: 4.5 }),
    // Korb mit Halterung am Steuerrohr
    accent(1.8, 'M', steer(33), 'L', basketLeftAt(0.8)),
    accent(2, 'M', basket.topLeft, 'L', basket.topRight, 'L', basket.bottomRight, 'L', basket.bottomLeft, 'Z'),
    accent(1.2, 'M', basketLeftAt(0.5), 'L', basketRightAt(0.5)),
    ...slats.map(([top, bottom]) => accent(1.2, 'M', top, 'L', bottom)),
    accent(2.6, 'M', [basket.topLeft[0] - 0.8, basketTop], 'L', [basket.topRight[0] + 0.8, basketTop]),
    // Kettenschutz über dem oberen Kettentrum, vorne um das Kettenblatt gebogen
    accent(2.4, 'M', [41, 61.4], 'L', [bb[0], bb[1] - 7.8], `A 7.8 7.8 0 0 1`, [bb[0] + 7.8, bb[1]]),
    hub(REAR_HUB),
    hub(FRONT_HUB),
    ...crank(bb),
  ];
}

// E-Bike: Akku am Unterrohr mit Blitz, Mittelmotor, Schutzbleche, moderner Rahmen
function drawEBike() {
  const bb = [72, 70];
  const seat = y => lineAtHeight(bb, 72, y);
  const steer = y => lineAtHeight(FRONT_HUB, 70, y);
  const seatTop = seat(39);
  const headTop = steer(32);
  const headBottom = steer(43.5);
  const downTubeEnd = steer(42);
  const steererTop = steer(28);
  const clamp = polar(steererTop, 25, 6);
  const post = seatpost(seatTop, 72, 8.5);

  // Akku liegt auf dem Unterrohr, parallel dazu
  const downTubeAngle = Math.atan2(bb[1] - downTubeEnd[1], downTubeEnd[0] - bb[0]) * 180 / Math.PI;
  const batteryCenter = polar(lerp(bb, downTubeEnd, 0.52), downTubeAngle + 90, 4.6);
  const batteryLength = 26;
  const batteryHeight = 7.4;
  const [bx, by] = batteryCenter;
  // Blitz, aufrecht in der Akkumitte
  const bolt = [[0.9, -3.2], [-1.8, 0.5], [-0.1, 0.5], [-0.9, 3.2], [1.8, -0.5], [0.1, -0.5]]
    .map(([x, y]) => `${formatNumber(bx + x)},${formatNumber(by + y)}`)
    .join(' ');

  return [
    shadow(),
    ...wheel(REAR_HUB, { tire: 3.8, disc: true }),
    ...wheel(FRONT_HUB, { tire: 3.8, disc: true }),
    fender(REAR_HUB, 60, 195),
    fender(FRONT_HUB, 10, 140),
    ...chain(bb),
    ...frame([
      tube(3.4, 'M', REAR_HUB, 'L', bb),
      tube(3, 'M', REAR_HUB, 'L', seat(45.5)),
      tube(3.6, 'M', bb, 'L', seatTop),
      tube(5, 'M', bb, 'L', downTubeEnd),
      // Mittelmotor: in Rahmenfarbe verkleidet, als Verdickung am Tretlager
      tube(10, 'M', bb, 'L', polar(bb, downTubeAngle, 5)),
      tube(3.6, 'M', steer(34.5), 'Q', [88, 35], seat(47)),
      tube(5.2, 'M', headTop, 'L', headBottom),
      tube(3.6, 'M', headBottom, 'L', FRONT_HUB),
    ]),
    ['bike-battery', 'rect', {
      x: formatNumber(bx - batteryLength / 2),
      y: formatNumber(by - batteryHeight / 2),
      width: batteryLength,
      height: batteryHeight,
      rx: 2.6,
      transform: `rotate(${formatNumber(-downTubeAngle)} ${formatNumber(bx)} ${formatNumber(by)})`,
    }],
    ['bike-bolt', 'polygon', { points: bolt }],
    post.shape,
    saddle(post.top),
    stem(headTop, steererTop, clamp),
    ...handlebar(clamp, { reach: 5.5, rise: 2.6 }),
    hub(REAR_HUB),
    hub(FRONT_HUB),
    ...crank(bb),
  ];
}

// Mountainbike: abfallendes Oberrohr, Stollenreifen, Federgabel, gerader Lenker
function drawMountainbike() {
  const bb = [73, 68];
  const seat = y => lineAtHeight(bb, 74, y);
  const steer = y => lineAtHeight(FRONT_HUB, 67, y);
  const seatTop = seat(41);
  const headTop = steer(33);
  const headBottom = steer(44);
  const steererTop = steer(30);
  const clamp = polar(steererTop, 8, 6.5);
  const post = seatpost(seatTop, 74, 11);

  return [
    shadow(),
    ...wheel(REAR_HUB, { tire: 5, knobs: true, disc: true }),
    ...wheel(FRONT_HUB, { tire: 5, knobs: true, disc: true }),
    ...chain(bb),
    // Federgabel: die dunklen Standrohre verschwinden oben in der Gabelkrone
    // und unten in den Tauchrohren, deshalb liegen sie hinter dem Rahmen
    part(3, 'M', headBottom, 'L', steer(55)),
    ...frame([
      tube(3.4, 'M', REAR_HUB, 'L', bb),
      tube(3, 'M', REAR_HUB, 'L', seat(46.5)),
      tube(3.6, 'M', bb, 'L', seatTop),
      tube(4.4, 'M', bb, 'L', steer(40.5)),
      tube(3.6, 'M', seat(45), 'L', steer(35)),
      // Steuerrohr mit Gabelkrone
      tube(5.2, 'M', headTop, 'L', headBottom),
      // Tauchrohre bis zur Nabe
      tube(5.4, 'M', steer(54), 'L', FRONT_HUB),
    ]),
    post.shape,
    saddle(post.top, { back: 5.8, nose: 7, height: 1 }),
    stem(headTop, steererTop, clamp),
    // Gerader Lenker: kaum Bogen, dazu der Bremshebel nach vorne unten
    ...handlebar(clamp, { reach: 1.5, rise: 0.8, grip: 4.5 }),
    part(1.8, 'M', [clamp[0] - 1.2, clamp[1] - 0.2], 'L', [clamp[0] + 3.6, clamp[1] + 1.8]),
    hub(REAR_HUB),
    hub(FRONT_HUB),
    ...crank(bb),
  ];
}

// Trekkingbike: Diamantrahmen, Gepäckträger hinten, Schutzbleche, Licht vorne
function drawTrekkingbike() {
  const bb = [72, 70];
  const seat = y => lineAtHeight(bb, 73, y);
  const steer = y => lineAtHeight([FRONT_HUB[0] - 3.2, FRONT_HUB[1]], 70, y);
  const seatTop = seat(36);
  const headTop = steer(32.5);
  const headBottom = steer(43.5);
  const steererTop = steer(29);
  const clamp = polar(steererTop, 20, 6);
  const post = seatpost(seatTop, 73, 7.5);

  // Gepäckträger knapp über dem hinteren Schutzblech
  const rackY = 36.8;
  const rackFront = seat(rackY);
  const rackBack = [16.5, rackY];

  // Scheinwerfer vor dem Vorbau
  const lamp = [clamp[0] + 3, clamp[1] + 3.2];

  return [
    shadow(),
    ...wheel(REAR_HUB),
    ...wheel(FRONT_HUB),
    fender(REAR_HUB, 62, 195),
    fender(FRONT_HUB, 12, 140),
    ...chain(bb),
    ...frame([
      tube(3.6, 'M', REAR_HUB, 'L', bb, 'L', steer(42)),
      tube(3, 'M', REAR_HUB, 'L', seat(38.5)),
      tube(3.6, 'M', bb, 'L', seatTop, 'L', steer(35)),
      tube(5, 'M', headTop, 'L', headBottom),
      tube(3.2, 'M', headBottom, 'L', steer(56), 'Q', steer(63), FRONT_HUB),
    ]),
    // Gepäckträger: Auflage und zwei Streben zur Hinterradachse
    accent(2.2, 'M', rackFront, 'L', rackBack, 'Q', [rackBack[0] - 1.6, rackY], [rackBack[0] - 1.6, rackY + 2]),
    accent(1.8, 'M', [20, rackY], 'L', REAR_HUB),
    accent(1.8, 'M', [31, rackY], 'L', REAR_HUB),
    post.shape,
    saddle(post.top),
    stem(headTop, steererTop, clamp),
    ...handlebar(clamp, { reach: 5, rise: 2.4 }),
    // Scheinwerfer mit Halter und Lichtstrahlen
    accent(1.6, 'M', lerp(steererTop, clamp, 0.6), 'L', [lamp[0] - 2, lamp[1]]),
    accent(3.4, 'M', [lamp[0] - 2, lamp[1]], 'L', [lamp[0] + 1.5, lamp[1]]),
    accent(1.6, 'M', [lamp[0] + 3, lamp[1] - 1.8], 'L', [lamp[0] + 3, lamp[1] + 1.8]),
    accent(1.4, 'M', [lamp[0] + 6, lamp[1] - 2.6], 'L', [lamp[0] + 9, lamp[1] - 3.8]),
    accent(1.4, 'M', [lamp[0] + 6.4, lamp[1]], 'L', [lamp[0] + 9.8, lamp[1]]),
    accent(1.4, 'M', [lamp[0] + 6, lamp[1] + 2.6], 'L', [lamp[0] + 9, lamp[1] + 3.8]),
    hub(REAR_HUB),
    hub(FRONT_HUB),
    ...crank(bb),
  ];
}

// Zuordnung Typname (klein geschrieben) → Zeichenfunktion
const BIKE_DRAWINGS = new Map([
  ['citybike', drawCitybike],
  ['e-bike', drawEBike],
  ['mountainbike', drawMountainbike],
  ['trekkingbike', drawTrekkingbike],
]);

export function createBikeArt(bikeType, { label } = {}) {
  const art = createSvgElement('svg', {
    'class': 'bike-art',
    'viewBox': '0 0 160 100',
    'fill': 'none',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  applyLabel(art, label);

  const typeKey = String(bikeType ?? '').trim().toLowerCase();
  const draw = BIKE_DRAWINGS.get(typeKey) ?? drawStandardBike;

  for (const [className, tag, attributes] of draw()) {
    const paint = FILLED_CLASSES.has(className)
      ? { fill: 'currentColor', stroke: 'none' }
      : { fill: 'none', stroke: 'currentColor' };
    art.append(createSvgElement(tag, { class: className, ...paint, ...attributes }));
  }
  return art;
}

// ---------------------------------------------------------------------------
// Radfarben: die einzige Stelle mit Farbwerten. Die Seite setzt `hex` als
// CSS-Variable; `light` markiert helle Farben, bei denen der Rahmen eine
// dunkle Kontur (bike-frame-outline) braucht.

export const BIKE_COLORS = Object.freeze({
  'Rot': Object.freeze({ hex: '#d64541', light: false }),
  'Blau': Object.freeze({ hex: '#2f6fd6', light: false }),
  'Schwarz': Object.freeze({ hex: '#23272e', light: false }),
  'Grün': Object.freeze({ hex: '#2f8f5b', light: false }),
  'Gelb': Object.freeze({ hex: '#f2c230', light: true }),
  'Silber': Object.freeze({ hex: '#aab4be', light: true }),
  'Weiß': Object.freeze({ hex: '#ffffff', light: true }),
  'Orange': Object.freeze({ hex: '#ef7d22', light: false }),
});

const FALLBACK_COLOR = Object.freeze({ hex: '#8a94a0', light: false });

// Groß-/Kleinschreibung egal, Umlaute zählen – wie beim Filtern (src/query.js)
const colorCollator = new Intl.Collator('de', { sensitivity: 'accent' });

export function colorInfo(name) {
  if (typeof name !== 'string') {
    return FALLBACK_COLOR;
  }
  const match = Object.keys(BIKE_COLORS).find(key => colorCollator.compare(key, name.trim()) === 0);
  return match ? BIKE_COLORS[match] : FALLBACK_COLOR;
}
