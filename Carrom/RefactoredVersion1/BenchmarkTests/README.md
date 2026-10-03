## 🏆 Runtime Rankings
| Rank | Runtime / Implementation | Execution Time | Concurrency Model |
| :--: | :-- | :--: | :-- |
| **🥇 1** | **Rust (4 Cores + Tuned)** | **80ms** | Multi-threaded (4 Cores + Spatial Optimizations) |
| **🥈 2** | **Nim/C++/Swift** | **90ms** | **Same as Rust 4 Cores + Tuned** |
| **🥉 3** | **Go** | **100ms** | **Same as Rust 4 Cores + Tuned** |
| 4 | **Rust (4 Cores Baseline)** | **120ms** | Multi-threaded (4 Cores via `std::thread`) |
| 5 | **Rust (Baseline Single-Thread)** | **210ms** | Single-threaded |
| 6 | **JavaScript (Web Worker, JIT Optimized)** | **420ms** | Multi-threaded (4 Cores) |
| 7 | **LuaJIT (4 Cores)** | **530ms** | Multi-threaded (4 Cores) |
| 8 | **JavaScript (Hand-Tuned, JIT Optimized)** | **830ms** | Single-threaded (V8 Optimized) |
| 9 | **JavaScript (Web Worker, Hand-Tuned)** | **830ms** | 4 cores (Pre-warm) |
| 10 | **LuaJIT (Single-Threaded)** | **1,100ms** (1.1s) | Single-threaded JIT |
| 11 | **JavaScript (Hand-Tuned, Pre-Warm)** | **1,100ms** (1.1s) | Single-threaded |
| 12 | **WebGPU (WGSL)** | **1,800ms** (1.8s) | GPU Compute Shader |
| 13 | **Naive JS (cold/warm)** | **5000ms** (5s) | Unoptimized JS |
| 14 | **Python (Pure CPython)** | **30,000ms** (30s) | Single-threaded |
| 15 | **Python (Numpy + 4 Cores)** | **46,000ms** (46s) | Multi-threaded Vectorized |
| 16 | **Python (Baseline)** | **90,000ms** (90s) | Single-threaded Naive |
