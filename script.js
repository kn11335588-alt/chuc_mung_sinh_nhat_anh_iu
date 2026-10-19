const PHRASES = [
  "Happy Birthday",
  "Wishing my sweetheart a wonderful day",
  "May you achieve great success",
  "in this new year of your life",
  "Hope you get into the university",
  "you've been dreaming of",
  "I love you so much!",
];

const HERO = "Happy Birthday";
const BASE_SIZE = 26;
const MIN_SCALE = 0.62;
const MAX_SCALE = 1.3;
const MIN_DUR_MS = 8000;
const MAX_DUR_MS = 15000;
const SPAWN_MIN_MS = 550;
const SPAWN_MAX_MS = 1500;
const MAX_CARDS = 9;
const SPARKLE_DENSITY = 0.00009;

const TINTS = ["#e81e2d", "#ff2f42", "#ff5566", "#c81025", "#ff808c"];

const stage = document.getElementById("stage");
const world = document.getElementById("world");
const canvas = document.getElementById("sparkles");
const ctx = canvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PALETTE = [
  [255, 118, 128],
  [255, 200, 205],
  [255, 66, 88],
  [255, 255, 255],
];

let sparkles = [];
let view = { w: 0, h: 0, dpr: 1 };
let paused = false;
let cards = 0;
let spawnTimer = 0;

const drag = { active: false, x: 0, y: 0 };
const rot = { x: 0, y: 0 };
const rotTarget = { x: 0, y: 0 };

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[(Math.random() * list.length) | 0];

function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.w = window.innerWidth;
  view.h = window.innerHeight;
  canvas.width = Math.floor(view.w * view.dpr);
  canvas.height = Math.floor(view.h * view.dpr);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

  const target = Math.round(view.w * view.h * SPARKLE_DENSITY);
  while (sparkles.length < target) sparkles.push(makeSparkle(true));
  sparkles.length = target;
}

function makeSparkle(anywhere) {
  return {
    x: Math.random() * view.w,
    y: anywhere ? Math.random() * view.h : view.h + Math.random() * 40,
    rise: rand(16, 46),
    sway: rand(0.4, 1.8),
    phase: Math.random() * Math.PI * 2,
    size: rand(1, 2.4),
    twinkle: rand(1.5, 5.1),
    life: rand(1.6, 5),
    age: 0,
    color: pick(PALETTE),
  };
}

function drawSparkle(s) {
  const pulse = Math.sin(s.age * s.twinkle + s.phase);
  if (pulse <= 0.02) return;
  const k = pulse * pulse;
  const radius = s.size * (0.5 + 1.7 * k);
  const arm = Math.max(2, radius * 3.6);
  const [r, g, b] = s.color;

  ctx.strokeStyle = ctx.fillStyle = `rgba(${r * k}, ${g * k}, ${b * k}, ${0.85 * k + 0.15})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s.x - arm, s.y);
  ctx.lineTo(s.x + arm, s.y);
  ctx.moveTo(s.x, s.y - arm);
  ctx.lineTo(s.x, s.y + arm);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (k > 0.82) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function spawnCard(backfill = false) {
  const isHero = Math.random() < 0.13;
  const text = isHero ? HERO : pick(PHRASES);
  const duration = rand(MIN_DUR_MS, MAX_DUR_MS);

  const float = document.createElement("div");
  float.className = "float";
  float.style.setProperty("--dur", `${Math.round(duration)}ms`);
  float.style.setProperty("--x", `${rand(10, 90).toFixed(1)}%`);
  // A negative delay starts the card mid-flight so the field is never empty.
  if (backfill) {
    float.style.setProperty("--delay", `-${Math.round(rand(0.1, 0.85) * duration)}ms`);
  }

  const depth = document.createElement("div");
  depth.className = "depth";
  // Positive z magnifies toward the viewer and can push wide phrases off-screen, so bias deep.
  depth.style.setProperty("--z", `${Math.round(rand(-320, 90))}px`);

  const line = document.createElement("span");
  line.className = "line" + (isHero ? " line--hero" : "");
  line.style.setProperty("--size", `${BASE_SIZE}px`);
  line.style.setProperty("--scale", rand(MIN_SCALE, MAX_SCALE).toFixed(3));
  line.style.setProperty("--tint", pick(TINTS));
  line.style.setProperty("--alpha", rand(0.55, 1).toFixed(2));
  line.textContent = text;

  depth.append(line);
  float.append(depth);
  world.append(float);

  cards += 1;
  float.addEventListener("animationend", () => {
    float.remove();
    cards -= 1;
  });

  // Keep the phrase inside the viewport once its rendered width is known.
  const half = (float.offsetWidth / Math.max(view.w, 1)) * 50;
  const x = parseFloat(float.style.getPropertyValue("--x"));
  const clamped = Math.min(96 - half, Math.max(4 + half, x));
  float.style.setProperty("--x", `${clamped.toFixed(1)}%`);
}

function scheduleSpawn() {
  spawnTimer = window.setTimeout(() => {
    if (!paused && cards < MAX_CARDS) spawnCard();
    scheduleSpawn();
  }, rand(SPAWN_MIN_MS, SPAWN_MAX_MS));
}

function frame() {
  if (!drag.active) {
    rotTarget.x *= 0.94;
    rotTarget.y *= 0.94;
  }
  rot.x += (rotTarget.x - rot.x) * 0.12;
  rot.y += (rotTarget.y - rot.y) * 0.12;
  world.style.transform = `rotateX(${rot.x.toFixed(2)}deg) rotateY(${rot.y.toFixed(2)}deg)`;

  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, view.w, view.h);
  ctx.globalCompositeOperation = "lighter";
  if (!paused) {
    const dt = 1 / 60;
    for (const s of sparkles) {
      s.age += dt;
      s.y -= s.rise * dt;
      s.x += Math.sin(s.age * s.sway + s.phase) * 14 * dt;
      if (s.age > s.life || s.y < -24) Object.assign(s, makeSparkle(false));
      drawSparkle(s);
    }
  } else {
    sparkles.forEach(drawSparkle);
  }

  requestAnimationFrame(frame);
}

function onPointerDown(event) {
  if (reducedMotion) return;
  drag.active = true;
  drag.x = event.clientX;
  drag.y = event.clientY;
  stage.classList.add("is-dragging");
  stage.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!drag.active) return;
  rotTarget.y = Math.max(-34, Math.min(34, rotTarget.y + (event.clientX - drag.x) * 0.22));
  rotTarget.x = Math.max(-26, Math.min(26, rotTarget.x - (event.clientY - drag.y) * 0.22));
  drag.x = event.clientX;
  drag.y = event.clientY;
}

function onPointerUp() {
  drag.active = false;
  stage.classList.remove("is-dragging");
}

function setPaused(value) {
  paused = value;
  document.body.classList.toggle("is-paused", paused);
}

stage.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
window.addEventListener("resize", resize);

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  event.preventDefault();
  setPaused(!paused);
});

resize();

if (reducedMotion) {
  PHRASES.forEach((text, i) => {
    const float = document.createElement("div");
    float.className = "float";
    float.style.setProperty("--x", "50%");
    float.style.setProperty("--dur", "0s");
    const depth = document.createElement("div");
    depth.className = "depth";
    const line = document.createElement("span");
    line.className = "line" + (text === HERO ? " line--hero" : "");
    line.style.setProperty("--size", `${BASE_SIZE}px`);
    line.style.setProperty("--scale", "1.1");
    line.textContent = text;
    depth.append(line);
    float.append(depth);
    world.append(float);
    float.style.top = `${18 + i * 12}%`;
  });
  ctx.globalCompositeOperation = "lighter";
  sparkles.forEach((s) => {
    s.age = s.phase;
    drawSparkle(s);
  });
} else {
  requestAnimationFrame(frame);
  for (let i = 0; i < 6; i += 1) spawnCard(true);
  scheduleSpawn();
}
