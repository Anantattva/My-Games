# 🎮 My self-taught programming journey in web & games

![GitHub last commit](https://img.shields.io/github/last-commit/Anantattva/My-Games)
![GitHub repo size](https://img.shields.io/github/repo-size/Anantattva/My-Games)
![Made with ❤️](https://img.shields.io/badge/made%20with-%E2%9D%A4-red)

> **।। ॐ नमः शिवाय ।।**

Hello world, I am **Karan Gupta** – a 19-year-old IGNOU BCOM student from Ranchi, India.

---

## 📑 Table of Contents
- [About Me](#-about-me)
- [Tech Stack](#-tech-stack)
- [Projects](#-projects-month-by-month)
  - [Month 1](#month-1--the-beginning)
  - [Month 2](#month-2--building-structure)
  - [Month 2.5](#month-25--canvas--reactivity)
  - [Month 3](#month-3--ai--decision-trees)
  - [Month 3.5](#month-35--advanced-logic)
  - [Month 4.5](#month-45--the-big-one-carrom-)
- [How to Run](#-how-to-run)
- [Connect With Me](#-connect-with-me)

---

## 🧠 About Me

I started coding on **24th February, 2026** – right in the middle of my 12th CBSE Commerce board exams. I don't know why I started; it was a random thought, a spontaneous curiosity.

I'm mostly into:
- **Vanilla JS** (no frameworks!)
- **WebGPU & WGSL** (graphics/compute shaders)
- **WebAssembly & Rust**

I tried many languages/frameworks for 2–7 days each – C#, C++, Lua, Kotlin, Dlang, Vue.js, React.js, Three.js, Babylon.js – but none resonated. So I discarded them and stuck to the web + Rust stack.

About 5 years back, when I was 14, I tried twice learning Python by YouTube, cuz I had heard it's an easy language & used by hackers (I wanted to appear cool). It was an horrible experience. I built programming phobia since then and never coded until Feb 2026.

Only now, that I could see programming has little to do with the language and more with you. Python simply didn't resonate with me and I clung rigidly to it regardless, moreover using YouTube as a learning environment made it more worse. On YT, you watch for 40 mins and code for 10. With book/docs/AI, you read syntax, API & concepts for 10 mins and code for 40. Moreover, now I find any language easy enough to learn.

Furthermore, I observe one must never fall for the *illusion of ease* of a language. Instead, one should pick up tough language at first and then may shift to easier ones. This is because learning a tough language after an easy one is still a long curve; but learning an easy language after a tough one is a matter of days - you are merely mapping new syntax.

> Personal opinion: Programming is closer to art & creativity than intelligence.

I also happened to learn **LaTeX** to create PDFs for my Math Telegram channel (*Maths Olympiad Preparation*) focused on olympiads, JEE, and research math. It was the 3rd largest in its niche in India and #1 fastest growing – but I deleted it when I lost passion for math over time.

**I dislike frameworks and heavy dependence on libraries.** I try my best to code from scratch and write custom engines and game loops.

**I don't own a laptop.** Everything here was coded on my mobile/tablet (currently, a Redmi 15 5G). All games are mobile/tablet-only too.

I coded many more games & projects in between, but I left them incomplete. So they are not posted here.

---

## 🛠️ Tech Stack

- **Languages:** HTML, CSS, JavaScript (ES6 modules), Rust, WGSL
- **APIs:** Canvas 2D, WebGPU, DOM API
- **Patterns:** Mediator, Dependency Injection, Data-Oriented Design
- **Tools:** Acode (on mobile), Termux, Google Gemini AI

---

## 📸 Screenshots

| Game | Screenshot |
|------|------------|
| Carrom | ![Carrom](carrom.jpg) |
| Tic Tac Toe | ![TTT](screenshots/ttt.png) |
| 2048 | ![2048](screenshots/2048.png) |
| Snake | ![Snake](screenshots/snake.png) |

*(Screenshots coming soon – I'm on mobile and haven't uploaded them yet!)*

---

## 📂 Projects (Month-by-Month)

### Month 1 – The Beginning

#### 📁 GuessTheNumber.html
- **What:** Number guessing game using binary search trick
- **Tech:** Vanilla JS, DOM events
- **Lesson Learned:** Conditionals, user input, binary search logic

#### 📁 tetris.html
- **What:** Classic Tetris
- **Tech:** HTML tables, CSS manipulation, `setInterval` game loop
- **Lesson Learned:** 2D arrays, grid rotations, collision detection

---

### Month 2 – Building Structure

#### 🐍 Snake
- **What:** Classic Snake game
- **Tech:** HTML tables, `setInterval` game loop, modular class structure
- **Patterns:** Linear dependency injection chains
- **Files:** `Structure.html`, `Aesthetics.css`, `Consciousness.js`

---

### Month 2.5 – MILESTONE: Canvas & Reactivity

#### 🔢 2048
- **What:** 2048 puzzle game
- **Tech:** Canvas API, `requestAnimationFrame`, mediator-class pattern
- **Patterns:** Single Source of Truth, reactive UI via `MutationObserver`
- **Files:** `Element.html`, `Design.css`, `Intelligence.js`

---

### Month 3 – AI & Decision Trees

#### ❌ Tic Tac Toe (Minimax-like AI)
- **What:** Tic Tac Toe with a 5-step priority-based AI
- **Tech:** Canvas API, mediator + tree-like class structure
- **AI Logic:** 5-step if-processor that ranks moves by priority (highest to lowest)
- **Files:** `Form.html`, `Beauty.css`, `Mind.js`, `37222e8f...jpg`

---

### Month 3.5 – Advanced Logic

#### 🔢 Guess the Number ++
- **What:** Enhanced version with dynamic difficulty (user sets max limit)
- **Tech:** Vanilla JS, dynamic DOM updates
- **Files:** `Manifest.html`, `Art.css`, `Brain.js`

---

### Month 4.5 – MILESTONE: Carrom 🎯

#### 📌 Carrom with Physics Engine + AI Opponent
- **What:** Full Carrom game with custom physics, collision engine, and AI
- **Tech:** Canvas API, `requestAnimationFrame`, mediator-class pattern, data-oriented design
- **Architecture:**
  - `PureBeing.js` – Single source of truth (all game data)
  - `Engine.js` – Pure physics functions (decoupled from game rules)
  - `CarromAI.js` – CPU AI (serial processing)
  - `GPU_AI.js` + `Engine_Shader.js` – WebGPU compute shader (parallel processing)
  - Extensive comments, JSDoc, explanations & personal notes
- **AI Algorithm:** Distance minimization (closest pieces to pockets)
- **Files:** `GameScreen.html`, `GameScreen_Consciousness.js`, `PureBeing.js`, `Engine.js`, `CarromAI.js`, `GPU_AI.js`, `Engine_Shader.js`, `Back2.jpg`

**⚠️ Status:**
- ✅ CPU AI: Working perfectly
- ✅ Physics engine: Working (friction, momentum transfer, pocketing)
- ✅ Game loop, scoring, turn management: All working
## 🆘 Help Wanted: WebGPU Debugging

I'm stuck on the **WebGPU AI** in my Carrom game.

**The Problem:**
- The compute shader runs successfully on the GPU
- Scores are written to a storage buffer
- But `stagingBuffer.mapAsync()` crashes on mobile (Android Chrome) with `AbortError: [Device] lost`.

**What I've Tried:**
- Verified buffer sizes match
- Used `await device.queue.onSubmittedWorkDone()` before mapping
- Added `pushErrorScope()` – no helpful errors reported
- Tried smaller workgroup sizes

If you know WebGPU/WGSL, please open an issue or DM me!

---

## 🌟 Connect With Me

- **GitHub:** [github.com/Anantattva](https://github.com/Anantattva)
- **Email:** uft289@gmail.com

I'm always open to collaboration, feedback, or just a friendly chat.

---

## 📄 License

MIT License – feel free to use, learn, and build upon these games.

---

**Made with ❤️ on a smartphone from Ranchi, India**

**।। ॐ नमः शिवाय ।।**
