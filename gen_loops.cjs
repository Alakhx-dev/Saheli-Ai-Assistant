const fs = require('fs');
const r2d = (rad) => rad * 180 / Math.PI;
const calc = (x1, y1, x2, y2) => {
  let dx = x2 - x1; let dy = y2 - y1;
  let ang = r2d(Math.atan2(dy, dx)) + 90;
  while(ang < 0) ang += 360;
  return ang;
};
const lerp = (a, b, t) => a + (b - a) * t;

const generateLoop = (name, points, opacity) => {
  let css = `@keyframes ${name} {\n`;
  let currentAngle = 0;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i+1];
    
    let angle = calc(p1.x, p1.y, p2.x, p2.y);
    
    if (i > 0) {
      while(angle - currentAngle > 180) angle -= 360;
      while(currentAngle - angle > 180) angle += 360;
    } else {
      currentAngle = angle;
    }
    
    const holdRatio = 0.8;
    const holdPct = lerp(p1.pct, p2.pct, holdRatio);
    const holdX = lerp(p1.x, p2.x, holdRatio);
    const holdY = lerp(p1.y, p2.y, holdRatio);
    const holdS = lerp(p1.s, p2.s, holdRatio);
    
    css += `  ${p1.pct}% { transform: translate3d(${p1.x}vw, ${p1.y}vh, 0) rotate(${currentAngle.toFixed(1)}deg) scale(${p1.s}); opacity: var(--path-opacity, ${opacity}); }\n`;
    css += `  ${holdPct.toFixed(1)}% { transform: translate3d(${holdX.toFixed(1)}vw, ${holdY.toFixed(1)}vh, 0) rotate(${currentAngle.toFixed(1)}deg) scale(${holdS.toFixed(3)}); opacity: var(--path-opacity, ${opacity}); }\n`;
    
    currentAngle = angle;
  }
  
  const last = points[points.length - 1];
  css += `  ${last.pct}% { transform: translate3d(${last.x}vw, ${last.y}vh, 0) rotate(${currentAngle.toFixed(1)}deg) scale(${last.s}); opacity: var(--path-opacity, ${opacity}); }\n`;
  css += `}\n`;
  
  return css;
};

const loops = [
  {
    name: 'cinematicPathLoop1',
    op: 0.58,
    pts: [
      {pct: 0, x: 15, y: 45, s: 0.52},
      {pct: 25, x: 48, y: 18, s: 0.58},
      {pct: 50, x: 82, y: 38, s: 0.54},
      {pct: 75, x: 52, y: 75, s: 0.5},
      {pct: 100, x: 15, y: 45, s: 0.52}
    ]
  },
  {
    name: 'cinematicPathLoop2',
    op: 0.54,
    pts: [
      {pct: 0, x: 85, y: 25, s: 0.48},
      {pct: 25, x: 52, y: 72, s: 0.54},
      {pct: 50, x: 18, y: 35, s: 0.5},
      {pct: 75, x: 48, y: 18, s: 0.46},
      {pct: 100, x: 85, y: 25, s: 0.48}
    ]
  },
  {
    name: 'cinematicPathLoop3',
    op: 0.52,
    pts: [
      {pct: 0, x: 25, y: 68, s: 0.5},
      {pct: 25, x: 50, y: 50, s: 0.55},
      {pct: 50, x: 75, y: 32, s: 0.48},
      {pct: 75, x: 50, y: 50, s: 0.52},
      {pct: 100, x: 25, y: 68, s: 0.5}
    ]
  },
  {
    name: 'cinematicPathLoop4',
    op: 0.56,
    pts: [
      {pct: 0, x: 75, y: 68, s: 0.52},
      {pct: 25, x: 50, y: 50, s: 0.48},
      {pct: 50, x: 25, y: 32, s: 0.54},
      {pct: 75, x: 50, y: 50, s: 0.5},
      {pct: 100, x: 75, y: 68, s: 0.52}
    ]
  },
  {
    name: 'cinematicPathLoop5',
    op: 0.5,
    pts: [
      {pct: 0, x: 18, y: 68, s: 0.5},
      {pct: 33, x: 82, y: 22, s: 0.54},
      {pct: 66, x: 50, y: 62, s: 0.48},
      {pct: 100, x: 18, y: 68, s: 0.5}
    ]
  },
  {
    name: 'cinematicPathLoop6',
    op: 0.48,
    pts: [
      {pct: 0, x: 82, y: 68, s: 0.48},
      {pct: 33, x: 18, y: 22, s: 0.52},
      {pct: 66, x: 50, y: 62, s: 0.46},
      {pct: 100, x: 82, y: 68, s: 0.48}
    ]
  }
];

let res = '';
for(let l of loops) res += generateLoop(l.name, l.pts, l.op);
fs.writeFileSync('generated_loops.txt', res);
console.log('Done!');
