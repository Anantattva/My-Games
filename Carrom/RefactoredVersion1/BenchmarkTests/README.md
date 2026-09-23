# 🏆 Runtime Rankings
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
