<div align="center">

# 🎯 Carrom Engine

### 🏵⚡ A Physics & AI engine, ported across 5 runtimes — and benchmarked all. ⚡🏵

[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![LuaJIT](https://img.shields.io/badge/LuaJIT-2C2D72?style=for-the-badge&logo=lua&logoColor=white)](https://luajit.org/)
[![WebGPU](https://img.shields.io/badge/WebGPU-005A9C?style=for-the-badge&logo=webgpu&logoColor=white)](https://www.w3.org/TR/webgpu/)

[![Made with Love](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-red?style=flat-square)]()
[![Benchmarks Honest](https://img.shields.io/badge/benchmarks-honest-brightgreen?style=flat-square)]()
[![Iterations Normalized](https://img.shields.io/badge/iterations-1485-blue?style=flat-square)]()

</div>

---

## 📑 Table of Contents

- [🎲 Overview: What Even Is This?](#-overview-what-even-is-this)
- [🤝 Acknowledgments](#-acknowledgments)
- [📐 Architecture Improvements](#-architecture-improvements)
- [🏆 Comprehensive Performance Rankings](#-comprehensive-performance-rankings)
- [📊 Deep-Dive Runtime Benchmarks](#-deep-dive-runtime-benchmarks)
  - [🟨 JavaScript / V8](#-javascript--v8-benchmarks)
  - [🦀 Rust](#-rust-benchmarks)
  - [🟩 LuaJIT](#-luajit-benchmarks)
  - [🔲 WebGPU](#-webgpu-benchmarks)
  - [🐍 Python](#-python-benchmarks)

---

## 🎲 Overview: What Even Is This?

This started as a **Carrom game in JavaScript** — a small board game featuring robust physics (momentum, friction, bouncing, pocketing) and an AI designed to search for the optimal shot across roughly **1,485 candidate trajectories**.

Driven by curiosity, I wondered how fast this exact same core engine would perform if ported across **Rust**, **Python**, **LuaJIT**, and **WebGPU**. So, I ported it **five times**, implementing both single-threaded and multi-threaded variants where applicable. 

Every implementation used the exact same algorithm, shared identical constants, processed the exact same iteration count (**1,485**), and was tested on the same device (my Redmi 15 5G).

---

## 🤝 Acknowledgments

> 💡 **Development Note:**
> * I don't know Python or Lua.
> * **DeepSeek AI** wrote the Python implementations.
> * **Gemini AI** wrote the Lua implementations.
> * Both strictly followed my architecture and design patterns established in JS, WebGPU, and Rust.

What I learned throughout this process fundamentally changed how I think about programming languages and memory layouts.

---

## 📐 Architecture Improvements

* **Decoupling Constants:** My original version relied on local constants, leading to tight-coupling and inter-dependency. I moved all configuration out into a dedicated `Constants.js` file.
* **Web Worker Compatibility:** Implemented a runtime check (`const isWindow = typeof window !== 'undefined';`) to safely share data and functions with Web Workers, paving the way for multi-threaded JavaScript AI.

---

## 🏆 Comprehensive Performance Rankings

| Rank | Runtime / Implementation | Execution Time | Concurrency Model |
| :---: | :--- | :---: | :--- |
| **🥇 1** | **Rust (4 Cores + Tuned)** | **80ms** | Multi-threaded (4 Cores + Spatial Optimizations) |
| **🥈 2** | **Rust (4 Cores Baseline)** | **120ms** | Multi-threaded (4 Cores via `std::thread`) |
| **🥉 3** | **Rust (Baseline Single-Thread)** | **210ms** | Single-threaded |
| 4 | **JavaScript (Web Worker, JIT Optimized)** | **420ms** | Multi-threaded (4 Cores) |
| 5 | **LuaJIT (4 Cores)** | **530ms** | Multi-threaded (4 Cores) |
| 6 | **JavaScript (Hand-Tuned, JIT Optimized)** | **830ms** | Single-threaded (V8 Optimized) |
| 7 | **JavaScript (Web Worker, Hand-Tuned)** | **830ms** | 4 cores (Pre-warm) |
| 8 | **LuaJIT (Single-Threaded)** | **1,100ms** (1.1s) | Single-threaded JIT |
| 9 | **JavaScript (Hand-Tuned, Pre-Warm)** | **1,100ms** (1.1s) | Single-threaded |
| 10 | **WebGPU (WGSL)** | **1,800ms** (1.8s) | GPU Compute Shader |
| 11 | **Naive JS (cold/warm)** | **5000ms** (5s) | Unoptimized JS |
| 12 | **Python (Pure CPython)** | **30,000ms** (30s) | Single-threaded |
| 13 | **Python (Numpy + 4 Cores)** | **46,000ms** (46s) | Multi-threaded Vectorized |
| 14 | **Python (Baseline)** | **90,000ms** (90s) | Single-threaded Naive |
---

## 📊 Deep-Dive Runtime Benchmarks

### 🟨 JavaScript / V8 Benchmarks

* **Naive JS (`~5.0s`):** Utilized high-level allocation methods (`structuredClone`, `map`, `forEach`, `filter`, `some`, `every`) inside tight loops with zero optimization. V8 couldn't salvage it. (This file was subsequently deleted).
* **Hand-Tuned JS (`1.1s` pre-warm / `830ms` JIT optimized):** 
  * Implemented massive **object pooling** to keep Garbage Collection spikes minimal.
  * Replaced high-overhead array methods with manual loops.
  * Swapped `Math.hypot()` for raw `Math.sqrt()` for massive speed gains.
  * Refactored object assignments from loose mutations (`current = cached;`) to explicit field-by-field updates (`current.x = cached.x; current.y = cached.y;`) to ensure stable shapes and monomorphic, predictable hidden classes that V8 can aggressively optimize.
* **Web Worker JS (`830ms` pre-warm / `420ms` JIT optimized):** 
  * Spawns worker threads matching the device's CPU count via `navigator.hardwareConcurrency` (with safe bounds clamping from 1 to MAX).
  * Chops execution time down to half through parallel execution.

---

### 🦀 Rust Benchmarks

* **Baseline Rust (`210ms`):** A direct, idiomatic Rust port of the hand-tuned JS architecture.
* **4 Cores Rust (`120ms`):** Leveraged manual multi-threading using Rust's standard library (`std::thread`, avoiding Rayon) to spawn `<ScopedJoinHandle>` instances, collect results, and determine the optimal shot.
* **4 Cores + Tuned Rust (`80ms`):** Retained manual concurrency while introducing *false-spatial-partitioning* via early exits and eliminating redundant square root distance checks.

---

### 🟩 LuaJIT Benchmarks

* **Single-threaded LuaJIT (`1.1s`):** JIT-optimized Lua running neck-and-neck with cold V8 hand-tuned JS.
* **4 Cores LuaJIT (`530ms`):** Scaled across 4 concurrent threads with JIT optimizations enabled.

---

### 🔲 WebGPU Benchmarks

* **WebGPU (`1.8s`):** 
  * The sole GPU-accelerated implementation—notoriously difficult to debug. 
  * Surprisingly slower than expected for a GPU workload. 
  * JavaScript data-sharing overhead was measured at under 30ms, pointing the bottleneck squarely at WGSL and hardware constraints. 
  * Likely caused by **GPU warp divergence**, where heavy branching (`if`/`for`/`while`) forces massive serialization across GPU core execution units.

---

### 🐍 Python Benchmarks

* **Baseline Python (`90s`):** Pure interpreted baseline.
* **Pure CPython (`30s`):** Optimized standard interpreter execution.
* **Numpy + 4 Cores (`46s`):** Vectorized approach, though overhead mitigated performance gains for this specific iterative structure.
