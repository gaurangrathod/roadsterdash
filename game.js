/* =========================================================
   ROADSTER DASH - CORE ENGINE
   Built with Three.js, Supabase & PostHog
   ========================================================= */

// --- 1. CONFIGURATION & CLIENT INITIALIZATION ---
const CONFIG = {
  LANES: [-4.5, 0, 4.5],
  BASE_SPEED: 0.8,
  BOOST_SPEED: 1.8,
  JUMP_FORCE: 0.45,
  GRAVITY: -0.018,
  TRAFFIC_COUNT: 7,
  ROAD_LENGTH: 400
};

// Supabase setup (Replace with your actual keys from project dashboard)
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// PostHog analytics hook
if (window.posthog) {
  window.posthog.init('YOUR_POSTHOG_API_KEY', { api_host: 'https://us.i.posthog.com' });
}

// --- 2. RETRO SOUND SYNTHESIZER (Web Audio API) ---
class SoundFX {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  playJump() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }
  playRoll() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }
  playCrash() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }
}
const sfx = new SoundFX();

// --- 3. THREE.JS SCENE SETUP ---
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0814, 0.012);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, -9);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
dirLight.position.set(0, 20, -10);
scene.add(dirLight);

// --- 4. PROCEDURAL HIGHWAY & ENVIRONMENT ---
function createHighway() {
  const roadGroup = new THREE.Group();
  
  // Road surface
  const geo = new THREE.PlaneGeometry(16, CONFIG.ROAD_LENGTH, 10, 50);
  const mat = new THREE.MeshStandardMaterial({ color: 0x110f22, roughness: 0.8, metalness: 0.2 });
  const road = new THREE.Mesh(geo, mat);
  road.rotation.x = -Math.PI / 2;
  roadGroup.add(road);

  // Neon Grid Stripes
  const lineGeo = new THREE.PlaneGeometry(0.3, CONFIG.ROAD_LENGTH);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  
  [-4.5, 4.5].forEach(x => {
    const laneMarker = new THREE.Mesh(lineGeo, lineMat);
    laneMarker.rotation.x = -Math.PI / 2;
    laneMarker.position.set(x / 2, 0.02, 0);
    roadGroup.add(laneMarker);
  });

  return roadGroup;
}
const highway1 = createHighway();
const highway2 = createHighway();
highway2.position.z = CONFIG.ROAD_LENGTH;
scene.add(highway1);
scene.add(highway2);

// --- 5. TESLA ROADSTER 3D MODEL BUILDER ---
function createRoadster() {
  const car = new THREE.Group();

  // Aerodynamic body
  const bodyGeo = new THREE.BoxGeometry(2.1, 0.6, 4.4);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.85,
    roughness: 0.2
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  car.add(body);

  // Cabin / Tinted Canopy
  const cabinGeo = new THREE.BoxGeometry(1.6, 0.5, 2.0);
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.1,
    metalness: 0.95
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(0, 0.95, -0.3);
  car.add(cabin);

  // Red LED Cyber Lightbar (Back)
  const tailGeo = new THREE.BoxGeometry(1.9, 0.1, 0.1);
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
  const taillight = new THREE.Mesh(tailGeo, tailMat);
  taillight.position.set(0, 0.6, -2.21);
  car.add(taillight);

  // SpaceX Thruster Exhaust Ports
  const thrusterGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.3, 16);
  const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  const thrusterL = new THREE.Mesh(thrusterGeo, thrusterMat);
  thrusterL.rotation.x = Math.PI / 2;
  thrusterL.position.set(-0.5, 0.45, -2.22);
  const thrusterR = thrusterL.clone();
  thrusterR.position.x = 0.5;
  car.add(thrusterL, thrusterR);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  [[-1.1, 1.3], [1.1, 1.3], [-1.1, -1.3], [1.1, -1.3]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.35, z);
    car.add(w);
  });

  return car;
}

const player = createRoadster();
player.position.set(0, 0, 0);
scene.add(player);

// --- 6. TRAFFIC SYSTEM ---
const trafficPool = [];
function spawnTrafficCar() {
  const car = new THREE.Group();
  const colors = [0x00f0ff, 0xff0077, 0xffe600, 0x4444ff];
  const mat = new THREE.MeshStandardMaterial({
    color: colors[Math.floor(Math.random() * colors.length)],
    roughness: 0.3
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 3.8), mat);
  body.position.y = 0.5;
  car.add(body);

  car.lane = Math.floor(Math.random() * 3);
  car.position.x = CONFIG.LANES[car.lane];
  car.position.z = 80 + Math.random() * 250;
  car.speed = 0.3 + Math.random() * 0.3;
  scene.add(car);
  trafficPool.push(car);
}

for (let i = 0; i < CONFIG.TRAFFIC_COUNT; i++) {
  spawnTrafficCar();
}

// --- 7. GAMEPLAY STATE & CONTROLS ---
const state = {
  running: false,
  currentLane: 1, // 0: Left, 1: Center, 2: Right
  targetX: 0,
  yVelocity: 0,
  isJumping: false,
  isRolling: false,
  rollAngle: 0,
  isBoosting: false,
  boostFuel: 100,
  score: 0,
  multiplier: 1.0
};

// Input listeners
window.addEventListener('keydown', (e) => {
  if (!state.running) return;
  sfx.init();

  if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
    if (state.currentLane > 0) state.currentLane--;
  }
  if (e.code === 'KeyD' || e.code === 'ArrowRight') {
    if (state.currentLane < 2) state.currentLane++;
  }
  if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && !state.isJumping) {
    state.isJumping = true;
    state.yVelocity = CONFIG.JUMP_FORCE;
    sfx.playJump();
  }
  if ((e.code === 'KeyQ' || e.code === 'KeyE') && state.isJumping && !state.isRolling) {
    triggerBarrelRoll();
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    state.isBoosting = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    state.isBoosting = false;
  }
});

// Mobile button listeners
document.getElementById('btn-left').onclick = () => { if (state.currentLane > 0) state.currentLane--; };
document.getElementById('btn-right').onclick = () => { if (state.currentLane < 2) state.currentLane++; };
document.getElementById('btn-jump').onclick = () => {
  if (!state.isJumping) {
    state.isJumping = true;
    state.yVelocity = CONFIG.JUMP_FORCE;
    sfx.playJump();
  }
};
document.getElementById('btn-roll').onclick = () => {
  if (state.isJumping && !state.isRolling) triggerBarrelRoll();
};
const boostBtn = document.getElementById('btn-boost');
boostBtn.ontouchstart = () => { state.isBoosting = true; };
boostBtn.ontouchend = () => { state.isBoosting = false; };

function triggerBarrelRoll() {
  state.isRolling = true;
  state.rollAngle = 0;
  sfx.playRoll();
  showStuntBanner('BARREL ROLL! +500');
  state.score += 500;
  state.multiplier += 0.2;
}

function showStuntBanner(text) {
  const el = document.getElementById('stunt-banner');
  el.innerText = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 1200);
}

// --- 8. COLLISION DETECTION & RESET ---
function checkCollisions() {
  const playerBox = new THREE.Box3().setFromObject(player);

  for (let car of trafficPool) {
    const carBox = new THREE.Box3().setFromObject(car);
    if (playerBox.intersectsBox(carBox)) {
      gameOver();
      break;
    }
  }
}

function gameOver() {
  state.running = false;
  sfx.playCrash();
  if (window.posthog) window.posthog.capture('game_over', { score: Math.floor(state.score) });

  document.getElementById('final-score').innerText = Math.floor(state.score);
  document.getElementById('final-stats').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('btn-start').innerText = 'PLAY AGAIN';
}

// --- 9. MAIN GAME LOOP ---
function update() {
  if (!state.running) return;

  const currentSpeed = (state.isBoosting && state.boostFuel > 0) ? CONFIG.BOOST_SPEED : CONFIG.BASE_SPEED;

  // Handle Boost Fuel depletion & recharge
  if (state.isBoosting && state.boostFuel > 0) {
    state.boostFuel -= 0.6;
    if (state.boostFuel <= 0) state.isBoosting = false;
  } else if (!state.isBoosting && state.boostFuel < 100) {
    state.boostFuel += 0.15;
  }
  document.getElementById('boost-bar-fill').style.width = `${state.boostFuel}%`;

  // Lateral Lane Movement (Interpolated smooth turn)
  state.targetX = CONFIG.LANES[state.currentLane];
  player.position.x += (state.targetX - player.position.x) * 0.18;
  player.rotation.z = -(player.position.x - state.targetX) * 0.08;

  // Jump and Barrel Roll Physics
  if (state.isJumping) {
    player.position.y += state.yVelocity;
    state.yVelocity += CONFIG.GRAVITY;

    if (state.isRolling) {
      state.rollAngle += 0.22;
      player.rotation.z = state.rollAngle;
      if (state.rollAngle >= Math.PI * 2) {
        state.isRolling = false;
        player.rotation.z = 0;
      }
    }

    if (player.position.y <= 0) {
      player.position.y = 0;
      state.isJumping = false;
      state.isRolling = false;
      player.rotation.z = 0;
    }
  }

  // Camera Follow
  camera.position.x = player.position.x * 0.6;
  camera.position.z = player.position.z - 8;
  camera.position.y = 4.2 + (state.isBoosting ? 0.3 : 0);
  camera.lookAt(player.position.x * 0.3, player.position.y + 0.8, player.position.z + 12);

  // Highway scrolling loop
  highway1.position.z -= currentSpeed;
  highway2.position.z -= currentSpeed;
  if (highway1.position.z <= -CONFIG.ROAD_LENGTH) highway1.position.z = highway2.position.z + CONFIG.ROAD_LENGTH;
  if (highway2.position.z <= -CONFIG.ROAD_LENGTH) highway2.position.z = highway1.position.z + CONFIG.ROAD_LENGTH;

  // Traffic updates
  trafficPool.forEach(car => {
    car.position.z -= (currentSpeed - car.speed);
    if (car.position.z < -20) {
      car.position.z = 180 + Math.random() * 80;
      car.position.x = CONFIG.LANES[Math.floor(Math.random() * 3)];
    }
  });

  // Collision
  checkCollisions();

  // Scoring
  state.score += (currentSpeed * 0.5) * state.multiplier;
  document.getElementById('score-val').innerText = Math.floor(state.score);
  document.getElementById('speed-val').innerHTML = `${Math.floor(currentSpeed * 120)} <small>KM/H</small>`;
  document.getElementById('mult-val').innerText = `${state.multiplier.toFixed(1)}x`;
}

function render() {
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
}
render();

// --- 10. SUPABASE LEADERBOARD INTEGRATION ---
async function fetchLeaderboard() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('name, score')
      .order('score', { ascending: false })
      .limit(10);

    if (error) throw error;

    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    data.forEach((entry, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>#${idx + 1} ${entry.name.toUpperCase()}</span> <span>${entry.score}</span>`;
      list.appendChild(li);
    });
  } catch (err) {
    console.warn('Leaderboard connection error:', err);
  }
}

async function submitScore() {
  const nameInput = document.getElementById('player-name');
  const name = nameInput.value.trim() || 'ANON_DRIVER';
  const finalScore = Math.floor(state.score);

  if (!supabase) {
    alert('Please configure your SUPABASE_URL and SUPABASE_ANON_KEY inside game.js');
    return;
  }

  const { error } = await supabase.from('scores').insert([{ name, score: finalScore }]);
  if (!error) {
    nameInput.value = '';
    fetchLeaderboard();
  }
}

document.getElementById('btn-submit').onclick = submitScore;

// --- 11. START / RESTART GAME ---
document.getElementById('btn-start').onclick = () => {
  sfx.init();
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('final-stats').classList.add('hidden');

  // Reset parameters
  state.running = true;
  state.score = 0;
  state.multiplier = 1.0;
  state.boostFuel = 100;
  state.currentLane = 1;
  player.position.set(0, 0, 0);

  trafficPool.forEach((car, index) => {
    car.position.z = 40 + index * 35;
    car.position.x = CONFIG.LANES[Math.floor(Math.random() * 3)];
  });

  if (window.posthog) window.posthog.capture('game_started');
};

// Window Resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Load high scores on boot
fetchLeaderboard();