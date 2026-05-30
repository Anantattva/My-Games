// —<{([ Our JS Bro ])}>— \\
// --- global setup --- \\
const gameGrid = document.getElementById('gameGrid');
const startButton = document.getElementById('startButton');

// -- DISPLAY CLASS -- \\
class DisplayFunctions {
  constructor(gameGridId) {
    // !! class setup !! \\
    this.gameGrid = document.getElementById(gameGridId);
    this.cells = [];
    this.cellCoordinates = [];
    // !! default snake body !! \\
    this.snakeBody = [
      {row: 11, column: 12, className: "head", direction: "right", index: 0},
      {row: 11, column: 11, className: "body", index: 1},
      {row: 11, column: 10, className: "body", index: 2}
    ];
    // !! calling functions !! \\
    this.renderGameTable();
    this.getCell;
    this.drawSnake();
    this.resetSnake;
    this.spawnFood;
  }
  // << defining functions >> \\
  // << draws 21×21 grid >> \\
  renderGameTable() {
    for (let x=1; x<=21; x++) {
      for (let y=1; y<=21; y++) {
        const div = document.createElement('div');
        div.className = "cell";
        div.dataset.row = x;
        div.dataset.column = y;
        this.cells.push(div)
        this.cellCoordinates.push([x, y]);
        this.gameGrid.appendChild(div);
      }
    }
  }
  // << returns a specified cell >> \\
  getCell(row, column) {
    const targetCell = document.querySelector(`div[data-row="${row}"][data-column="${column}"]`);
    if (targetCell) return targetCell;
  }
  // << draw a 3 cell default snake >> \\
  drawSnake() {
    this.snakeBody.forEach(segment => {
      let target = this.getCell(segment.row, segment.column);
      if (target) {
        target.classList.add('snake');
      };
    });
  }
  // << resets snake back to default >> \\
  resetSnake() {
    // !! clear existing snake !! \\
    this.cellCoordinates.forEach(cell => {
      let targetCell = this.getCell(cell[0], cell[1]);
      if (targetCell && targetCell.classList.contains('snake')) {
        targetCell.classList.remove('snake');
      }
    });
    // !! reset back to default snake !! \\
    this.snakeBody.length = 0;
    this.snakeBody.push(
      {row: 11, column: 12, className: "head", direction: "right", index: 0},
      {row: 11, column: 11, className: "body", index: 1},
      {row: 11, column: 10, className: "body", index: 2}
    );
    // !! redraw default snake !! \\
    this.drawSnake();
  }
  // << spawns food >> \\
  spawnFood() {
    // << get free cells >> \\
    let freeCells = this.cells.filter(cell => !cell.classList.contains('snake'));
    let l = freeCells.length;
    // << get a random free cell >> \\
    let randomIndex = Math.floor(l*Math.random());
    let randomCell = freeCells[randomIndex];
    // << clear old food >> \\
    [...freeCells].forEach(cell => {
      if (cell.classList.contains('food')) {
        cell.classList.remove('food');
      }
    });
    // << spawn food >> \\
    if (randomCell && !randomCell.classList.contains('food')) {
      randomCell.classList.add('food');
    }
  }
}

// -- GAME CLASS -- \\
class GameFunctions {
  constructor(displayInstance) {
    // !! class setup !! \\
    this.display = displayInstance;
    this.getCell = this.display.getCell.bind(this.display);
    /*
    In JavaScript, when you assign a method to a new variable, it forgets which object it belonged to.
    .bind(): This is an in-built JavaScript method. It creates a new version of the function that is permanently locked to the object you pass into the parentheses.
    It manually "tethers" the function to its parent so it never forgets where it came from.
    */
    this.snakeBody = this.display.snakeBody;
    // !! returning functions !! \\
    this.updateSnakePosition;
  }
  // << moves snakes >> \\
  updateSnakePosition() {
    this.snakeBody.forEach(segment => {
      // (( get existing snake )) \\
      const currentCell = this.getCell(segment.row, segment.column);
      // (( clear existing snake )) \\
      if (currentCell.classList.contains('snake')) {
        currentCell.classList.remove('snake');
      };
    });
    // (( assign new coordinates )) \\
    // (( rest of the body )) \\
    for (let k=this.snakeBody.length-1; k>0; k--) {
      const currentCell = this.snakeBody[k];
      currentCell.row = this.snakeBody[k-1].row;
      currentCell.column = this.snakeBody[k-1].column;
      const target = this.getCell(currentCell.row, currentCell.column);
    }
    // (( head )) \\
    const head = this.snakeBody[0];
    if (head.direction === "right") {
      head.column++;
    } else if (head.direction === "left") {
      head.column--;
    } else if (head.direction === "down") {
      head.row++;
    } else if (head.direction === "up") {
      head.row--;
    }
    const target = this.getCell(head.row, head.column);
    // (( now redraw snake )) \\
    this.snakeBody.forEach(segment => {
      const target = this.getCell(segment.row, segment.column);
      if (target) {
        target.classList.add('snake');
      }
    });
  }
}

// -- MOVEMENT CLASS -- \\
class MovementFunctions {
  constructor(gameInstance) {
    // !! class setup !! \\
    this.game = gameInstance;
    this.getCell = this.game.getCell.bind(this.game);
    this.snakeBody = this.game.display.snakeBody;
    // (( get buttons )) \\
    this.moveUpButton = document.getElementById('moveUpButton');
    this.moveDownButton = document.getElementById('moveDownButton');
    this.moveRightButton = document.getElementById('moveRightButton');
    this.moveLeftButton = document.getElementById('moveLeftButton');
    // (( assign functions )) \\
    this.moveUpButton.addEventListener('touchstart', (event) => {
      if (this.snakeBody[0].direction !== "down") {
        // prevents 180° rotation
        this.moveUp();
      }
    });
    this.moveDownButton.addEventListener('touchstart', (event) => {
      if (this.snakeBody[0].direction !== "up") {
        // prevents 180° rotation
        this.moveDown();
      }
    });
    this.moveRightButton.addEventListener('touchstart', (event) => {
      if (this.snakeBody[0].direction !== "left") {
        // prevents 180° rotation
        this.moveRight();
      }
    });
    this.moveLeftButton.addEventListener('touchstart', (event) => {
      if (this.snakeBody[0].direction !== "right") {
        // prevents 180° rotation
        this.moveLeft();
      }
    });
    /*
    On Android, buttons on a screen can sometimes feel "sticky" if you tap them fast. To make the controls feel professional, you might want to use the in-built 'touchstart' event for your buttons instead of 'click'.
    • 'click' has a tiny delay (about 300ms) on some mobile browsers because the phone is waiting to see if you are double-tapping. 'touchstart' happens the instant your finger hits the glass.
    • COMPARISON:
    — 'click': Tap -> Wait -> Move.
    — 'touchstart': Tap -> Move!
    */
    // (( swipe movements )) \\
    this.handleMovementsViaSwipe();
  }
  // <( change head direction of snake simply; rest follow up; clean logic 😎 )> \\
  moveUp() {
    this.snakeBody[0].direction = "up";
  }
  moveDown() {
    this.snakeBody[0].direction = "down";
  }
  moveRight() {
    this.snakeBody[0].direction = "right";
  }
  moveLeft() {
    this.snakeBody[0].direction = "left";
  }
  // (( alternative: swipe controls )) \\
  handleMovementsViaSwipe() {
    // !! declare variables !! \\
    let startX, startY;
    // !! records swipe start !! \\
    document.addEventListener('touchstart', (event) => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    });
    // !! record swipe end & do math !! \\
    document.addEventListener('touchend', (event) => {
      //event.preventDefault()
      let endX = event.changedTouches[0].clientX;
      let endY = event.changedTouches[0].clientY;
      let min = 70;
      let offsetX = endX - startX;
      let offsetY = endY - startY;
      // !! check swipe direction & render !! \\
      if (offsetX > min && Math.abs(offsetY) < Math.abs(offsetX) && this.snakeBody[0].direction !== "left") {
      // swipe right
      this.snakeBody[0].direction = "right"
      } else if (offsetX < -min && Math.abs(offsetY) < Math.abs(offsetX) && this.snakeBody[0].direction !== "right") {
      // swipe left 
      this.snakeBody[0].direction = "left";
      } else if (offsetY > min && Math.abs(offsetX) < Math.abs(offsetY) && this.snakeBody[0].direction !== "up") {
      // swipe down
      this.snakeBody[0].direction = "down";
      } else if (offsetY < -min && Math.abs(offsetX) < Math.abs(offsetY) && this.snakeBody[0].direction !== "down") {
      // swipe up
      this.snakeBody[0].direction = "up";
      }
    });
  }
}

// -- COLLISION CLASS -- \\
class Collisions {
  constructor(movementInstance) {
    // !! class setup !! \\
    this.movements = movementInstance;
    this.getCell = this.movements.getCell.bind(this.movements);
    this.snakeBody = this.movements.game.display.snakeBody;
    this.updateSnakePosition = this.movements.game.updateSnakePosition;
    // !! returning functions !! \\
    this.handleCollisionGameOver;
    this.handleCollisionScoring;
  }
  // << declaring functions >> \\
  // << handles game over >> \\
  handleCollisionGameOver() {
    // !! declare variables !! \\
    const head = this.snakeBody[0];
    const direction = head.direction;
    let nextCell;
    // << get direction & next cell >> \\
    if (direction === "right") {
      nextCell = this.getCell(head.row, head.column+1);
    } else if (direction === "left") {
      nextCell = this.getCell(head.row, head.column-1);
    } else if (direction === "down") {
      nextCell = this.getCell(head.row+1, head.column);
    } else if (direction === "up") {
      nextCell = this.getCell(head.row-1, head.column);
    }
    // << checks collision >> \\
    if (!nextCell || nextCell.classList.contains('snake')) {
      return true;
    } else return false;
  }
  // << handles scoring >> \\
  handleCollisionScoring() {
    // !! declare variables !! \\
    const head = this.snakeBody[0];
    const direction = head.direction;
    let nextCell;
    // << get direction & next cell >> \\
    if (direction === "right") {
      nextCell = this.getCell(head.row, head.column+1);
    } else if (direction === "left") {
      nextCell = this.getCell(head.row, head.column-1);
    } else if (direction === "down") {
      nextCell = this.getCell(head.row+1, head.column);
    } else if (direction === "up") {
      nextCell = this.getCell(head.row-1, head.column);
    }
    // << checks if snake ate food >> \\
    if (nextCell && nextCell.classList.contains('food') && !this.handleCollisionGameOver()) {
      return true;
    } else return false;
  }
}

// -- SCORES CLASS -- \\
class Scoring {
  constructor(collisionInstance) {
    // !! class setup !! \\
    this.collision = collisionInstance;
    this.getCell = this.collision.getCell.bind(this.collision);
    this.snakeBody = this.collision.movements.game.display.snakeBody;
    this.highScore = document.getElementById('highScore');
    this.currentScore = document.getElementById('currentScore');
    // !! returning functions !! \\
    this.handleScoringUpdation;
    this.updateHighScore;
  }
  // << defining functions >> \\
  // << updates current score >> \\
  handleScoringUpdation() {
    // << add to snake body >> \\
    let snakeLength = this.snakeBody.length;
    let snakeTail = this.snakeBody[snakeLength-1];
    let newSnakeCell = {
      row: snakeTail.row,
      column: snakeTail.column,
      className: "body",
      index: snakeLength
    };
    this.snakeBody.push(newSnakeCell);
    // << update score >> \\
    let scoreElement = parseInt(this.currentScore.innerText) | 0;
    this.currentScore.innerText = scoreElement + 10;
  }
  // << updates high score >> \\
  updateHighScore() {
    // << get score values >> \\
    let currentScore = parseInt(this.currentScore.innerText) | 0;
    let highScore = parseInt(this.highScore.innerText) | 0;
    if (currentScore > highScore) {
      this.highScore.innerText = currentScore | 0;
    } else {
      this.highScore.innerText = highScore | 0;
    }
    this.currentScore.innerText = null;
  }
}

// -- BUTTONS CLASS -- \\
class ButtonFunctions {
  constructor(scoresInstance) {
    // !! class setup !! \\
    this.scores = scoresInstance;
    this.timer;
    this.gameSpeed = 500;
    this.gameState = true;
    this.startButton = document.getElementById('startButton');
    this.pauseButton = document.getElementById('pauseButton');
    this.restartButton = document.getElementById('restartButton');
    // !! assigning functions !! \\
    this.startButton.addEventListener('touchstart', () => {
      this.startGame(this.gameSpeed);
    })
    this.pauseButton.addEventListener('touchstart', () => {
      this.handlePauseAndResume();
    });
    this.restartButton.addEventListener('touchstart', () => {
      this.restartGame();
    })
  }
  // << declaring functions >> \\
  // << manifests game >> \\
  startGame(gameSpeed) {
    // << clear old state >> \\
    if (this.timer) {
      clearInterval(this.timer);
    }
    // << enable game state >> \\
    this.gameState = true;
    this.startButton.disabled = true;
    this.scores.collision.movements.game.display.spawnFood();
    // << set new state >> \\
    this.timer = setInterval(() => {
      let isGameOver = this.scores.collision.handleCollisionGameOver();
      let isScored = this.scores.collision.handleCollisionScoring();
      if (isGameOver) {
        // << end game >> \\
        this.endGame();
        // << alert >> \\
        alert("GAME OVER!");
      } else if (isScored) {
        // << update score >> \\
        this.scores.handleScoringUpdation();
        // << increase game speed by calling this function within itself >> \\
        if (this.gameSpeed > 200) {
          this.gameSpeed -= 2;
        }
        this.startGame(this.gameSpeed);
      // << spawn new food & move>> \\
      this.scores.collision.movements.game.display.spawnFood();
      this.scores.collision.movements.game.updateSnakePosition();
      } else {
        this.scores.collision.movements.game.updateSnakePosition();
      }
    }, gameSpeed);
  }
  // << clears game >> \\
  endGame() {
    // << clear game timer & state >> \\
    clearInterval(this.timer);
    this.gameSpeed = 500;
    this.gameState = false;
    // << reset snake & grid >> \\
    this.scores.collision.movements.game.display.resetSnake();
    this.scores.collision.movements.game.display.cells.forEach(cell => {
      if (cell.classList.contains('snake')) {
        cell.classList.remove('snake');
      }
    });
    // << update high score & enable new game >> \\
    this.scores.updateHighScore();
    this.startButton.disabled = false;
  }
  // << handles pause button >> \\
  handlePauseAndResume() {
    if (this.gameState === true) {
      this.gameState = false;
      clearInterval(this.timer);
      this.pauseButton.innerText = "Resume";
    } else {
      this.startGame(this.gameSpeed);
      this.pauseButton.innerText = "Pause";
    }
  }
  // << handles restart button >> \\
  restartGame() {
    // << clears old game directly & starts new one >> \\
    this.endGame();
    this.startGame(this.gameSpeed);
  }
}

// <<< {{{{{ GAME START }}}}} >>> \\
let display, game, move, collide, scores, buttons;
window.onload = () =>  {
  display = new DisplayFunctions("gameGrid");
  game = new GameFunctions(display);
  move = new MovementFunctions(game);
  collide = new Collisions(move);
  scores = new Scoring(collide);
  buttons = new ButtonFunctions(scores);
};
/*
startButton.addEventListener('click', () => {
  buttons = new ButtonFunctions(scores);
}, { once : true });
// { once : true } auto handles removing event listener after initialization;
*/

// ---<<++ NOTES ++>> --- \\
/*
1. Code's Mental Map <<
•| The game us nested into classes, nothing unnecessary is left hanging open in global scope;
•| Classes are grouped as per the functions they perform;
•| Class nesting & binding is as per game's natural flow & rendering; On window load, everything from display to game & buttons functions is instantiated but stored as inactive potential; On clicking start button, everything manifests into form;
•| The nesting is: display |> game |> movements |> collisions |> scores |> buttons;

2. References <<
•| Display Class
— renderGameTable
— getCell
— drawSnake
— resetSnake
— spawnFood;

•| Game Class
— updateSnakePosition;

•| Movements Class 
— moveUp
— moveDown 
— moveRight 
— moveLeft 
— handleMovementsViaSwipe;

•| Collisions Class
— handleCollisionGameOver
— handleCollisionScoring;

•| Scores Class 
— handleScoringUpdation
— updateHighScore;

•| Buttons Class
— startGame
— endGame
— handlePauseAndResume
— restartGame;
*/
