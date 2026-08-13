This repo contains the games I built across my self-teaching coding journey.
I dislike laptops, so I code on mobiles/tablets. All my projects are mobile/tablet only.


In the first month, I built:

• GuessTheNumber.html - uses standard binary trick

• tetris.html


In the second month, I built:
• Snake
• Uses modular class structure with linear dependency injection chains.
• Distributed across 3 files
• - Structure.html
• - Aesthetics.css
• - Consciousness.js


In the 2.5 month, I built:
• 2048
√ Uses Canvas API
• Uses mediator-class pattern with one class acting as the single SOURCE OF TRUTH.
• Also uses reactive-style programming via in-built MutationObserver API.
• 3 files
• - Element.html
• - Design.css
• - Intelligence.js


In the third month:
• Tic Tac Toe with minimax-like AI
• Uses mediator + tree-like class structure.
• AI is a simple 5 step if processor that runs internally cases in itself and plays the best possible one on the basis of 5 steps ranked from highest priority to least.
• 3 files & 1 image:
• - Form.html
• - Beauty.css
• - Mind.js
• - 


In the 3.5 month:
• Guess the number ++
• Same binary trick game with advanced limits. Player can dynamically adjust max limit.
• 3 files:
• - Manifest.html
• - Art.css
• - Brain.js


Many more games were coded in between but I left most incomplete and don't post them here on GitHub.


In the 4.5 month:
• Carrom with custom physics engine + AI
• Uses mediator-class structure with data-oriented design.
• One single file PureBeing.js acts as the source of truth.
• Physics & collisions engine is stored in a separate Engine.js file. This file contains pure physics functions & pipeline only - indifferent to game rules. This decoupling allows for effortless usage between main gameplay & AI simulations.
• Has 2 AI: one using CPU, the other using WebGPU. Both are same. Just the WebGPU one is parellelly-processed & lightning fast.
• Both call the same physics pipeline, simulates hypothetical cases internally & sends the best possible shot by using distance minimization algorithm.
• 7 files & 1 image:
• - GameScreen.html
• - GameScreen_Consciousness.js
• - PureBeing.js
• - Engine.js
• - CarromAI.js
• - GPU_AI.js
• - Engine_Shader.js
• - Back2.jpg
