// ==== Genius JS ==== \\

let dh = window.innerHeight;
let dvh = dh / 100;
let dw = window.innerWidth;
let dvw = dw / 100;

function updateDynamicLayout() {
  dh = window.innerHeight;
  dvh = dh / 100;
  dw = window.innerWidth;
  dvw = dw / 100;
}

window.addEventListener('resize', () => {
  updateDynamicLayout();
});

// ++== SOURCE OF TRUTH ==++ \\
class PureAwareness {
  constructor() {
    // !! Class Setup !! \\
    this.gameLayout = document.getElementById('gameLayout');
    this.gameOverWindow = document.getElementById('gameOverWindow');
    // !! Call Classes !! \\
    this.display = new ManifestDisplay(this);
    this.game = new ManifestGame(this);
  }
}

class ManifestDisplay {
  constructor(awarenessInstance) {
    // !! Class Setup !! \\
    this.awareness = awarenessInstance;
    this.gameLayout = this.awareness.gameLayout;
    // !! Call Functions !! \\
    this.manifestGameGrid();
  }
  // !! Class Functions !! \\
  manifestGameGrid() {
    for (let y=1; y<=3; y++) {
      // << create row >> \\
      let row = document.createElement('tr');
      row.className = 'row';
      row.dataset.row = y;
      for (let x=1; x<=3; x++) {
        // << create cell >> \\
        let cell = document.createElement('td');
        cell.className = 'gameCell';
        cell.dataset.number = `${3*(y-1)+x}`;
        row.appendChild(cell);
      }
      this.gameLayout.appendChild(row);
    }
  }
}

class ManifestGame {
  constructor(awarenessInstance) {
    // !! Class Setup !! \\
    this.awareness = awarenessInstance;
    this.turn = document.getElementById('turn');
    this.cells = Array.from(document.getElementsByClassName('gameCell'));
    this.playerScore = document.getElementById('playerScore');
    this.computerScore = document.getElementById('computerScore');
    this.cellsData = [
      [1, null],
      [2, null],
      [3, null],
      [4, null],
      [5, null],
      [6, null],
      [7, null],
      [8, null],
      [9, null]
    ];
    this.turnState = true;
    // !! Call Classes !! \\
    this.buttons = new GameButtons(this);
    this.scores = new GameScores(this);
    this.gameover = new GameOver(this);
    this.algorithm = new GameAlgorithm(this);
  }
  updateGameData(eventCell) {
    let number = eventCell?.dataset?.number;
    let changedText = eventCell?.textContent;
    this.cellsData[parseInt(number)-1][1] = `${changedText}`;
  }
}

class GameButtons {
  constructor(gameInstance) {
    // !! Class Setup !! \\
    this.game = gameInstance;
    this.restartButton = document.getElementById('restartButton');
    // !! Call Functions !! \\
    this.restartButton.addEventListener('click', () => {
      this.restartGame();
    });
    this.game.cells.forEach(cell => {
      cell.addEventListener('click', (event) => {
        if (this.game.turnState === true) {
          this.play(cell);
        }
      });
    });
  }
  play(cell) {
    if (!cell.classList.contains('filled')) {
      cell.classList.add('filled');
      if (this.game.turnState === true) {
        // << update >> \\
        cell.textContent = "O";
        cell.style.color = 'lime';
        this.game.updateGameData(cell);
        // << change state >> \\
        this.game.turn.textContent = "My Turn";
        this.game.turnState = false;
        this.game.scores.gameLoop();
      } else {
        // << update >> \\
        cell.textContent = "X";
        cell.style.color = 'red';
        this.game.updateGameData(cell);
        // << change state >> \\
        this.game.turn.textContent = "Your Turn";
        this.game.turnState = true;
        this.game.scores.gameLoop();
      }
    }
  }
  animateTurnText() {
    return new Promise((done) => {
      setTimeout(() => {
        this.game.turn.textContent = "..Thinking..";
        setTimeout(() => {
          this.game.turn.textContent = "Done!!";
          setTimeout(done, 1000);
        }, 2000);
      }, 2000);
    });
  }
}

class GameScores {
  constructor(gameInstance) {
    // !! Class Setup !! \\
    this.game = gameInstance;
    this.WIN = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [1, 4, 7],
      [2, 5, 8],
      [3, 6, 9],
      [1, 5, 9],
      [3, 5, 7]
    ];
  }
  checkWIN() {
    // << Get Data >> \\
    let oPositions = this.game.cellsData.filter(data => data[1] === "O").map(data => data[0]);
    let xPositions = this.game.cellsData.filter(data => data[1] === "X").map(data => data[0]);
    // << Match >> \\
    return this.WIN.some(c => {
      return ((c.every(p => {
        return oPositions.includes(p);
      })) || (c.every(p => {
        return xPositions.includes(p);
      })));
    });
    /* if true, some player has won; otherwise false (game continue OR draw); */
  }
  checkDraw() {
    return (!this.checkWIN() && this.game.cellsData.every(data => data[1] !== null)); // if true, game draw; otherwise false;
  }
  checkWinPlayer() {
    // << Get Data >> \\
    let oPositions = this.game.cellsData.filter(data => data[1] === "O").map(data => data[0]);
    // << Match >> \\
    return this.WIN.some(c => {
      return c.every(p => oPositions.includes(p));
    });
    /* if true, user (player O) has won; otherwise false (computer has won); */
  }
  handleScoring() {
    // << Function Setup >> \\
    let playerScore = parseInt(this.game.playerScore.textContent) || 0;
    let computerScore = parseInt(this.game.computerScore.textContent) || 0;
    // << Update Score >> \\
    if (this.checkWinPlayer()) {
      // player won \\
      playerScore++;
      this.game.playerScore.textContent = playerScore;
    } else {
      // computer won \\
      computerScore++;
      this.game.computerScore.textContent = computerScore;
    }
  }
  async gameLoop() {
    if (!this.checkWIN()) {
      if (this.checkDraw()) {
        // game draws \\
        this.game.gameover.declareGameOverAnimation();
        setTimeout(() => {
          this.game.cells.forEach(cell => cell.style.background = 'transparent');
          this.game.gameover.restartGame();
        }, 4500);
        return; // safety closure;
      } else {
        // game continues \\
        if (this.game.turnState === false) {
          await this.game.buttons.animateTurnText();
          this.game.algorithm.playSmartAI();
          return;
        }
      }
    } else {
      // game over \\
      this.handleScoring();
      this.game.gameover.declareGameOverAnimation();
      setTimeout(() => {
        this.game.cells.forEach(cell => cell.style.background = 'transparent');
        this.game.gameover.restartGame();
      }, 4500);
      return; // safety closure;
    }
  }
}

class GameOver {
  constructor(gameInstance) {
    // !! Class Setup !! \\
    this.game = gameInstance;
  }
  declareGameOverAnimation() {
    // << Get Data >> \\
    const didPlayerWin = this.game.scores.checkWinPlayer();
    const isDraw = this.game.scores.checkDraw();
    let cellsToHighlight;
    // << Function Setup >> \\
    if (didPlayerWin && !isDraw) {
      // << players wins >> \\
      const oPositions = this.game.cellsData.filter(data => data[1] === "O").map(data => data[0]);
      const targetCells = this.game.scores.WIN.find(c => {
        return c.every(p => oPositions.includes(p));
      });
      this.game.turn.textContent = "You Win! 🥳";
      cellsToHighlight = this.game.cells.filter(cell => targetCells.includes(parseInt(cell.dataset.number)));
      cellsToHighlight.forEach(cell => {
        cell.style.background = `rgba(0, 255, 255, 0.3)`;
      });
      return; // safety closure;
    } else if (!didPlayerWin && !isDraw) {
      // << computer wins >> \\
      const xPositions = this.game.cellsData.filter(data => data[1] === "X").map(data => data[0]);
      const targetCells = this.game.scores.WIN.find(c => {
        return c.every(p => xPositions.includes(p));
      });
      this.game.turn.textContent = "I Win! 😎";
      cellsToHighlight = this.game.cells.filter(cell => targetCells.includes(parseInt(cell.dataset.number)));
      cellsToHighlight.forEach(cell => {
        cell.style.background = `rgba(0, 255, 255, 0.3)`;
      });
      return; // safety closure;
    } else if (isDraw) {
      // << game draw >> \\
      this.game.turn.textContent = "Draw 😭";
      cellsToHighlight = this.game.cells;
      cellsToHighlight.forEach(cell => {
        cell.style.background = `rgba(255, 255, 0, 0.3)`;
      });
      return; // safety closure;
    }
  }
  restartGame() {
    this.game.turnState = true;
    this.game.turn.textContent = "Your Turn";
    this.game.cellsData.forEach(cell => cell[1] = null);
    this.game.cells.forEach(cell => {
      cell.classList.remove('filled');
      cell.textContent = "";
    });
  }
}

class GameAlgorithm {
  constructor(gameInstance) {
    // !! Class Setup !! \\
    this.game = gameInstance;
    this.virtualData = this.game.cellsData.map(data => [...data]); // creates the fastest & safest deep copy
  }
  // << This Bot just plays any random empty tile >> \\
  playRandomAI() {
    if (this.game.turnState === false) {
      let freeCells = this.game.cells.filter(cell => !cell.classList.contains('filled'));
      if (freeCells.length === 0) return;
      let choice = Math.floor(Math.random() * freeCells.length);
      let targetCell = freeCells[choice];
      this.game.buttons.play(targetCell);
    }
  }
  // << This Bot is smart; It observes game states and makes calculated decisions >> \\
  playSmartAI() {
    // << Function Setup >> \\
    if (this.game.turnState === true) return; // Safety Check;
    this.getCurrentGameState();
    // << First Priority >> \\
    // << Capture Immediate WIN >> \\
    let move = this.findWinningMove("X");
    if (move !== null) {
      this.playMove(move);
      return;
    }
    // << Second Priority >> \\
    // << Block Immediate Player Win >> \\
    move = this.findWinningMove("O");
    if (move !== null) {
      this.playMove(move);
      return;
    }
    // << Third Priority >> \\
    // << Capture Center >> \\
    if (this.emptyPositions.includes(5)) {
      this.playMove(5);
      return;
    }
    // << Fourth Priority >> \\
    // << Capture Corners >> \\
    const corners = [1, 3, 7, 9];
    const cornerMove = this.emptyPositions.find(p => corners.includes(p));
    if (cornerMove) {
      this.playMove(cornerMove);
      return;
    }
    // << Fifth Priority >> \\
    // << Play Random AI >> \\
    this.playRandomAI();
    return;
  }
  getCurrentGameState() {
    // << Update Current State >> \\
    this.virtualData = this.game.cellsData.map(data => [...data]);
    // << Get Empty Positions >> \\
    this.emptyPositions = this.virtualData.filter(data => data[1] === null).map(data => parseInt(data[0]));
  }
  detectPossibleWin(player) {
    // << Get Data >> \\
    let playerPositions = this.virtualData.filter(data => data[1] === player).map(data => data[0]);
    // << Match >> \\
    return this.game.scores.WIN.some(winCondition => {
      return winCondition.every(position => playerPositions.includes(position));
    });
    /* if true, given player is winning; otherwise false; */
  }
  findWinningMove(player) {
    for (let position of this.emptyPositions) {
      // << simulate tests >> \\
      this.virtualData.forEach(data => {
        if (parseInt(data[0]) === position) {
          data[1] = player;
        }
      });
      if (this.detectPossibleWin(player)) {
        return parseInt(position);
      }
      this.getCurrentGameState(); // resets state back to default for simulating next test;
    }
    return null;
  }
  playMove(position) {
    const targetCell = this.game.cells.find(cell => parseInt(cell.dataset.number) === position);
    if (targetCell) {
      this.game.buttons.play(targetCell);
    }
  }
}

// .. Instantiate Game .. \\
window.addEventListener('load', () => {
  const awareness = new PureAwareness();
});

// ++ DEVELOPER'S NOTES ++ \\

// The game's architecture uses mediator + tree-like structure;
// One single ""Source of Truth"" i.e. PureAwareness handles and controls all but delegates authority to ManifestDisplay for rendering display and to ManifestGame for rendering game classes & operations;
/*
// ...==<< THE STRUCTURE >>==... \\
              - ManifestDisplay
PureAwareness |
              |              - GameButtons
              - ManifestGame - GameScores
                             - GameOver
                             - GameAlgorithm
*/
/*
/// ===<<< Functions List >>>=== \\\
PureAwareness

ManifestDisplay
- manifestGameGrid();

ManifestGame
- updateGameData();

GameButtons
- play(),
- animateTurnText();

GameScores
- checkWIN(),
- checkDraw(),
- checkWinPlayer(),
- handleScoring(),
- gameLoop();

GameOver
- declareGameOverAnimation(),
- restartGame();

GameAlgorithm
- playRandomAI(),
- playSmartAI(),
- getCurrentGameState(),
- detectPossibleWin(),
- findWinningMove(),
- playMove();
*/