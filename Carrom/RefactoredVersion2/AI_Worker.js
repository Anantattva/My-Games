// ।। ॐ नमः शिवाय ।। \\

// @date 22nd September, 2026
// First thread for parallel AI processing

import { deepClone, setBack } from "./CarromAI.js";
import { simulatePhysics, simulateScore } from "./CarromAI.js";
console.log("AI worker script loaded successfully!!");

self.addEventListener('message', (event) => {
  // try {
  const { startIndex, endIndex, pools, originalEntities } = event.data;
  console.log("Thread: Data received from main thread!!");
  
  let bestScore = Infinity;
  let bestShot = {
    x: null,
    y: null,
    p: null,
    a: null
  };

  const workingEntities = deepClone(originalEntities);
  let cachedPool = null;
  let cachedSimulation = null;
  let cachedScore = null;
  console.log("Thread: Simulation setup ready!!");

  for (let k=startIndex; k<endIndex; k++) {
    cachedPool = pools[k];
    cachedSimulation = simulatePhysics(cachedPool.x, cachedPool.y, cachedPool.p, cachedPool.a, workingEntities);
    cachedScore = simulateScore(cachedSimulation);

    if (cachedScore < bestScore) {
      bestScore = cachedScore;
      bestShot.x = cachedPool.x;
      bestShot.y = cachedPool.y;
      bestShot.p = cachedPool.p;
      bestShot.a = cachedPool.a;
    }

    setBack(workingEntities, originalEntities);
  }
  console.log("Thread: Simulation done!!");

  self.postMessage({ bestShot, bestScore });
  // } catch (e) { console.error(JSON.stringify(e)); throw(e); }
});