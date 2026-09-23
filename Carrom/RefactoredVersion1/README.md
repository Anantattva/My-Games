# Refactored Carrom

## Table of Contents
- [🎲 What changed??]()
- 🎰 Improvements
- 🏆 Performance
- 🪗 Tests across 5 runtimes

## 🎲 What changed??
- My original used local constants.
- This led to tight-coupling & inter-dependency.
- So, I moved out all necessary constants into a separate `Constants.js` file.
---
## 🎰 Improvements
- The file implements:
 ```js
 const isWindow = typeof window !== 'undefined';
```
  flag to ensure safe sharing of data & functions to Web Workers.
- In the original version, I couldn't use Web Workers — prohibiting me to implement multi-threaded JS AI.
---
## 🏆 Performance
- **Naive JS**
  - **Benchmark:** 5 seconds
  - My JS AI version used methods like `structuredClone, map, forEach, filter, some, every`; allocated during tight loops & was poorly optimized. (That file is not posted here, I deleted it.)
  - This would run at `5s` to execute 1485 iterations.
  - It would stay at 5s - V8 couldn't magically optimize anything.
- **My Hand-Tuned JS**
  - **Benchmark:** 1.1 seconds (pre-warm)
  - **Benchmark:** 830ms (V8 optimized)
  - This version implemented MASSIVE object pooling - keeping GC spikes minimal.
  - It used custom functions & manual loop over allocation-heavy `structuredClone` and `map, forEach, filter, every, some`.
  - `Math.hypot()` was replaced with `Math.sqrt()` - a massive gain.
  - Instead of reassigning objects casually like `current = cached` — explicit field-by-field assignment was used: `current.x = cached.x; current.y = cached.y; ...`.
  - This provided stable shapes, monomorphic & predictable hidden classes - which V8 can optimize aggressively.
  - This would run at `1.1s` generally.
  - V8 would optimize it down to `830ms`.
- **Web Worker JS**
  - **Benchmark:** 830ms (pre-warm)
  - **Benchmark:** 420ms (JIT optimized)
  - This is the same as my hand-tuned JS version.
  - It implements multi-threading via `Web Workers`.
  - By default, it would spawn at beginning as many threads as the device's CPU provides via `navigator.hardwareConcurrency` or fallback to single-thread if not found.
  - You can pass `requestedThreads` into parameter if you wish - function safely clamps it between 1 to MAX.
  - It runs at `830ms` generally.
  - V8 would optimize it down to half `420ms`.
