// ।। ॐ नमः शिवाय ।। \\

// @date START 22nd September, 2026
// @date END

// This is an attempt to parallelize my AI simulation engine
// Utilizing 1-MAX threads & Web Workers

// MY FIRST SUCCESSFUL ATTEMPT WITH PROPER JS WEB WORKERS
// It was not so hard
// But debugging was challenging
// Errors wouldn't show nicely in console
// So, I had to spam manual console.log() everywhere
// Could get it done complete in one day - thanks to my clean architecture

import { strikerLaunchBounds, strikerLaunchCoords } from "./PureBeing.js";
import { getAllEntities } from "./Engine.js";
import { deepClone, setBack } from "./CarromAI.js";

/// ++ SINGLE SOURCE OF TRUTH ++ \\\
///// ++ GLOBAL DATA HOLDER ++ \\\\\

/**
 * @type {Object} data
 * @property {boolean} instantiated
 * @property {Array<Object>} simulationPools
 * @property {Array<Object>} threads
 */
const data = {
  instantiated: false,
  simulationPools: [],
  threadCount: navigator.hardwareConcurrency || 1,
  threads: []
};

/**
 * Loops across all possible general trajectory possibilities.
 * Pushes each to `simulationPools` object in global `data`.
 * 
 * @function fillSimulationPools
 * @param {void}
 * @return {void}
 */
function fillSimulationPools() {
  const min = strikerLaunchBounds.min;
  const max = strikerLaunchBounds.max;
  const computerY = strikerLaunchCoords.computerY;
  for (let x=min; x<=max; x+=0.1*min) {
    for (let a=0.2; a<=Math.PI-0.2; a+=0.25) {
      for (let p=5; p<=15; p+=5) {
        data.simulationPools.push({
          x: x,
          y: computerY,
          p: p,
          a: a
        });
      }
    }
  }
}

/**
 * Awakes max number of possible new threads by simply calling new Web Workers.
 * Returns back to one core only if `hardwareConcurrency` not found.
 *
 * @function instantiateThreads
 * @param {void}
 * @return {void}
 */
function instantiateThreads() {
  for (let k=0; k<data.threadCount; k++) {
    const worker = new Worker("./AI_Worker.js", { type: 'module' });
    worker.onerror = (err) => {
      console.error(`Worker #${k} failed to load or crashed: `, err);
    }
    data.threads[k] = worker;
  }
}

/**
 * Parallely computes best shot.
 * 
 * @async
 * @function estimateBestShotParallel
 * @param {Number} requestedThreads, defaults to data.threadCount, i.e. maximum available cores
 * @return {Promise<Object>} bestShot
 */
export async function estimateBestShotParallel(requestedThreads = data.threadCount) {
  // << instantiation + setup >> \\
  if (!data.instantiated) {
    fillSimulationPools();
    instantiateThreads();
    data.instantiated = true;
    console.log("Parallel AI instantiation successful!!");
  }
  requestedThreads = Math.max(1, Math.min(requestedThreads, data.threadCount)); // safely clamped between 1 to max;
  
  /** @type {DOMHighResTimeStamp} */
  const start = performance.now();

  const totalShots = data.simulationPools.length;
  const originalEntities = deepClone(getAllEntities());
  
  const chunkSize = Math.ceil(totalShots / requestedThreads);
  const workerPromises = [];
  // console.log("Parallel simulation setup ready!!");

  for (let k=0; k<requestedThreads; k++) {
    // << get sliced bounds of pools >> \\
    const startIndex = chunkSize * k;
    const endIndex = Math.min(totalShots, chunkSize * (k + 1));

    // << safety break >> \\
    if (startIndex >= totalShots) {
      break;
    }

    // << attach listener BEFORE postMessage to prevent race condition >> \\
    workerPromises.push(new Promise((resolve, reject) => {
      data.threads[k].onmessage = (e) => resolve(e.data);
      data.threads[k].onerror = (err) => reject(err);
    }));

    // << send only integer pointers + pools + current board state >> \\
    data.threads[k].postMessage({
      startIndex: startIndex,
      endIndex: endIndex,
      pools: data.simulationPools,
      originalEntities: originalEntities
    });

    // workerPromises.push(workerPromise);
  }

  // console.log("Workers dispatched!!");
  const results = await Promise.all(workerPromises);
  // console.log("Workers' results received!!", results);

  let globalBestScore = Infinity;
  let globalBestShot = null;
  let res = null;

  for (let k=0; k<results.length; k++) {
    res = results[k];
    if (res && res.bestScore < globalBestScore) {
      globalBestScore = res.bestScore;
      globalBestShot = res.bestShot;      
    }
  }
  // console.log("Best shot computation done!!");
  
  /** @type {DOMHighResTimeStamp} */
  const time  = performance.now() - start;
  console.log(`Parallel AI simulation took ${time}ms across ${requestedThreads} workers.`);

  return globalBestShot;
}

/**
 * @performance
 * This is fast.
 * We nearly identical result of on-average 830ms across 2, 4 & 8 cores test.
 * V8 optimizes down instantly to 470-380ms.
 */