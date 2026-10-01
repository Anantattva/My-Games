// ।। ॐ नमः शिवाय ।। \\
// @date 28th September, 2026
// Finished complete on 28th September, 2026 itself

// @date 29th September, 2026
// Refactored this code

import { testPools } from "./EngineAdvance_Helper.js";
import { getLiveState, setBackState } from "./EngineAdvance_Helper.js";
import { runPhysics, runScore } from "./EngineAdvance_Helper.js";

const threadCount = navigator.hardwareConcurrency || 1;

// IIFE
const threads = (() => {
  const output = [];
  for (let k=0; k<threadCount; k++) {
    const workerURL = new URL("./EngineAdvance_Worker.js", import.meta.url);
    const worker = new Worker(workerURL, { type: 'module' });
    output.push(worker);
  }
  // console.log(output);
  return output;
})();

export function estimateBestShot() {
  // << setup >> \\
  const originalState = getLiveState();
  const cachedState   = getLiveState();
  const len = testPools.length / 4;
  const bestShot = {
    x: 0.0,
    y: 0.0,
    p: 0.0,
    a: 0.0
  };
  let bestScore = 300000.0;
  let cachedScore = 0.0;
  let s = 0;
  let x = 0.0, y = 0.0, p = 0.0, a = 0.0;

  // << simulation >> \\
  /** @type {DOMHighResTimeStamp} */
  const start = performance.now();
  for (let k=0; k<len; k++) {
    s = 4 * k;
    x = testPools[s];
    y = testPools[s + 1];
    p = testPools[s + 2];
    a = testPools[s + 3];
    runPhysics(x, y, p, a, cachedState);
    cachedScore = runScore(cachedState);
    if (cachedScore < bestScore) {
      bestScore = cachedScore;
      bestShot.x = x;
      bestShot.y = y;
      bestShot.p = p;
      bestShot.a = a;
    }
    // setBackState(cachedState, originalState);
    cachedState.set(originalState);
  }
  
  const time = performance.now() - start;
  console.log(`Advance CPU AI simulation:
  time: ${time}ms,
  bestScore: ${bestScore}.`);
  return bestShot;
}

export async function estimateBestShotParallel(requestedThreads = threadCount) {
  // << setup >> \\
  requestedThreads = Math.max(1, Math.min(requestedThreads, threadCount));
  const workerPromises = [];
  const len = testPools.length / 4;
  const chunk = Math.ceil(len / requestedThreads);
  let startIndex = 0, endIndex = 0;

  /** @type {DOMHighResTimeStamp} */
  const start = performance.now();
  for (let k=0; k<requestedThreads; k++) {
    startIndex = chunk * k;
    endIndex   = Math.min(len, chunk * (k + 1));
    if (startIndex >= len) { break; }
    workerPromises.push(new Promise((res, rej) => {
      threads[k].onmessage = (event) => { res(event); };
      threads[k].onerror   = (error) => { rej(error); };
    }));
    threads[k].postMessage({
      start: startIndex,
      end: endIndex
    });
  }
  // console.log(workerPromises);

  // << retrieve results >> \\
  /** @type {Array<MessageEvent>} */
  const results = await Promise.all(workerPromises);
  let globalBestScore = 3000000.0;
  let globalBestShot = null;
  let res = null;
  // console.log(results);
  
  // << get best among thread shots >> \\
  for (let k=0; k<results.length; k++) {
    res = results[k].data;
    if (res && res.bestScore < globalBestScore) {
      globalBestScore = res.bestScore;
      globalBestShot = res.bestShot;      
    }
  }
  const time = performance.now() - start;
  console.log(`${requestedThreads} Core Advance CPU AI Simulation:
  time: ${time}ms,
  bestScore: ${globalBestScore}.`);
  return globalBestShot;
}

/// ++ DEVELOPER'S NOTES ++ \\\
/**
 * THIS IS GOOD.
 * BUT NOT SO IMPRESSIVE.
 * 
 * Float64Array results:
 * 1 core: 450ms
 * 4 core: 290ms
 * 8 core: 220ms
 *
 * Float32Array is more or less same or slower.
 * Float16Array is slowest (due to V8's internal type conversion overhead).
 * 
 * !!!!! A CAVEAT !!!!!
 * My original AI would run at 1100ms single-core.
 * Run at 830ms with 4 core.
 * But drop down instantly to 420ms.
 */