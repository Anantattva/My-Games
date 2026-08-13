// ।। ॐ नमः शिवाय ।। \\
// ॥ ॐ वामदेवाय नमः ॥ \\
// ++ Wise Being JS ++ \\

// !! IMPORT MODULES !! \\
import * as PureBeing from './PureBeing.js';
import * as Engine from './Engine.js';
import * as CarromAI from './CarromAI.js';
import * as GPU_AI from './GPU_AI.js';

// !! globals !! \\
const dpr = window.devicePixelRatio;
/** viewHeight */
const vh = window.innerHeight;
/** unitHeight */
const uh = vh / 100;
/** viewWidth */
const vw = window.innerWidth;
/** unitWidth */
const uw = vw / 100;
const min = Math.min(uw, uh);
const max = Math.max(uw, uh);
const u = (min + max)/2;

// ============================== \\
////// +++ BOARD +++ \\\\\\\
/** @type {HTMLCanvasElement} */
const board = document.getElementById('board');
board.height = 40*uh*dpr;
board.width = 40*uh*dpr;

// .. CSS DATA .. \\
// .. FOR ACCURATE DRAWING .. \\
const logicalWidth = 40*uh;
const logicalHeight = 40*uh;
const boardRect = board.getBoundingClientRect();
const scale = logicalWidth / boardRect.width;
// .. DEEP COPY OF DEFAULT CARROM STATE TO RESET GAME .. \\
/**
 * structuredClone is an in-built modern JS method to deep clone objects.
 * Supported in modern browsers.
 * Very reliable but allocates too much new memory, can trigger GC spikes.
 * Hence, avoided in CarromAI simulation. Instead, we have used custom manual for loop + explicit property assignment.
 */
const startSnapShot = structuredClone(Engine.getAllEntities());

// .... Helper Math Tools .... \\
const pi = Math.PI;
const sin = (theta) => { return Math.sin(theta); };
const cos = (theta) => { return Math.cos(theta); };
const tan = (theta) => { return Math.tan(theta); };

/** @type {CanvasRenderingContext2D} */
const brush = board.getContext('2d');
brush.scale(dpr, dpr);

// ============================== \\
////// +++ STRIKER UI CONTROLS +++ \\\\\\\
/** @type {HTMLDivElement} */
const strikerPositioner = document.getElementById("striker-positioner");
/** @type {HTMLDivElement} */
const strikerHTML = document.getElementById("striker-html");

///// ================== \\\\\
//// ++ SCORES ++ \\\\
/** @type {HTMLSpanElement} */
const computerScore = document.getElementById("computer-score");
/** @type {HTMLSpanElement} */
const playerScore = document.getElementById("player-score");

///// ===================== \\\\\
//// ++ GAMEOVER SCREEN ++ \\\\
/** @type {HTMLDivElement} */
const gameOverScreen = document.getElementById("game-over-screen");
/** @type {HTMLDivElement} */
const winnerText = document.getElementById("winner-text");
/** @type {HTMLButtonElement} */
const replayButton = document.getElementById("replay-button");

///// ====================== \\\\\
// +++ CLASSES +++ \\
// == CENTRAL INTELLIGENCE == \\
/**
 * Centralized intelligence class to instantiate + manage other classes, handle gameplay & gameloop animation.
 * 
 * @class Orchestrator
 */
class Orchestrator {
  constructor() {
    // !! class design !! \\
    this.lastTime = performance.now();
    this.accumulatedTime = 0;
    // !! state tracker flag !! \\
    this.IS_PLAYER_TURN = true;
    this.IS_AI_THINKING = false;
    // !! data !! \\
    this.allEntities = Engine.getAllEntities();
    this.turnPockets = [];
    // !! awake other classes !! \\
    this.artist = new Artist(this);
    this.inputs = new InputWitness(this);
    this.game = new GameManager(this);
    // !! awake !! \\
    requestAnimationFrame((currentTime) => {this.gameLoop(currentTime); });
  }
  /**
   * Checks if all entities/pieces are sliding or not.
   * Returns true if all have stopped, otherwise false.
   * 
   * @function hasAllStopped
   * @return {boolean}
   */
  hasAllStopped() {
    for (let k=0; k<this.allEntities.length; k++) {
      const e = this.allEntities[k];
      if (!e.isActive) continue;
      if (e.isGliding) return false;
    }
    return true;
  }
  /**
   * Animation loop function.
   * Renders at a fixed 60 FPS.
   * Uses requestAnimationFrame.
   * 
   * @function gameLoop
   * @param {DOMHighResTimeStamp} - currentTime
   */
  gameLoop(currentTime) {
    const elapsed = currentTime - this.lastTime;
    this.accumulatedTime += elapsed;
    // << frame rendering >> \\
    if (elapsed >= 16.66) {
      brush.clearRect(0, 0, board.width, board.height);
      const framePockets = Engine.awake();
      if (framePockets && framePockets.length > 0) {
        this.turnPockets.push(...framePockets);
      }
      this.artist.drawCarrom();
      // << reset >> \\
      this.lastTime = currentTime - (elapsed % 16.66);
    }
    // << handling turn state & shot >> \\
    /**
     * @optimization
     * 
     * Instead of checking scoring & turn updation every frame, we do so only once per second at the very last frame OR the very first frame.
     * @pros
     * This reduces CPU load by ~98%.
     * @cons
     * This delays processing by < one second each turn.
     * ACCEPTABLE for a board game.
     */
    if (this.accumulatedTime >= 1000) {
      if (this.hasAllStopped()) {
        const striker = PureBeing.striker;
        const launchCoords = PureBeing.strikerLaunchCoords;
        // << shot aftermath >> \\
        if (this.inputs.wasShot) {
          // << handle pocketing >> \\
          this.game.handleTurns(this.turnPockets);
          // << reset striker >> \\
          strikerHTML.style.left = "50%";
          striker.x = launchCoords.x;
          striker.y = this.IS_PLAYER_TURN ? launchCoords.playerY : launchCoords.computerY;
          // << reset pockets holder & shot flag >> \\
          this.turnPockets = [];
          this.inputs.wasShot = false;
          // << check game over >> \\
          if (this.game.checkGameOver()) {
            this.game.triggerGameOver();
          }
        }
        // << AI Integration >> \\
        if (!this.IS_PLAYER_TURN && !this.IS_AI_THINKING) {
          this.IS_AI_THINKING = true;
          this.callGpuAi();
        }
      }
      // << reset >> \\
      this.accumulatedTime = 0;
    }
    requestAnimationFrame((currentTime) => { this.gameLoop(currentTime); });
  }
  /**
   * Calls GPU AI.
   *
   * @function callGpuAi
   */
  callGpuAi() {
    GPU_AI.estimateBestShotGPU().then((shot) => {
      const striker = PureBeing.striker;
      if (shot) {          
        striker.x = shot.x;
        Engine.launchStriker(shot.a, shot.p);
        this.inputs.wasShot = true;
        this.IS_AI_THINKING = false;
        console.log("GPU AI Shot!");
      } else {
        // << gracefully fallback to CPU AI >> \\
        this.callCpuAi();
      }
    });
  }
  /**
   * Calls CPU AI.
   *
   * @function callCpuAi
   */
  callCpuAi() {
    CarromAI.estimateBestShot().then((shot) => {
      const striker = PureBeing.striker;
      striker.x = shot.x;
      Engine.launchStriker(shot.a, shot.p);
      this.inputs.wasShot = true;
      this.IS_AI_THINKING = false;
    });
  }
}

// == DRAWING == \\
/**
 * Handles drawing and canvas frame rendering.
 * 
 * @class Artist
 * @param {Orchestrator}
 */
class Artist {
  constructor(central) {
    // !! class design !! \\
    this.central = central;
    this.angle = 0;
    this.potential = 0;
  }
  ////// ========= \\\\\\
  // ++ CARROM DRAWING FUNCTIONS ++ \\
  /**
   * Helper function: draw centre of carrom board.
   * @function drawCentre
   */
  drawCentre() {
    // << get brush & draw >> \\
    brush.fillStyle = 'rgba(227, 58, 28, 0.35)';
    brush.beginPath();
    brush.arc(logicalWidth/2, logicalHeight/2, 35, 0, 2*pi);
    brush.fill();
  }
  /**
   * Helper function: draws board corners.
   * @function drawCorners
   */
  drawCorners() {
    // << set colour >> \\
    brush.fillStyle = 'rgb(0, 0, 0)';
    const corners = PureBeing.boardCorners;
    // << loop through 4 corners >> \\
    for (let k=0; k<4; k++) {
      // << get centres >> \\
      const corner = corners[k];
      brush.beginPath();
      /** corner radii: 2.5*u */
      brush.arc(corner.x, corner.y, 2.5*u, 0, 2*pi);
      brush.fill();
    }
  }
  /**
   * Helper function: draws board arrows.
   * @function drawArrows
   */
  drawArrowLines() {
    // << set colour >> \\
    brush.strokeStyle = 'rgb(0, 0, 0)';
    brush.lineWidth = 0.5*u;
    brush.lineCap = 'round';
    // << loop through 4 corners >> \\
    // << offsets to control arrow alignment & positioning >> \\
    const arrows = PureBeing.arrowLines;
    for (let k=0; k<4; k++) {
      // << get centres >> \\
      const arrow = arrows[k];
      brush.beginPath();
      brush.moveTo(arrow.sx, arrow.sy);
      brush.lineTo(arrow.ex, arrow.ey);
      brush.stroke();
    }
  }
  /**
   * Helper function: draws pieces
   * @function drawPieces
   */
  drawPieces() {
    const r = PureBeing.r;
    // << draw queen >> \\
    const queen = PureBeing.queen;
    if (queen.isActive) {
      brush.fillStyle = queen.colour;
      brush.beginPath();
      brush.arc(queen.x, queen.y, r, 0, 2*pi);
      brush.fill();
    }
    // << draw whites >> \\
    const whites = PureBeing.whites;
    brush.fillStyle = 'rgb(255, 255, 255)';
    for (let k=0; k<whites.length; k++) {
      const target = whites[k];
      if (target.isActive) {
        brush.beginPath();
        brush.arc(target.x, target.y, r, 0, 2*pi);
        brush.fill();
      }
    }
    // << draw blacks >> \\
    const blacks = PureBeing.blacks;
    brush.fillStyle = 'rgb(0, 0, 0)';
    for (let k=0; k<blacks.length; k++) {
      const target = blacks[k];
      if (target.isActive) {
        brush.beginPath();
        brush.arc(target.x, target.y, r, 0, 2*pi);
        brush.fill();
      }
    }
  }
  /**
   * Helper function: draws striking areas.
   * @function drawStrikingAreas
   */
  drawStrikingAreas() {
    // << set draw styles >> \\
    brush.strokeStyle = 'rgba(255, 0, 255, 0.55)';
    brush.fillStyle = 'rgba(115, 45, 235, 0.75)';
    brush.lineWidth = 3*u;
    brush.lineCap = 'round';
    // << get coordinates >> \\
    const areas = PureBeing.boardStrikingAreas;
    // << loop through 4 corners >> \\
    for (let k=0; k<4; k++) {
      const area = areas[k];
      // << issue draw calls >> \\
      // << draw slides >> \\
      brush.beginPath();
      brush.moveTo(area.sx, area.sy);
      brush.lineTo(area.ex, area.ey);
      brush.stroke();
      // << draw circles at ends >> \\
      brush.beginPath();
      brush.arc(area.sx, area.sy, 1.7*u, 0, 2*pi);
      brush.arc(area.ex, area.ey, 1.7*u, 0, 2*pi);
      brush.fill();
    }
  }
  ////// ========= \\\\\\
  // ++ STRIKER DRAWING FUNCTIONS ++ \\
  /**
   * Helper function: draws striker.
   * @function drawStriker
   */
  drawStriker() {
    /////// ++ NOTES ++ \\\\\\\
    // READ DATA DIRECTLY FROM striker \\
    // << setup >> \\
    const striker = PureBeing.striker;
    const x = striker.x;
    const y = striker.y;
    const r = striker.r;
    const gradient = brush.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgb(255, 255, 255)');
    gradient.addColorStop(1, 'rgb(0, 255, 255)');
    brush.fillStyle = gradient;
    // << draw call >> \\
    brush.beginPath();
    brush.arc(x, y, r, 0, 2*pi);
    brush.fill();
  }
  /**
   * Helper function: draws striker direction pointer when player aims to launch.
   * @function drawStrikerPotential
   * @param {number} - angle, angle of rotation for striker launch.
   * @param {number} - potential, potential or initial velocity for striker launch, ranging from 0 to 12.
   */
  drawStrikerPotential(angle, potential) {
    if (!this.central.inputs.isAiming) return;
    // << setup >> \\
    const striker = PureBeing.striker;
    const x = striker.x;
    const y = striker.y;
    brush.fillStyle = 'rgb(255, 255, 255)';
    for (let k=0; k<3; k++) {
      const step = k * potential * 0.5 + 3;
      brush.beginPath();
      brush.arc(x + step*u*cos(angle), y + step*u*sin(angle), 0.5*u, 0, 2*pi);
      brush.fill();
    }
  }
  ////// ========== \\\\\\
  // ++ UNIFIED MASTER FUNCTION ++ \\
  /**
   * Unified function: draws carrom design.
   * @function drawCarrom
   */
  drawCarrom() {
    this.drawCorners();
    this.drawCentre();
    this.drawArrowLines();
    this.drawStrikingAreas();
    this.drawStriker();
    this.drawStrikerPotential(this.angle, this.potential);
    this.drawPieces();
  }
}

// == UI INPUTS & TOUCHES == \\
/**
 * Handles UI, DOM updation, inputs & interactions.
 * 
 * @class InputWitness
 * @param {Orchestrator}
 */
class InputWitness {
  constructor(central) {
    // !! class design !! \\
    this.central = central;
    this.isSliding = false; // checks if strikerHTML is active \\ 
    this.isAiming = false; // checks if player if aiming to strike \\
    // !! awake !! \\
    this.setupStrikerListeners();
    this.setupCanvasStrikerListeners();
  }
  ///// ++++++++++++++++ \\\\\
  // == HTML STRIKER EVENTS ++ \\
  /**
   * Sets up touch start event listener for strikerHTML.
   * @function onTouchStart
   * @param {TouchEvent} - e, or event.
   */
  onTouchStart(e) {
    if (!this.isSliding && this.central.IS_PLAYER_TURN) {
      this.isSliding = true;
    }
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
  }
  /**
   * Sets up touch move event listener for strikerHTML.
   * @function onTouchMove
   * @param {TouchEvent} - e, or event.
   */
  onTouchMove(e) {
    if (!this.isSliding) return;
    e.preventDefault();
    this.nowX = e.touches[0].clientX;
    this.nowY = e.touches[0].clientY;
    // << movement math >> \\
    // << get positioning data >> \\
    const rect = strikerPositioner.getBoundingClientRect();
    const min = rect.left;
    const max = rect.right;
    // << get relative distances >> \\
    const length = rect.width;
    let dx = this.nowX - min;
    if (dx > length) dx = length;
    if (dx < 0) dx = 0;
    // << round off & update position >> \\
    const ratio = dx/length;
    strikerHTML.style.left = `${ratio*100}%`;
    // << update actual striker position on carrom canvas >> \\
    const launchBounds = PureBeing.strikerLaunchBounds;
    const launchCoords = PureBeing.strikerLaunchCoords;
    const strikerMin = launchBounds.min;
    const strikerMax = launchBounds.max;
    const dist = strikerMax - strikerMin;
    PureBeing.striker.x = strikerMin + (dist*ratio);
    PureBeing.striker.y = this.central.IS_PLAYER_TURN ? launchCoords.playerY : launchCoords.computerY;
  }
  /**
   * Sets up touch end event listener for strikerHTML.
   * @function onTouchEnd
   * @param {TouchEvent} - e, or event.
   */
  onTouchEnd(e) {
     if (this.isSliding) this.isSliding = false;
   }
  /**
   * Unified function to setup & bind strikerHTML event listeners.
   * @function setupStrikerListeners
   */
  setupStrikerListeners() {
    strikerHTML.addEventListener('touchstart', (e) => {
      this.onTouchStart(e);
    });
    strikerHTML.addEventListener('touchmove', (e) => {
      this.onTouchMove(e);
    });
    strikerHTML.addEventListener('touchend', (e) => {
      this.onTouchEnd(e);
    });
  }
  ///// +++++++++++++++ \\\\\
  // == BOARD STRIKER EVENTS == \\
  /**
   * Sets up touch start event listener for actual board striker.
   * @function onTouchStriker
   * @param {TouchEvent} - e, or event.
   */
  onTouchStriker(e) {
    // << skip if striker is moving  OR disable user when AI is playing >> \\
    const striker = PureBeing.striker;
    if (striker.isGliding || !this.central.IS_PLAYER_TURN) return;
    // << get touch x & y >> \\
    this.tx = (e.touches[0].clientX - boardRect.left) * scale;
    this.ty = (e.touches[0].clientY - boardRect.top) * scale;
    // << get striker x & y >> \\
    const sx = striker.x;
    const sy = striker.y;
    // << get distance >> \\
    const dist = Math.sqrt((this.tx - sx)**2+(this.ty - sy)**2);
    // << check >> \\
    if (dist <= PureBeing.strikerRadius && !this.isAiming && !this.isSliding) {
      this.isAiming = true;
    }
  }
  /**
   * Sets up touch move event listener for board striker.
   * @function onMoveStriker
   * @param {TouchEvent} - e, or event.
   */
  onMoveStriker(e) {
    // << skip if aiming or striker moving >> \\
    if (!this.isAiming || PureBeing.striker.isGliding) return;
    e.preventDefault();
    // << get now x & y >> \\
    const nx = (e.touches[0].clientX - boardRect.left) * scale;
    const ny = (e.touches[0].clientY - boardRect.top) * scale;
    // << get angle & potential >> \\
    const angle = Math.atan2((ny - this.ty), (nx - this.tx));
    const dist = Math.sqrt((nx - this.tx)**2 + (ny - this.ty)**2);
    // << pass adjusted data to Artist >> \\
    this.central.artist.angle = pi + angle; // rotated by 180 degree to nullify offset;
    this.central.artist.potential = Math.min(15, Math.max(0, dist/uw)); // clamped between 0 to 15;
  }
  /**
   * Sets up touch end event listener for board striker.
   * @function onEndStriker
   * @param {TouchEvent} - e, or event.
   */
  onEndStriker(e) {
    if (!this.isAiming) return;
    this.isAiming = false;
    Engine.launchStriker(this.central.artist.angle, this.central.artist.potential);
    // << flag to track states in Orchestrator gameLoop >> \\
    this.wasShot = true;
    this.central.artist.angle = 0;
  }
  /**
   * Unified function to setup board striker event listeners.
   * @function setupCanvasStrikerListeners
   */
  setupCanvasStrikerListeners() {
    board.addEventListener('touchstart', (e) => {
      this.onTouchStriker(e);
    });
    board.addEventListener('touchmove', (e) => {
      this.onMoveStriker(e);
    });
    board.addEventListener('touchend', (e) => {
      this.onEndStriker(e);
    });
  }
}

// == GAMEPLAY, SCORES & TURNS == \\
/**
 * @class GameManager
 * @param {Orchestrator}
 */
class GameManager {
  constructor(central) {
    // !! class design !! \\
    this.central = central;
    // !! internal trackers !! \\
    this._playerScore = 0;
    this._computerScore = 0;
    // !! pocket holders !! \\
    this.playerPockets = [];
    this.computerPockets = [];
    // !! awake !! \\
    this.bindScores();
  }
  // +++++++++++++ \\
  // ++ REACTIVE BINDINGS ++ \\
  /**
   * Binds scores & DOM updation reactively using Object.defineProperty() method.
   * 
   * @function bindScores
   */
  bindScores() {
    /**
     * @blueprint
     * 
     * Target: 'this' (the GameManager instance)
     * Property Name: "playerScore"/"computerScore"
     * Configuration Object: The gears/triggers you want to attach
     */
    // << bind player score >> \\
    Object.defineProperty(this, "playerScore", {
      // << attaches to console.log(this.playerScore) >> \\
      get: () => {
        return this._playerScore;
      },
      // << attaches to this.playerScore++ >> \\
      set: (newValue) => {
        this._playerScore = newValue;
        playerScore.textContent = newValue;
      }
    });
    // << bind computer score >> \\
    Object.defineProperty(this, "computerScore", {
      // << attaches to console.log(this.playerScore) >> \\
      get: () => {
        return this._computerScore;
      },
      // << attaches to this.playerScore++ >> \\
      set: (newValue) => {
        this._computerScore = newValue;
        computerScore.textContent = newValue;
      }
    });
    // << instantiate >> \\
    this.playerScore = 0;
    this.computerScore = 0;
  }
  // ++ TURNS ++ \\
  /**
   * Checks, manages & toggles turn flags.
   * 
   * @function handleTurns
   * @param {array<object>} - pocketedEntities
   */
  handleTurns(pocketedEntities) {
    // << get active player >> \\
    const isPlayer = this.central.IS_PLAYER_TURN;
    let keepNextTurn = false;
    const hasPockets = pocketedEntities && pocketedEntities.length > 0;
    // << flag to track queen pocketing >> \\
    if (this.isQueenMove) {
      // << get queen >> \\
      const queen = PureBeing.queen;
      // << handle pocketing >> \\
      if (hasPockets) {
        // << switch states >> \\
        keepNextTurn = true;
        this.isQueenMove = false;
        // << add queen points >> \\
        if (isPlayer) {
          this.playerScore += 50;
          this.playerPockets.push("QUEEN");
        } else {
          this.computerScore += 50;
          this.computerPockets.push("QUEEN");
        }
        for (let k=0; k<pocketedEntities.length; k++) {
          const e = pocketedEntities[k];
          if (isPlayer) {
            if (e.type === "WHITE") {
              this.playerScore += 20;
              this.playerPockets.push("WHITE");
            } else if (e.type === "BLACK") {
              this.playerScore += 10;
              this.playerPockets.push("BLACK");
            }
          } else {
            if (e.type === "WHITE") {
              this.computerScore += 20;
              this.computerPockets.push("WHITE");
            } else if (e.type === "BLACK") {
              this.computerScore += 10;
              this.computerPockets.push("BLACK");
            }
          }
        }
      } else {
        // << bring back queen if failed to pocket >> \\
        this.isQueenMove = false;
        queen.isActive = true;
        queen.isGliding = false;
        queen.vx = 0;
        queen.vy = 0;
        queen.x = logicalWidth/2;
        queen.y = logicalHeight/2;
      }
    } else {
      if (hasPockets) {
        keepNextTurn = true;
        for (let k=0; k<pocketedEntities.length; k++) {
          const e = pocketedEntities[k];
          if (isPlayer) {
            if (e.type === "WHITE") {
              this.playerScore += 20;
              this.playerPockets.push("WHITE");
            } else if (e.type === "BLACK") {
              this.playerScore += 10;
              this.playerPockets.push("BLACK");
            } else if (e.type === "QUEEN") {
              this.isQueenMove = true;
            }
          } else {
            if (e.type === "WHITE") {
              this.computerScore += 20;
              this.computerPockets.push("WHITE");
            } else if (e.type === "BLACK") {
              this.computerScore += 10;
              this.computerPockets.push("BLACK");
            } else if (e.type === "QUEEN") {
              this.isQueenMove = true;
            }
          }
        }
      }
    }
    // << toggle if no valid pockets >> \\
    if (!keepNextTurn) {
      this.central.IS_PLAYER_TURN = !isPlayer;
    }
  }
  // ++ GAMEOVER & RESTART ++ \\
  /**
   * Checks if game is over.
   * 
   * @function checkGameOver
   * @return {boolean}
   */
  checkGameOver() {
    // << setup >> \\
    const total = this.playerScore + this.computerScore;
    const neitherHaveQueen = !this.playerPockets.includes("QUEEN") && !this.computerPockets.includes("QUEEN");
    // << check >> \\
    // << game ends if all pieces are pocketed or if all except queen are pocketed >> \\
    /**
     * @math
     * 
     * MAX (including queen)
     * = 9 BLACK + 9 WHITE + 1 QUEEN
     * = 9 × 10 + 9 × 20 + 50
     * = 320
     * 
     * MAX (excluding queen)
     * = 9 × 10 + 9 × 20
     * = 270
     */
    if (total === 320) return true;
    if (total === 270 && neitherHaveQueen) return true;
    // << otherwise the game is good to go on >> \\
    return false;
  }
  /**
   * Check for victory & game's outcome.
   * 
   * @function declareOutcome
   * @return {string}
   */
  declareOutcome() {
    // << setup >> \\
    const total = this.playerScore + this.computerScore;
    const diff = this.playerScore - this.computerScore;
    const playerHaveQueen = this.playerPockets.includes("QUEEN");
    const computerHaveQueen = this.computerPockets.includes("QUEEN");
    // << check >> \\
    /**
     * @pathflow
     * 
     * First check scores.
     * The one with greater score wins.
     * 
     * Next check queen.
     * In case of equal scores, the one with queen wins.
     * 
     * Otherwise, game draws.
     */
    if (diff > 0) {
      return "YOU WON!";
    } else if (diff < 0) {
      return "COMPUTER WON!";
    } else {
      if (playerHaveQueen) {
        return "YOU WON!";
      } else if (computerHaveQueen) {
        return "COMPUTER WON!";
      } else {
        // << draw >> \\
        return "GAME DRAW";
      }
    }
  }
  /**
   * Triggers & declares game over.
   * 
   * @function triggerGameOver
   */
  triggerGameOver() {
    winnerText.textContent = this.declareOutcome();
    gameOverScreen.style.display = "grid";
    replayButton.addEventListener('click', this.resetGameState.bind(this), { once: true });
  }
  /**
   * Resets score, states, flags, pockets, carrom state to start & closes game over window.
   * 
   * @function resetGameState()
   */
  resetGameState() {
    // << reset score & pockets >> \\
    this.playerScore = 0;
    this.computerScore = 0;
    this.playerPockets = [];
    this.computerPockets = [];
    this.isQueenMove = false;
    // << reset state >> \\
    const entities = this.central.allEntities;
    for (let k=0; k<entities.length; k++) {
      const target = entities[k];
      const start = startSnapShot[k];
      target.x = start.x;
      target.y = start.y;
      target.vx = 0;
      target.vy = 0;
      target.isGliding = false;
      target.isActive = true;
    }
    // << reset turn & striker >> \\
    this.central.IS_PLAYER_TURN = true;
    // << close game over window >> \\
    gameOverScreen.style.display = "none";
  }
}

// == Performance == \\
/**
 * THIS CLASS DOESNT BELONG TO THE MAIN GAMEPLAY LOOP.
 * Which is why, it is instantiated separately.
 * Tracks & logs frame rates in fps using requestAnimationFrame.
 * Helps gain performance insights.
 * 
 * @class Disciplinarian
 */
class Disciplinarian {
  constructor() {
    // !! class design !! \\
    this.lastTime = performance.now();
    this.frameCount = 0;
    // !! awake !! \\
    requestAnimationFrame((currentTime) => { this.logFPS(currentTime); });
  }
  /**
   * Tracks & logs frame rate using requestAnimationFrame.
   * 
   * @function logFPS
   * @param {DOMHighResTimeStamp} - currentTime
   */
  logFPS(currentTime) {
    // << update counter on every call >> \\
    this.frameCount++;
    const elapsed = currentTime - this.lastTime;
    if (elapsed >= 1000) {
      console.log(`Frame rate: ${this.frameCount}fps.`);
      // << reset counter >> \\
      this.frameCount = 0;
      this.lastTime = currentTime - (elapsed % 1000);
    }
    // << awake loop >> \\
    requestAnimationFrame((currentTime) => { this.logFPS(currentTime); });
  }
}

///// +++++++++++++++++++++++++ \\\\\
//// +++ THE GREAT AWAKENING +++ \\\\
window.addEventListener('load', async () => {
  const game = new Orchestrator();
  const perf = new Disciplinarian();
  try {
    await GPU_AI.initialize();
  } catch (error) {
    console.log("GPU AI failed to initialize: ", error);
  }
});

///// +++++++++++++++++++++ \\\\\
//// == DEVELOPER'S NOTES == \\\\
/**
 * || Om Tatpurushaya Vidmahe,
 *    Mahadevaya Dhimahi,
 *    Tanno Rudrah Prachodayat ||
 * 
 * +++++++ MAIN +++++++
 * Games used mediator class structure & data-oriented design.
 * All modules/classes communicate via a central class _Orchestrator_.
 * 
 * +++++++ DATA +++++++
 * All data is stored in a separate js file _PureBeing.js_.
 * The game loop engine & animator class reads/updates data from this file & renders game.
 * 
 * +++++++ PHYSICS ENGINE +++++++
 * Game engine is stored in a entirely separate file _Engine.js_.
 * Handles both game physics & collisions.
 * 
 * Physics rules are composed across 4 functions. Orchestrator only calls one master function: _Engine.awake()_ that calls all 4.
 * 
 * +++++++ AI SIMULATION +++++++
 * AI opponent is stored in a separate file _CarromAI.js_.
 * Engine calls async function estimateBestShot that yield thread controls back-to-bsck per 60 simulation
 * Finally, when all simulations are done, AI yields & launches carrom at best estimated shot. 
 * 
 * +++++++ GAME RULES +++++++
 * Player/user always starts first.
 * Scoring is indifferent to black or white. Both players can safely pocket any piece.
 * BLACK = 10 points.
 * WHITE = 20 points.
 * QUEEN = 50 points.
 * Like traditional carrom, a player needs a "cover-piece" to secure queen, otherwise he/she loses it.
 * But unlike traditional carrom, striker can't fall into pockets. Even if it does, _Artist_ doesn't pocket it and lets game flow freely. This ensures easier gameplay.
 * Game ends with either all pieces are pocketed OR when only queen remains.
 * Winner is declared by who scored more points.
 * In case of equal points, the one with queen wins.
 * In case of equal points and neither having queen, the game draws.
 * BEWARE OF THE AI. Though it uses simple distance minimizing algorithm & covers only general cases, it can demolish you with 320 points with his side and 0 with you. ☠️☠️☠️😈😈😈
 */
 
/**
 * Game is grouped into 4 classes.
 * The central class is _Orchestrator_.
 * 
 * Rest 3 classes are:
 *   _Artist_
 *   _InputWitness_
 *   _GameManager_
 * 
 * We have an extra class _Disciplinarian_ that tracks performance in FPS.
 */
 
/**
 * @class Orchestrator
 * 
 * @functions
 *   hasAllStopped - checks whether all entities are moving or not.
 *   gameLoop - the actual game play loop.
 * 
 * @flags
 *   IS_PLAYER_TURN - tracks whose turn is.
 *   IS_AI_THINKING - checks AI move simulation.
 *   
 * @timestamps
 *   lastTime - tracks frame updates in gameLoop.
 *   accumulatedTime - measures per second passing; used in checks & performance optimizations.
 *   Instead of calling scoring, pocketing & game over check every frame, we call it only at the last frame of every second via the help of _accumulatedTime_.
 * 
 * @data
 *   allEntities - holds array of all game entities.
 * 
 * @subclasses
 *   artist - Artist()
 *   inputs - InputWitness()
 *   game - GameManager()
 */
 
/**
 * @class Artist
 * 
 * @functions
 *   drawCentre
 *   drawCorners
 *   drawArrowLines
 *   drawPieces
 *   drawStrikingAreas
 *   drawStriker
 *   drawStrikerPotential
 *   drawCarrom - unified function with all above-mentioned functions composed into a pipeline.
 * 
 * All functions of this class call data from _PureBeing.js_ file to draw from.
 * 
 * @data
 *   central - reference to _Orchestrator_ class.
 *   angle - angle of launching striker.
 *   potential - potential or initial velocity of launching striker, clamped between 0 to 15.
 */
 
/**
 * @class InputWitness
 * 
 * @functions
 *   onTouchStart
 *   onTouchMove
 *   onTouchEnd
 *   setupStrikerListeners - unified above 3 listener for _strikerHTML_ slider into one function.
 *   onTouchStriker
 *   onMoveStriker
 *   onEndStriker
 *   setupCanvasStrikerListeners -  unified above 3 listeners for carrom striker into one function.
 * 
 * @data
 *   central - reference to _Orchestrator_ class.
 * 
 * @flags
 *   isSliding - checks whether player is sliding striker.
 *   isAiming - checks whether player is aiming to launch, helps in **when** to draw call _drawStrikerPotential_ from _Artist_ class.
 */
 
/**
 * @class GameManager
 * 
 * @functions
 *   bindScores
 *   handleTurns
 *   checkGameOver
 *   declareOutcome
 *   triggerGameOver
 *   resetGameState
 * 
 * @data
 *   central - reference for _Orchestrator_ class.
 *   _playerScore - internal data tracker to bind player score & UI.
 *   _computerScore - internal data tracker to bind computer score & UI.
 *   playerPockets - array to store player pocketed pieces.
 *   computerScore - array to store computerPockets pocketed pieces.
 *   playerScore - actual player score variable.
 *   computerScore - actual computer score variable.
 */