// ।। ॐ नमः शिवाय ।। \\
// ॥ ॐ वामदेवाय नमः ॥ \\
// ++ Wise Being JS ++ \\

// !! IMPORT MODULES !! \\
import * as PureBeing from './PureBeing.js';
import * as Engine from './Engine.js';

/// +++ EXTRACT PureBeing DATA +++ \\\
const allEntities = Engine.getAllEntities();
const corners = PureBeing.boardCorners;
const min = PureBeing.strikerLaunchBounds.min;
const max = PureBeing.strikerLaunchBounds.max;
const defaultX = PureBeing.strikerLaunchCoords.x;
const computerY = PureBeing.strikerLaunchCoords.computerY;

///// =================== \\\\\
///// ++ HELPER FUNCTIONS ++ \\\\\
/**
 * Returns absolute distance between 2 entities.
 * 
 * @function getDistance
 * @param {object} a
 * @param {object} b
 * @return {number} dist
 */
export function getDistance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  return dist;
}

/**
 * Returns the pocket/corner closest to the input entity/piece.
 * 
 * @function getClosestPocket
 * @param {object} e, or entity
 * @return {object} pocket, or corner
 */
export function getClosestPocket(e) {
  let pocket = corners[0];
  let dist = getDistance(pocket, e);
  for (let k=1; k<4; k++) {
    const targetPocket = corners[k];
    const targetDist = getDistance(targetPocket, e);
    if (targetDist < dist) {
      dist = targetDist;
      pocket = targetPocket;
    }
  }
  if (pocket) return pocket;
}

/**
 * Helper function to help get deep cloned copy of entities array.
 * @optimization optimized manual alternative for .filter().map().
 * 
 * It uses **explicit property assignment** to trigger V8 engine's monomorphism.
 * Giving V8 the exact keys in the exact same order guarantees that every cloned entity gets created with the identical hidden class (or shape) in memory. This allows underlying C++ engine's JIT compiler to generate hyper-optimized machine code for property access.
 * 
 * @function deepClone
 * @param {array<object>} entities
 * @return {array<object>} cloned
 */
export function deepClone(entities) {
  // << setup >> \\
  const cloned = [];
  const len = entities.length;
  // << custom loop >> \\
  for (let k=0; k<len; k++) {
    const e = entities[k];
    if (e.isActive) {
      cloned.push({
        type: e.type,
        isActive: e.isActive,
        isGliding: e.isGliding,
        r: e.r,
        mass: e.mass,
        x: e.x,
        y: e.y,
        vx: e.vx,
        vy: e.vy
      });
    }
  }
  return cloned;
}

/**
 * Takes the current array of entities & transforms it back to original array.
 * 
 * @function setBack
 * @param {array<object>} current
 * @param {array<object>} original
 */
export function setBack(current, original) {
  const len = original.length;
  for (let k = 0; k < len; k++) {
    const c = current[k];
    const o = original[k];
    c.isActive = o.isActive;
    c.isGliding = o.isGliding;
    c.x = o.x;
    c.y = o.y;
    c.vx = o.vx;
    c.vy = o.vy;
  }
}


/**
 * Check if any piece is moving & returns true.
 * @optimization optimized manual alternative for .some()
 * @function isAnyPieceMoving
 * @param {array<object>} entities
 * @return {boolean}
 */
export function isAnyPieceMoving(entities) {
  for (let k=0; k<entities.length; k++) {
    const e = entities[k];
    if (e.isActive && e.isGliding) return true;
  }
  return false;
}

/**
 * Helper function to yield control back to main UI.
 * 
 * @async
 * @function yieldThread
 * @return {Promise}
 */
const yieldThread = () => new Promise(resolve => requestAnimationFrame(resolve));

///// ===================== \\\\\
/// ++ AI FUNCTIONS ++ \\\

/**
 * Simulates hypothetical physics & returns new positions.
 * Uses only active pieces (excluding striker).
 * Takes striker's launch data as input
 * 
 * @function simulatePhysics
 * @param {number} ix - launch coord x
 * @param {number} iy - launch coord y
 * @param {number} p - potential
 * @param {number} a - angle
 * @param {array<object>} baseEntities
 * @return {array<object>} entities
 */
export function simulatePhysics(ix, iy, p, a, entities) {
  // << setup >> \\
  // const entities = deepClone(baseEntities);
  const striker = entities[0];
  if (!striker || striker.type !== "STRIKER" || !striker.isActive) return entities;
  striker.x = ix;
  striker.y = iy;
  striker.vx = p * Math.cos(a);
  striker.vy = p * Math.sin(a);
  // << apply launch as in engine >> \\
  striker.x += striker.vx;
  striker.y += striker.vy;
  // << simulate >> \\
  /**
   * @math
   * 
   * Internal testing shows number of steps per simulation rarely exceeds 240, so we safely cap MAX_STEPS to 240.
   */
  const MAX_STEPS = 240;
  let step = 0;
  while (step < MAX_STEPS) {
    // << physics pipeline to match Engine.awake() >> \\
    Engine.checkUniformPocketing(entities);
    Engine.applyUniformBoundaryChecks(entities);
    Engine.applyUniformMomentumResolve(entities);
    Engine.applyUniformKinematics(entities);
    // << stop check >> \\
    // const isAnyPieceMoving = entities.some(e => e.isActive && e.isGliding);
    if (!isAnyPieceMoving(entities)) break;
    step++;
  }
  // console.log(`Steps for physics simulation: ${step}.`);
  return entities;
}

/**
 * Simulates scoring, given the active entities as input (excluding striker).
 * Sums up distance between each piece and its closest pocket.
 * Returns the sum.
 * The lower the sum, the better the shot.
 * This function is to be called after simulating physics.
 * 
 * @function simulateScore
 * @param {object} entities
 * @return {number} score
 */
export function simulateScore(entities) {
  let score /** @type {number} */ = 0;
  for (let k=0; k<entities.length; k++) {
    const e = entities[k];
    const pocket = getClosestPocket(e);
    score += getDistance(e, pocket);
  }
  // console.log(score);
  return score;
}

/**
 * Simulation pipeline.
 * Hits-and-trial testing to estimate best possible move.
 * Uses async/await to avoid freezing main thread.
 * 
 * @async
 * @function estimateBestShot
 * @return {Promise<object>} bestShot
 */
export async function estimateBestShot() {
  // << setup >> \\
  const start = performance.now();
  let bestScore = Infinity;
  /** @type {object} */
  const bestShot = {
    x: defaultX,
    y: computerY,
    p: 12,
    a: Math.PI/2
  };
  // << simulation loop + caching >> \\
  let iteration = 0;
  let cachedSimulation = null;
  let cachedScore = null;
  const original = deepClone(Engine.getAllEntities());
  let using = deepClone(original);
  for (let x=min; x<=max; x+=0.1*min) {
    for (let a=0.2; a<=Math.PI-0.2; a+=0.25) {
      for (let p=5; p<=15; p+=5) {
        /**
         * @pathflow
         * 
         * Here, we first simulate hypothetical physics using the combo of {x, a, p} and the identical logic of _Engine.awake()_ as in _Orchestrator_ in actual runtime.
         * This ensures both AI & humans perceive the same physics and have a fair game.
         * 
         * Next, we calculate scores for each simulation using _simulateScore()_ and send the data of the combo with least score.
         */
        cachedSimulation = simulatePhysics(x, computerY, p, a, using);
        cachedScore = simulateScore(cachedSimulation);
        if (cachedScore < bestScore) {
          bestScore = cachedScore;
          bestShot.x = x;
          bestShot.p = p;
          bestShot.a = a;
        }
        setBack(using, original);
        // << iterate >> \\
        /**
         * @user_experience
         * @optimization
         * 
         * This functions sends back empty responses every 60 iterations to avoid freezing the main UI thread.
         */
        iteration++;
        if (iteration % 60 === 0) {
          // console.log("THINKING!");
          await yieldThread();
        }
      }
    }
  }
  const end = performance.now();
  const time = (end - start)/1000;
  console.log(`AI Simulation Data:
  Time: ${time.toFixed(3)}s,
  Iterations: ${iteration}.`);
  return bestShot;
}

// ++++ DEVELOPER'S NOTES ++++ \\
/**
 * @functions
 *   getDistance
 *   getClosestPocket
 *   deepClone
 *   setBack
 *   isAnyPieceMoving
 *   yieldThread
 *   simulatePhysics
 *   simulateScore
 *   estimateBestShot
 * 
 * Last 3 are primary AI simulation function. Rest are for help, optimizing, caching & object pooling.
 */

/**
 * @ai
 * @algorithm
 * 
 * AI uses **distance minimizing algorithm** to find best shot possible.
 * It runs internally physics simulation on general cases that cover maximum possibilities with the use of _Engine.js_ on  its separate cloned data to avoid mutating actual game data.
 * After running hypothesis, it calculates distances between each piece & its closest pocket, then sums all.
 * The lower this sum, more plausible the move.
 * AI plays the move with least sum.
 * 
 * @time
 * Each simulation takes less than 4 seconds.
 * Every turn runs exactly 1485 iterations of one complete physics simulation pipeline (in my phone atleast).
 * @pros
 * Plays like a cold-blooded carrom grandmaster.
 * Can demolish you effortlessly.
 * @cons
 * Frame rate can drop as low as 7FPS.
 * But since all pieces are static while this simulation, the drop is unnoticable to the human user.
 */
 
// LEARNING FLOW & OPTIMIZATIONS \\
/**
 * @learning_flow
 * @optimization
 * 
 * FIRST: structuredClone, zero optimizations
 * In the first Carrom AI model, we used direct structuredClone() to clone entities and run physics simulation with slow array methods like .filter() & .map(). Moreover, no object pooling was applied.
 * @time this took <5s per simulation
 * 
 * SECOND: array methods, no object pooling
 * structuredClone was replaced with .filter().map().
 * @time this took <4s per simulation
 * @gain ~20%
 * 
 * THIRD: custom function + direct assignment, no object pooling
 * Array methods were then replaced with custom function _deepClone_. And object were assigned explcitly key by key.
 * @time this took <3.4s per simulation
 * @gain ~32%
 * 
 * FOURTH: more custom functions + little object pooling
 * @time <2.8s per simulation
 * @gain ~44%
 * 
 * FIFTH: improved engine further
 * Replaced Math.hypot(dx, dy) with Math.sqrt(dx*dx + dy*dy).
 * @time <1.3s per simulation
 * @gain ~74%
 *
 * @lesson
 * Algorithm & engine optimizations yield maximum performance gains over micro-optimization hacks.
 */