'use strict';

// Change these named values for the live classroom remix.
const CONFIG = {
  FIREFLY_COUNT: 24,
  TARGET_RESCUED: 16,
  ROUND_SECONDS: 50,
  BEACON_LIMIT: 3,
  BEACON_RADIUS: 250,              // visible and effective signal radius
  BEACON_LINK_MAX: 235,            // every waypoint must connect to the previous one
  BEACON_CAPTURE_RADIUS: 43,       // a firefly must actually reach a light to pass it
  BEACON_STRENGTH: 0.034,
  GOAL_INFLUENCE_RADIUS: 285,      // the Moon Gate cannot attract from across the map
  GOAL_STRENGTH: 0.012,
  MIN_ROUTE_PROGRESS: 65,          // each new light must move the route towards the gate
  FLOCK_RADIUS: 88,
  SEPARATION_RADIUS: 25,
  MAX_SPEED: 2.35,
  OBSTACLE_PADDING: 34,
  TREE_COLLISION_MARGIN: 8,
  BEACON_LIFETIME_MS: 60000,
  CANVAS_WIDTH: 1000,
  CANVAS_HEIGHT: 550
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startOverlay = document.getElementById('startOverlay');
const endOverlay = document.getElementById('endOverlay');
const startButton = document.getElementById('startButton');
const againButton = document.getElementById('againButton');
const placeButton = document.getElementById('placeButton');
const savedValue = document.getElementById('savedValue');
const lostValue = document.getElementById('lostValue');
const savedBar = document.getElementById('savedBar');
const lightsValue = document.getElementById('lightsValue');
const lightPips = document.getElementById('lightPips');
const timeValue = document.getElementById('timeValue');
const timeBar = document.getElementById('timeBar');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const instructionTitle = document.getElementById('instructionTitle');
const instructionText = document.getElementById('instructionText');
const endKicker = document.getElementById('endKicker');
const endTitle = document.getElementById('endTitle');
const endMessage = document.getElementById('endMessage');
const endSymbol = document.getElementById('endSymbol');

const W = CONFIG.CANVAS_WIDTH;
const H = CONFIG.CANVAS_HEIGHT;
const goal = { x: 925, y: 275, radius: 47 };
const homeAnchor = { x: 150, y: 275 };
const obstacles = [
  { x: 420, y: 170, r: 72, seed: 2 },
  { x: 625, y: 365, r: 89, seed: 5 },
  { x: 765, y: 115, r: 48, seed: 8 }
];

let fireflies = [];
let beacons = [];
let particles = [];
let saved = 0;
let lost = 0;
let lightsUsed = 0;
let timeLeft = CONFIG.ROUND_SECONDS;
let running = false;
let finished = false;
let lastFrame = 0;
let startTime = 0;
let elapsed = 0;
let cursor = { x: 270, y: 275, visible: false };
let pointer = { x: 270, y: 275, inside: false };
let animationId = 0;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function createFireflies() {
  fireflies = Array.from({ length: CONFIG.FIREFLY_COUNT }, (_, index) => {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.4, 1.1);
    return {
      id: index,
      x: rand(72, 188),
      y: rand(82, H - 82),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      phase: rand(0, Math.PI * 2),
      size: rand(1.6, 3.1),
      trail: [],
      nextBeaconIndex: 0
    };
  });
}

function createBackgroundParticles() {
  particles = Array.from({ length: 78 }, () => ({
    x: rand(0, W), y: rand(0, H), r: rand(0.35, 1.25),
    alpha: rand(0.12, 0.48), phase: rand(0, 7)
  }));
}

function resetGame() {
  createFireflies();
  beacons = [];
  saved = 0;
  lost = 0;
  lightsUsed = 0;
  timeLeft = CONFIG.ROUND_SECONDS;
  elapsed = 0;
  running = false;
  finished = false;
  cursor = { x: 270, y: 275, visible: false };
  startOverlay.classList.remove('hidden');
  endOverlay.classList.add('hidden');
  placeButton.disabled = true;
  instructionTitle.textContent = 'Build a connected light path';
  instructionText.textContent = 'Start near the fireflies. Each new light must reach the previous one.';
  setStatus('WAITING FOR YOU', false);
  updateHud();
  draw(0);
}

function setStatus(message, live) {
  statusText.textContent = message;
  statusDot.classList.toggle('live', Boolean(live));
}

function updateHud() {
  savedValue.textContent = String(saved).padStart(2, '0');
  lostValue.textContent = String(lost).padStart(2, '0');
  savedBar.style.width = `${Math.min(100, saved / CONFIG.TARGET_RESCUED * 100)}%`;
  lightsValue.textContent = String(Math.max(0, CONFIG.BEACON_LIMIT - lightsUsed)).padStart(2, '0');
  timeValue.textContent = String(Math.max(0, Math.ceil(timeLeft))).padStart(2, '0');
  timeBar.style.width = `${Math.max(0, timeLeft / CONFIG.ROUND_SECONDS * 100)}%`;
  const pips = lightPips.querySelectorAll('i');
  pips.forEach((pip, index) => pip.classList.toggle('used', index >= CONFIG.BEACON_LIMIT - lightsUsed));
  lightPips.setAttribute('aria-label', `${Math.max(0, CONFIG.BEACON_LIMIT - lightsUsed)} lights remaining`);
  placeButton.disabled = !running || lightsUsed >= CONFIG.BEACON_LIMIT;
}

function startGame() {
  createFireflies();
  beacons = [];
  saved = 0;
  lost = 0;
  lightsUsed = 0;
  timeLeft = CONFIG.ROUND_SECONDS;
  elapsed = 0;
  running = true;
  finished = false;
  startTime = performance.now();
  lastFrame = startTime;
  cursor = { x: 280, y: 275, visible: true };
  startOverlay.classList.add('hidden');
  endOverlay.classList.add('hidden');
  instructionTitle.textContent = 'Place light 1 near the clearing';
  instructionText.textContent = 'Connect all 3 lights in order. Amber rings are dangerous — guide around the trees.';
  setStatus('THE SWARM IS MOVING', true);
  updateHud();
  canvas.focus({ preventScroll: true });
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function finishGame(won) {
  running = false;
  finished = true;
  placeButton.disabled = true;
  setStatus(won ? 'MISSION COMPLETE' : 'NIGHT IS OVER', false);
  endKicker.textContent = won ? 'THE MOON GATE IS OPEN' : 'THE NIGHT HAS ENDED';
  endTitle.textContent = won ? 'You brought them home.' : (fireflies.length === 0 ? 'The forest went dark.' : 'Some lights got lost.');
  endMessage.textContent = won
    ? `${saved} fireflies found the Moon Gate. ${lost} were lost in the trees.`
    : `${saved} of ${CONFIG.TARGET_RESCUED} needed fireflies made it home. ${lost} were lost in the trees. Try a safer route.`;
  endSymbol.textContent = won ? '✦' : '☾';
  endOverlay.classList.remove('hidden');
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width * W, 20, W - 20),
    y: clamp((event.clientY - rect.top) / rect.height * H, 20, H - 20)
  };
}

function placeBeacon(point = cursor) {
  if (!running || lightsUsed >= CONFIG.BEACON_LIMIT) return;
  const safePoint = {
    x: clamp(point.x, 35, W - 75),
    y: clamp(point.y, 35, H - 35)
  };

  const blockedByTree = obstacles.some(obstacle =>
    distance(safePoint, obstacle) < obstacle.r + CONFIG.TREE_COLLISION_MARGIN
  );
  if (blockedByTree) {
    instructionTitle.textContent = 'Too close to a tree';
    instructionText.textContent = 'Stay outside the amber danger ring. Fireflies can be lost if they hit a trunk.';
    setStatus('INVALID PLACEMENT — TREE', false);
    return;
  }

  const previousPoint = lightsUsed === 0 ? homeAnchor : beacons[beacons.length - 1];
  const linkDistance = distance(safePoint, previousPoint);
  if (linkDistance > CONFIG.BEACON_LINK_MAX) {
    instructionTitle.textContent = 'That light is out of reach';
    instructionText.textContent = lightsUsed === 0
      ? 'Place your first light closer to the firefly clearing.'
      : 'Place this light inside the previous light’s dotted signal circle.';
    setStatus('INVALID PLACEMENT — SIGNAL GAP', false);
    return;
  }

  const previousGoalDistance = distance(previousPoint, goal);
  const newGoalDistance = distance(safePoint, goal);
  if (previousGoalDistance - newGoalDistance < CONFIG.MIN_ROUTE_PROGRESS) {
    instructionTitle.textContent = 'The route must move forward';
    instructionText.textContent = 'Place each new light noticeably closer to the Moon Gate.';
    setStatus('INVALID PLACEMENT — NO PROGRESS', false);
    return;
  }

  if (lightsUsed === CONFIG.BEACON_LIMIT - 1 && newGoalDistance > CONFIG.GOAL_INFLUENCE_RADIUS - 25) {
    instructionTitle.textContent = 'The final light is too far away';
    instructionText.textContent = 'Your last light must be close enough for the Moon Gate to pull the swarm in.';
    setStatus('INVALID PLACEMENT — GATE OUT OF REACH', false);
    return;
  }

  beacons.push({ ...safePoint, id: lightsUsed + 1, born: performance.now(), phase: rand(0, 6) });
  lightsUsed += 1;
  cursor = { ...safePoint, visible: true };
  const nextNumber = lightsUsed + 1;
  instructionTitle.textContent = lightsUsed >= CONFIG.BEACON_LIMIT
    ? 'Your route is complete — watch the swarm'
    : `Light ${nextNumber}: extend the route`;
  instructionText.textContent = lightsUsed >= CONFIG.BEACON_LIMIT
    ? 'Each firefly must reach all 3 lights before the Moon Gate can guide it home.'
    : 'Stay inside the previous signal circle and move closer to the Moon Gate.';
  setStatus(`LIGHT ${lightsUsed} CONNECTED — ROUTE EXTENDED`, true);
  updateHud();
}
function moveCursor(dx, dy) {
  if (!running) return;
  cursor.visible = true;
  cursor.x = clamp(cursor.x + dx, 25, W - 25);
  cursor.y = clamp(cursor.y + dy, 25, H - 25);
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(32, now - lastFrame || 16.67);
  lastFrame = now;
  elapsed = now - startTime;
  timeLeft = Math.max(0, CONFIG.ROUND_SECONDS - elapsed / 1000);
  updateFireflies(dt / 16.67, now);
  beacons = beacons.filter(beacon => now - beacon.born < CONFIG.BEACON_LIFETIME_MS);
  updateHud();
  draw(now);

  if (saved >= CONFIG.TARGET_RESCUED) {
    finishGame(true);
  } else if (timeLeft <= 0 || fireflies.length === 0) {
    finishGame(false);
  } else {
    animationId = requestAnimationFrame(loop);
  }
}

function updateFireflies(step, now) {
  const active = [];
  for (const fly of fireflies) {
    let alignX = 0, alignY = 0, centerX = 0, centerY = 0;
    let separateX = 0, separateY = 0, neighbours = 0;
    for (const other of fireflies) {
      if (other === fly) continue;
      const dx = fly.x - other.x;
      const dy = fly.y - other.y;
      const d = Math.hypot(dx, dy);
      if (d < CONFIG.FLOCK_RADIUS && d > 0.001) {
        alignX += other.vx;
        alignY += other.vy;
        centerX += other.x;
        centerY += other.y;
        neighbours += 1;
      }
      if (d < CONFIG.SEPARATION_RADIUS && d > 0.001) {
        separateX += dx / d;
        separateY += dy / d;
      }
    }

    let steerX = 0;
    let steerY = 0;
    if (neighbours > 0) {
      const avgVX = alignX / neighbours;
      const avgVY = alignY / neighbours;
      const avgX = centerX / neighbours;
      const avgY = centerY / neighbours;
      steerX += (avgVX - fly.vx) * 0.034;
      steerY += (avgVY - fly.vy) * 0.034;
      steerX += (avgX - fly.x) * 0.0009;
      steerY += (avgY - fly.y) * 0.0009;
    }
    steerX += separateX * 0.055;
    steerY += separateY * 0.055;

    // Agency: lights are ordered waypoints, not universal magnets.
    // A fly can advance only by physically reaching the current waypoint.
    // Emergence: local alignment, cohesion and separation shape the swarm around that route.
    let target = null;
    if (fly.nextBeaconIndex < beacons.length) {
      target = beacons[fly.nextBeaconIndex];
      const targetDistance = distance(fly, target);
      if (targetDistance <= CONFIG.BEACON_CAPTURE_RADIUS) {
        fly.nextBeaconIndex += 1;
        target = fly.nextBeaconIndex < beacons.length ? beacons[fly.nextBeaconIndex] : null;
      }
    }

    if (target) {
      const d = distance(fly, target);
      // A light only influences fireflies inside its visible signal radius.
      if (d <= CONFIG.BEACON_RADIUS) {
        const falloff = 1 - d / CONFIG.BEACON_RADIUS;
        steerX += (target.x - fly.x) * CONFIG.BEACON_STRENGTH * falloff;
        steerY += (target.y - fly.y) * CONFIG.BEACON_STRENGTH * falloff;
      }
    } else if (fly.nextBeaconIndex >= CONFIG.BEACON_LIMIT && lightsUsed >= CONFIG.BEACON_LIMIT) {
      // The Moon Gate attracts only nearby flies after all three waypoints are visited.
      const gateDistance = distance(fly, goal);
      if (gateDistance <= CONFIG.GOAL_INFLUENCE_RADIUS) {
        const falloff = 1 - gateDistance / CONFIG.GOAL_INFLUENCE_RADIUS;
        steerX += (goal.x - fly.x) * CONFIG.GOAL_STRENGTH * Math.max(0.18, falloff);
        steerY += (goal.y - fly.y) * CONFIG.GOAL_STRENGTH * Math.max(0.18, falloff);
      }
    } else if (fly.nextBeaconIndex > 0) {
      // If the next waypoint has not been placed yet, brake and gather around the last light.
      const lastVisited = beacons[fly.nextBeaconIndex - 1];
      if (lastVisited) {
        steerX += (lastVisited.x - fly.x) * 0.0032;
        steerY += (lastVisited.y - fly.y) * 0.0032;
      }
      if (lightsUsed < CONFIG.BEACON_LIMIT) {
        fly.vx *= 0.84;
        fly.vy *= 0.84;
      }
    } else {
      // Before the first light, the swarm stays in its original clearing.
      steerX += (homeAnchor.x - fly.x) * 0.0014;
      steerY += (homeAnchor.y - fly.y) * 0.0014;
    }

    // Tree trunks are solid obstacles and push the swarm away from their edge.
    for (const obstacle of obstacles) {
      const dx = fly.x - obstacle.x;
      const dy = fly.y - obstacle.y;
      const d = Math.hypot(dx, dy) || 1;
      const safeDistance = obstacle.r + CONFIG.OBSTACLE_PADDING;
      if (d < safeDistance) {
        const push = (safeDistance - d) / safeDistance;
        steerX += (dx / d) * push * 0.24;
        steerY += (dy / d) * push * 0.24;
      }
    }

    // Soft boundaries keep the swarm inside the playable forest.
    if (fly.x < 28) steerX += 0.07;
    if (fly.x > W - 24) steerX -= 0.07;
    if (fly.y < 28) steerY += 0.07;
    if (fly.y > H - 28) steerY -= 0.07;

    const breeze = Math.sin(now * 0.00042 + fly.phase) * 0.004;
    steerX += breeze;
    steerY += Math.cos(now * 0.00037 + fly.phase) * 0.004;
    fly.vx += steerX * step;
    fly.vy += steerY * step;

    const speed = Math.hypot(fly.vx, fly.vy) || 0.001;
    const maxSpeed = CONFIG.MAX_SPEED;
    if (speed > maxSpeed) {
      fly.vx = fly.vx / speed * maxSpeed;
      fly.vy = fly.vy / speed * maxSpeed;
    }
    const waitingAtCheckpoint = fly.nextBeaconIndex > 0 &&
      fly.nextBeaconIndex >= beacons.length && lightsUsed < CONFIG.BEACON_LIMIT;
    const minSpeed = waitingAtCheckpoint ? 0.12 : 0.65;
    if (speed < minSpeed) {
      fly.vx = fly.vx / speed * minSpeed;
      fly.vy = fly.vy / speed * minSpeed;
    }
    fly.x += fly.vx * step;
    fly.y += fly.vy * step;
    fly.x = clamp(fly.x, 12, W - 12);
    fly.y = clamp(fly.y, 12, H - 12);

    // Tree canopies are danger zones: collisions remove a firefly from the rescue.
    const hitTree = obstacles.some(obstacle =>
      distance(fly, obstacle) < obstacle.r + CONFIG.TREE_COLLISION_MARGIN
    );
    if (hitTree) {
      lost += 1;
      continue;
    }

    fly.trail.push({ x: fly.x, y: fly.y });
    if (fly.trail.length > 5) fly.trail.shift();

    const completedRoute = lightsUsed >= CONFIG.BEACON_LIMIT &&
      fly.nextBeaconIndex >= CONFIG.BEACON_LIMIT;
    if (completedRoute && distance(fly, goal) < goal.radius - 4) {
      saved += 1;
    } else {
      active.push(fly);
    }
  }
  fireflies = active;
}
function drawBackground(now) {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, '#0b1d17');
  gradient.addColorStop(.52, '#0b1815');
  gradient.addColorStop(1, '#102019');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  const mist = ctx.createRadialGradient(260, 270, 20, 260, 270, 520);
  mist.addColorStop(0, 'rgba(46,118,77,.19)');
  mist.addColorStop(1, 'rgba(46,118,77,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = 'rgba(178,224,191,.035)';
  ctx.lineWidth = 1;
  for (let x = 50; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 50; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();

  for (const p of particles) {
    const alpha = p.alpha * (.75 + Math.sin(now * .0007 + p.phase) * .25);
    ctx.fillStyle = `rgba(190,232,198,${alpha})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }

  // Soft forest silhouettes at the edges.
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const x = i * 92 - 15;
    const h = 25 + (i % 4) * 13;
    ctx.fillStyle = 'rgba(3,10,7,.42)';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 38, 0); ctx.lineTo(x + 19, h); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + 42, H); ctx.lineTo(x + 20, H - h - 5); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawObstacle(obstacle, now) {
  ctx.save();
  const glow = ctx.createRadialGradient(obstacle.x, obstacle.y, obstacle.r * .15, obstacle.x, obstacle.y, obstacle.r * 1.7);
  glow.addColorStop(0, 'rgba(2,9,6,.96)');
  glow.addColorStop(.65, 'rgba(5,16,11,.92)');
  glow.addColorStop(1, 'rgba(19,49,32,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(obstacle.x, obstacle.y, obstacle.r * 1.7, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#0a1510';
  ctx.strokeStyle = 'rgba(113,159,121,.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = i / 24 * Math.PI * 2;
    const wobble = 1 + Math.sin(a * 3 + obstacle.seed) * .045 + Math.cos(a * 5 + obstacle.seed) * .025;
    const x = obstacle.x + Math.cos(a) * obstacle.r * wobble;
    const y = obstacle.y + Math.sin(a) * obstacle.r * wobble;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(80,126,91,.09)';
  ctx.beginPath(); ctx.arc(obstacle.x - obstacle.r * .1, obstacle.y - obstacle.r * .1, obstacle.r * .58, .3, 2.5); ctx.stroke();

  // Amber dotted boundary matches the collision radius shown to the player.
  ctx.strokeStyle = 'rgba(245,157,126,.55)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.arc(obstacle.x, obstacle.y, obstacle.r + CONFIG.TREE_COLLISION_MARGIN, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGoal(now) {
  const pulse = 1 + Math.sin(now * .0022) * .035;
  const gateActive = lightsUsed >= CONFIG.BEACON_LIMIT;
  ctx.save();
  ctx.globalAlpha = gateActive ? 1 : 0.42;
  const halo = ctx.createRadialGradient(goal.x, goal.y, 3, goal.x, goal.y, 105);
  halo.addColorStop(0, 'rgba(205,249,212,.16)');
  halo.addColorStop(.45, 'rgba(126,211,155,.08)');
  halo.addColorStop(1, 'rgba(126,211,155,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(goal.x, goal.y, 105, 0, Math.PI * 2); ctx.fill();

  ctx.translate(goal.x, goal.y);
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = 'rgba(220,246,211,.24)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 64, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(209,246,212,.82)'; ctx.lineWidth = 2.3;
  ctx.shadowColor = '#bff5c9'; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(0, 0, 43, -.95, 2.45); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,232,181,.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 34, 2.7, 5.6); ctx.stroke();
  ctx.fillStyle = 'rgba(214,248,219,.1)';
  ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e5f5d9'; ctx.font = '10px "DM Mono", monospace'; ctx.textAlign = 'center';
  ctx.fillText(gateActive ? 'HOME' : 'LOCKED', 0, 4);
  ctx.restore();
}

function drawRoute(now) {
  const points = [homeAnchor, ...beacons];
  if (beacons.length === CONFIG.BEACON_LIMIT) points.push(goal);
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 8]);
  ctx.strokeStyle = 'rgba(163,240,194,.28)';
  if (beacons.length > 0) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(163,240,194,.72)';
  ctx.beginPath(); ctx.arc(homeAnchor.x, homeAnchor.y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.font = '9px "DM Mono", monospace';
  ctx.fillStyle = 'rgba(190,224,198,.62)';
  ctx.fillText('CLEARING', homeAnchor.x - 30, homeAnchor.y + 22);
  ctx.restore();
}

function drawBeacon(beacon, now) {
  const age = now - beacon.born;
  const remaining = 1 - age / CONFIG.BEACON_LIFETIME_MS;
  const pulse = 1 + Math.sin(now * .004 + beacon.phase) * .11;
  ctx.save();
  ctx.globalAlpha = Math.max(.28, remaining);

  // The dashed ring is the actual range used by the movement rules.
  ctx.fillStyle = 'rgba(163,240,194,.025)';
  ctx.beginPath(); ctx.arc(beacon.x, beacon.y, CONFIG.BEACON_RADIUS, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(169,246,197,.28)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 7]);
  ctx.beginPath(); ctx.arc(beacon.x, beacon.y, CONFIG.BEACON_RADIUS, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  const halo = ctx.createRadialGradient(beacon.x, beacon.y, 2, beacon.x, beacon.y, 82);
  halo.addColorStop(0, 'rgba(163,240,194,.22)');
  halo.addColorStop(.35, 'rgba(115,220,164,.11)');
  halo.addColorStop(1, 'rgba(115,220,164,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(beacon.x, beacon.y, 82, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(169,246,197,.72)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(beacon.x, beacon.y, 16 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowColor = '#a3f0c2'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#c9ffcf';
  ctx.beginPath(); ctx.arc(beacon.x, beacon.y, 4.8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d8f8df'; ctx.font = 'bold 10px "DM Mono", monospace'; ctx.textAlign = 'center';
  ctx.fillText(String(beacon.id), beacon.x, beacon.y - 23);
  ctx.restore();
}
function drawFirefly(fly, now) {
  ctx.save();
  const flicker = .72 + Math.sin(now * .006 + fly.phase) * .22;
  for (let i = 0; i < fly.trail.length; i++) {
    const point = fly.trail[i];
    const alpha = (i + 1) / fly.trail.length * .17;
    ctx.fillStyle = `rgba(255,205,112,${alpha})`;
    ctx.beginPath(); ctx.arc(point.x, point.y, fly.size * (i + 1) / fly.trail.length, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowColor = '#ffd88a'; ctx.shadowBlur = 14 * flicker;
  ctx.fillStyle = `rgba(255,220,145,${flicker})`;
  ctx.beginPath(); ctx.arc(fly.x, fly.y, fly.size, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,248,211,.85)';
  ctx.beginPath(); ctx.arc(fly.x - .45, fly.y - .5, Math.max(.65, fly.size * .34), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawCursor() {
  if (!running || lightsUsed >= CONFIG.BEACON_LIMIT || !cursor.visible) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(191,244,206,.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  ctx.beginPath(); ctx.arc(cursor.x, cursor.y, CONFIG.BEACON_RADIUS, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(191,244,206,.7)';
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 15, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cursor.x - 22, cursor.y); ctx.lineTo(cursor.x + 22, cursor.y); ctx.moveTo(cursor.x, cursor.y - 22); ctx.lineTo(cursor.x, cursor.y + 22); ctx.stroke();
  ctx.restore();
}

function draw(now = 0) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(now);
  for (const obstacle of obstacles) drawObstacle(obstacle, now);
  drawGoal(now);
  drawRoute(now);
  for (const beacon of beacons) drawBeacon(beacon, now);
  for (const fly of fireflies) drawFirefly(fly, now);
  drawCursor();
}

canvas.addEventListener('pointermove', event => {
  pointer = canvasPoint(event);
  pointer.inside = true;
  cursor = { ...pointer, visible: true };
});
canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
canvas.addEventListener('pointerdown', event => {
  if (!running) return;
  event.preventDefault();
  const point = canvasPoint(event);
  cursor = { ...point, visible: true };
  placeBeacon(point);
});

startButton.addEventListener('click', startGame);
againButton.addEventListener('click', startGame);
placeButton.addEventListener('click', () => placeBeacon(cursor));
document.querySelectorAll('[data-move]').forEach(button => {
  button.addEventListener('click', () => {
    const step = 38;
    const map = {
      up: [0, -step], down: [0, step], left: [-step, 0], right: [step, 0]
    };
    const [dx, dy] = map[button.dataset.move];
    moveCursor(dx, dy);
  });
});

document.addEventListener('keydown', event => {
  if (!running) return;
  const step = event.shiftKey ? 55 : 28;
  const moves = {
    ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0]
  };
  if (moves[event.key]) {
    event.preventDefault();
    const [dx, dy] = moves[event.key];
    moveCursor(dx, dy);
  } else if (event.code === 'Space' || event.key === 'Enter') {
    if (event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    placeBeacon(cursor);
  }
});

createBackgroundParticles();
resetGame();
