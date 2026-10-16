## 🏆 Runtime Rankings
| Rank | Runtime / Implementation | Execution Time | Concurrency Model |
| :--: | :-- | :--: | :-- |
| **🥇 1** | **Rust (4 Cores + Tuned)** | **80ms** | Multi-threaded (4 Cores + Spatial Optimizations) |
| **🥈 2** | **Nim/C++** | **90ms** | **Same as Rust 4 Cores + Tuned** |
| **🥉 3** | **Go/Swift** | **100ms** | **Same as Rust 4 Cores + Tuned** |
| 4 | **Rust (4 Cores Baseline)** | **120ms** | Multi-threaded (4 Cores via `std::thread`) |
| 5 | **Java (4 Cores)** | **125ms** | Multi-thread (4 Cores) |
| 6 | **WebGPU (better design)** | **150ms** | One workgroup - One shot | 
| 7 | **Rust (Baseline Single-Thread)** | **210ms** | Single-threaded |
| 8 | **WebAssembly** | **220ms** | 1 Core via Rust |
| 9 | **JavaScript 4 Core + DOD** | **290ms** | DOD + JIT warmup + 4 Cores |
| 9 | **JavaScript (Web Worker, JIT Optimized)** | **420ms** | Multi-threaded (4 Cores) |
| 10 | **LuaJIT (4 Cores)** | **530ms** | Multi-threaded (4 Cores) |
| 11 | **JavaScript (Hand-Tuned, JIT Optimized)** | **830ms** | Single-threaded (V8 Optimized) |
| 12 | **JavaScript (Web Worker, Hand-Tuned)** | **830ms** | 4 cores (Pre-warm) |
| 13 | **LuaJIT (Single-Threaded)** | **1,100ms** (1.1s) | Single-threaded JIT |
| 14 | **JavaScript (Hand-Tuned, Pre-Warm)** | **1,100ms** (1.1s) | Single-threaded | **1700ms** (1.7s) | Single-threaded |
| 15 | **PyPy3** | **1700ms** (1.7s) | Single-Threaded + JIT |
| 16 | **WebGPU (WGSL)** | **1,800ms** (1.8s) | GPU Compute Shader |
| 17 | **Naive JS (cold/warm)** | **5000ms** (5s) | Unoptimized JS |
| 18 | **Python (Pure CPython)** | **30,000ms** (30s) | Single-threaded |
| 19 | **Python (Numpy + 4 Cores)** | **46,000ms** (46s) | Multi-threaded Vectorized |
| 20| **Python (Baseline)** | **90,000ms** (90s) | Single-threaded Naive |
