<div align="center">

# 🎯 Carrom Engine

### A physics & AI engine, ported across 5 runtimes — and benchmarked all.

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Lua](https://img.shields.io/badge/LuaJIT-2C2D72?style=for-the-badge&logo=lua&logoColor=white)](https://luajit.org/)
[![WebGPU](https://img.shields.io/badge/WebGPU-005A9C?style=for-the-badge&logo=webgpu&logoColor=white)](https://www.w3.org/TR/webgpu/)

[![Made with Love](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-red?style=flat-square)]()
[![Benchmarks Honest](https://img.shields.io/badge/benchmarks-honest-brightgreen?style=flat-square)]()
[![Iterations Normalized](https://img.shields.io/badge/iterations-1485-blue?style=flat-square)]()

</div>

## 🎲 What even is this?

This started as a **Carrom game in JavaScript** — a small board game with physics (momentum, friction, bouncing) and an AI that searches for the best possible shot across ~1,485 candidate trajectories.

Then I got curious.

I wondered how fast this same engine would run in **Rust**, **Python**, **LuaJIT**, and **WebGPU**. So I ported it. Five times. Implemented both single-threaded & multi-threading versions.

Then I benchmarked all of them. Same algorithm, same constants, same iteration count (1485), same phone.

@acknowledgment
- I don't know Python & Lua.
- DeepSeek AI wrote Python versions.
- Gemini AI wrote Lua versions.
- Both used my architecture & design as in JS, WebGPU & Rust

What I learned changed how I think about programming languages.

## Table of Contents
- [🎲 What changed??]()
- 🎰 Improvements
- 🏆 Performance
- 🪗 Tests across 5 runtimes

## 🎲 What changed??
- My original version of this Carrom game used local constants.
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
  - Instead of reassigning objects casually like:
 ```js
current = cached;
```
  — explicit field-by-field assignment was used
```js
current.x = cached.x;
current.y = cached.y;
```
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
 ---
 ## 🥇 Rust Benchmarks
- **Baseline Rust**
  - **Benchmark:** 210ms
  - This is just JS hand-tuned version written in Rust.
- **4 cores Rust**
  - **Benchmark:** 120ms
  - I used manual multi-threading via `std::thread` crate of Rust's standard library (no Rayon) to spawn 4 `<ScopedJoinHandle>` collect back results & return best one.
 - **4 cores + Tuned Rust**
   - **Benchmark:** 80ms
   - Again, same manual concurrency. But with minor optimization tricks.
   - Added *false-spatial-partitioning* via early-exits & eliminated unnecesary `sqrt` checks for distances.
---
## 🎖 LuaJIT Benchmarks
- **Single-threaded LuaJIT**
  - **Benchmark:"" 1.1s
  - This is JIT optimized Lua.
  - Interestingly, it runs only as fast as cold V8 hand-tuned JS.
- **4 cores LuaJIT**
  - **Benchmark:** 530ms
  - Uses 4 threads concurrency.
  - Again, JIT optimized.
---
## 🎖 WebGPU Benchmarks
- I have only one implementation of WebGOU (which too was notoriously hard to debug).
- Surpris
