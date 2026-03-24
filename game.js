const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const restartBtn = document.getElementById("restartBtn");
const mapSelectEl = document.getElementById("mapSelect");
const mapNameLabelEl = document.getElementById("mapNameLabel");
const appShell = document.getElementById("appShell");
const appEl = document.querySelector(".app");
const topbarEl = document.querySelector(".topbar");
const hudEl = document.querySelector(".hud");
const arenaEl = document.getElementById("gameWrap");
const controlsEl = document.querySelector(".controls");
const toggleInfoBtn = document.getElementById("toggleInfoBtn");
const bottomInfoContent = document.getElementById("bottomInfoContent");
const statusEl = document.getElementById("status");
const p1LivesEl = document.getElementById("p1Lives");
const p2LivesEl = document.getElementById("p2Lives");
const p1BombsEl = document.getElementById("p1Bombs");
const p2BombsEl = document.getElementById("p2Bombs");
const p1PowerEl = document.getElementById("p1Power");
const p2PowerEl = document.getElementById("p2Power");
const p1SpeedEl = document.getElementById("p1Speed");
const p2SpeedEl = document.getElementById("p2Speed");
const p1ScoreEl = document.getElementById("p1Score");
const p2ScoreEl = document.getElementById("p2Score");
const roundNumberEl = document.getElementById("roundNumber");
const p1FxEl = document.getElementById("p1Fx");
const p2FxEl = document.getElementById("p2Fx");
const p1PickupMessageEl = document.getElementById("p1PickupMessage");
const p2PickupMessageEl = document.getElementById("p2PickupMessage");

const TILE = 48;
const COLS = 33;
const ROWS = 22;
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

const POWERUP_TYPES = ["bomb", "power", "speed", "ghost", "shield", "heart"];
const POWERUP_SPAWN_LIMITS = { power: 5, ghost: 3, bomb: 2, speed: 2, shield: 2, heart: 2 };
const BOMB_FUSE = 2200;
const EXPLOSION_MS = 650;
const ROUND_END_DELAY = 1600;
const MOVE_THRESHOLD = 0.35;

let keys = {};
let roundNumber = 1;
let scores = [0, 0];
let paused = false;
let gameOver = false;
let winnerText = "FIGHT!";
let lastTimestamp = 0;
let grid = [];
let bombs = [];
let flames = [];
let powerUps = [];
let hiddenPowerUps = new Map();
let players = [];
let roundResetTimer = null;
let selectedMapKey = "classic";

const SPAWN_P1 = { x: 1, y: 1 };
const SPAWN_P2 = { x: COLS - 2, y: ROWS - 2 };

function rng(a, b) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function setStatus(text) { statusEl.textContent = text; }
function isInside(tx, ty) { return tx >= 0 && ty >= 0 && tx < COLS && ty < ROWS; }
function tileAtPixel(px, py) { return { tx: Math.floor(px / TILE), ty: Math.floor(py / TILE) }; }

function makeRows(fill = ".") {
  return Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1 ? "#" : fill));
}
function applyCell(rows, x, y, val) { if (isInside(x, y)) rows[y][x] = val; }
function addSymmetric(rows, coords) { for (const [x, y] of coords) { applyCell(rows, x, y, "#"); applyCell(rows, COLS - 1 - x, y, "#"); } }
function carveSafeZones(rows) {
  const pts = [[1,1],[2,1],[3,1],[1,2],[1,3],[31,20],[30,20],[29,20],[31,19],[31,18]];
  for (const [x,y] of pts) applyCell(rows, x, y, ".");
}
function addClassicBase(rows) {
  for (let y = 2; y < ROWS - 1; y += 2) for (let x = 2; x < COLS - 1; x += 2) applyCell(rows, x, y, "#");
}
function rowsToStrings(rows) { carveSafeZones(rows); return rows.map(r => r.join("")); }

function buildClassic() {
  const rows = makeRows();
  addClassicBase(rows);
  return rowsToStrings(rows);
}
function buildCrossfire() {
  const rows = makeRows();
  addClassicBase(rows);
  addSymmetric(rows, [[4,3],[6,3],[8,3],[10,3],[12,3],[4,5],[8,5],[10,5],[12,5],[6,7],[8,7],[10,7],[12,7],[4,9],[6,9],[12,9],[8,11],[10,11],[4,13],[8,13],[12,13],[6,15],[8,15],[10,15],[12,15],[4,17],[6,17],[10,17],[12,17]]);
  for (let y = 4; y < ROWS - 4; y++) if (y !== 10 && y !== 11) applyCell(rows, 16, y, "#");
  for (let x = 9; x < COLS - 9; x++) if (![15,16,17].includes(x)) { applyCell(rows, x, 10, "#"); applyCell(rows, x, 11, "#"); }
  return rowsToStrings(rows);
}
function buildSpiral() {
  const rows = makeRows();
  addClassicBase(rows);
  for (let x = 4; x <= 28; x++) { applyCell(rows, x, 4, "#"); applyCell(rows, x, 17, "#"); }
  for (let y = 4; y <= 17; y++) { applyCell(rows, 4, y, "#"); applyCell(rows, 28, y, "#"); }
  for (let x = 8; x <= 24; x++) { applyCell(rows, x, 8, "#"); applyCell(rows, x, 13, "#"); }
  for (let y = 8; y <= 13; y++) { applyCell(rows, 8, y, "#"); applyCell(rows, 24, y, "#"); }
  for (let x = 12; x <= 20; x++) applyCell(rows, x, 10, "#");
  for (let y = 10; y <= 15; y++) applyCell(rows, 20, y, "#");
  for (let x = 13; x <= 20; x++) applyCell(rows, x, 15, "#");
  for (const [x,y] of [[16,4],[4,10],[28,11],[16,17],[8,10],[24,11],[16,8],[16,13],[12,15],[20,12]]) applyCell(rows, x, y, ".");
  return rowsToStrings(rows);
}
function buildVault() {
  const rows = makeRows();
  addClassicBase(rows);
  addSymmetric(rows, [[5,3],[7,3],[9,3],[11,3],[13,3],[5,6],[9,6],[13,6],[3,8],[5,8],[9,8],[13,8],[3,10],[7,10],[11,10],[13,10],[5,12],[9,12],[13,12],[3,14],[5,14],[9,14],[13,14],[5,16],[7,16],[9,16],[11,16],[13,16],[7,18],[9,18]]);
  for (let y = 5; y <= 16; y++) if (y !== 10 && y !== 11) { applyCell(rows, 11, y, "#"); applyCell(rows, 21, y, "#"); }
  for (let x = 12; x <= 20; x++) if (x !== 16) { applyCell(rows, x, 6, "#"); applyCell(rows, x, 15, "#"); }
  for (let x = 14; x <= 18; x++) { applyCell(rows, x, 10, "#"); applyCell(rows, x, 11, "#"); }
  for (const [x,y] of [[16,6],[16,15],[14,10],[18,11],[11,10],[21,11]]) applyCell(rows, x, y, ".");
  return rowsToStrings(rows);
}


const MAP_THEMES = {
  classic: {
    bg: "#153052",
    floorA: "#16645f",
    floorB: "#1f7a72",
    floorInnerA: "#2fb49e",
    floorInnerB: "#47cdb4",
    floorHighlight: "rgba(255,255,255,0.16)",
    floorShadow: "rgba(0,0,0,0.18)",
    tileStroke: "rgba(8,23,41,0.24)",
    blockOuter: "#586489",
    blockInner: "#b2c4f0",
    blockHighlight: "#dce7ff",
    blockColumn: "#536089",
    blockShadow: "#394568",
    crateOuter: "#875622",
    crateInner: "#dfa05a",
    crateCross: "#7b4d18",
    crateHighlight: "#e9c17f",
    accent: "#6f95ff",
    accentSoft: "#dce7ff"
  },
  crossfire: {
    bg: "#3a1620",
    floorA: "#6a2133",
    floorB: "#7d2b40",
    floorInnerA: "#bc4a63",
    floorInnerB: "#d9657e",
    floorHighlight: "rgba(255,233,201,0.18)",
    floorShadow: "rgba(50,8,18,0.24)",
    tileStroke: "rgba(35,6,14,0.30)",
    blockOuter: "#5f3b73",
    blockInner: "#d2b3ff",
    blockHighlight: "#f0ddff",
    blockColumn: "#7f56a6",
    blockShadow: "#412553",
    crateOuter: "#7d2a19",
    crateInner: "#dd6c49",
    crateCross: "#612010",
    crateHighlight: "#f2b08e",
    accent: "#ff8da1",
    accentSoft: "#ffd9e2"
  },
  spiral: {
    bg: "#11253f",
    floorA: "#1b4c83",
    floorB: "#235e9a",
    floorInnerA: "#4a8edd",
    floorInnerB: "#63a6ef",
    floorHighlight: "rgba(230,248,255,0.20)",
    floorShadow: "rgba(7,18,38,0.22)",
    tileStroke: "rgba(6,20,44,0.28)",
    blockOuter: "#4f5d7a",
    blockInner: "#c6d9ff",
    blockHighlight: "#eef6ff",
    blockColumn: "#7587aa",
    blockShadow: "#34415a",
    crateOuter: "#2f5f64",
    crateInner: "#58c0bf",
    crateCross: "#214347",
    crateHighlight: "#b5fffb",
    accent: "#7ec7ff",
    accentSoft: "#e0f5ff"
  },
  vault: {
    bg: "#31210f",
    floorA: "#6b4d18",
    floorB: "#7d6020",
    floorInnerA: "#d2a74f",
    floorInnerB: "#e3bd67",
    floorHighlight: "rgba(255,247,214,0.18)",
    floorShadow: "rgba(52,29,6,0.24)",
    tileStroke: "rgba(35,19,4,0.28)",
    blockOuter: "#786b54",
    blockInner: "#efe0b8",
    blockHighlight: "#fff6da",
    blockColumn: "#b49b5a",
    blockShadow: "#5b4d32",
    crateOuter: "#6b2f13",
    crateInner: "#c65f2b",
    crateCross: "#4e220d",
    crateHighlight: "#f0b77e",
    accent: "#ffd567",
    accentSoft: "#fff0bc"
  }
};

function getMapTheme() { return MAP_THEMES[selectedMapKey] || MAP_THEMES.classic; }
function applyMapTheme() {
  const theme = getMapTheme();
  document.documentElement.style.setProperty("--map-accent", theme.accent);
  document.documentElement.style.setProperty("--map-accent-soft", theme.accentSoft);
  document.documentElement.style.setProperty("--map-bg", theme.bg);
}

const MAPS = {
  classic: { name: "CLASSIC RUINS", crateBias: 1.0, template: buildClassic() },
  crossfire: { name: "CROSSFIRE ALLEYS", crateBias: 0.9, template: buildCrossfire() },
  spiral: { name: "SPIRAL FORTRESS", crateBias: 0.85, template: buildSpiral() },
  vault: { name: "ROYAL VAULT", crateBias: 0.92, template: buildVault() }
};

function getSelectedMap() { return MAPS[selectedMapKey] || MAPS.classic; }
function updateMapLabel() {
  const map = getSelectedMap();
  mapNameLabelEl.textContent = map.name;
  mapSelectEl.value = selectedMapKey;
  applyMapTheme();
}
function createGrid() {
  const map = getSelectedMap();
  const rows = map.template.map(r => r.split(""));
  const safe = new Set(["1,1","2,1","3,1","1,2","1,3","31,20","30,20","29,20","31,19","31,18"]);
  const bias = map.crateBias;
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (rows[y][x] !== ".") continue;
      if (safe.has(`${x},${y}`)) continue;
      const t1 = rng(x + roundNumber * 2, y + roundNumber * 5);
      const t2 = rng(x * 7 + roundNumber, y * 11 + roundNumber * 3);
      const fillA = ((x + y) % 2 === 1 && t1 > 0.28 / bias);
      const fillB = t2 > 0.72 + (1 - bias) * 0.18;
      const fillC = ((x * 5 + y * 3 + roundNumber) % 9 === 0 && rng(x + 13, y + 19) > 0.55 + (1 - bias) * 0.12);
      if (fillA || fillB || fillC) rows[y][x] = "C";
    }
  }
  carveSafeZones(rows);
  return rows;
}

function createPlayer(id, tileX, tileY, palette, controls, gamepadIndex) {
  return {
    id, tileX, tileY, x: tileX * TILE + TILE / 2, y: tileY * TILE + TILE / 2, radius: 15, palette, controls, gamepadIndex,
    lives: 3, maxBombs: 2, activeBombs: 0, power: 1, speedLevel: 1, moveSpeed: 150, alive: true,
    ghostUntil: 0, ghostExitActive: false, shieldCharges: 0, bombPressed: false, invulnerableUntil: 0,
    faceDir: 1, animSeed: Math.random() * 1000, pickupMessage: "", pickupMessageUntil: 0
  };
}

function updatePickupMessageEl(player, el) { el.innerHTML = (player.pickupMessage && player.pickupMessageUntil > performance.now()) ? player.pickupMessage : "&nbsp;"; }
function showPickupMessage(player, text) { player.pickupMessage = text; player.pickupMessageUntil = performance.now() + 10000; }
function getPlayerFxText(player) {
  const now = performance.now();
  const fx = [];
  if (player.ghostUntil > now) fx.push(`GHOST ${Math.ceil((player.ghostUntil - now) / 1000)}S`);
  else if (player.ghostExitActive) fx.push("GHOST EXIT");
  if (player.shieldCharges > 0) fx.push(`SHIELD ${player.shieldCharges}`);
  return fx.length ? fx.join(" · ") : "-";
}
function updateHud() {
  p1LivesEl.textContent = players[0].lives; p2LivesEl.textContent = players[1].lives;
  p1BombsEl.textContent = `${players[0].activeBombs}/${players[0].maxBombs}`; p2BombsEl.textContent = `${players[1].activeBombs}/${players[1].maxBombs}`;
  p1PowerEl.textContent = players[0].power; p2PowerEl.textContent = players[1].power;
  p1SpeedEl.textContent = players[0].speedLevel; p2SpeedEl.textContent = players[1].speedLevel;
  p1ScoreEl.textContent = scores[0]; p2ScoreEl.textContent = scores[1]; roundNumberEl.textContent = roundNumber;
  p1FxEl.textContent = getPlayerFxText(players[0]); p2FxEl.textContent = getPlayerFxText(players[1]);
  updatePickupMessageEl(players[0], p1PickupMessageEl); updatePickupMessageEl(players[1], p2PickupMessageEl);
}

function getOverlappingTiles(player) {
  const r = player.radius - 6;
  const pts = [[player.x-r, player.y-r],[player.x+r, player.y-r],[player.x-r, player.y+r],[player.x+r, player.y+r]];
  const set = new Set();
  for (const [px, py] of pts) { const {tx, ty} = tileAtPixel(px, py); set.add(`${tx},${ty}`); }
  return set;
}
function hasGhostPhase(player) { return player && (player.ghostUntil > performance.now() || player.ghostExitActive); }
function updateGhostGrace(player) {
  if (player.ghostUntil > performance.now()) { player.ghostExitActive = false; return; }
  const overlaps = [...getOverlappingTiles(player)];
  player.ghostExitActive = overlaps.some(key => {
    const [tx, ty] = key.split(",").map(Number);
    return isInside(tx, ty) && grid[ty][tx] === "C";
  });
}
function isWalkableTile(tx, ty, player = null) {
  if (!isInside(tx, ty)) return false;
  const cell = grid[ty][tx];
  if (cell === "#") return false;
  if (cell === "C" && !hasGhostPhase(player)) return false;
  return !bombs.some(b => b.tx === tx && b.ty === ty && !(player && b.ownerId === player.id && b.passThroughOwners.has(player.id)));
}
function circleCanMoveTo(player, nx, ny) {
  const r = player.radius - 6;
  const pts = [[nx-r, ny-r],[nx+r, ny-r],[nx-r, ny+r],[nx+r, ny+r]];
  return pts.every(([px, py]) => { const {tx, ty} = tileAtPixel(px, py); return isWalkableTile(tx, ty, player); });
}
function getDigitalMove(player) {
  let dx = 0, dy = 0;
  if (keys[player.controls.left]) dx -= 1;
  if (keys[player.controls.right]) dx += 1;
  if (keys[player.controls.up]) dy -= 1;
  if (keys[player.controls.down]) dy += 1;
  return { dx, dy, bomb: !!keys[player.controls.bomb] };
}
function getGamepadMove(player) {
  const gp = navigator.getGamepads ? navigator.getGamepads()[player.gamepadIndex] : null;
  if (!gp) return { dx: 0, dy: 0, bomb: false };
  let dx = 0, dy = 0;
  const axX = gp.axes[0] || 0, axY = gp.axes[1] || 0;
  if (Math.abs(axX) > MOVE_THRESHOLD) dx = axX;
  if (Math.abs(axY) > MOVE_THRESHOLD) dy = axY;
  if (gp.buttons[14]?.pressed) dx = -1; if (gp.buttons[15]?.pressed) dx = 1; if (gp.buttons[12]?.pressed) dy = -1; if (gp.buttons[13]?.pressed) dy = 1;
  return { dx, dy, bomb: !!(gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) };
}
function getPlayerInput(player) {
  const a = getDigitalMove(player), b = getGamepadMove(player);
  let dx = Math.abs(b.dx) > Math.abs(a.dx) ? b.dx : a.dx;
  let dy = Math.abs(b.dy) > Math.abs(a.dy) ? b.dy : a.dy;
  if (dx && dy) { const len = Math.hypot(dx, dy); dx /= len; dy /= len; }
  return { dx, dy, bomb: a.bomb || b.bomb };
}
function placeBomb(player) {
  if (!player.alive || gameOver || player.activeBombs >= player.maxBombs) return;
  const tx = Math.floor(player.x / TILE), ty = Math.floor(player.y / TILE);
  if (!isInside(tx, ty) || grid[ty][tx] !== "." || bombs.some(b => b.tx === tx && b.ty === ty)) return;
  bombs.push({ tx, ty, ownerId: player.id, power: player.power, explodeAt: performance.now() + BOMB_FUSE, passThroughOwners: new Set([player.id]) });
  player.activeBombs += 1; updateHud();
}
function isPlayerStillOverlappingBombTile(player, bomb) {
  const r = player.radius - 6;
  const left = player.x - r, right = player.x + r, top = player.y - r, bottom = player.y + r;
  const tileLeft = bomb.tx * TILE, tileRight = tileLeft + TILE, tileTop = bomb.ty * TILE, tileBottom = tileTop + TILE;
  return !(right <= tileLeft || left >= tileRight || bottom <= tileTop || top >= tileBottom);
}
function updateBombPassThrough() {
  for (const bomb of bombs) for (const ownerId of [...bomb.passThroughOwners]) {
    const player = players.find(p => p.id === ownerId);
    if (!player || !player.alive || !isPlayerStillOverlappingBombTile(player, bomb)) bomb.passThroughOwners.delete(ownerId);
  }
}
function createHiddenPowerUpMap(currentGrid) {
  const crateTiles = [];
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (currentGrid[y][x] === "C") crateTiles.push({ tx: x, ty: y, weight: rng(x + roundNumber * 17, y + roundNumber * 31) });
  crateTiles.sort((a, b) => a.weight - b.weight);
  const spawnPool = [];
  for (const type of POWERUP_TYPES) for (let i = 0; i < POWERUP_SPAWN_LIMITS[type]; i++) spawnPool.push(type);
  const hidden = new Map();
  for (let i = 0; i < Math.min(spawnPool.length, crateTiles.length); i++) hidden.set(`${crateTiles[i].tx},${crateTiles[i].ty}`, spawnPool[i]);
  return hidden;
}
function spawnPowerUp(tx, ty) { const key = `${tx},${ty}`; if (!hiddenPowerUps.has(key)) return; powerUps.push({ tx, ty, type: hiddenPowerUps.get(key), spawnedAt: performance.now() }); hiddenPowerUps.delete(key); }
function addFlame(tx, ty) { flames.push({ tx, ty, expiresAt: performance.now() + EXPLOSION_MS }); }
function triggerBomb(bomb) {
  bombs.splice(bombs.indexOf(bomb), 1);
  const owner = players.find(p => p.id === bomb.ownerId); if (owner) owner.activeBombs = Math.max(0, owner.activeBombs - 1);
  addFlame(bomb.tx, bomb.ty);
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    for (let step = 1; step <= bomb.power; step++) {
      const tx = bomb.tx + dx * step, ty = bomb.ty + dy * step;
      if (!isInside(tx, ty)) break;
      const cell = grid[ty][tx];
      if (cell === "#") break;
      addFlame(tx, ty);
      const chained = bombs.find(b => b.tx === tx && b.ty === ty); if (chained) chained.explodeAt = 0;
      if (cell === "C") { grid[ty][tx] = "."; spawnPowerUp(tx, ty); break; }
    }
  }
  updateHud();
}
function getPowerUpMessage(type) { return ({ bomb:"GOT MORE BOMBS", power:"GOT BIGGER BLAST", speed:"GOT MORE SPEED", ghost:"GOT GHOST POWER", shield:"GOT SHIELD", heart:"GOT +1 HEART" })[type] || "GOT POWER-UP"; }
function collectPowerUps() {
  for (const player of players) {
    if (!player.alive) continue;
    const tx = Math.floor(player.x / TILE), ty = Math.floor(player.y / TILE), idx = powerUps.findIndex(p => p.tx === tx && p.ty === ty);
    if (idx < 0) continue;
    const item = powerUps.splice(idx, 1)[0];
    if (item.type === "bomb") player.maxBombs = Math.min(6, player.maxBombs + 1);
    else if (item.type === "power") player.power = Math.min(6, player.power + 1);
    else if (item.type === "speed") { player.speedLevel = Math.min(6, player.speedLevel + 1); player.moveSpeed = 150 + (player.speedLevel - 1) * 24; }
    else if (item.type === "ghost") { player.ghostUntil = performance.now() + 6000; player.ghostExitActive = false; }
    else if (item.type === "shield") player.shieldCharges = Math.min(2, player.shieldCharges + 1);
    else if (item.type === "heart") player.lives = Math.min(5, player.lives + 1);
    showPickupMessage(player, getPowerUpMessage(item.type)); updateHud();
  }
}
function damagePlayers() {
  const now = performance.now();
  for (const flame of flames) {
    for (const player of players) {
      if (!player.alive || player.invulnerableUntil > now) continue;
      const tx = Math.floor(player.x / TILE), ty = Math.floor(player.y / TILE);
      if (tx !== flame.tx || ty !== flame.ty) continue;
      if (player.shieldCharges > 0) { player.shieldCharges -= 1; player.invulnerableUntil = now + 900; updateHud(); continue; }
      player.lives -= 1; player.invulnerableUntil = now + 900;
      if (player.lives <= 0) player.alive = false;
      else if (player.id === 1) { player.x = SPAWN_P1.x * TILE + TILE/2; player.y = SPAWN_P1.y * TILE + TILE/2; }
      else { player.x = SPAWN_P2.x * TILE + TILE/2; player.y = SPAWN_P2.y * TILE + TILE/2; }
      updateHud();
    }
  }
  const alive = players.filter(p => p.alive);
  if (!gameOver && alive.length <= 1) {
    gameOver = true;
    if (alive.length === 1) { winnerText = `PLAYER ${alive[0].id} WINS!`; scores[alive[0].id - 1] += 1; }
    else winnerText = "DRAW!";
    updateHud(); setStatus(winnerText);
    roundResetTimer = setTimeout(() => { roundNumber += 1; resetRound(); }, ROUND_END_DELAY);
  }
}
function resetRound() {
  updateMapLabel();
  grid = createGrid(); bombs = []; flames = []; powerUps = []; hiddenPowerUps = createHiddenPowerUpMap(grid);
  gameOver = false; paused = false; winnerText = "FIGHT!"; setStatus(winnerText);
  players = [
    createPlayer(1, SPAWN_P1.x, SPAWN_P1.y, { body:"#6ed8ff", trim:"#ffffff", shadow:"#24688d", face:"#123654" }, { up:"KeyW", down:"KeyS", left:"KeyA", right:"KeyD", bomb:"KeyF" }, 0),
    createPlayer(2, SPAWN_P2.x, SPAWN_P2.y, { body:"#ff8d72", trim:"#fff0d2", shadow:"#9e3d2f", face:"#4b1e16" }, { up:"ArrowUp", down:"ArrowDown", left:"ArrowLeft", right:"ArrowRight", bomb:"Enter" }, 1)
  ];
  if (roundResetTimer) { clearTimeout(roundResetTimer); roundResetTimer = null; }
  updateHud();
}
function updatePlayers(dt) {
  if (gameOver || paused) return;
  for (const player of players) {
    if (!player.alive) continue;
    updateGhostGrace(player);
    const input = getPlayerInput(player), step = player.moveSpeed * dt;
    if (input.dx < -0.15) player.faceDir = -1; if (input.dx > 0.15) player.faceDir = 1;
    const nx = player.x + input.dx * step; if (circleCanMoveTo(player, nx, player.y)) player.x = nx;
    const ny = player.y + input.dy * step; if (circleCanMoveTo(player, player.x, ny)) player.y = ny;
    updateGhostGrace(player);
    player.tileX = Math.floor(player.x / TILE); player.tileY = Math.floor(player.y / TILE);
    if (input.bomb && !player.bombPressed) placeBomb(player);
    player.bombPressed = input.bomb;
  }
}
function updateBombs(now) { updateBombPassThrough(); for (const bomb of bombs.filter(b => now >= b.explodeAt)) if (bombs.includes(bomb)) triggerBomb(bomb); }
function updateFlames(now) { flames = flames.filter(f => now < f.expiresAt); }

function drawBoardBackground() {
  const theme = getMapTheme();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  for (let y=0; y<ROWS; y++) {
    for (let x=0; x<COLS; x++) {
      const px = x * TILE, py = y * TILE;
      const even = (x + y) % 2 === 0;
      ctx.fillStyle = even ? theme.floorA : theme.floorB;
      ctx.fillRect(px,py,TILE,TILE);
      ctx.fillStyle = even ? theme.floorInnerA : theme.floorInnerB;
      ctx.fillRect(px+4,py+4,TILE-8,TILE-8);
      ctx.fillStyle = theme.floorHighlight;
      ctx.fillRect(px+6,py+6,TILE-24,6);
      ctx.strokeStyle = theme.tileStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(px+3,py+3,TILE-6,TILE-6);
      ctx.fillStyle = theme.floorShadow;
      ctx.fillRect(px+8,py+TILE-12,TILE-14,6);
    }
  }
}
function drawSolidBlock(x,y){
  const theme = getMapTheme();
  const px=x*TILE, py=y*TILE;
  ctx.fillStyle=theme.blockOuter;
  ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle=theme.blockInner;
  ctx.fillRect(px+4,py+4,TILE-8,TILE-8);
  ctx.fillStyle=theme.blockHighlight;
  ctx.fillRect(px+6,py+6,TILE-22,6);
  ctx.fillRect(px+6,py+18,TILE-22,4);
  ctx.fillStyle=theme.blockColumn;
  ctx.fillRect(px+12,py+10,8,TILE-20);
  ctx.fillRect(px+28,py+10,8,TILE-20);
  ctx.fillStyle=theme.blockShadow;
  ctx.fillRect(px+4,py+TILE-10,TILE-8,6);
}
function drawCrate(x,y){
  const theme = getMapTheme();
  const px=x*TILE, py=y*TILE;
  ctx.fillStyle=theme.crateOuter;
  ctx.fillRect(px+2,py+2,TILE-4,TILE-4);
  ctx.fillStyle=theme.crateInner;
  ctx.fillRect(px+5,py+5,TILE-10,TILE-10);
  ctx.fillStyle=theme.crateCross;
  ctx.fillRect(px+6,py+20,TILE-12,6);
  ctx.fillRect(px+20,py+6,6,TILE-12);
  ctx.fillStyle=theme.crateHighlight;
  ctx.fillRect(px+8,py+8,TILE-26,5);
  ctx.fillRect(px+8,py+8,5,TILE-26);
}
function drawBoard(){ drawBoardBackground(); for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ const cell=grid[y][x]; if(cell==="#") drawSolidBlock(x,y); else if(cell==="C") drawCrate(x,y); } }
function drawBombs(now){ for(const bomb of bombs){ const x=bomb.tx*TILE+TILE/2, y=bomb.ty*TILE+TILE/2, pulse=1+0.07*Math.sin(now/85); ctx.save(); ctx.translate(x,y); ctx.scale(pulse,pulse); ctx.fillStyle="#1e2439"; ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#434c6d"; ctx.beginPath(); ctx.arc(-4,-4,12,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(5,-7,4,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#ffcf53"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(9,-25); ctx.stroke(); ctx.restore(); } }
function drawFlameTile(tx,ty,now){ const px=tx*TILE, py=ty*TILE, flicker=Math.sin(now/50+tx*.8+ty)*2; ctx.fillStyle="rgba(255,240,168,0.55)"; ctx.fillRect(px+6,py+6,TILE-12,TILE-12); ctx.fillStyle="#ffcd48"; ctx.beginPath(); ctx.moveTo(px+TILE/2, py+4+flicker); ctx.lineTo(px+TILE-10, py+TILE/2-2); ctx.lineTo(px+TILE/2+4, py+TILE-5); ctx.lineTo(px+9, py+TILE/2+3); ctx.closePath(); ctx.fill(); ctx.fillStyle="#ff7b1f"; ctx.beginPath(); ctx.moveTo(px+TILE/2, py+10+flicker); ctx.lineTo(px+TILE-16, py+TILE/2); ctx.lineTo(px+TILE/2+3, py+TILE-11); ctx.lineTo(px+15, py+TILE/2+1); ctx.closePath(); ctx.fill(); ctx.fillStyle="#fff2a0"; ctx.beginPath(); ctx.arc(px+TILE/2, py+TILE/2, 6, 0, Math.PI*2); ctx.fill(); }
function drawFlames(now){ for(const flame of flames) drawFlameTile(flame.tx, flame.ty, now); }
function drawPowerUps(now){ const styles={ bomb:{color:"#68d8ff",label:"+B"}, power:{color:"#ff7d5e",label:"+F"}, speed:{color:"#91ff77",label:"+S"}, ghost:{color:"#dcb4ff",label:"G"}, shield:{color:"#ffe36c",label:"H"}, heart:{color:"#ff7aa9",label:"+1"} }; for(const item of powerUps){ const px=item.tx*TILE, py=item.ty*TILE, style=styles[item.type]||styles.bomb, bob=Math.sin((now-item.spawnedAt)/120)*2; ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.fillRect(px+10, py+12, TILE-20, TILE-20); ctx.fillStyle=style.color; ctx.fillRect(px+12, py+10+bob, TILE-24, TILE-24); ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.fillRect(px+14, py+12+bob, TILE-30, 6); ctx.fillStyle="#10203b"; ctx.font="bold 16px Verdana"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(style.label, px+TILE/2, py+TILE/2+1+bob); } }
function drawBomber(player, now) { if (player.invulnerableUntil > now && Math.floor(now / 100) % 2 === 0) return; const bob=Math.sin(now/120+player.animSeed+(player.x+player.y)/70)*1.5, x=player.x, y=player.y+bob, dir=player.faceDir||1; ctx.save(); ctx.translate(x,y); ctx.fillStyle=player.palette.shadow; ctx.fillRect(-11,10,8,8); ctx.fillRect(3,10,8,8); ctx.fillStyle=player.palette.body; ctx.fillRect(-13,-6,26,18); ctx.fillStyle=player.palette.trim; ctx.fillRect(-10,-10,20,12); ctx.fillStyle=player.palette.body; ctx.fillRect(-7,-14,14,5); ctx.fillStyle="#ffffff"; ctx.fillRect(-10,-7,8,8); ctx.fillRect(2,-7,8,8); ctx.fillStyle=player.palette.face; ctx.fillRect(-8+(dir===1?1:-1),-5,3,3); ctx.fillRect(5+(dir===1?1:-1),-5,3,3); ctx.fillRect(-4,2,8,2); ctx.fillStyle=player.palette.shadow; ctx.fillRect(-13,12,10,8); ctx.fillRect(3,12,10,8); ctx.fillRect(-16,-2,4,10); ctx.fillRect(12,-2,4,10); ctx.fillStyle="rgba(255,255,255,0.25)"; ctx.fillRect(-10,-9,14,4); if(player.shieldCharges>0){ ctx.strokeStyle="rgba(255,230,120,0.95)"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,2,20,0,Math.PI*2); ctx.stroke(); } if(player.ghostUntil>now || player.ghostExitActive){ ctx.fillStyle = player.ghostUntil > now ? "rgba(220,180,255,0.18)" : "rgba(220,180,255,0.12)"; ctx.fillRect(-18,-18,36,40); } ctx.restore(); }
function drawPlayers(now){ for(const player of players) if(player.alive) drawBomber(player, now); }
function drawPausedOverlay(){ if(!paused) return; ctx.fillStyle="rgba(10,14,32,0.62)"; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle="#fff0a1"; ctx.font="bold 54px Verdana"; ctx.textAlign="center"; ctx.fillText("PAUSED", canvas.width/2, canvas.height/2); ctx.font="bold 24px Verdana"; ctx.fillStyle="#ffffff"; ctx.fillText("PRESS P TO CONTINUE", canvas.width/2, canvas.height/2 + 40); }
function drawFrame(){ const now=performance.now(); drawBoard(); drawPowerUps(now); drawBombs(now); drawFlames(now); drawPlayers(now); drawPausedOverlay(); }


function resizeCanvasDisplay() {
  const shellRect = arenaEl.getBoundingClientRect();
  const style = getComputedStyle(arenaEl);
  const padX = parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
  const padY = parseFloat(style.paddingTop || 0) + parseFloat(style.paddingBottom || 0);
  const headerHeight = arenaEl.querySelector(".arena-header")?.offsetHeight || 0;
  const borderX = (arenaEl.offsetWidth - arenaEl.clientWidth);
  const borderY = (arenaEl.offsetHeight - arenaEl.clientHeight);
  const availableWidth = Math.max(240, Math.floor(shellRect.width - padX - borderX - 8));
  const availableHeight = Math.max(180, Math.floor((document.fullscreenElement === appShell ? (window.innerHeight || arenaEl.clientHeight) : Math.min(window.innerHeight * 0.70, window.innerHeight - 180)) - headerHeight - padY - borderY - 8));
  const aspect = canvas.width / canvas.height;
  let drawWidth = availableWidth;
  let drawHeight = Math.floor(drawWidth / aspect);
  if (drawHeight > availableHeight) {
    drawHeight = availableHeight;
    drawWidth = Math.floor(drawHeight * aspect);
  }
  canvas.style.width = `${drawWidth}px`;
  canvas.style.height = `${drawHeight}px`;
}

function setBottomInfoCollapsed(collapsed){ controlsEl.classList.toggle("is-collapsed", collapsed); bottomInfoContent.hidden = collapsed; toggleInfoBtn.textContent = collapsed ? "SHOW INFO" : "HIDE INFO"; toggleInfoBtn.setAttribute("aria-expanded", String(!collapsed)); requestAnimationFrame(updateFullscreenLayout); }
function togglePause(){ if(!gameOver){ paused=!paused; setStatus(paused?"PAUSED":"FIGHT!"); } }
function updateFullscreenLayout(){ if(document.fullscreenElement !== appShell){ appShell.style.removeProperty("--fs-canvas-max-height"); resizeCanvasDisplay(); return; } const viewportHeight = window.innerHeight || appEl.clientHeight || 800; const usedHeight = topbarEl.offsetHeight + hudEl.offsetHeight + controlsEl.offsetHeight + 18; const arenaChrome = arenaEl.offsetHeight - arenaEl.clientHeight; const arenaHeader = arenaEl.querySelector(".arena-header")?.offsetHeight || 0; const available = Math.max(180, Math.floor(viewportHeight - usedHeight - arenaChrome - arenaHeader - 8)); appShell.style.setProperty("--fs-canvas-max-height", `${available}px`); resizeCanvasDisplay(); }
async function toggleFullscreen(){ if(document.fullscreenElement === appShell) { if(document.exitFullscreen) await document.exitFullscreen(); } else if(appShell.requestFullscreen) await appShell.requestFullscreen(); }
function loop(timestamp){ const dt=Math.min(0.033, (timestamp-lastTimestamp)/1000 || 0); lastTimestamp=timestamp; if(!paused){ updatePlayers(dt); updateBombs(timestamp); updateFlames(timestamp); collectPowerUps(); damagePlayers(); } updateHud(); drawFrame(); requestAnimationFrame(loop); }

window.addEventListener("keydown", e => { keys[e.code] = true; if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault(); if(e.code === "KeyR"){ roundNumber = 1; scores = [0,0]; resetRound(); } if(e.code === "KeyP") togglePause(); if(e.code === "KeyK") toggleFullscreen(); });
window.addEventListener("keyup", e => { keys[e.code] = false; });
window.addEventListener("gamepadconnected", e => { setStatus(`PAD ${e.gamepad.index + 1} CONNECTED`); setTimeout(() => { if(!paused && !gameOver) setStatus("FIGHT!"); }, 1200); });
window.addEventListener("gamepaddisconnected", () => { setStatus("CONTROLLER REMOVED"); setTimeout(() => { if(!paused && !gameOver) setStatus("FIGHT!"); }, 1200); });
document.addEventListener("fullscreenchange", () => { const active = document.fullscreenElement === appShell; document.body.classList.toggle("fullscreen-mode", active); fullscreenBtn.textContent = active ? "EXIT FULL SCREEN" : "FULL SCREEN"; requestAnimationFrame(updateFullscreenLayout); });
window.addEventListener("resize", updateFullscreenLayout);
mapSelectEl.addEventListener("change", e => { selectedMapKey = MAPS[e.target.value] ? e.target.value : "classic"; roundNumber = 1; scores = [0,0]; setStatus(`${getSelectedMap().name} LOADED`); resetRound(); resizeCanvasDisplay(); setTimeout(() => { if(!paused && !gameOver) setStatus("FIGHT!"); }, 1000); });
fullscreenBtn.addEventListener("click", toggleFullscreen);
restartBtn.addEventListener("click", () => { roundNumber = 1; scores = [0,0]; resetRound(); resizeCanvasDisplay(); });
toggleInfoBtn.addEventListener("click", () => setBottomInfoCollapsed(!controlsEl.classList.contains("is-collapsed")));

setBottomInfoCollapsed(true);
updateMapLabel();
resetRound();
resizeCanvasDisplay();
updateFullscreenLayout();
requestAnimationFrame(loop);
