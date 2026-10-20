// ।। ॐ नमः शिवाय ।। \\
// @date 14th October, 2026

#![allow(warnings)]

use wasm_bindgen::prelude::*;

// ++++ DATA LAYOUT ++++ \\

type State = [f32; 160];

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub struct Shot {
  pub x: f32,
  pub y: f32,
  pub p: f32,
  pub a: f32,
}

// ++ global constants ++ \\

const FRICTION: f32 = 0.03;
const MTR: f32      = 0.85;

const UW: f32 = 3.84;
const UH: f32 = 6.94;
const U: f32  = (UW + UH) / 2.0;

const LOGICAL_WIDTH: f32  = 40.0 * UH;
const LOGICAL_HEIGHT: f32 = 40.0 * UH;

const COLLIDE_THRESHOLD: f32 = 11.0 * U * U;

const BOARD_CORNERS: [f32; 8] = [
  U,         U ,
  39.0 * U,  U,
  U,         39.0 * U,
  39.0 * U,  39.0 * U,
];

const POCKET_THRESHOLD: f32 = 6.25 * U * U;

const OFFSET: f32 = 8.0 * U;
const GAP: f32    = 4.0 * U;

const STRIKER_AREA: [f32; 4] = [
  OFFSET,                  OFFSET - GAP,
  LOGICAL_WIDTH - OFFSET,  OFFSET - GAP,
];

const MAX_STEPS: u32 = 240;

// ++++ helpers ++++ \\

#[inline(always)]
fn get_len_sq(x: f32, y: f32) -> f32 {
  x * x + y * y
}

// ++++ physics functions ++++ \\

#[inline(always)]
fn run_kinematics(state: &mut State) {
  let mut start: u32 = 0;
  for i in 0..20 {
    start = 8 * i;
    if state[start as usize] == 1.0 {
      if get_len_sq(state[(start + 6) as usize], state[(start + 7) as usize]) >= 0.0001 {
        state[(start + 6) as usize] *= 1.0 - FRICTION;
        state[(start + 7) as usize] *= 1.0 - FRICTION;
        state[(start + 4) as usize] += state[(start + 6) as usize];
        state[(start + 5) as usize] += state[(start + 7) as usize];
        state[(start + 1) as usize] = 1.0;
      } else {
        state[(start + 6) as usize] = 0.0;
        state[(start + 7) as usize] = 0.0;
        state[(start + 1) as usize] = 0.0;
      }
    }
  }
}

#[inline(always)]
fn handle_boundary(state: &mut State) {
  let mut start: u32 = 0;
  let mut r: f32 = 0.0;
  for i in 0..20 {
    start = 8 * i;
    if state[start as usize] == 1.0 {
      r = state[(start + 2) as usize];
      if state[(start + 4) as usize] <= r {
        state[(start + 4) as usize] = r;
        state[(start + 6) as usize] *= -1.0;
      } else if state[(start + 4) as usize] >= LOGICAL_WIDTH - r {
        state[(start + 4) as usize] = LOGICAL_WIDTH - r;
        state[(start + 6) as usize] *= -1.0;
      }
      if state[(start + 5) as usize] <= r {
        state[(start + 5) as usize] = r;
        state[(start + 7) as usize] *= -1.0;
      } else if state[(start + 5) as usize] >= LOGICAL_WIDTH - r {
        state[(start + 5) as usize] = LOGICAL_HEIGHT - r;
        state[(start + 7) as usize] *= -1.0;
      }
    }
  }
}

#[inline(always)]
fn resolve_momentum(state: &mut State) {
  let mut sa: u32 = 0;
  let mut sb: u32 = 0;
  let mut dx: f32 = 0.0;
  let mut dy: f32 = 0.0;
  let mut dist_sq: f32 = 0.0;
  let mut actual: f32  = 0.0;
  let mut min: f32     = 0.0;
  let mut overlap: f32 = 0.0;
  let mut nx: f32 = 0.0;
  let mut ny: f32 = 0.0;
  let mut kx: f32 = 0.0;
  let mut ky: f32 = 0.0;
  let mut rel_vel: f32 = 0.0;
  let mut impulse: f32 = 0.0;
  for a in 0..19 {
    for b in (a + 1)..20 {
      sa = 8 * a;
      sb = 8 * b;
      if state[sa as usize] == 1.0 && state[sb as usize] == 1.0 {
        if state[(sa + 1) as usize] == 1.0 || state[(sb + 1) as usize] == 1.0 {
          dx = state[(sb + 4) as usize] - state[(sa + 4) as usize];
          dy = state[(sb + 5) as usize] - state[(sa + 5) as usize];
          dist_sq = get_len_sq(dx, dy);
          if dist_sq <= COLLIDE_THRESHOLD {
            min = state[(sa + 2) as usize] + state[(sb + 2) as usize];
            actual = dist_sq.sqrt();
            if actual < min && actual > 0.0 {
              overlap = min - actual;
              nx = dx / actual;
              ny = dy / actual;
              state[(sa + 4) as usize] -= nx * (overlap / 2.0);
              state[(sa + 5) as usize] -= ny * (overlap / 2.0);
              state[(sb + 4) as usize] += nx * (overlap / 2.0);
              state[(sb + 5) as usize] += ny * (overlap / 2.0);
              kx = state[(sa + 6) as usize] - state[(sb + 6) as usize];
              ky = state[(sa + 7) as usize] - state[(sb + 7) as usize];
              rel_vel = kx * nx + ky * ny;
              if rel_vel > 0.0 {
                impulse = (2.0 * MTR * rel_vel) / (state[(sa + 3) as usize] + state[(sb + 3) as usize]);
                state[(sa + 6) as usize] -= nx * impulse * state[(sb + 3) as usize];
                state[(sa + 7) as usize] -= ny * impulse * state[(sb + 3) as usize];
                state[(sb + 6) as usize] += nx * impulse * state[(sa + 3) as usize];
                state[(sb + 7) as usize] += ny * impulse * state[(sa + 3) as usize];
              }
            }
          }
        }
      }
    }
  }
}

#[inline(always)]
fn handle_pocketing(state: &mut State) {
  let mut start: u32 = 0;
  let mut dx: f32 = 0.0;
  let mut dy: f32 = 0.0;
  for i in 0..20 {
    start = 8 * i;
    if state[start as usize] == 1.0 {
      for p in 0..4 {
        dx = BOARD_CORNERS[(2 * p) as usize]     - state[(start + 4) as usize];
        dy = BOARD_CORNERS[(2 * p + 1) as usize] - state[(start + 5) as usize];
        if get_len_sq(dx, dy) <= POCKET_THRESHOLD {
          state[(start + 6) as usize] = 0.0;
          state[(start + 7) as usize] = 0.0;
          state[(start) as usize]     = 0.0;
          state[(start + 1) as usize] = 0.0;
          break;
        }
      }
    }
  }
}

// ++++ physics pipeline ++++ \\

#[inline(always)]
fn run_score(state: &State) -> f32 {
  let mut start: u32 = 0;
  let mut score: f32 = 0.0;
  let mut target_score_sq: f32 = 0.0;
  let mut best_score_sq: f32 = 0.0;
  let mut dx: f32 = 0.0;
  let mut dy: f32 = 0.0;
  for i in 1..20 {
    start = 8 * i;
    dx = BOARD_CORNERS[0 as usize] - state[(start + 4) as usize];
    dy = BOARD_CORNERS[1 as usize] - state[(start + 5) as usize];
    best_score_sq = get_len_sq(dx, dy);
      
    for p in 1..4 {
      dx = BOARD_CORNERS[(2 * p) as usize]     - state[(start + 4) as usize];
      dy = BOARD_CORNERS[(2 * p + 1) as usize] - state[(start + 5) as usize];
      target_score_sq = get_len_sq(dx, dy);
      if target_score_sq < best_score_sq {
        best_score_sq = target_score_sq;
      }     
    }
    score += best_score_sq.sqrt();
  }
  score
}

#[inline(always)]
fn check_any_moving(state: &State) -> bool {  
  for i in 0..20 {   
    if state[(8 * i) as usize] == 1.0 && state[(8 * i + 1) as usize] == 1.0 {
      return true;
    }
  }
  false
}

fn set_back(using_state: &mut State, cached_state: &State) {
  for i in 0..160 {
    using_state[i as usize] = cached_state[i as usize];
  }
}

fn run_simulation(state: &mut State, shot: &Shot) {
  let vx: f32 = shot.p * shot.a.cos();
  let vy: f32 = shot.p * shot.a.sin();
  state[0 as usize] = 1.0;
  state[1 as usize] = 1.0;
  state[6 as usize] = vx;
  state[7 as usize] = vy;
  state[4 as usize] = shot.x;
  state[5 as usize] = shot.y;
  
  let mut step: u32 = 0;
  while step < MAX_STEPS {
    if !check_any_moving(state) {
      break;
    }
    handle_pocketing(state);
    handle_boundary(state);
    resolve_momentum(state);
    run_kinematics(state);
    step += 1;
  }
}

fn get_test_shots() -> Vec<Shot> {
  let mut output = Vec::new();
  let min: f32 = STRIKER_AREA[0];
  let y: f32   = STRIKER_AREA[1];
  let max: f32 = STRIKER_AREA[2];
  let mut x: f32 = min;
  while x <= max {
    let mut p: f32 = 5.0;
    while p <= 15.0 {
      let mut a: f32 = 0.2;
      while a <= std::f32::consts::PI - 0.2 {
        output.push(Shot { x: x, y: y, p: p, a: a });
        a += 0.25;
      }
      p += 5.0;
    }
    x += 0.1 * min;
  }
  output
}

///// ======++++++====== \\\\\
// + simulation functions + \\

#[wasm_bindgen]
pub fn estimate_best_shot(state_slice: &[f32]) -> Shot {
  let mut state: State = [0.0; 160];
  if state_slice.len() >= 160 {
    state.copy_from_slice(&state_slice[..160]);
  }

  let mut local_state = state;
  let test_shots = get_test_shots();
  let mut results = Vec::new();

  for shot in &test_shots {
    run_simulation(&mut local_state, &shot);
    results.push((*shot, run_score(&local_state)));
    set_back(&mut local_state, &state);
  }

  let (mut global_best_shot, mut global_best_score) = results[0];
  for (local_best_shot, local_best_score) in results {
    if local_best_score < global_best_score {
      global_best_shot = local_best_shot;
      global_best_score = local_best_score;
    }
  }

  global_best_shot
}
