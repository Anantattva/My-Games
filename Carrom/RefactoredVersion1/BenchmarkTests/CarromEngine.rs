// ।। ॐ नमः शिवाय ।। \\

// @date START 1st September, 2026
// @date END 2nd September, 2026
// @Rust @learning @engines

///// ========================== \\\\\
/// ++ SETUP ++ \\\
///// ========================== \\\\\
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, PartialEq, Copy)]
pub enum Name {
  STRIKER,
  QUEEN,
  WHITE,
  BLACK,
}

#[derive(Debug, Clone, Copy)]
pub struct Position {
  x: f32,
  y: f32,
}

impl Position {
  pub fn get_length(&self) -> f32 {
    (self.x * self.x + self.y * self.y).sqrt()
  }
  pub fn update(&mut self, vel: &Velocity) {
    self.x += vel.vx;
    self.y += vel.vy;
  }
  pub fn get_distance(&self, pos: &Position) -> f32 {
    let dx: f32 = pos.x - self.x;
    let dy: f32 = pos.y - self.y;
    ((dx * dx) + (dy * dy)).sqrt()
  }
}

#[derive(Debug, Clone, Copy)]
pub struct Velocity {
  vx: f32,
  vy: f32,
}

impl Velocity {
  pub fn get_speed(&self) -> f32 {
    ((self.vx * self.vx) + (self.vy * self.vy)).sqrt()
  }
  pub fn decelerate(&mut self, friction: &f32) {
    self.vx *= 1.0 - friction;
    self.vy *= 1.0 - friction;
  }
}

const UW: f32 = 3.84;           // unit viewport width
const UH: f32 = 6.94;           // unit viewport height
const U: f32 = (UW + UH) / 2.0; // base unit

const LOGICAL_WIDTH: f32  = 40.0 * UH;
const LOGICAL_HEIGHT: f32 = 40.0 * UH;

const OFFSET: f32 = 8.0 * U;
const GAP: f32    = 4.0 * U;

const BOARD_DIMENSIONS: [Position; 4] = [
  Position { x: 0.0,           y: 0.0 },
  Position { x: LOGICAL_WIDTH, y: 0.0 },
  Position { x: 0.0,           y: LOGICAL_HEIGHT },
  Position { x: LOGICAL_WIDTH, y: LOGICAL_HEIGHT },
];

const BOARD_CORNERS: [Position; 4] = [
  Position { x: U,      y: U },
  Position { x: 39.0 * U, y: U },
  Position { x: U,      y: 39.0 * U },
  Position { x: 39.0 * U, y: 39.0 * U },
];

const STRIKER_AREA: [Position; 2] = [
  Position { x: OFFSET,                 y: OFFSET - GAP },
  Position { x: LOGICAL_WIDTH - OFFSET, y: OFFSET - GAP },
];

const PI: f32 = std::f32::consts::PI;
const STRIKER_RADIUS: f32 = 1.8 * U;
const STRIKER_MASS: f32 = PI * (STRIKER_RADIUS * STRIKER_RADIUS);
const PIECE_RADIUS: f32 = 1.4 * U;
const PIECE_MASS: f32 = PI * (PIECE_RADIUS * PIECE_RADIUS);

const FRICTION: f32 = 0.03;
const MOMENTUM_TRANSFER_RATIO: f32 = 0.85;
const MAX_STEPS: u32 = 240;
const MAX_ENTITIES: u32 = 20;

///// ========================== \\\\\
/// ++ STRUCT DECLARATION ++ \\\
///// ========================== \\\\\

#[derive(Debug, Clone, Copy)]
pub struct Entity {
  type_name: Name,
  pos: Position,
  vel: Velocity,
  r: f32,
  mass: f32,
  is_active: bool,
  is_gliding: bool,
}

impl Entity {
  ///// ++++++++++++++++++++++++ \\\\\
  /// ++ ENGINE IMPLEMENTATIONS ++ \\\
  ///// ++++++++++++++++++++++++ \\\\\
  
  // << handles inidvidual entity kinematics >> \\
  pub fn apply_kinematics(&mut self) {
    if !self.is_active { return; }
    if self.vel.get_speed() <= 0.001 {
      // << quit motion >> \\
      self.vel.vx = 0.0;
      self.vel.vy = 0.0;
      // << turn off flag >> \\
      self.is_gliding = false;
    } else {
      // << decelerate >> \\
      self.vel.decelerate(&FRICTION);
      // << update position >> \\
      self.pos.update(&self.vel);
      // << keep flag active >> \\
      self.is_gliding = true;
    }
  }
  
  // << handles individual entity boundary collisions & bouncing >> \\
  pub fn detect_boundary_collision(&mut self) {
    if !self.is_active { return; }
    let r: f32 = self.r;
    // << left & right walls >> \\
    if self.pos.x <= r {
      self.pos.x = r;
      self.vel.vx *= -1.0;
    } else if self.pos.x >= LOGICAL_WIDTH - r {
      self.pos.x = LOGICAL_WIDTH - r;
      self.vel.vx *= -1.0;
    }
    // << top & bottom walls >> \\
    if self.pos.y <= r {
      self.pos.y = r;
      self.vel.vy *= -1.0;
    } else if self.pos.y >= LOGICAL_HEIGHT - r {
      self.pos.y = LOGICAL_HEIGHT - r;
      self.vel.vy *= -1.0;
    }
  }
  
  // << handles individual entity momentum resoution, paired with another entity >> \\
  pub fn resolve_momentum(&mut self, entity: &mut Entity) {
    // << @optimization early exits >> \\
    if !self.is_active && !entity.is_active { return; }
    if !self.is_gliding && !entity.is_gliding && self.type_name != Name::STRIKER && entity.type_name != Name::STRIKER { return; }
    // << setup data >> \\
    let min_dist: f32 = self.r + entity.r;
    let dx: f32 = entity.pos.x - self.pos.x;
    let dy: f32 = entity.pos.y - self.pos.y;
    let actual_dist: f32 = self.pos.get_distance(&entity.pos);
    // << momentum math >> \\
    if actual_dist < min_dist && actual_dist > 0.0 {
      // << separate overlap >> \\
      let overlap: f32 = min_dist - actual_dist;
      // << normalized unit vectors: self -> entity >> \\
      let nx: f32 = dx / actual_dist;
      let ny: f32 = dy / actual_dist;
      // << push self backwards, entity forwards >> \\
      self.pos.x -= nx * (overlap / 2.0);
      self.pos.y -= ny * (overlap / 2.0);
      entity.pos.x += nx * (overlap / 2.0);
      entity.pos.y += ny * (overlap / 2.0);

      // << relative velocity >> \\
      let rx: f32 = self.vel.vx - entity.vel.vx;
      let ry: f32 = self.vel.vy - entity.vel.vy;
      // << relative velocity along collision normal: dot product >> \\
      let rv: f32 = (rx * nx) + (ry * ny);
      // << dont resolve if already separating >> \\
      if rv < 0.0 { return; }

      // << elastic impulse resolution >> \\
      let impulse: f32 = (MOMENTUM_TRANSFER_RATIO * 2.0 * rv) / (self.mass + entity.mass);
      // << distribute equal & opposing impulses >> \\
      self.vel.vx -= impulse * nx * entity.mass;
      self.vel.vy -= impulse * ny * entity.mass;
      entity.vel.vx += impulse * nx * self.mass;
      entity.vel.vy += impulse * ny * self.mass;
    }
  }
  
  // << handles inidvidual entity pocketing >> \\
  pub fn check_pocketed(&mut self) {
    // << ignore striker & inactive entities >> \\
    if self.type_name == Name::STRIKER || !self.is_active { return; }
    for i in 0..4 {
      let corner: Position = BOARD_CORNERS[i as usize];
      let dist: f32 = self.pos.get_distance(&corner);
      if dist <= 2.5 * U {
        self.is_active = false;
        self.is_gliding = false;
        self.vel = Velocity { vx: 0.0, vy: 0.0 };
        return;
      }
    }
  }

  ///// ++++++++++++++++++++ \\\\\
  /// ++ AI IMPLEMENTATIONS ++ \\\
  ///// ++++++++++++++++++++ \\\\\

  pub fn get_closest_pocket(&self) -> Position {
    let mut pocket: Position = BOARD_CORNERS[0];
    let mut min_dist: f32 = self.pos.get_distance(&pocket);
    for i in 1..4 {
      let target: Position = BOARD_CORNERS[i as usize];
      let dist: f32 = self.pos.get_distance(&target);
      if dist < min_dist {
        pocket = target;
        min_dist = dist;
      }
    }
    pocket
  }
}

#[derive(Debug, Clone, Copy)]
pub struct AllEntities([Entity; MAX_ENTITIES as usize]);

impl AllEntities {
  ///// ++++++++++++++++++++++++ \\\\\
  /// ++ ENGINE IMPLEMENTATIONS ++ \\\
  ///// ++++++++++++++++++++++++ \\\\\

  // << applies kinematics to all >> \\
  pub fn apply_uniform_kinematics(&mut self) {
    self.0.iter_mut().for_each(|entity| entity.apply_kinematics());
  }

  // << apply boundary checks to all >> \\
  pub fn apply_uniform_boundary_checks(&mut self) {
    self.0.iter_mut().for_each(|entity| entity.detect_boundary_collision());
  }

  // << applies uniform momentum resolve to all >> \\
  pub fn apply_uniform_momentum_resolve(&mut self) {
    for i in 0..(MAX_ENTITIES - 1) {
      // Split the slice into:
      // - `left`: elements from index 0 up to `i`
      // - `entity_slice`: element `i` (a 1-element slice)
      // - `right`: elements from index `i + 1` to the end 
      let (left, right) = self.0.split_at_mut((i + 1) as usize);
      let entity = &mut left[i as usize];
      right.iter_mut().for_each(|target| entity.resolve_momentum(target));
    }
  }

  // applies uniform pocketing to all pieces >> \\
  pub fn apply_uniform_pocketing(&mut self) {
    self.0.iter_mut().for_each(|entity| entity.check_pocketed());
  }

  ///// ++++++++++++++++++++ \\\\\
  /// ++ AI IMPLEMENTATIONS ++ \\\
  ///// ++++++++++++++++++++ \\\\\

  // << sets back current array to original array >> \\
  pub fn set_back(&mut self, original: &AllEntities) {
    for i in 0..MAX_ENTITIES {
      self.0[i as usize] = original.0[i as usize];
    }
  }

  // << checks if any pieces is still moving >> \\
  pub fn is_any_piece_moving(&self) -> bool {
    self.0.iter().any(|&entity| entity.is_gliding)
  }

  // << simulates one turn physics >> \\
  pub fn simulate_physics(&mut self, launch_pos: Position, p: f32, a: f32) {
    // << update & launch striker >> \\
    let striker = &mut self.0[0];
    striker.pos = launch_pos;
    striker.vel = Velocity { vx: p * a.cos(), vy: p* a.sin() };
    striker.pos.x += striker.vel.vx;
    striker.pos.y += striker.vel.vy;

    // << simulation >> \\
    let mut step: u32 = 0;
    while step < MAX_STEPS {
      // << physics pipeline >> \\
      self.apply_uniform_kinematics();
      self.apply_uniform_boundary_checks();
      self.apply_uniform_momentum_resolve();
      self.apply_uniform_pocketing();
      // << @optimization early exit >> \\
      if !self.is_any_piece_moving() { break; }
      step += 1;
    }
  }

  // << simulates one turn scores >> \\
  pub fn simulate_score(&self) -> f32 {
    self.0.iter()
      .map(|&entity| entity.pos.get_distance(&entity.get_closest_pocket()))
        .sum()
  }
  
  // Generates a randomized board layout with all 20 entities active:
  // - Striker: Placed randomly along the bottom baseline
  // - Queen & Pieces: Scattered across the board with non-overlapping bounds
  // @acknowledgement this sampler function was coded by Google Gemini AI
  pub fn new_randomized_sample() -> Self {
    // Simple Pseudo-Random Number Generator (PRNG) to avoid external crate dependencies
    let nanos = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .subsec_nanos();
    let mut seed = nanos;
    let mut next_rand = || -> f32 {
        seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
        (seed as f32) / (u32::MAX as f32)
    };

    let mut entities = [Entity {
      type_name: Name::BLACK,
      pos: Position { x: 0.0, y: 0.0 },
      vel: Velocity { vx: 0.0, vy: 0.0 },
      r: PIECE_RADIUS,
      mass: PIECE_MASS,
      is_active: true,
      is_gliding: false,
    }; MAX_ENTITIES as usize];

    // 1. Setup Striker at a random position along the baseline
    let striker_x = STRIKER_AREA[0].x + next_rand() * (STRIKER_AREA[1].x - STRIKER_AREA[0].x);
    entities[0] = Entity {
      type_name: Name::STRIKER,
      pos: Position { x: striker_x, y: STRIKER_AREA[0].y },
      vel: Velocity { vx: 0.0, vy: 0.0 },
      r: STRIKER_RADIUS,
      mass: STRIKER_MASS,
      is_active: true,
      is_gliding: false,
    };
    // Helper closure to ensure new pieces don't overlap with existing ones
    let is_overlapping = |pos: &Position, radius: f32, count: usize, list: &[Entity; 20]| -> bool {
      for idx in 0..count {
        let min_dist = radius + list[idx].r + 0.5; // include a small gap buffer
        if pos.get_distance(&list[idx].pos) < min_dist {
        return true;
        }
      }
      false
    };

    // Safe spawn boundaries for pieces (away from walls and corners)
    let min_x = 3.0 * U;
    let max_x = LOGICAL_WIDTH - 3.0 * U;
    let min_y = 6.0 * U;
    let max_y = LOGICAL_HEIGHT - 3.0 * U;

    // 2. Setup Queen & 18 Pieces (9 Whites, 9 Blacks)
    let piece_types = [
      Name::QUEEN,
      Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE,
      Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK,
    ];

    for (i, &type_name) in piece_types.iter().enumerate() {
      let entity_index = i + 1; // 0 is reserved for striker
      let mut spawn_pos = Position { x: 0.0, y: 0.0 };
      
      // Loop until a non-overlapping spot is found
      loop {
        spawn_pos.x = min_x + next_rand() * (max_x - min_x);
        spawn_pos.y = min_y + next_rand() * (max_y - min_y);

        if !is_overlapping(&spawn_pos, PIECE_RADIUS, entity_index, &entities) {
          break;
        }
      }

      entities[entity_index] = Entity {
        type_name,
        pos: spawn_pos,
        vel: Velocity { vx: 0.0, vy: 0.0 },
        r: PIECE_RADIUS,
        mass: PIECE_MASS,
        is_active: true,
        is_gliding: false,
      };
    }
    AllEntities(entities)
  }
}

///// ========================== \\\\\
/// ++ MASTER FUNCTION ++ \\\
///// ========================== \\\\\

#[inline(always)]
fn estimate_best_shot(current_pos: &mut AllEntities) {
  // << setup >> \\
  let start = Instant::now();
  let original_pos = current_pos.clone();
  let mut best_score: f32 = 300000.0;
  let mut outcome_x: f32 = STRIKER_AREA[0].x;
  let mut outcome_p: f32 = 5.0;
  let mut outcome_a: f32 = 0.2;
  let mut outcome_iteration: u32 = 0;
  let mut iteration: u32 = 0;
  // << simulation >> \\
  let min: f32 = STRIKER_AREA[0].x;
  let mut launch_x: f32 = min;
  let launch_y: f32 = STRIKER_AREA[0].y;
  while launch_x <= STRIKER_AREA[1].x {
    let mut a: f32 = 0.2;
    while a <= PI - 0.2 {
      let mut p: f32 = 5.0;
      while p <= 15.0 {
        let pos: Position = Position { x: launch_x, y: launch_y, };
        current_pos.simulate_physics(pos, p, a);
        let score: f32 = current_pos.simulate_score();
        // << updation >> \\
        if score < best_score {
          best_score = score;
          outcome_x = launch_x;
          outcome_p = p;
          outcome_a = a;
          outcome_iteration = iteration;
        }
        // << reset & increment >> \\
        current_pos.set_back(&original_pos);
        p += 5.0;
        iteration += 1;
      }
      a += 0.25;
    }
    launch_x += 0.1 * min;
  }
  // << outcome >> \\  
  let end = Instant::now();
  let time = (end - start).as_millis();
  println!("Time for one AI simulation: {}ms.", time);
  println!("Number of iteration: {}.", iteration);
  println!("Best shot: {}, {}, {}.", outcome_x, outcome_p, outcome_a);
  println!("Found at iteration: {}.", outcome_iteration);
}

fn main() {
    println!("Generating mid-gameboard state with random active pieces...");
    let mut board = AllEntities::new_randomized_sample();

    println!("Testing AI shot estimation on randomized layout...");
    estimate_best_shot(&mut board); // very fast: about 210ms;
}
