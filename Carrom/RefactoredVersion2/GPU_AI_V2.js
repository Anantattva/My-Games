// ।। ॐ नमः शिवाय ।। \\
// @date 30th September, 2026

// Rewriting my GPU AI with better GPU-oriented structure.
// Completed on 1st October, 2026

import { uw, uh, u } from "./Constants.js";
import { testPools, getLiveState } from "./EngineAdvance_Helper.js";

/**
 * @architecture
 * @design
 * 
 * Borrowing from Data-Oriented CPU AI Design,
 * this GPU AIs architecture too uses unified states into one flat Float32Array.
 * Each row represents one entity.
 * Each column represents one state.
 * 
 * We use offsets of 8 modulo to get states.
 * Let's say for entity k:
 *   - isActive  = 8 * k,
 *   - IsGliding = 8 * k + 1,
 *   - radius    = 8 * k + 2,
 *   - mass      = 8 * k + 3,
 *   - x         = 8 * k + 4,
 *   - y         = 8 * k + 5,
 *   - vx        = 8 * k + 6,
 *   - vy        = 8 * k + 7
 *
 * @gpu
 * @benchmark
 * 
 * My previous GPU AI used "One Thread - One Shot" simulation structure.
 * This assumed each GPU core behaves like one CPU core.
 * But it's not.
 * In reality, a GPU core is about 1000x-100000x weaker than weakest CPU core.
 * As a result, the previous GPU AI ran at 1.6s.
 * 
 * This new design uses "One Workgroup - One Shot" simulation structure.
 * And work is parallelized per entity instead of per simulation - requiring 20x more cores.
 * It's good - runs at 150ms.
 * 
 * However, same Rust AI engine with 4 cores + tuning took about 80ms only.
 */

/// ++ SOURCE OF TRUTH ++ \\\
/**
 * @type {object} wgpu
 * 
 * @property {boolean} initialized
 * @property {GPUAdapter} adapter
 * @property {GPUDevice} device
 * @property {String} wgsl
 * @property {GPUShaderModule} compiledModule
 * @property {GPUComputePipeline} pipeline
 * @property {Object<GPUBuffer>} buffers
 * @property {GPUBindGroup} bindGroup
 * @property {GPUCommandEncoder} encoder
 * @property {GPURenderPassEncoder} pass
 */
export const wgpu = {
  initialized: false,
  adapter: null,
  device: null,
  wgsl: null,
  module: null,
  pipeline: null,
  buffers: {},
  bindGroup: null,
  encoder: null,
  pass: null
};

wgpu.wgsl = `
  // ++ GLOBAL CONSTANTS ++
  
  const UW: f32  = ${uw};
  const UH: f32  = ${uh};
  const U: f32   = ${u};

  const LOGICAL_WIDTH: f32  = 40.0 * UH;
  const LOGICAL_HEIGHT: f32 = 40.0 * UH;

  const OFFSET: f32 = 8.0 * U;
  const GAP: f32    = 4.0 * U;

  const pockets: array<vec2f, 4> = array<vec2f, 4>(
    vec2f(GAP / 4.0,                  GAP / 4.0),
    vec2f(LOGICAL_WIDTH - GAP / 4.0,  GAP / 4.0),
    vec2f(GAP / 4.0,                  LOGICAL_HEIGHT - GAP / 4.0),
    vec2f(LOGICAL_WIDTH - GAP / 4.0,  LOGICAL_HEIGHT - GAP / 4.0)
  );

  const POCKET_THRESHOLD: f32 = 2.5 * U;

  const MAX_ENTITIES: u32        = 20u;
  const MAX_STEPS: u32           = 120u;
  const ELEMENTS_PER_ENTITY: u32 = 8u;

  const FRICTION: f32 = 0.03;
  const MTR: f32      = 0.85; // MOMENTUM_TRANSFER_RATIO

  // ++ BUFFERS ++
  @group(0) @binding(0) var<storage, read> test_shots: array<vec4f>;
  @group(0) @binding(1) var<storage, read> initial_state: array<f32, MAX_ENTITIES * ELEMENTS_PER_ENTITY>; // array<f32, 160u>
  @group(0) @binding(2) var<storage, read_write> scores_result: array<f32>;

  fn run_kinematics(state: ptr<workgroup, array<f32, 160u>>, k: u32) {
    let start: u32 = 8u * k;

    // << run only if active entity >>
    if ((*state)[start] == 1.0) {
      if (length(vec2f((*state)[start + 6u], (*state)[start + 7u])) >= 0.001) {
        // << decelerate >>
        (*state)[start + 6u] *= (1.0 - FRICTION);
        (*state)[start + 7u] *= (1.0 - FRICTION);

        // << update position >>
        (*state)[start + 4u] += (*state)[start + 6u];
        (*state)[start + 5u] += (*state)[start + 7u];

        // << keep gliding flag active >>
        (*state)[start + 1u] = 1.0;
      } else {
        // << quit motion >>
        (*state)[start + 6u] = 0.0;
        (*state)[start + 7u] = 0.0;

        // << turn off gliding flag >>
        (*state)[start + 1u] = 0.0;
      }
    }
  }

  fn handle_boundary(state: ptr<workgroup, array<f32, 160u>>, k: u32) {
    let start: u32 = 8u * k;

    // << run only if active entity >>
    if ((*state)[start] == 1.0) {
      let r: f32 = (*state)[start + 2u];
      // << left & right walls >>
      if ((*state)[start + 4u] <= r) {
        (*state)[start + 4u] = r;
        (*state)[start + 6u] *= -1.0;
      } else if ((*state)[start + 4u] >= LOGICAL_WIDTH - r) {
        (*state)[start + 4u] = LOGICAL_WIDTH - r;
        (*state)[start + 6u] *= -1.0;
      }

      // << top & bottom walls >>
      if ((*state)[start + 5u] <= r) {
        (*state)[start + 5u] = r;
        (*state)[start + 7u] *= -1.0;
      } else if ((*state)[start + 5u] >= LOGICAL_HEIGHT - r) {
        (*state)[start + 5u] = LOGICAL_HEIGHT - r;
        (*state)[start + 7u] *= -1.0;
      }
    }
  }

  /*
  fn resolve_momentum(state: ptr<workgroup, array<f32, 160u>>, k: u32) {
    let sk: u32 = 8u * k;

    // << resolve active entities only >>
    if ((*state)[sk] == 1.0) {
      for (var i=0u; i<MAX_ENTITIES; i++) {
        // << ignore if entity itself >>
        if (i != k) {
          let si: u32 = 8u * i;
          
          // << only resolve if other entity is active >>
          if ((*state)[si] == 1.0) {

            // << only resolve if either is gliding >>
            if ((*state)[sk + 1u] == 1.0 || (*state)[si + 1u] == 1.0) {
              let min: f32 = (*state)[sk + 2u] + (*state)[si + 2u];
              let d: vec2f = vec2f((*state)[si + 4u], (*state)[si + 5u]) - vec2f((*state)[sk + 4u], (*state)[sk + 5u]);
              let actual: f32 = length(d);

              // << check collision >>
              if (actual < min) {
                let overlap = min - actual;

                // << normal unit vector: k -> i
                let n: vec2f = d / actual;

                // << push target entity k backwards >>
                (*state)[sk + 4u] -= n.x * overlap * 0.5;
                (*state)[sk + 5u] -= n.y * overlap * 0.5;

                // << normal velocity vector: i -> k >>
                let k_vel: vec2f = vec2f((*state)[si + 6u], (*state)[si + 7u]) - vec2f((*state)[sk + 6u], (*state)[sk + 7u]);
                let rel_vel: f32 = dot(n, k_vel);

                // << dont resolve if already separating >>
                if (rel_vel > 0.0) {
                  // << get masses >>
                  let mk: f32 = (*state)[sk + 3u];
                  let mi: f32 = (*state)[si + 3u];

                  let impulse: f32 = (2.0 * MTR * rel_vel) / (mk + mi);

                  // << apply >>
                  (*state)[sk + 6u] -= impulse * mi * n.x;
                  (*state)[sk + 7u] -= impulse * mi * n.y;
                }
              }
            }
          }
        }
      }
    }
  }
  */

  fn resolve_momentum_safe(state: ptr<workgroup, array<f32, 160u>>, k: u32) {
    let sk: u32 = 8u * k;
 
    if ((*state)[sk] == 0.0) { return; }

    var delta_pos: vec2f = vec2f(0.0, 0.0);
    var delta_vel: vec2f = vec2f(0.0, 0.0);

    let pos_k: vec2f = vec2f((*state)[sk + 4u], (*state)[sk + 5u]);
    let vel_k: vec2f = vec2f((*state)[sk + 6u], (*state)[sk + 7u]);
    let r_k: f32     = (*state)[sk + 2u];
    let m_k: f32     = (*state)[sk + 3u];

    for (var i = 0u; i < MAX_ENTITIES; i++) {
      if (i == k) { continue; }

      let si: u32 = 8u * i;
      if ((*state)[si] == 1.0) {
        let pos_i: vec2f = vec2f((*state)[si + 4u], (*state)[si + 5u]);
        let vel_i: vec2f = vec2f((*state)[si + 6u], (*state)[si + 7u]);
        let r_i: f32     = (*state)[si + 2u];
        let m_i: f32     = (*state)[si + 3u];

        let d: vec2f = pos_i - pos_k;
        let actual: f32 = length(d);
        let min_dist: f32 = r_k + r_i;

        if (actual < min_dist) {
          let overlap: f32 = min_dist - actual;
          let n: vec2f = d / actual; // Normal from k -> i

          // Accumulate displacement for entity k only (1/2 overlap)
          delta_pos -= n * (overlap * 0.5);

          // Relative velocity
          let rel_vel: f32 = dot(n, vel_k - vel_i);

          if (rel_vel > 0.0) {
            let impulse: f32 = (2.0 * MTR * rel_vel) / (m_k + m_i);
            delta_vel -= n * (impulse * m_i);
          }
        }
      }
    }
  
    // Apply the accumulated changes safely to Entity K
    (*state)[sk + 4u] += delta_pos.x;
    (*state)[sk + 5u] += delta_pos.y;
    (*state)[sk + 6u] += delta_vel.x;
    (*state)[sk + 7u] += delta_vel.y;
  }

  fn handle_pocketing(state: ptr<workgroup, array<f32, 160u>>, k: u32) {
    let start = 8u * k;

    // << active entities only >> \\
    if ((*state)[start] == 1.0) {
      for (var i=0u; i<4u; i++) {
        if (distance(pockets[i], vec2f((*state)[start + 4u], (*state)[start + 5u])) <= POCKET_THRESHOLD) {
          // << quit motion >>
          (*state)[start + 6u] = 0.0;
          (*state)[start + 7u] = 0.0;

          // << disable flags >>
          (*state)[start]      = 0.0;
          (*state)[start + 1u] = 0.0;
          break;
        }
      }
    }
  }

  fn run_score(state: ptr<workgroup, array<f32, 160u>>, k: u32) -> f32 {
    // << setup >>
    let start: u32 = 8u * k;

    // << return 0.0 for inactive entities >> \\
    if ((*state)[start] == 0.0) {
      return 0.0;
    } else {
      // << else return distance from closest pocket >>
      let position: vec2f = vec2f((*state)[start + 4u], (*state)[start + 5u]);      
      var min_dist: f32 = distance(position, pockets[0u]);
      var target_dist: f32 = 0.0;

      for (var i=1u; i<4u; i++) {
        target_dist = distance(position, pockets[i]);
        if (target_dist < min_dist) {          
          min_dist = target_dist;
        }
      }
      return min_dist;
    }
  }
  
  /**
   * @learning
   * 
   * '@builtin(workgroup_id)' is used to access each individual workgroup.
   * '@builtin(local_invocation_id)' is used to access each individual thread within a workgroup.
   */

  var<workgroup> shared_state: array<f32, 160u>;
  
  @compute @workgroup_size(32) 
  fn estimate_best_shot(@builtin(workgroup_id) worker_id: vec3u, @builtin(local_invocation_id) local_id: vec3u) {
    // << setup >>
    let worker_index: u32 = worker_id.x;
    let thread_index: u32 = local_id.x;

    // << thread 0/striker copies initial_state data to workgroup shared_state >>
    if (thread_index == 0u) {
      for (var i=0u; i<160u; i++) {
        shared_state[i] = initial_state[i];
      }

      // << launch striker >>
      let shot: vec4f = test_shots[worker_index];
      let vx: f32 = shot.z * cos(shot.w);
      let vy: f32 = shot.z * sin(shot.w);
      shared_state[4u] = shot.x + vx;
      shared_state[5u] = shot.y + vy;
      shared_state[6u] = vx;
      shared_state[7u] = vy;
      shared_state[0u] = 1.0;
      shared_state[1u] = 1.0;
    }    
    workgroupBarrier();

    // << physics pipeline simulation >>
    let is_active_index: u32 = 8u * thread_index;
    for (var step=0u; step<MAX_STEPS; step++) {      
      if (thread_index < MAX_ENTITIES) {
        if (shared_state[is_active_index] == 1.0) {
          handle_pocketing(&shared_state, thread_index);
          handle_boundary(&shared_state, thread_index);
          resolve_momentum_safe(&shared_state, thread_index);
          run_kinematics(&shared_state, thread_index);
        }
      }
      workgroupBarrier();
    }
    workgroupBarrier();

    // << thread 0/striker accumulated score & writes back to results >> \\
    if (thread_index == 0u) {
      var worker_score: f32 = 0.0;
      for (var k=1u; k<MAX_ENTITIES; k++) {
        worker_score += run_score(&shared_state, k);
      }
      scores_result[worker_index] = worker_score;
    }
    workgroupBarrier();
  }
`;

/**
 * Initialized GPU compute setup.
 * 
 * @async
 * @function INITIALIZE
 * @param {void}
 * @return {void}
 */
async function INITIALIZE() {
  try {
    wgpu.adapter = await navigator.gpu.requestAdapter();
    wgpu.device = await wgpu.adapter.requestDevice();
    console.log("WebGPU AI 2 Initialization successful!!! 😎😎😇🥳");
  } catch (error) {
    console.error("WebGPU AI 2 failed to initialize: ", error);
  }
}

/**
 * Compiles shader & compute pipeline.
 * 
 * @async
 * @function compileShaderAndPipeline
 * @param {void}
 * @return {void}
 */
async function compileShaderAndPipeline() {
  // << shader module >> \\
  wgpu.module = wgpu.device.createShaderModule({ code: wgpu.wgsl });
  const info = await wgpu.module.getCompilationInfo();
  info.messages.forEach((e) => {
    console.warn(e);
  });

  // << compute pipeline >> \\
  try {
  wgpu.pipeline = await wgpu.device.createComputePipelineAsync({
    layout: 'auto',
    compute: {
      module: wgpu.module,
      entryPoint: "estimate_best_shot"
    }
  });
  } catch (e) { console.error(e); }
  
  console.log("Shader compiled & compute pipeline ready!! 😎😎");
}

/**
 * Establishes buffers & bind group.
 * 
 * @function setBuffersAndBindGroup
 * @param {void}
 * @return {void}
 */
function setBuffersAndBindGroup() {
  // << setup >> \\
  const testShots = new Float32Array(testPools);
  const liveState = new Float32Array(getLiveState());
  const totalShots     = testShots.length / 4;
  const shotsByteSize  = testShots.byteLength;
  const stateByteSize  = liveState.byteLength;
  const scoresByteSize = totalShots * Float32Array.BYTES_PER_ELEMENT;
  
  // << buffers >> \\
  wgpu.buffers.testPools = wgpu.device.createBuffer({
    size: shotsByteSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  wgpu.device.queue.writeBuffer(wgpu.buffers.testPools, 0, testShots);

  wgpu.buffers.initialState = wgpu.device.createBuffer({
    size: stateByteSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  
  wgpu.buffers.scores = wgpu.device.createBuffer({
    size: scoresByteSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  
  wgpu.buffers.staging = wgpu.device.createBuffer({
    size: scoresByteSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });
  
  // << bind group >> \\
  wgpu.bindGroup = wgpu.device.createBindGroup({
    layout: wgpu.pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: wgpu.buffers.testPools } },
      { binding: 1, resource: { buffer: wgpu.buffers.initialState } },
      { binding: 2, resource: { buffer: wgpu.buffers.scores } }
    ]
  });

  console.log("Established buffers & bind groups successfully!! 😎😎💫");
}

/**
 * Writes current state to GPU buffer.
 * Maps score results.
 * Fetches best score & sends back best shot.
 * 
 * @async
 * @function estimateBestShotGPU
 * @param {void}
 * @return {object}
 */
export async function estimateBestShotGPU() {
  // << initialization >> \\
  try {
  if (!wgpu.initialized) {
    await INITIALIZE();
    await compileShaderAndPipeline();
    setBuffersAndBindGroup();
    wgpu.initialized = true;
    console.log("WebGPU AI V2 successfully initialized fully!! 😎💫🥳😇");
  }
  
  // << setup >> \\
  const start = performance.now();
  const initialState   = new Float32Array(getLiveState());
  const stateLength    = initialState.length / 8;
  const totalPools     = testPools.length / 4;
  const scoresByteSize = totalPools * Float32Array.BYTES_PER_ELEMENT;

  // << write to GPUBuffer >> \\
  wgpu.device.queue.writeBuffer(wgpu.buffers.initialState, 0, initialState);

  // << encoder + pass >> \\
  wgpu.encoder = wgpu.device.createCommandEncoder();
  wgpu.pass = wgpu.encoder.beginComputePass();

  wgpu.pass.setPipeline(wgpu.pipeline);
  wgpu.pass.setBindGroup(0, wgpu.bindGroup);
  wgpu.pass.dispatchWorkgroups(totalPools);
  wgpu.pass.end();

  wgpu.encoder.copyBufferToBuffer(wgpu.buffers.scores, 0, wgpu.buffers.staging, 0, scoresByteSize);
  wgpu.device.queue.submit([ wgpu.encoder.finish() ]);

  const stamp1 = performance.now();
  await wgpu.device.queue.onSubmittedWorkDone();
  const stamp2 = performance.now();
  console.log(`Time for pure GPU compute: ${stamp2 - stamp1}ms.`);
  // << fetch back results >> \\
  await wgpu.buffers.staging.mapAsync(GPUMapMode.READ);
  const scores = new Float32Array(wgpu.buffers.staging.getMappedRange().slice());
  wgpu.buffers.staging.unmap();
  // console.log(scores);
    
  let bestShot = {
    x: 0.0,
    y: 0.0,
    p: 0.0,
    a: 0.0
  };
  let bestScore = 3000000.0;
  let bestIndex = 0;

  for (let k=0; k<scores.length; k++) {
    if (scores[k] < bestScore) {
      bestScore = scores[k];
      bestIndex = k;
      bestShot.x = testPools[4 * k];
      bestShot.y = testPools[4 * k + 1];
      bestShot.p = testPools[4 * k + 2];
      bestShot.a = testPools[4 * k + 3];
    }
  }

  const time = performance.now() - start;
  console.log(`GPU AI V2 simulation:
  time: ${time}ms,
  bestScore: ${bestScore},
  found at iteration: ${bestIndex}.`);
  return bestShot;
  } catch (e) { console.error(e); }
}