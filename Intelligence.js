// <<!!{{ Enlightened Mystic JS }}!!>> \\
// ---!!! PURE NON-DUAL POTENTIAL !!!--- \\

// <<!! PERCEIVE DIMENSIONS !!>> \\
const deviceHeight = window.innerHeight;
const unitHeight = deviceHeight / 100;
const deviceWidth = window.innerWidth;
const unitWidth = deviceWidth / 100;

// <<!! SOURCE OF TRUTH !!>> \\
class FormlessIntelligence {
  constructor() {
    // !! class' samskaras !! \\
    // !! display samskara !! \\
    this.gridContainer = document.getElementById('gridContainer');
    this.gameGrid = document.getElementById('gameGrid');
    this.gridBrush = this.gameGrid.getContext('2d');
    // !! souls samskara !! \\
    this.souls = [];
    this.soulsKundalini = [
      {chakra: 1, roop: "red"},
      {chakra: 2, roop: "orange"},
      {chakra: 3, roop: "yellow"},
      {chakra: 4, roop: "lightgreen"},
      {chakra: 5, roop: "skyblue"},
      {chakra: 6, roop: "violet"},
      {chakra: 7, roop: "indigo"},
      {chakra: 8, roop: "red"},
      {chakra: 9, roop: "orange"},
      {chakra: 10, roop: "yellow"},
      {chakra: 11, roop: "lightgreen"},
      {chakra: 12, roop: "skyblue"},
      {chakra: 13, roop: "violet"},
      {chakra: 14, roop: "indigo"}
      ];
    // !! scores samskaras !! \\
    this.currentScore = document.getElementById('currentScore');
    this.highScore = document.getElementById('highScore');
    // !! game over samskaras !! \\
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.restartButton = document.getElementById('restartButton');
    this.gameOverHigh = document.getElementById('gameOverHigh');
    this.gameOverCurrent = document.getElementById('gameOverCurrent');
    // !! dharana !! \\
    this.display = new FormDisplay(this);
    // !! dhyana !! \\
    this.witness();
    // !! samadhi !! \\
    this.movements = new FormMovements(this);
    this.scores = new FormScores(this);
    this.gameover = new FormGameOver(this);
  }
  // << the background witness >> \\
  witness() {
    const awareness = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        // << movements >> \\
        if (mutation.type === 'attributes' && mutation.attributeName.startsWith('data-')) {
          // << get shift data >> \\
          let node = mutation.target;
          let nadiType = mutation.attributeName;
          let oldValue = mutation.oldValue;
          let newValue = node.getAttribute(mutation.attributeName);
          // << update >> \\
          if (oldValue !== newValue) {
            this.watchNadiShifts(node, nadiType, parseInt(oldValue), parseInt(newValue));
          }
        }
      }
    });
    // << configure the witness >> \\
    awareness.observe(this.gridContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-ida', 'data-pingala'],
      attributeOldValue: true
    });
  }
  // << witnessing states >> \\
  watchSoulsState(ida, pingala, state) {
    let soul = this.souls.find(s => s[0] === ida && s[1] === pingala);
    if (soul) {
      soul[2] = state;
    }
  }
  // << witnessing movements >> \\
  watchNadiShifts(node, nadiType, oldNadi, newNadi) {
    let currentIda = parseInt(node.dataset.ida);
    let currentPingala = parseInt(node.dataset.pingala);
    if (nadiType === 'data-ida') {
      this.watchSoulsState(oldNadi, currentPingala, "unmanifest");
      this.watchSoulsState(newNadi, currentPingala, "manifest");
    } else if (nadiType === 'data-pingala') {
      this.watchSoulsState(currentIda, oldNadi, "unmanifest");
      this.watchSoulsState(currentIda, newNadi, "manifest");
    }
  }
  // << elevates nadi states >> \\
  elevateNadiShifts(soulElement, ida, pingala) {
    if (soulElement) {
      soulElement.dataset.ida = ida;
      soulElement.dataset.pingala = pingala;
    }
  }
}

// <<!! DISPLAY ILLUSIONS !!>> \\
class FormDisplay {
  constructor(intelligence) {
    // !! class' samskaras !! \\
    this.intelligence = intelligence;
    this.gridContainer = this.intelligence.gridContainer;
    this.gameGrid = this.intelligence.gameGrid;
    this.gameGrid.width = 37 * unitHeight;
    this.gameGrid.height = 37 * unitHeight;
    this.gridBrush = this.intelligence.gridBrush;
    this.souls = this.intelligence.souls;
    this.soulsKundalini = this.intelligence.soulsKundalini;
    // !! manifesting karmas !! \\
    this.manifestLife();
    this.birthRandomSoul();
    // !! kundalini !! \\
    this.letSoulsKundaliniRise();
  }
  // << class' karmas >> \\
  // << manifests 4×4 grid >> \\
  manifestLife() {
    // << colour canvas >> \\
    this.gridBrush.fillStyle = 'brown';
    this.gridBrush.fillRect(0, 0, this.gameGrid.width, this.gameGrid.height);
    // << colour souls >> \\
    for (let x=1; x<=4; x++) {
      for (let y=1; y<=4; y++) {
        // << setup samsara for 4×4 destiny >> \\
        let left = unitHeight+((x-1)*9*unitHeight);
        let top = unitHeight+((y-1)*9*unitHeight);
        let cellWidth = 8 * unitHeight;
        let cellHeight = 8 * unitHeight;
        let borderRadius = unitHeight;
        // << now draw >> \\
        this.gridBrush.beginPath();
        this.gridBrush.fillStyle = `rgba(200, 160, 30, 0.3)`;
        this.gridBrush.roundRect(left, top, cellWidth, cellHeight, borderRadius);
        this.gridBrush.fill();
        /*
        To achieve rounded corners on your tiny boxes, we have to define our own custom drawing path using a combination of in-built path generation methods, or use the newer in-built roundRect() method which is now widely supported in modern browsers.
        Modern browsers have added an in-built method explicitly for this purpose: ctx.roundRect(x, y, width, height, radii).
        */
        // << store data >> \\
        this.souls.push([x, y, "unmanifest"]);
      }
    }
  }
  // << manifests new soul >> \\
  birthSoul(ida, pingala) {
    // << design new soul's karma >> \\
    let newSoul = document.createElement('div');
    newSoul.className = 'soul';
    newSoul.dataset.ida = ida;
    newSoul.dataset.pingala = pingala;
    newSoul.dataset.chakra = 1;
    newSoul.innerText = 2**newSoul.dataset.chakra;
    newSoul.style.background = this.soulsKundalini[newSoul.dataset.chakra-1].roop;
    // << design soul's body >> \\
    newSoul.style.transform = `translate3d(${(1+9*(ida-1))*unitHeight}px, ${(1+(9*(pingala-1)))*unitHeight}px, 0)`;
    this.gridContainer.appendChild(newSoul);
    // << sync game state >> \\
    this.intelligence.watchSoulsState(ida, pingala, "manifest");
  }
  // << unmanifests a manifest soul >> \\
  dissolveSoul(soulElement) {
    if (!soulElement) return; //safety check;
    // << meditate on target soul>> \\
    let ida = parseInt(soulElement.dataset.ida);
    let pingala = parseInt(soulElement.dataset.pingala);
    // << remove this soul >> \\
    soulElement.remove();
    // << sync game state >> \\
    this.intelligence.watchSoulsState(ida, pingala, "unmanifest");
    /*
    .removeChild() simply detaches the child from the parent. It lingers in the memory anyway until GC acts;
      However, .remove() directly deletes the elements entirely;
    */
  }
  // << births a new random soul >> \\
  birthRandomSoul() {
    // << meditate on unmanifest souls >> \\
    let unmanifestSouls = this.souls.filter(soul => soul[2] === "unmanifest");
    let l = unmanifestSouls.length;
    let r = Math.floor(Math.random()*l);
    let randomSoul = [...unmanifestSouls][r];
    // << birth >> \\
    let ida = randomSoul[0];
    let pingala = randomSoul[1];
    this.birthSoul(ida, pingala);
  }
  // << kundalini herself >> \\
  letSoulsKundaliniRise() {
    // << manifest doer >> \\
    const kundalini = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        // << check if chakra elevated >> \\
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-chakra') {
          // << get soul node >> \\
          let node = mutation.target;
          let chakra = node.dataset.chakra;
          // << shift kundalini >> \\ 
          node.innerText = 2 ** chakra;
          node.style.background = this.soulsKundalini[chakra-1].roop;
        }
      }
    });
    // << configure kundalini >> \\
    kundalini.observe(this.gridContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-chakra']
    });
  }
}

// <<!! MOVEMENT ILLUSIONS !!>> \\
class FormMovements {
  constructor(intelligence) {
    // !! class' samskaras !! \\
    this.intelligence = intelligence;
    this.gridContainer = this.intelligence.gridContainer;
    this.gameGrid = this.intelligence.gameGrid;
    this.gridBrush = this.intelligence.gridBrush;
    this.isMoving = false; // gatekeeper to prevent multiple race swipes;
    // !! flow down karma from intelligence !! \\
    // !! manifesting karmas !! \\
    this.letSoulsMoveThroughLife();
    this.freeWillSwiping();
  }
  // << class' karmas >> \\
  // << movements animation >> \\
  moveSoul(soulElement, currentIda, currentPingala, endIda, endPingala) {
    // << function's samskaras >> \\
    const speed = 0.21;
    if (!soulElement) return; //safety check;
    // << meditate on soul's current position >> \\
    let nowIda = parseFloat((9*(currentIda-1)+1)*unitHeight);
    let nowPingala = parseFloat((9*(currentPingala-1)+1)*unitHeight);
    // << meditate on soul's target position >> \\
    let targetIda = parseFloat((9*(endIda-1)+1)*unitHeight);
    let targetPingala = parseFloat((9*(endPingala-1)+1)*unitHeight);
    // << move >> \\
    const animate = () => {
      // << get difference >> \\
      let diffIda = parseFloat(targetIda - nowIda);
      let diffPingala = parseFloat(targetPingala - nowPingala);
      if (Math.abs(diffIda) > 0.1 || Math.abs(diffPingala) > 0.1) {
        // << get distances >> \\
        nowIda += diffIda * speed;
        nowPingala += diffPingala * speed;
        // << apply transform >> \\
        soulElement.style.transform = `translate3d(${nowIda}px, ${nowPingala}px, 0)`;
        // << animate >> \\
        requestAnimationFrame(animate);
      } else {
        // << land on final position >> \\
        soulElement.style.transform = `translate3d(${targetIda}px, ${targetPingala}px ,0)`;
      }
    }
    requestAnimationFrame(animate);
  }
  // << movements karta >> \\
  letSoulsMoveThroughLife() {
    // << manifest doer >> \\
    const doer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        // << check if nadi shifted >> \\
        if (mutation.type === 'attributes') {
          // << get soul karma >> \\
          let node = mutation.target;
          if (!node || !node.parentNode) return; // safety check;
          // << get new nadis >> \\
          let currentIda = parseInt(node.dataset.ida);
          let currentPingala = parseInt(node.dataset.pingala);
          // << ensure values exists >> \\
          if (isNaN(currentIda) || isNaN(currentPingala)) continue;
          if (mutation.attributeName === 'data-ida') {
            // << get nadis >> \\
            let oldIda = parseInt(mutation.oldValue);
            if (isNaN(oldIda)) oldIda = currentIda; // safety bottleneck;
            // << karma-phal >> \\
            if (oldIda !== currentIda) {
              this.moveSoul(node, oldIda, currentPingala, currentIda, currentPingala);
            }
          } else if (mutation.attributeName === 'data-pingala') {
            // << get nadis >> \\
            let oldPingala = parseInt(mutation.oldValue);
            if (isNaN(oldPingala)) oldPingala = currentPingala; // safety bottleneck;
            // << karma-phal >> \\
            if (oldPingala !== currentPingala) {
              this.moveSoul(node, currentIda, oldPingala, currentIda, currentPingala);
            }
          }
        }
      }
    });
    // << configure doer >> \\
    doer.observe(this.gridContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-ida', 'data-pingala'],
      attributeOldValue: true
    });
  }
  // << handles right swipe >> \\
  moveRight() {
    // << function's samskaras >> \\
    let manifestSouls = Array.from(document.getElementsByClassName('soul'));
    let movedAny = false;
    // << function's karma >> \\
    for (let thisPingala=1; thisPingala<=4; thisPingala++) {
      // << get this row souls >> \\
      let alignedSouls = manifestSouls.filter(soul => parseInt(soul.dataset.pingala) === thisPingala).sort((a, b) => {
        let parameterA = parseInt(a.dataset.ida);
        let parameterB = parseInt(b.dataset.ida);
        return (parameterB - parameterA);
      });
      // << process shift & merge simultaneously within this row >> \\
      let destinedIda = 4;
      for (let k=0; k<alignedSouls.length; k++) {
        // << get adjacent souls >> \\
        let thisSoul = alignedSouls[k];
        let nextSoul = alignedSouls[k+1];
        // << lock in nadis >> \\
        let currentIda = parseInt(thisSoul.dataset.ida);
        let currentPingala = parseInt(thisSoul.dataset.pingala);
        // << check if they can shift & merge >> \\
        if (nextSoul && nextSoul.dataset.chakra === thisSoul.dataset.chakra) {
          // << move this soul to target slot & dissolve it >> \\
          this.intelligence.display.dissolveSoul(thisSoul);
          // << move next soul & elevate its kundalini >> \\
          this.intelligence.elevateNadiShifts(nextSoul, destinedIda, currentPingala);
          // << elevate chakra >> \\
          nextSoul.dataset.chakra = parseInt(nextSoul.dataset.chakra) + 1;
          // << skip next ida since already merged >> \\
          k++;
          movedAny = true;
        } else {
          // << simply shift since no match found >> \\
          if (currentIda !== destinedIda) {
            this.intelligence.elevateNadiShifts(thisSoul, destinedIda, currentPingala);
            movedAny = true;
          }
        }
        // << advance destiny tracker >> \\
        destinedIda--;
      }
    }
    return movedAny;
  }
  // << handles left swipe >> \\
  moveLeft() {
    // << function's samskaras >> \\
    let manifestSouls = Array.from(document.getElementsByClassName('soul'));
    let movedAny = false;
    // << function's karma >> \\
    for (let thisPingala=1; thisPingala<=4; thisPingala++) {
      // << get this row souls >> \\
      let alignedSouls = manifestSouls.filter(soul => parseInt(soul.dataset.pingala) === thisPingala).sort((a, b) => {
        let parameterA = parseInt(a.dataset.ida);
        let parameterB = parseInt(b.dataset.ida);
        return (parameterA - parameterB);
      });
      // << process shift & merge simultaneously within this row >> \\
      let destinedIda = 1;
      for (let k=0; k<alignedSouls.length; k++) {
        // << get adjacent souls >> \\
        let thisSoul = alignedSouls[k];
        let nextSoul = alignedSouls[k+1];
        // << lock in nadis >> \\
        let currentIda = parseInt(thisSoul.dataset.ida);
        let currentPingala = parseInt(thisSoul.dataset.pingala);
        // << check if they can shift & merge >> \\
        if (nextSoul && nextSoul.dataset.chakra === thisSoul.dataset.chakra) {
          // << move this soul to target slot & dissolve it >> \\
          this.intelligence.display.dissolveSoul(thisSoul);
          // << move next soul & elevate its kundalini >> \\
          this.intelligence.elevateNadiShifts(nextSoul, destinedIda, currentPingala);
          // << elevate chakra >> \\
          nextSoul.dataset.chakra = parseInt(nextSoul.dataset.chakra) + 1;
          // << skip next ida since already merged >> \\
          k++;
          movedAny = true;
        } else {
          // << simply shift since no match found >> \\
          if (currentIda !== destinedIda) {
            this.intelligence.elevateNadiShifts(thisSoul, destinedIda, currentPingala);
            movedAny = true;
          }
        }
        // << advance destiny tracker >> \\
        destinedIda++;
      }
    }
    return movedAny;
  }
  // << handles down swipe >> \\
  moveDown() {
    // << function's samskaras >> \\
    let manifestSouls = Array.from(document.getElementsByClassName('soul'));
    let movedAny = false;
    // << function's karma >> \\
    for (let thisIda=1; thisIda<=4; thisIda++) {
      // << get this row souls >> \\
      let alignedSouls = manifestSouls.filter(soul => parseInt(soul.dataset.ida) === thisIda).sort((a, b) => {
        let parameterA = parseInt(a.dataset.pingala);
        let parameterB = parseInt(b.dataset.pingala);
        return (parameterB - parameterA);
      });
      // << process shift & merge simultaneously within this row >> \\
      let destinedPingala = 4;
      for (let k=0; k<alignedSouls.length; k++) {
        // << get adjacent souls >> \\
        let thisSoul = alignedSouls[k];
        let nextSoul = alignedSouls[k+1];
        // << lock in nadis >> \\
        let currentIda = parseInt(thisSoul.dataset.ida);
        let currentPingala = parseInt(thisSoul.dataset.pingala);
        // << check if they can shift & merge >> \\
        if (nextSoul && nextSoul.dataset.chakra === thisSoul.dataset.chakra) {
          // << move this soul to target slot & dissolve it >> \\
          this.intelligence.display.dissolveSoul(thisSoul);
          // << move next soul & elevate its kundalini >> \\
          this.intelligence.elevateNadiShifts(nextSoul, currentIda, destinedPingala);
          // << elevate chakra >> \\ 
          nextSoul.dataset.chakra = parseInt(nextSoul.dataset.chakra) + 1;
          // << skip next ida since already merged >> \\
          k++;
          movedAny = true;
        } else {
          // << simply shift since no match found >> \\
          if (currentPingala !== destinedPingala) {
            this.intelligence.elevateNadiShifts(thisSoul, currentIda, destinedPingala);
            movedAny = true;
          }
        }
        // << advance destiny tracker >> \\
        destinedPingala--;
      }
    }
    return movedAny;
  }
  // << handles up swipe >> \\
  moveUp() {
    // << function's samskaras >> \\
    let manifestSouls = Array.from(document.getElementsByClassName('soul'));
    let movedAny = false;
    // << function's karma >> \\
    for (let thisIda=1; thisIda<=4; thisIda++) {
      // << get this row souls >> \\
      let alignedSouls = manifestSouls.filter(soul => parseInt(soul.dataset.ida) === thisIda).sort((a, b) => {
        let parameterA = parseInt(a.dataset.pingala);
        let parameterB = parseInt(b.dataset.pingala);
        return (parameterA - parameterB);
      });
      // << process shift & merge simultaneously within this row >> \\
      let destinedPingala = 1;
      for (let k=0; k<alignedSouls.length; k++) {
        // << get adjacent souls >> \\
        let thisSoul = alignedSouls[k];
        let nextSoul = alignedSouls[k+1];
        // << lock in nadis >> \\
        let currentIda = parseInt(thisSoul.dataset.ida);
        let currentPingala = parseInt(thisSoul.dataset.pingala);
        // << check if they can shift & merge >> \\
        if (nextSoul && nextSoul.dataset.chakra === thisSoul.dataset.chakra) {
          // << move this soul to target slot & dissolve it >> \\
          this.intelligence.display.dissolveSoul(thisSoul);
          // << move next soul & elevate its kundalini >> \\
          this.intelligence.elevateNadiShifts(nextSoul, currentIda, destinedPingala);
          // << elevate chakra >> \\
          nextSoul.dataset.chakra = parseInt(nextSoul.dataset.chakra) + 1;
          // << skip next ida since already merged >> \\
          k++;
          movedAny = true;
        } else {
          // << simply shift since no match found >> \\
          if (currentPingala !== destinedPingala) {
            this.intelligence.elevateNadiShifts(thisSoul, currentIda, destinedPingala);
            movedAny = true;
          }
        }
        // << advance destiny tracker >> \\
        destinedPingala++;
      }
    }
    return movedAny;
  }
  // << handles swiping >> \\
  freeWillSwiping() {
    // << function's samskaras >> \\
    let startIda, startPingala;
    let min = 40;
    // << function's karma >> \\
    document.addEventListener('touchstart', (event) => {
      // << get start nadis >> \\
      startIda = event.touches[0].clientX;
      startPingala = event.touches[0].clientY;
    });
    document.addEventListener('touchend', (event) => {
      if (this.isMoving) return; // reject race loop;
      // << get end nadis >> \\
      let endIda = event.changedTouches[0].clientX;
      let endPingala = event.changedTouches[0].clientY;
      // << get nadi length >> \\
      let offsetIda = endIda - startIda;
      let offsetPingala = endPingala - startPingala;
      let didMove = false;
      // << get axis >> \\
      if (Math.abs(offsetIda) > Math.abs(offsetPingala)) {
        // << get direction >> \\
        if (offsetIda > min) {
          didMove = this.moveRight();
        } else if (offsetIda < -min) {
          didMove = this.moveLeft();
        }
      } else {
        // << get direction >> \\
        if (offsetPingala > min) {
          didMove = this.moveDown();
        } else if (offsetPingala < -min) {
          didMove = this.moveUp();
        }
      }
      // << gatekeepers to prevent race nadi shifts >> \\
      if (didMove) {
        // << disable swiping >> \\
        this.isMoving = true;
        setTimeout(() => {
          // << birth new soul >> \\
          this.intelligence.display.birthRandomSoul();
          // << check if creation dissolved >> \\
          if (this.intelligence.gameover.mahaSamadhi()) {
            // << dissolution >> \\
            this.intelligence.gameover.dissolveCreation();
            this.intelligence.gameover.rebirthCreation();
          } else {
            // << continue life >> \\
            this.isMoving = false;
          }
        }, 250);
      } else {
        // << enable swiping back >> \\
        this.isMoving = false;
      }
    });
  }
}

// <<!! SCORING ILLUSIONS !!>> \\
class FormScores {
  constructor(intelligence) {
    // !! class' samskaras !! \\
    this.intelligence = intelligence;
    this.gridContainer = this.intelligence.gridContainer;
    this.currentScore = this.intelligence.currentScore;
    this.highScore = this.intelligence.highScore;
    // !! unlocking ajna !! \\
    this.ajna();
  }
  // << class' karmas >> \\
  // << does scoring >> \\
  ajna() {
    const meditateOnScores = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-chakra') {
          let node = mutation.target;
          if (!node || !node.parentNode) return; // safety check;
          let chakra = parseInt(node.dataset.chakra);
          let score = parseInt(currentScore.innerText) | 0;
          let newScore = parseInt(2 ** (chakra));
          // << elevate score >> \\
          score += newScore;
          currentScore.innerText = score;
        }
      }
    });
    meditateOnScores.observe(this.gridContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-chakra'],
      attributeOldValue: true
    });
  }
}

// <<!! GAME OVER ILLUSIONS !!>> \\
class FormGameOver {
  constructor(intelligence) {
    // !! class' samskaras !! \\
    this.intelligence = intelligence;
    this.souls = this.intelligence.souls;
    this.gridContainer = this.intelligence.gridContainer;
    this.restartButton = this.intelligence.restartButton;
    // !! score samskara !! \\
    this.currentScore = this.intelligence.currentScore;
    this.highScore = this.intelligence.highScore;
    // !! game over samskara !! \\
    this.gameOverScreen = this.intelligence.gameOverScreen;
    this.gameOverHigh = this.intelligence.gameOverHigh;
    this.gameOverCurrent = this.intelligence.gameOverCurrent;
    // !! manifest karma !! \\
    this.restartButton.addEventListener('click', () => {
      this.rebirthCreation();
    });
    // !! game over screen !! \\
    this.gameOverScreen.addEventListener('click', () => {
      if (this.gameOverScreen.style.display === 'flex') {
        this.gameOverScreen.style.display = 'none'; 
      }
    });
  }
  // << class' karmas >> \\
  // << check for game over >> \\
  mahaSamadhi() {
    // << if all 16 souls manifest >> \\
    let areAllManifest = this.souls.filter(soul => soul[2] === "manifest");
    if (areAllManifest.length < 16) return false;
    // << if no more match >> \\
    let manifestSouls = Array.from(document.getElementsByClassName('soul'));
    if (!manifestSouls) return; // safety bottleneck;
    let matchPossible = manifestSouls.some(soul => {
      // << get kundalini >> \\
      let ida = Number(soul.dataset.ida);
      let pingala = Number(soul.dataset.pingala);
      let chakra = Number(soul.dataset.chakra);
      // << neighbour >> \\
      let neighbours = manifestSouls.filter(nb => {
        // << get neighbour kundalini >> \\
        let nIda = Number(nb.dataset.ida);
        let nPingala = Number(nb.dataset.pingala);
        return (nIda === ida+1 && nPingala === pingala) ||
               (nIda === ida-1 && nPingala === pingala) ||
               (nIda === ida && nPingala === pingala+1) ||
               (nIda === ida && nPingala === pingala-1);
       });
       return neighbours.some(nb => Number(nb.dataset.chakra) === chakra);
    });
    return !matchPossible;
  }
  // << dissolve creation >> \\
  dissolveCreation() {
    // << declare game over >> \\
    this.gameOverScreen.style.display = 'flex';
    // << score >> \\
    let score = Number(this.currentScore.innerText) || 0;
    let highScore = Number(this.highScore.innerText) || 0;
    // << check >> \\
    if (score > highScore) {
      this.gameOverHigh.innerText = score;
    } else {
      this.gameOverHigh.innerText = highScore;
    }
    this.gameOverCurrent.innerText = score;
  }
  // << new creation >> \\
  rebirthCreation() {
    // << get manifest souls >> \\
    let manifestSouls = Array.from(document.getElementsByClassName('soul'));
    // << dissolve all >> \\
    manifestSouls.forEach(soul => this.intelligence.display.dissolveSoul(soul));
    // << reset score >> \\
    let score = Number(this.currentScore.innerText) || 0;
    let highScore = Number(this.highScore.innerText) || 0;
    if (score > highScore) {
      this.highScore.innerText = score; 
    } else {
      this.highScore.innerText = highScore;
    }
    this.currentScore.innerText = null;
    // << new creation >> \\
    this.intelligence.movements.isMoving = false;
    this.intelligence.display.birthRandomSoul();
  }
}

// --<<{{ MANIFEST DUAL GAME }}>>-- \\
window.onload = () => {
  const Intelligence = new FormlessIntelligence();
}

// ++==<<{{ PROGRAMMER'S INSIGHTS }}>>==++ \\
/*
• The game is coded in mediator style pattern;
• Functions are wrapped within classes, with each class serving a specific role only;
• There's one unified _Source of Truth_: FormlessIntelligence.
• All other classes are linked to it and FormlessIntelligence monitors each as a centralized consciousness;
• Other classes are:-
  FormDisplay: handles display,
  FormMovements: handles movements,
  FormScores: handles scoring,
  FormGameOver: handles game over;
• MutationObservers have been used consistently to boost browser, minimize repetitive function & asynchronously automate database changes as game flows. The intent was to introduce Upanishad's Turiya into the game that act as silent background witness — always present, but formless and acting only when needed;
*/

/*
<<<{{{ Game's design }}}>>>
Source of Truth: FormlessIntelligence
- witness,
- watchSoulsState,
- watchNadiShifts,
- elevateNadiShifts;

FormDisplay
- manifestLife,
- birthSoul,
- dissolveSoul,
- birthRandomSoul,
- letSoulsKundaliniRise;

FormMovements
- moveSoul,
- moveRight,
- moveLeft,
- moveDown,
- moveUp,
- freeWillSwiping,
- letSoulsMoveThroughLife;

FormScores
- ajna;

FormGameOver
- mahaSamadhi,
- dissolveCreation,
- rebirthCreation;
*/