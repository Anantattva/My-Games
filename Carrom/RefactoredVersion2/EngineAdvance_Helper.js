// ।। ॐ नमः शिवाय ।। \\
// @date 28th September, 2026

// @rebuilding
// @learning
// Rewriting EngineAdvance CPU AI with better architecture
// So that this supports parallelism too

import { u } from "./Constants.js";
import { FRICTION, MOMENTUM_TRANSFER_RATIO } from "./Constants.js";
import { logicalWidth, logicalHeight } from "./Constants.js";
import { boardCorners, strikerLaunchCoords, strikerLaunchBounds } from "./PureBeing.js";
import { getAllEntities } from "./Engine.js";

/**
 * @architecture
 * @design
 * 
 * The previous broken version had a separate TypedArray for each state.
 * Moreover, isActive & IsGliding used Uint8Array while rest used Float64Array.
 * The flags used binary bits instead of float 0.0/1.0.
 * 
 * This architecture has unified all states into one flat Float64Array.
 * Each row represents one entity.
 * Each column represents one state.
 * 
 * We use offsets of 8 modulo to get states.
 * Let's say for entity k:
 *   - isActive  = 8 * k,
 *   - IsGliding = 8 * k + 1,
 *   - radius    = 8 * k + 2,
 *   - mass      = 8 * k + 3,
 *   - x         = 8 * k + 4,
 *   - y         = 8 * k + 5,
 *   - vx        = 8 * k + 6,
 *   - vy        = 8 * k + 7
 */

export const POCKET_THRESHOLD = 6.25 * u * u;
export const MAX_STEPS = 240;
export const MAX_ENTITIES = 20;

// ++ a sample state ++ \\
export const state = new Float64Array([
  // isActive // IsGliding // radius // mass // x // y // vx // vy
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // striker
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // queen
  
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // white
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // white
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // white
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // white
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // white
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // white
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // white
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // white
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // white
  
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // black
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // black
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // black
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // black
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // black
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // black
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // black
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0,  // black
  1.0,        0.0,         0.0,      0.0,    0.0, 0.0, 0.0,  0.0   // black
]);

// IIFE
export const pocketState = (() => {
  const output = new Array(8);
  for (let k=0; k<4; k++) {
    const pocket = boardCorners[k];
    output[2 * k]     = pocket.x;
    output[2 * k + 1] = pocket.y;
  }
  // console.log(output);
  return new Float64Array(output);
})();

// IIFE
export const testPools = (() => {
  const output = [];
  const min = strikerLaunchBounds.min;
  const max = strikerLaunchBounds.max;
  const y = strikerLaunchCoords.computerY;
  for (let x=min; x<=max; x+=0.1*min) {
    for (let a=0.2; a<=Math.PI-0.2; a+=0.25) {
      for (let p=5.0; p<=15.0; p+=5.0) {
        output.push(x, y, p, a);        
      }
    }
  }
  return new Float64Array(output);
})();

/**
 * Gets data of live entities.
 * Then packs & returns them as a state array.
 * 
 * @function getLiveState
 * @param {void}
 * @return {Float64Array} output, Float64Array
 */
export function getLiveState() {
  // const start = performance.now();
  const current = getAllEntities();
  const len = current.length;
  const output  = new Array(len * 8);
  for (let k=0; k<len; k++) {
    const entity = current[k];
    const start  = 8 * k;
    output[start]     = entity.isActive  ? 1.0 : 0.0;
    output[start + 1] = entity.isGliding ? 1.0 : 0.0;
    output[start + 2] = entity.r;
    output[start + 3] = entity.mass;
    output[start + 4] = entity.x;
    output[start + 5] = entity.y;
    output[start + 6] = entity.vx;
    output[start + 7] = entity.vy;
  }
  // console.log(output);
  // const time = performance.now() - start;
  // console.log(`Time to spawn fresh state: ${time}ms.`);
  return new Float64Array(output);
}

// getLiveState();

/**
 * Returns length-squared of 2 vectors.
 * 
 * @function getLengthSq
 * @param {Number} vx
 * @param {Number} vy
 * @return {Number}
 */
export function getLengthSq(vx, vy) {
  return ((vx * vx) + (vy * vy));
}

/**
 * Takes 2 state Float64Arrays as inputs.
 * Sets back current values to original values.
 * 
 * @function setBackState
 * @param {Float64Array} current
 * @param {Float64Array} original
 * @return {void}
 */
export function setBackState(current, original) {
  let k = 0;
  if (current.length !== original.length) {
    throw new Error("Invalid bounds at setBackState...");
  }
  while (k < original.length) {
    current[k] = original[k];
    k++;
  }
}

/**
 * Checks if all entities are in motion.
 * 
 * @function isAnyMoving
 * @param {Float64Array} stateArray
 * @return {boolean}
 */
export function isAnyMoving(stateArray) {
  for (let k=0; k<MAX_ENTITIES; k++) {
    if (stateArray[8 * k] === 1.0 && stateArray[8 * k + 1] === 1.0) {
      return true;
    }
  }
  return false;
}

/**
 * Takes stateArray as input
 * and runs kinematics on them.
 * 
 * @function runKinematics
 * @param {Float64Array} stateArray
 * @return {void}
 */
export function runKinematics(stateArray) {
  let start = 0;
  for (let k=0; k<MAX_ENTITIES; k++) {
    start = 8 * k;
    // << only run on active entities >> \\
    if (stateArray[start] === 1.0) {
      // << decelerate & move above a threshold >> \\
      if (getLengthSq(stateArray[start + 6], stateArray[start + 7]) > 0.0001) {
        // << decelerate >> \\
        stateArray[start + 6] *= (1.0 - FRICTION);
        stateArray[start + 7] *= (1.0 - FRICTION);
        // << move >> \\ 
        stateArray[start + 4] += stateArray[start + 6];
        stateArray[start + 5] += stateArray[start + 7];
        // << keep flag ON >> \\
        stateArray[start + 1] = 1.0;
      } else {
        // << quit motion >> \\
        stateArray[start + 6] = 0.0;
        stateArray[start + 7] = 0.0;
        // << turn OFF flag >> \\
        stateArray[start + 1] = 0.0;
      }
    }
  }
}

/**
 * Checks & resolves boundary collisions for all entities.
 * 
 * @function resolveBoundary
 * @param {Float64Array} stateArray
 * @return {void}
 */
export function resolveBoundary(stateArray) {
  let start = 0;
  let r = 0.0, x = 0.0, y = 0.0;
  for (let k=0; k<MAX_ENTITIES; k++) {
    start = 8 * k;
    // << check only active entities >> \\
    if (stateArray[start] === 1.0) {
      r = stateArray[start + 2];
      x = stateArray[start + 4];
      y = stateArray[start + 5];
      // << left & right walls >> \\
      if (x <= r) {
        stateArray[start + 4] = r;
        stateArray[start + 6] *= -1.0;
      } else if (x >= logicalWidth - r) {
        stateArray[start + 4] = logicalWidth - r;
        stateArray[start + 6] *= -1.0;
      }
      // << top & bottom walls >> \\
      if (y <= r) {
        stateArray[start + 5] = r;
        stateArray[start + 7] *= -1.0;
      } else if (y >= logicalHeight - r) {
        stateArray[start + 5] = logicalHeight - r;
        stateArray[start + 7] *= -1.0;
      }
    }
  }
}

/**
 * Resolves momentum across all entities.
 *
 * @optimization
 * Hoisted state checks above geometry math.
 *
 * The previous version computed dx, dy, min, and Math.sqrt(dx*dx + dy*dy)
 * unconditionally for all 190 pairs BEFORE checking whether either entity
 * was active or gliding. In the endgame (3-7 active pieces), this burned
 * ~180 wasted sqrt() calls per physics step per trajectory.
 *
 * Now: gate on isActive first, then gliding, THEN compute geometry.
 * Sparse case drops from 190 sqrts/step to ~3 sqrts/step.
 *
 * @function resolveMomentum
 * @param {Float64Array} stateArray
 * @return {void}
 */
export function resolveMomentum(stateArray) {
  let sa = 0, sb = 0;
  let min = 0.0, actual = 0.0, overlap = 0.0;
  let dx = 0.0, dy = 0.0;
  let nx = 0.0, ny = 0.0;
  let kx = 0.0, ky = 0.0;
  let relVel = 0.0, impulse = 0.0;
  for (let a=0; a<MAX_ENTITIES-1; a++) {
    sa = 8 * a;
    // << early exit: skip inactive a >> \\
    if (stateArray[sa] === 0.0) continue;
    for (let b=a+1; b<MAX_ENTITIES; b++) {
      sb = 8 * b;
      // << early exit: skip inactive b >> \\
      if (stateArray[sb] === 0.0) continue;
      // << early exit: neither is gliding >> \\
      if (stateArray[sa + 1] === 0.0 && stateArray[sb + 1] === 0.0) continue;
      // << NOW compute geometry >> \\
      dx = stateArray[sb + 4] - stateArray[sa + 4];
      dy = stateArray[sb + 5] - stateArray[sa + 5];
      min = stateArray[sa + 2] + stateArray[sb + 2];
      actual = Math.sqrt(dx * dx + dy * dy);

      // << collision test >> \\
      if (actual < min && actual > 0.0) {
        // << get normal unit vectors >> \\
        overlap = min - actual;
        nx = dx / actual;
        ny = dy / actual;

        // << push a backwards, b forwards >> \\
        stateArray[sa + 4] -= nx * (overlap / 2.0);
        stateArray[sa + 5] -= ny * (overlap / 2.0);
        stateArray[sb + 4] += nx * (overlap / 2.0);
        stateArray[sb + 5] += ny * (overlap / 2.0);

        // << relative velocity along collision normal >> \\
        kx = stateArray[sa + 6] - stateArray[sb + 6];
        ky = stateArray[sa + 7] - stateArray[sb + 7];
        relVel = kx * nx + ky * ny;

        // << apply impulse only if approaching >> \\
        if (relVel > 0.0) {
          impulse = (2.0 * MOMENTUM_TRANSFER_RATIO * relVel) / (stateArray[sa + 3] + stateArray[sb + 3]);
          stateArray[sa + 6] -= nx * impulse * stateArray[sb + 3];
          stateArray[sa + 7] -= ny * impulse * stateArray[sb + 3];
          stateArray[sb + 6] += nx * impulse * stateArray[sa + 3];
          stateArray[sb + 7] += ny * impulse * stateArray[sa + 3];
        }
      }
    }
  }
}

/**
 * Handles pocketing.
 * 
 * @function handlePocketing
 * @param {Float64Array} stateArray
 * @return {void}
 */
export function handlePocketing(stateArray) {
  let start = 0;
  let dx = 0.0, dy = 0.0;
  for (let k=0; k<MAX_ENTITIES; k++) {
    start = 8 * k;
    // << check active entities only >> \\
    if (stateArray[start] === 1.0) {
      for (let c=0; c<4; c++) {
        dx = pocketState[2 * c] - stateArray[start + 4];
        dy = pocketState[2 * c + 1] - stateArray[start + 5];
        if (getLengthSq(dx, dy) <= POCKET_THRESHOLD) {
          // << quit motion >> \\
          stateArray[start + 6] = 0.0;
          stateArray[start + 7] = 0.0;
          // << turn off flag >> \\
          stateArray[start]     = 0.0;
          stateArray[start + 1] = 0.0;
          break;
        }
      }
    }
  }
}

/**
 * Runs one turn of physics simulation
 * on the input trajectory parameters.
 * 
 * @function runPhysics
 * @param {Number} x
 * @param {Number} y
 * @param {Number} p
 * @param {Number} a
 * @param {Float64Array} stateArray
 * @return {void}
 */
export function runPhysics(x, y, p, a, stateArray) {
  // << launch striker >> \\
  stateArray[0] = 1.0;
  stateArray[1] = 1.0;
  const vx = p * Math.cos(a);
  const vy = p * Math.sin(a);
  stateArray[6] = vx;
  stateArray[7] = vy;
  stateArray[4] = x + vx;
  stateArray[5] = y + vy;

  // << simulation >> \\
  let k = 0;
  while (k < MAX_STEPS) {
    handlePocketing(stateArray);
    resolveBoundary(stateArray);
    resolveMomentum(stateArray);
    runKinematics(stateArray);
    if (!isAnyMoving(stateArray)) { break; }
    k++;
  }
}

/**
 * Runs scoring on a state.
 * @algorithm
 * Uses Distance-Minimization Algorithm.
 * 
 * @function runScore
 * @param {Float64Array} stateArray
 * @return {Number} score
 */
export function runScore(stateArray) {
  let score = 0.0;
  let start = 0;
  let dx = 0.0, dy = 0.0;
  let dist = 0.0, target = 0.0;
  for (let k=0; k<MAX_ENTITIES; k++) {
    start = 8 * k;
    if (stateArray[start] === 1.0) {
      dx = pocketState[0] - stateArray[start + 4];
      dy = pocketState[1] - stateArray[start + 5];
      dist = getLengthSq(dx, dy);
      for (let c=1; c<4; c++) {
        dx = pocketState[2 * c] - stateArray[start + 4];
        dy = pocketState[2 * c + 1] - stateArray[start + 5];
        target = getLengthSq(dx, dy);
        if (target < dist) {
          dist = target;
        }
      }
      score += Math.sqrt(dist);
    }
  }
  return score;
}