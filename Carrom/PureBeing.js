// ।। ॐ नमः शिवाय ।। \\
// ॥ ॐ वामदेवाय नमः ॥ \\
// ++ Wise Being JS ++ \\

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
export const u = (min + max)/2;

// !! CSS DATA !! \\
export const logicalWidth = 40*uh;
export const logicalHeight = 40*uh;

// .... Helper Math Tools .... \\
const pi = Math.PI;
const rt3 = Math.sqrt(3); // square root of 3;
const sin = (theta) => { return Math.sin(theta); };
const cos = (theta) => { return Math.cos(theta); };
const tan = (theta) => { return Math.tan(theta); };

///// ================ \\\\\
// --= SOURCE OF TRUTH =-- \\

// == piece data == \\
// ++ radii ++ \\
export const r = 1.4*u;
// ++ mass ++ \\
export const pieceMass = pi*(r*r); // pi × r²;

/** @type {object} */
export const queen = {
  type: "QUEEN",
  isActive: true,
  isGliding: false,
  colour: 'rgb(255, 100, 40)',
  r: r,
  mass: pieceMass,
  x: logicalWidth/2, 
  y: logicalHeight/2,
  vx: 0,
  vy: 0
};

/** @type {array<object>} */
/** colour: 'rgb(255, 255, 255)' */
export const whites = [
  // !! inner white pieces !! \\
  { type: "WHITE",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 2*r*cos(1/3*pi),
    y: logicalHeight/2 + 2*r*sin(1/3*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "WHITE",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 2*r*cos(pi),
    y: logicalHeight/2 + 2*r*sin(pi),
    vx: 0,
    vy: 0
  },
  
  { type: "WHITE",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 2*r*cos(5/3*pi),
    y: logicalHeight/2 + 2*r*sin(5/3*pi),
    vx: 0,
    vy: 0
  },
  
  // !! outer white pieces !! \\
  { type: "WHITE",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 4*r,
    y: logicalHeight/2,
    vx: 0,
    vy: 0
  },
  
  { type: "WHITE",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + rt3*2*r*cos(1/6*pi),
    y: logicalHeight/2 + rt3*2*r*sin(1/6*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "WHITE",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 4*r*cos(2/3*pi),
    y: logicalHeight/2 + 4*r*sin(2/3*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "WHITE",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + rt3*2*r*cos(5/6*pi),
    y: logicalHeight/2 + rt3*2*r*sin(5/6*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "WHITE",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 4*r*cos(4/3*pi),
    y: logicalHeight/2 + 4*r*sin(4/3*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "WHITE",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + rt3*2*r*cos(3/2*pi),
    y: logicalHeight/2 + rt3*2*r*sin(3/2*pi),
    vx: 0,
    vy: 0
  }
];

/** @type {array<object>} */
/** colour: 'rgb(0, 0, 0)' */
export const blacks = [
  // !! inner black pieces !! \\
  { type: "BLACK",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 2*r,
    y: logicalHeight/2,
    vx: 0,
    vy: 0
  },
  
  { type: "BLACK",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 2*r*cos(2/3*pi),
    y: logicalHeight/2 + 2*r*sin(2/3*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "BLACK",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 2*r*cos(4/3*pi),
    y: logicalHeight/2 + 2*r*sin(4/3*pi),
    vx: 0,
    vy: 0
  },
  
  // !! outer black pieces !! \\
  { type: "BLACK",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 4*r*cos(1/3*pi),
    y: logicalHeight/2 + 4*r*sin(1/3*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "BLACK",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + rt3*2*r*cos(1/2*pi),
    y: logicalHeight/2 + rt3*2*r*sin(1/2*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "BLACK",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 4*r*cos(pi),
    y: logicalHeight/2 + 4*r*sin(pi),
    vx: 0,
    vy: 0
  },
  
  { type: "BLACK",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + rt3*2*r*cos(7/6*pi),
    y: logicalHeight/2 + rt3*2*r*sin(7/6*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "BLACK",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + 4*r*cos(5/3*pi),
    y: logicalHeight/2 + 4*r*sin(5/3*pi),
    vx: 0,
    vy: 0
  },
  
  { type: "BLACK",
    isActive: true,
    isGliding: false,
    r: r,
    mass: pieceMass,
    x: logicalWidth/2 + rt3*2*r*cos(11/6*pi),
    y: logicalHeight/2 + rt3*2*r*sin(11/6*pi),
    vx: 0,
    vy: 0
  }
];

// ++++++++++++++++++++++++++++ \\
/// === BOARDS & STRIKER DETAILS === \\\
export const offset = 8*u;
export const arrowOffset = 16*u;
export const gap = 4*u;
/** @type {array<object>} */
export const boardCorners = [
  {x: gap/4, y: gap/4},
  {x: logicalWidth - gap/4, y: gap/4},
  {x: gap/4, y: logicalHeight - gap/4},
  {x: logicalWidth - gap/4, y: logicalHeight - gap/4}
];
/** @type <array<object>} */
export const arrowLines = [
  {
    sx: gap,
    sy: gap,
    ex: arrowOffset,
    ey: arrowOffset
  },
  {
    sx: logicalWidth - gap,
    sy: gap,
    ex: logicalWidth - arrowOffset,
    ey: arrowOffset
  },
  {
    sx: logicalWidth - gap,
    sy: logicalHeight - gap,
    ex: logicalWidth - arrowOffset,
    ey: logicalHeight - arrowOffset
  },
  {
    sx: gap,
    sy: logicalHeight - gap,
    ex: arrowOffset,
    ey: logicalHeight - arrowOffset
  }
];
/**
 * @type {array<object>}
 * 
 * Coordinates data for board striking areas.
 * We use offset to manage positioning.
 * The 4 slides overlap each others corners.
 * We then use use gap to add padding & spacing for further carrom accurate look.
 */
export const boardStrikingAreas = [
  {
    sx: offset,
    sy: offset - gap,
    ex: logicalWidth - offset,
    ey: offset - gap
  },
  {
    sx: logicalWidth - offset + gap,
    sy: offset,
    ex: logicalWidth - offset + gap,
    ey: logicalHeight - offset
  },
  {
    sx: offset,
    sy: logicalHeight - offset + gap,
    ex: logicalWidth - offset,
    ey: logicalHeight - offset + gap
  },
  {
    sx: offset - gap,
    sy: offset,
    ex: offset - gap,
    ey: logicalHeight - offset
  }
];

export const strikerRadius = 1.8*u;
export const strikerMass = pi*(strikerRadius*strikerRadius); // pi × r²;

/** @type {object} */
export const strikerLaunchCoords = {
  x: logicalWidth/2,
  playerY: logicalHeight - offset + gap,
  computerY: offset - gap
};
/** @type {object } */
export const strikerLaunchBounds = {
  min: offset,
  max: logicalWidth - offset
};
/** @type {object} */
export const striker = {
  type: "STRIKER",
  isActive: true,
  isGliding: false,
  r: strikerRadius,
  mass: strikerMass,
  x: strikerLaunchCoords.x,
  y: strikerLaunchCoords.playerY,
  vx: 0,
  vy: 0
};

/// ++ DEVELOPER'S NOTES ++ \\\
/**
 * @blueprint
 * 
 * Every entity/piece uses a standard object structure of 9 key-value pairs:
 *   type: string, 
 *     - "STRIKER", "QUEEN", "WHITE", "BLACK"
 *   isActive: boolean,
 *     - checks if pocketed or not
 *   isGliding: boolean,
 *     - checks if moving or not; switches to false automatically when vx & vy become 0
 *   r: number, - radius
 *   mass: number,
 *   x: number,
 *   y: number,
 *   vx: number,
 *   vy: number
 */