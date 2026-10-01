// ।। ॐ नमः शिवाय ।। \\
// @date 28th September, 2026

import { testPools, getLiveState, setBackState } from "./EngineAdvance_Helper.js";
import { runPhysics, runScore } from "./EngineAdvance_Helper.js";

self.addEventListener('message', (event) => {
  // << setup >> \\
  const { start, end } = event.data;
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
  for (let k=start; k<end; k++) {
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
  self.postMessage({ bestShot, bestScore });
});