// ।। ॐ नमः शिवाय ।। \\
// ++ Enlightened Mystic JS ++ \\

// ++ global setup ++ \\
// !! get DOM elements !! \\
const maxValue = document.getElementById('maxValue');
const gameCards = document.getElementById('gameCards');
// !! get DOM buttons !! \\
const guessBtn = document.getElementById('guessBtn');
const generateBtn = document.getElementById('generateBtn');
// !! get game over elements !! \\
const gameOver = document.getElementById('gameOver');
const gameScore = document.getElementById('gameScore');

// !! global variables !! \\
let max = Number(maxValue.value);
let n = Math.ceil(Math.log2(max));

// !! global functions !! \\
// .. this updates game math .. \\
function updateValues() {
  max = Number(maxValue.value);
  n = Math.ceil(Math.log2(max));
}

// !! state observer !! \\
const observeGameState = {
  set(target, property, value, receiver) {
    const success = Reflect.set(target, property, value, receiver); // in-built JS utility
    if (success) {
      const card = document.querySelector(`.card[data-power="${property}"]`);
      if (card) {
        card.classList.toggle('selected', value === true); // is value is true, add 'selected', else remove;
      }
    }
    return success;
  }
};

// !! generators !! \\
const generation = {
  gameData: {},
  generateGameData(n) {
    // << clear & bind proxy >> \\
    generation.gameData = new Proxy({}, observeGameState);
    // << generate new data >> \\ 
    for (let k=0; k<n; k++) {
      generation.gameData[k] = false;
    }
  },
  generateCards(n) {
    // << clear existing cards >> \\
    gameCards.replaceChildren(); // in-built method, removes all children at once;
    // << generate new cards >> \\
    for (let k=0; k<n; k++) {
      // << generate cards >> \\
      const card = document.createElement('div');
      let nums = [];
      const mask = 1 << k; // in-built bitwise shift operator
      card.className = "card";
      card.dataset.power = k;
      // << add numbers >> \\
      for (let i=1; i<=max; i++) {
        // << in-built bitwise operation >> \\
        if ((i & mask) !== 0) {
          nums.push(i);
        }
      }
      card.textContent = nums.join(", ");
      // << attach listener >> \\
      card.addEventListener('pointerdown', () => {
        const start = performance.now();
        game.updateGameData(k);
        const end = performance.now();
        console.log(`Time taken to update state: ${end-start}ms.`);
        console.log(generation.gameData);
      });
      gameCards.appendChild(card); 
    }
  }
};

const game = {
  updateGameData(k) {
    // << safety check >> \\
    if (generation.gameData !== null) {
      generation.gameData[k] = !generation.gameData[k];
    }
  },
  calculateScore() {
    let score = Number(0);
    for (let k=0; k<n; k++) {
      if (generation.gameData[k] === true) {
        score += 1 << k;
      }
    }
    return score;
  },
  declareScore(score) {
    if (score) {
      gameScore.textContent = score;
    }
    gameOver.style.display = 'grid';
    gameOver.addEventListener('pointerdown', () => {
      gameOver.style.display = 'none';
      game.resetGameData();
    }, { once : true });
  },
  resetGameData() {
    for (let k=0; k<n; k++) {
      generation.gameData[k] = false;
    }
    gameScore.textContent = 0;
  }
};

// !! buttons setup !! \\
generateBtn.addEventListener('pointerdown', () => {
  const start = performance.now();
  console.log("Generation starts!");
  updateValues();
  console.log("Values updated!!");
  generation.generateGameData(n);
  console.log("Game data generated!!");
  generation.generateCards(n);
  console.log("Generated game cards!!");
  console.log("Generation ended!");
  const end = performance.now();
  console.log(`Time taken: ${end-start}ms.`);
});
guessBtn.addEventListener('pointerdown', () => {
  const start = performance.now();
  const score = game.calculateScore();
  game.declareScore(score);
  const end = performance.now();
  console.log(`Time taken to calculate & declare result and reset game state: ${end-start}ms.`);
});

// ++ DEVELOPER NOTES ++ \\
// ++ Proxy Setup ++ \\
/*
// First: 
​set(...): This is an in-built Proxy trap. JavaScript pre-defines this method name. If you name it anything else (like update()), the Proxy won't recognize it. It automatically runs whenever someone executes an assignment statement like object.key = value.
•| The 4 Parameters (What the Proxy knows dynamically):
​target: The actual, raw underlying object behind the scenes (initially our empty object {}).
​property: The specific key/index being changed. If you run gameData[3] = true, property becomes the string "3".
​value: The new data being assigned. In this case, true or false.
​receiver: The proxy object itself (usually ignored, but needed for advanced internal routing).

// Second:
​Reflect.set(...): This is an in-built JavaScript utility. It does the default job of actually saving the data. It physically takes your value (true) and writes it to the property (3) inside the target object.
​It returns an in-built boolean (true if the write worked, false if the object was locked or frozen). We store that result in our variable success.

// Third:
JavaScript in-built strict mode rules demand that a Proxy set trap must explicitly return a boolean. Returning true tells the script engine: "The operation is complete, you may move on to the next line of code."
*/

/*
// ++ Game Structure ++ \\
The game utilizes objects instead of classes to seperate concerns;
A global proxy object observeGameState witness data changes and fires DOM updates correspondingly;

generation:
- gameOver,
- generateGameData(),
- generateCards();

game: 
- updateGameData(),
- calculateScore(),
- declareScore(),
- resetGameData();
*/