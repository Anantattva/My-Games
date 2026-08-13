// ।। ॐ नमः शिवाय ।। \\
// ॥ ॐ वामदेवाय नमः ॥ \\
// +++ WGSL +++ \\

// + WEB GRAPHICS SHADING LANGUAGE + \\
// SHADER CODE FOR WEBGPU AI \\

export const wgsl = `
//// +++ struct blueprint +++
/**
 * @learning
 *
 * WGSL's strict alignment rules expect only multiples of 8-byte or 16-byte for struct. So we add an additional _padding to expand 36 byte to 40 byte.
 */
struct Entity {
  pos: vec2f, // position: <x, y>;
  vel: vec2f, // velocity: <vx, vy>;
  type_id: f32, // string: 0 for "STRIKER", 1 for "QUEEN", 2 for "BLACK" & 3 for "BLACK";
  is_active: f32, // boolean: 0.0 for false, 1.0 for true;
  is_gliding: f32, // boolean: 0.0 for false, 1.0 for true;
  r: f32,
  mass: f32,
  _padding: f32,
}

struct TrajectoryParams {
  x: f32,
  y: f32,
  p: f32,
  a: f32,
}

/// +++ COMPILE-TIME CONSTANTS +++
// use const declaration for these
const FRICTION: f32 = 0.03;
const MOMENTUM_TRANSFER_RATIO: f32 = 0.85;
const MAX_STEPS: u32 = 240u;
const MAX_ENTITIES: u32 = 20u;

// ++ PureBeing Data ++
// +++ values will be inserted later via JS at pre-processing stage +++
const logical_width: f32 = {{LOGICAL_WIDTH}};
const logical_height: f32 = {{LOGICAL_HEIGHT}};
const default_x: f32 = {{DEFAULT_X}};
const default_y: f32 = {{DEFAULT_Y}};
const launch_min: f32 = {{LAUNCH_MIN}};
const launch_max: f32 = {{LAUNCH_MAX}};
const u: f32 = {{BOARD_UNIT}};

const corners = array<vec2f, 4>(
  vec2f({{C0_X}}, {{C0_Y}}),
  vec2f({{C1_X}}, {{C1_Y}}),
  vec2f({{C2_X}}, {{C2_Y}}),
  vec2f({{C3_X}}, {{C3_Y}})
);

//// ========================
// ++ PHYSICS ENGINE ++

// ==== kinematics ====
/**
 * @learning
 *
 * In WGSL, passing direct structs in function signature makes a copy of original data.
 * Thus, any changes made are lost.
 * Therefore, we pass pointer to the function signature and dereference it during calculation to directly mutate original data.
 */
fn apply_kinematics(entity: ptr<function, Entity>) {
  // << disable for inactive entities >>
  if ((*entity).is_active == 0.0) {
    return;
  }
  let speed: f32 = length((*entity).vel); // in-built method: length;
  if (speed >= 0.01) {
    // << keep flag active >>
    (*entity).is_gliding = 1.0;
    // << decelerate >>
    (*entity).vel *= (1.0 - FRICTION);
    // << apply >>
    (*entity).pos += (*entity).vel;
  } else {
    // << disable >>
    (*entity).is_gliding = 0.0;
    // << stop motion >>
    (*entity).vel = vec2f(0.0, 0.0);
  }
}
/**
 * @learning
 * WGSL uses the following signature blueprint for pointers:
 *  ptr<AddressSpace, AccessMode Data Type>;
 * When one writes " ptr<function, Entity> ", one is giving 2 kinds of info to GPU:
 * 
 * | function (Address Space): Tells the GPU compiler that this pointer refers to memory allocated inside the current thread's private stack frame. It lives only as long as that function call, and no other GPU thread can see or modify it.
 * 
 * | Entity (Data Type): Tells the compiler what struct or primitive layout exists at that memory address.
 * 
 * WGSL has 4 major address spaces.
 * 
 * Name - What It Means - Where It Lives in Hardware - Typical Access
 * 
 * | function
 *   - Private stack memory for a single execution thread.
 *   - Fast GPU registers / local stack memory.
 *   - Read / Write
 *
 * | storage
 *   - Large buffers shared across the entire GPU (your WebGPU writeBuffer arrays).
 *   - Main VRAM (GPU Video RAM).
 *   - Read / Write
 *
 * | uniform
 *   - Small, read-only constant data shared across all threads (e.g., global settings).
 *   - High-speed constant cache memory.
 *   - Read-Only
 *
 * | workgroup
 *   - Memory shared between threads within the same workgroup block.
 *   - Super-fast On-Chip L1 Shared Memory (SRAM).
 *   - Read / Write
 */
 
fn apply_uniform_kinematics(entities: ptr<function, array<Entity, MAX_ENTITIES>>) {
  for (var k: u32 = 0u; k<MAX_ENTITIES; k++) {
    apply_kinematics(&(*entities)[k]);
  }
}


/// ++ boundary collisions ++
fn check_boundary_collisions(entity: ptr<function, Entity>) {
  // << setup >>
  if ((*entity).is_active == 0.0) {
    return;
  }
  let r: f32 = (*entity).r;
  let pos: vec2f = (*entity).pos;
  // << collision detectors >>
  // << right/left walls >>
  if (pos.x <= r) {
    (*entity).pos.x = r;
    (*entity).vel.x *= -1.0;
  } else if (pos.x >= logical_width - r) {
    (*entity).pos.x = logical_width - r;
    (*entity).vel.x *= -1.0;
  }
  // << top/bottom walls >>
  if (pos.y <= r) {
    (*entity).pos.y = r;
    (*entity).vel.y *= -1.0;
  } else if (pos.y >= logical_height - r) {
    (*entity).pos.y = logical_height - r;
    (*entity).vel.y *= -1.0;
  }
}
/**
 * @learning
 *
 * In WGSL, & denotes pointer reference and * denotes dereference.
 * When one writes " &entity ", it tells GPU: "This is a data in memory, get the memory address/pointer of this.".
 * When one writes " *ptr ", it tells GPU: "This is a memory address/pointer, go get the data this address holds.".
 * 
 * Dot operator (.) has higher precedence than dereference operator (*). Therefore, " *ptr.pos " tries to apply .pos directly on pointer first, which leads to error.
 * Hence, we use explicit dereferencing " (*ptr).pos " to enforce dereferencing first. This ensures GPU applies .pos directly on data in memory without errors.
 * Works almost like BODMAS in arithmetic.
 */
 
fn apply_uniform_boundary_checks(entities: ptr<function, array<Entity, MAX_ENTITIES>>) {
  for (var k: u32 = 0u; k<MAX_ENTITIES; k++) {
    check_boundary_collisions(&(*entities)[k]);
  }
}

/// +++ momentum +++
/**
 * @learning
 * In WGSL, passing two pointers originating from the same memory source (&(*entities)[i] and &(*entities)[j]) into a function that writes to them triggers a static safety violation. The compiler detects that both pointer arguments point into the exact same array (entities), which could cause race conditions or undefined memory behavior.
 * Earlier, resolve_momentum accepted (a: ptr<function, Entity>, b: ptr<function, Entity>) and modifies their contents via dereferencing. Because (*entities)[i] and (*entities)[j] come from the same entities array variable, WGSL flags them as aliased pointers.
 * Instead of passing two pointers into resolve_momentum, we now pass the whole entities array pointer along with the indices i and j to mutate elements inside the function.
 */
fn resolve_momentum(entities: ptr<function, array<Entity, MAX_ENTITIES>>, i: u32, j: u32) {
  // << setup + early exits >>
  if ((*entities)[i].is_active == 0.0 || (*entities)[j].is_active == 0.0) {
    return;
  }
  // << neither are gliding & neither are striker >>
  if ((*entities)[i].is_gliding == 0.0 && (*entities)[j].is_gliding == 0.0 && (*entities)[i].type_id != 0.0 && (*entities)[j].type_id != 0.0) {
    return;
  }
  // << get radii & minimum distance >>
  let min: f32 = (*entities)[i].r + (*entities)[j].r;
  // << get masses >>
  let ma: f32 = (*entities)[i].mass;
  let mb: f32 = (*entities)[j].mass;
  // << get centres & distances >>
  let d: vec2f = (*entities)[j].pos - (*entities)[i].pos;
  let dist: f32 = length(d);
  // << check >>
  if (dist < min && dist > 0.0) {
    // << separate overlapping pieces >>
    let overlap: f32 = min - dist;
    // << normalized unit vectors >>
    // << DIRECTION: a -> b >>
    let n: vec2f = d / dist;
    // << push a backwards, b forwards >>
    (*entities)[i].pos -= n * overlap * 0.5;
    (*entities)[j].pos += n * overlap * 0.5;
    // << elastic momentum transfer >>
    // << relative velocity >>
    let k_vel: vec2f = (*entities)[i].vel - (*entities)[j].vel;
    let rel_vel: f32 = dot(k_vel, n); // in-built dot product method;
    // << don't resolve if already separating >>
    if (rel_vel < 0.0) {
      return;
    }
    // << elastic impulse resolution >>
    let p: f32 = 2.0 * rel_vel/(ma + mb);
    let impulse: f32 = p * MOMENTUM_TRANSFER_RATIO;
    // << apply equal & opposite impulses >>
    (*entities)[i].vel -= impulse * mb * n;
    (*entities)[j].vel += impulse * ma * n;
  }
}
fn apply_uniform_momentum_resolve(entities: ptr<function, array<Entity, MAX_ENTITIES>>) {
  for (var i: u32 = 0u; i<MAX_ENTITIES-1; i++) {
    for (var j: u32 = i+1; j<MAX_ENTITIES; j++) {
      resolve_momentum(entities, i, j);
    }
  }
}

/// ++++++ pocketing ++++++
fn check_pocketed(entity: ptr<function, Entity>) {
  // << skip striker & inactive entities >>
  if ((*entity).is_active == 0.0 || (*entity).type_id == 0.0) {
    return;
  }
  for (var k: u32 = 0u; k<4u; k++) {
    let pocket: vec2f = corners[k];
    // << check >>
    if (distance((*entity).pos, pocket) <= 2.5*u) {
      // << disable entity >>
      (*entity).is_active = 0.0;
      (*entity).is_gliding = 0.0;
      (*entity).vel = vec2f(0.0, 0.0);
      return;
    }
  }
}
fn check_uniform_pocketing(entities: ptr<function, array<Entity, MAX_ENTITIES>>) {
  for (var k: u32 = 0u; k<MAX_ENTITIES; k++) {
    check_pocketed(&(*entities)[k]);
  }
}

////// ====================
/// === AI ALGORITHM ===
/// +++ AI HELPER FUNCTIONS +++

/**
 * Returns closest pocket to the input entity.
 */
fn get_closest_pocket(e_pos: vec2f) -> vec2f {
  var pocket: vec2f = corners[0];
  var dist: f32 = distance(pocket, e_pos);
  for (var k: u32 = 1u; k<4u; k++) {
    let target_pocket: vec2f = corners[k];
    let target_dist: f32 = distance(target_pocket, e_pos);
    if (target_dist < dist) {
      pocket = target_pocket;
      dist = target_dist;
    }
  }
  return pocket;
}

///// +++ AI FUNCTIONS +++

fn simulate_score(entities: ptr<function, array<Entity, MAX_ENTITIES>>) -> f32 {
  var score: f32 = 0.0;
  // << skip striker & loop through active pieces >>
  for (var k: u32 = 1u; k<MAX_ENTITIES; k++) {
    let target_entity: Entity = (*entities)[k];
    if (target_entity.is_active == 1.0) {
      let closest_pocket: vec2f = get_closest_pocket(target_entity.pos);
      score += distance(target_entity.pos, closest_pocket);
    }
  }
  return score;
}

fn simulate_physics(traj: TrajectoryParams, base_entities: array<Entity, MAX_ENTITIES>) -> array<Entity, MAX_ENTITIES> {
  // << clone original entities to run simulation without mutating original data >>
  var clone_entities: array<Entity, MAX_ENTITIES> = base_entities;
  // << striker setup >>
  let striker: ptr<function, Entity> = &clone_entities[0];
  if ((*striker).type_id != 0.0 || (*striker).is_active != 1.0) {
    return clone_entities;
  }
  (*striker).pos.x = traj.x;
  (*striker).pos.y = traj.y;
  (*striker).vel.x = traj.p * cos(traj.a);
  (*striker).vel.y = traj.p * sin(traj.a);
  (*striker).pos += (*striker).vel;
  // << simulate >>
  var step: u32 = 0u;
  while (step < MAX_STEPS) {
    // << physics engine pipeline >>
    check_uniform_pocketing(&clone_entities);
    apply_uniform_boundary_checks(&clone_entities);
    apply_uniform_momentum_resolve(&clone_entities);
    apply_uniform_kinematics(&clone_entities);
    // << break & early exit >>
    var is_any_moving: f32 = 0.0;
    for (var k: u32 = 0u; k<MAX_ENTITIES; k++) {
      if (clone_entities[k].is_active == 1.0 && clone_entities[k].is_gliding == 1.0) {
        is_any_moving = 1.0;
        break;
      }
    }
    if (is_any_moving == 0.0) {
      break;
    }
    step++;
  }
  return clone_entities;
}

/////// ============
// ++++ MASTER FUNCTION ++++
@group(0) @binding(0) var<storage, read> initial_entities: array<Entity, MAX_ENTITIES>;
@group(0) @binding(1) var<storage, read> trajectories: array<TrajectoryParams>;
@group(0) @binding(2) var<storage, read_write> score_results: array<f32>;

/**
 * @learning
 *
 * @builtin(global_invocation_id) is a built-in variable provided by WebGPU. The @builtin attribute tells the GPU compiler: "Don't expect the JavaScript code to pass this parameter in; retrieve this thread's exact coordinate identifier directly from the GPU hardware."
 *
 * WebGPU organizes its execution grid in 3 dimensions (X, Y, Z). Because of this 3D structure, the GPU built-in coordinate identifier uses a 3D vector of unsigned integers: vec3u (short for vec3<u32>).
 * | X dimension: Index of the thread horizontally.
 * | Y dimension: Index of the thread vertically.
 * | Z dimension: Depth index of the thread.
 * Even though our Carrom shot variations form a 1D list (e.g., shot 0, shot 1, shot 2 ... shot 1484), WebGPU always provides coordinates in 3D. For 1D problems like yours, we only launch threads along the X-axis and leave Y and Z set to 1. Thus, we access id.x to get the unique numeric ID of the current thread.
 */
 
 
@compute @workgroup_size(64)
fn estimate_best_shot(@builtin(global_invocation_id) id: vec3u) { // << setup & identify which trajectory >>
  let index: u32 = id.x;
  if (index >= arrayLength(&trajectories)) {
    return;
  }
  // << perform simulation & dispatch score for individual thread >>
  var simulated: array<Entity, MAX_ENTITIES> = simulate_physics(trajectories[index], initial_entities);
  score_results[index] = simulate_score(&simulated);
}
`;