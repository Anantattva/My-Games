// ।। ॐ नमः शिवाय ।। \\
// ॥ ॐ वामदेवाय नमः ॥ \\
// ++ Wise Being JS ++ \\

// !! IMPORT MODULES !! \\
import * as PureBeing from './PureBeing.js';

// !! globals !! \\
const dpr = window.devicePixelRatio;
/** viewHeight */
const vh = window.innerHeight;
/** unitHeight */
const uh = vh / 100;
/** viewWidth */
const vw = window.innerWidth;
/** unitWidth */
const uw = vw / 100;
const min = Math.min(uw, uh);
const max = Math.max(uw, uh);
const u = (min + max)/2;

// !! CSS DATA !! \\
const logicalWidth = 40*uh;
const logicalHeight = 40*uh;

// .... Helper Math Tools .... \\
const pi = Math.PI;
const rt3 = Math.sqrt(3); // square root of 3;
const sin = (theta) => { return Math.sin(theta); };
const cos = (theta) => { return Math.cos(theta); };
const tan = (theta) => { return Math.tan(theta); };

////// +++++++++++++++++ \\\\\\
/// ++ ALL ENTITIES UNIFIED ++ \\\
/**
 * Returns all entities as a single array.
 * 
 * @function getAllEntities
 * @return {array<object>}
 */
export function getAllEntities() {
  return [
    PureBeing.striker,
    PureBeing.queen,
    ...PureBeing.whites,
    ...PureBeing.blacks
  ];
}

//////// ================== \\\\\\\\
//// +++ PHYSICS ENGINE +++ \\\\

///// ===================== \\\\\
/// +++ PHYSICS DATA +++ \\\
export const FRICTION = 0.03; // entities lose 3% of their velocity per frame;
export const MOMENTUM_TRANSFER_RATIO = 0.85; // only 85% of momentum is transferred between colliding entities;

/**
 * Shoots striker taking inputs as initial launch angle & initial velocity.
 * 
 * @function launchStriker
 * @param {number} - angle.
 * @param {number} - potential, or inital velocity.
 */
export function launchStriker(angle, potential) {
  // << grab data >> \\
  const striker = PureBeing.striker;
    // << disable if already gliding >> \\
  if (striker.isGliding) return;
  // << update >> \\
  striker.vx = potential * Math.cos(angle);
  striker.vy = potential * Math.sin(angle);
  // << apply >> \\
  striker.x += striker.vx;
  striker.y += striker.vy;
}

/**
 * Generic function to handle entities' movements, decelaration & motion/gliding flag toggling. Works alike for striker & pieces.
 * 
 * @function applyKinematics
 * @param {object} - entity.
 * Expects an input as object of atleast 5 key-value pairs:
 *   isGliding: {boolean},
 *   x: {number} coordinate-x,
 *   y: {number} coordinate-y,
 *   vx: {number} velocity-x,
 *   vy: {number} velocity-y.
 */
export function applyKinematics(entity) {
  // << disable for inactive pieces >> \\
  if (!entity.isActive) return;
  const vx = entity.vx;
  const vy = entity.vy;
  if (Math.sqrt(vx*vx + vy*vy) >= 0.01) {
    // << keep flag active >> \\
    entity.isGliding = true;
    // << decelerate >> \\
    entity.vx *= (1 - FRICTION);
    entity.vy *= (1 - FRICTION);
    // << apply >> \\
    entity.x += entity.vx;
    entity.y += entity.vy;
  } else {
    // << turn off flag >> \\
    entity.isGliding = false;
    // << stop motion >> \\
    entity.vx = 0;
    entity.vy = 0;
  }
}

/**
 * Master function to apply kinematics uniformly across all pieces & striker.
 * 
 * @function applyUniformKinematics
 * @param {array<object>}
 */
export function applyUniformKinematics(allEntities) {
  const len = allEntities.length;
  for (let k=0; k<len; k++) {
    applyKinematics(allEntities[k]);
  }
}

//////// ================== \\\\\\\\
// +++ COLLISIONS ENGINE +++ \\

/**
 * Generic function to detects boundary collisions, handles bouncing off & velocity negation. Works alike for striker & pieces.
 * 
 * @function detectBoundaryCollision
 * @param {object} - entity.
 * Expects an input as object of atleast 5 key-value pairs:
 *   r: {number} radius,
 *   x: {number} coordinate-x,
 *   y: {number} coordinate-y,
 *   vx: {number} velocity-x,
 *   vy: {number} velocity-y.
 */
export function detectBoundaryCollision(entity) {
  // << disable for inactive pieces >> \\
  if (!entity.isActive) return;
  const r = entity.r;
  // << wall collision detectors >> \\
  // << left/right walls >> \\
  if (entity.x <= r) {
    entity.x = r;
    entity.vx *= -1;
  } else if (entity.x >= logicalWidth - r) {
    entity.x = logicalWidth - r;
    entity.vx *= -1;
  }
  // << top/bottom walls >> \\
  if (entity.y <= r) {
    entity.y = r;
    entity.vy *= -1;
  } else if (entity.y >= logicalHeight - r) {
    entity.y = logicalHeight - r;
    entity.vy *= -1;
  }
}

/**
 * Master function to apply boundary collision detectors uniformly across all pieces & striker.
 * 
 * @function applyUniformBoundaryChecks
 * @param {array<object>}
 */
export function applyUniformBoundaryChecks(allEntities) {
  const len = allEntities.length;
  for (let k=0; k<len; k++) {
    detectBoundaryCollision(allEntities[k]);
  }
}

/**
 * Generic function to detect collisions between 2 entities and resolve transfer of momentum between them.
 * 
 * @function resolveMomentum
 * @param {object} - a, first entity.
 * @param {object} - b, second entity.
 */
export function resolveMomentum(a, b) {
  // << disable for inactive pieces >> \\
  if (!a.isActive || !b.isActive) return;
  /**
   * @optimization
   * Early exits for stationary pair of entities to prevent redundant calculations, EXCLUDING STRIKER.
   */
  if (!a.isGliding && !b.isGliding && a.type !== "STRIKER" && b.type !== "STRIKER") return;
  // << get radii >> \\
  const ra = a.r;
  const rb = b.r;
  const min = ra + rb;
  // << get masses >> \\
  const ma = a.mass;
  const mb = b.mass;
  // << get centres & distances >> \\
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  // << check >> \\
  if (dist < min && dist > 0) {
    // << separate overlapping pieces >> \\
    const overlap = min - dist;
    // << normalized unit vectors: A -> B >> \\
    const nx = dx / dist;
    const ny = dy / dist;
    // << push a backwards, b forwards >> \\
    a.x -= nx * (overlap / 2);
    a.y -= ny * (overlap / 2);
    b.x += nx * (overlap / 2);
    b.y += ny * (overlap / 2);
    // << elastic momentum transfer >> \\
    // << relative velocity >> \\
    const kx = a.vx - b.vx;
    const ky = a.vy - b.vy;
    // << relative velocity along collision normal >> \\
    const relVelocity = kx * nx + ky * ny;
    // << dont resolve if velocities are already separating >> \\
    if (relVelocity < 0) return;
    // << elastic impulse resolution >> \\
    const p = 2 * (relVelocity)/(ma + mb);
    const impulse = p * MOMENTUM_TRANSFER_RATIO;
    // << apply equal & opposite impulses >> \\
    a.vx -= impulse * mb * nx;
    a.vy -= impulse * mb * ny;
    b.vx += impulse * ma * nx;
    b.vy += impulse * ma * ny;
  }
}

/**
 * Unified function to apply momentum resolutions & transfers across all entities.
 * 
 * @function applyUniformMomentumResolve
 * @param {array<object>} - allEntities
 */
export function applyUniformMomentumResolve(allEntities) {
  const len = allEntities.length;
  for (let i=0; i<len-1; i++) {
    for (let j=i+1; j<len; j++) {
      const a = allEntities[i];
      const b = allEntities[j];
      resolveMomentum(a, b);
    }
  }
}

/**
 * Checks if a piece or entity fell into corners or got pocketed.
 * 
 * @function checkPocketed
 * @param {object} - entity
 * @return {object} - entity
 */
export function checkPocketed(entity) {
  // << skip striker & inactive entities >> \\
  if (!entity.isActive || entity.type === "STRIKER") return;
  const corners = PureBeing.boardCorners;
  for (let k=0; k<corners.length; k++) {
    let corner = corners[k];
    const dx = entity.x - corner.x;
    const dy = entity.y - corner.y;
    if (Math.sqrt(dx*dx + dy*dy) <= 2.5*u) {
      entity.isActive = false;
      entity.isGliding = false;
      entity.vx = 0;
      entity.vy = 0;
      return entity;
    }
  }
}
/**
 * Unified function to check pocketed across all entities.
 * 
 * @function checkUniformPocketing
 * @param {array<object>} - allEntities.
 * @return {array<object>} - allPocketed
 */
export function checkUniformPocketing(allEntities) {
  const allPocketed = [];
  const len = allEntities.length;
  for (let k=0; k<len; k++) {
    const pocketed = checkPocketed(allEntities[k]);
    if (pocketed) {
      allPocketed.push(pocketed);
    }
  }
  return allPocketed;
}

///// ++++++++++++++++++ \\\\\
// ++ ABSOLUTE MASTER FUNCTION ++ \\
let cachedEntities = null;
/**
 * Composes all functions into one single function.
 * 
 * @function awake
 * @return {array<object>} - allPocketed
 */
export function awake() {
  if (!cachedEntities) {
    cachedEntities = getAllEntities();
  }
  // << physics pipeline >> \\
  // << steps 1 - 4 are intentionally ordered, don't inter-mix or randomize >> \\
  // << get pockets >> \\
  const allPocketed = checkUniformPocketing(cachedEntities);
  // << boundaries >> \\
  applyUniformBoundaryChecks(cachedEntities);
  // << momentum >> \\
  applyUniformMomentumResolve(cachedEntities);
  // << kinematics >> \\
  applyUniformKinematics(cachedEntities);
  // << return >> \\
  return allPocketed;
}

//// ++ DEVELOPER'S NOTES ++ \\\\
/**
 * @layout
 * 
 * This engine contains 11 functions, namely:
 *   getAllEntities
 *   launchStriker
 *   applyKinematics
 *   applyUniformKinematics
 *   detectBoundaryCollision
 *   applyUniformBoundaryChecks
 *   resolveMomentum
 *   applyUniformMomentumResolve
 *   checkPocketed
 *   checkUniformPocketing
 *   awake
 * 
 * @usage
 * 
 * _GameScreen_Consciousness.js_ file only uses _getAllEntities_, _launchStriker_ & _awake_ during game loop.
 * 
 * Also, the AI algorithm in _CarromAI.js_ calls this same physics pipeline to simulate hypothetical cases and estimate the best possible shot.
 * 
 * @blueprint
 * 
 * Physics functions are grouped into 2 categories: **generic** & **unified**.
 * Each generic function takes an entity object at input and applies it's corresponding laws, calculations & property updates.
 * Each unified function takes its corresponding generic function and loops across all **active** pieces.
 * _awake_ is the master function that composes all isolated unified functions into a composed unified pipeline.
 */