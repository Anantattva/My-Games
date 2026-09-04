// ।। ॐ नमः शिवाय ।। \\
// ॥ ॐ वामदेवाय नमः ॥ \\
// ++ Wise Being JS ++ \\

/// ++ SETUP + IMPORTS ++ \\\
import * as PureBeing from './PureBeing.js';
import * as Engine from './Engine.js';
import * as RawShaderText from './Engine_Shader.js';

/**
 * @dates
 * 
 * Started working on WebGPU accelerated AI on 11th August, 2026.
 * Finished rewriting physics pipeline & AI simulation functions into WGSL shader on 12th August. 2026.
 * Also completed entire compute pipeline & setup by 12th August.
 * This took 2 days only. Far less than i expected.

 * @bugs
 
 * However, the AI runs into a serious bug.
 * All simulations happen correctly on GPU. GPU returns an array of length 46992.
 * But when reading back data from this to JS at mapAsync stage, it crashes with 'AbortError: Device lost'.
 * I tried adding safety nets, gpu error into, gpu.device.onSubmittedWorkDone() delay & console.log() every possible blindspot & bug. Nothing quiet helped.
 * 
 * @learning
 * Today is 4th September, 2026.
 * I quit working on this project for all these days in between.
 * I spent time working on Rust & other WebGPU projects.
 * Those projects strengthened my intuition & allowed me to develop the necessary perception to profile the bottlenecks.
 * 
 * THE BUG IS FINNALY FIXED. WOWWWW 😎😎😎😇😇😇🥳🥳🥳
 * The issue was serious but simple.
 * GPU simulation simply exceed limit: 2 seconds.
 * Triggering inactive thread response forcing driver to shut down GPUDevice.
 * I fixed my simplifying WGSL loop & passing data updatiln directly to @compute function itself.
 * 
 * Also another heavy bug was on **trajectories data array**.
 * Instead of passing 1485 test-points as in CPU AI, it was passing 32x more due to incorrect increment in nested loops.
 * Now, its fixed & correct.
 * 
 * Moreover, I shifted buffers & bind groups to their separate one-time function.
 * In previous design, new buffers & bind groups were during each simulation.
 *
 * Now, they are allocated once during initialization.
 * JS & GPU simply over-write this during each AI turn.
 */
 
/**
 * Preprocesses WGSL shader and injects PureBeing data.
 * 
 * @function preprocessShader
 * @return {string} shader, modified WGSL code with values injected.
 */
export function preprocessShader() {
  // << safety check >> \\
  if (!RawShaderText) {
    throw new Error("Shader WGSL not found!");
  }
  let shader = RawShaderText.wgsl;
  // << inject CSS dimensions >> \\
  shader = shader.replace("{{LOGICAL_WIDTH}}", PureBeing.logicalWidth.toFixed(4));
  shader = shader.replace("{{LOGICAL_HEIGHT}}", PureBeing.logicalHeight.toFixed(4));
  // << inject default striker positions >> \\
  shader = shader.replace("{{DEFAULT_X}}", PureBeing.strikerLaunchCoords.x.toFixed(4));
  shader = shader.replace("{{DEFAULT_Y}}", PureBeing.strikerLaunchCoords.computerY.toFixed(4));
  // << inject launch ranges >> \\
  shader = shader.replace("{{LAUNCH_MIN}}", PureBeing.strikerLaunchBounds.min.toFixed(4));
  shader = shader .replace("{{LAUNCH_MAX}}", PureBeing.strikerLaunchBounds.max.toFixed(4));
  // << inject board unit >> \\
  shader = shader.replace("{{BOARD_UNIT}}", PureBeing.u.toFixed(4));
  // << inject board corners >> \\
  for (let k=0; k<4; k++) {
    const x = `{{C${k}_X}}`;
    const y = `{{C${k}_Y}}`;
    shader = shader.replace(x, PureBeing.boardCorners[k].x.toFixed(4));
    shader = shader.replace(y, PureBeing.boardCorners[k].y.toFixed(4));
  }
  return shader;
}

/// +++++ CARROM AI WEBGPU +++++ \\\

/**
 * Holds WebGPU data.
 * Helps in maintaining clean code via a single source of truth.
 * @type {object}
 */
export const wgpu = {
  adapter: null,
  device: null,
  shader: null,
  module: null,
  pipeline: null,
  data: {},
  buffers: {},
  bindGroup: null,
  encoder: null,
  pass: null
};

/**
 * Sets up WebGPU by requesting an adapter & device.
 * Next, executes preprocessing of WGSL shader & compiles it.
 * Finally, sets up pipeline.
 * 
 * @async
 * @function initialize
 */
export async function initialize() {
  // << setup >> \\
  if (!navigator.gpu) {
    throw new Error("GPU not available!");
  }
  // << get adapter >> \\
  try {
    wgpu.adapter = await navigator.gpu.requestAdapter();
  } catch (error) {
    console.log(`No available adapter: ${error}.`);
  }
  // << get device >> \\
  try {
    wgpu.device = await wgpu.adapter.requestDevice();
    wgpu.device.lost.then((e) => {
      console.warn(e.message);
    });
  } catch (error) {
    console.log(`No available device: ${error}.`);
  }
  // << shader & module >> \\
  wgpu.shader = preprocessShader();
  wgpu.module = wgpu.device.createShaderModule({
    code: wgpu.shader
  });
  // << log errors >> \\
  const info = await wgpu.module.getCompilationInfo();
  info.messages.forEach(m => console.warn(m));
  // << pipeline >> \\
  wgpu.pipeline = wgpu.device.createComputePipeline({
    /**
     * @learning
     * 
     * layout: 'auto' automatically infers @binding(0), @binding(1), etc.
     */
    layout: 'auto',
    compute: {
      module: wgpu.module,
      entryPoint: 'estimate_best_shot'
    }
  });
}

/**
 * Takes entities data, realigns & maps them to Float32Array to match WGSL struct layout.
 * Next, sets bind layout, groups & uniform buffers to pass for computation.
 * 
 * @function generateEntitiesData
 * @return {ArrayBuffer} entitiesData
 */
function generateEntitiesData() {
  // << setup >> \\
  const entities = Engine.getAllEntities();
  const len = entities.length;
  const entitiesData = new Float32Array(20 * 10);
  for (let k=0; k<len; k++) {
    const entity = entities[k];
    const offset = k * 10;
    
    // << position vector >> \\
    entitiesData[offset] = entity.x;
    entitiesData[offset+1] = entity.y;
    
    // << velocity vector >> \\
    entitiesData[offset+2] = entity.vx;
    entitiesData[offset+3] = entity.vy;
    
    // << type id >> \\
    let type = 0.0;
    if (entity.type === "QUEEN") type = 1.0;
    else if (entity.type === "WHITE") type = 2.0;
    else if (entity.type === "BLACK") type = 3.0;
    entitiesData[offset+4] = type;
    
    // << flags >> \\
    entitiesData[offset+5] = entity.isActive ? 1.0 : 0.0;
    entitiesData[offset+6] = entity.isGliding ? 1.0 : 0.0;
    
    // << radii, mass & padding >> \\
    entitiesData[offset+7] = entity.r;
    entitiesData[offset+8] = entity.mass;
    entitiesData[offset+9] = 0.0;
  }
  return entitiesData;
}

/**
 * Generates trajectory permutations list and maps them to Float32Array.
 * 
 * @function generateTrajectoriesData
 * @return {ArrayBuffer}
 */
export function generateTrajectoriesData() {
  const min = PureBeing.strikerLaunchBounds.min;
  const max = PureBeing.strikerLaunchBounds.max;
  const computerY = PureBeing.strikerLaunchCoords.computerY;
  const u = PureBeing.u;
  // console.log(`min: ${min}, max: ${max}, u: ${u}.`);
  let list = [];
  
  // << setup permutations loop >> \\
  /**
   * @format {x, y, p, a}
   */
  for (let x=min; x<=max; x+=0.1*min) {
    for (let p=5; p<=15; p+=5) {
      for (let a=0.2; a<=Math.PI-0.2; a+=0.25) {
        list.push(x, computerY, p, a);
      }
    }
  }
  return new Float32Array(list);
}

/**
 * Establishes buffers & bund groups for GPUComputePipeline.
 * 
 * @export
 * @function establishData
 */
export function establishData() {
  // << data & size >> \\
  wgpu.data.trajectories= generateTrajectoriesData();
  const numTrajectories = wgpu.data.trajectories.length / 4;
  const scoresByteSize = numTrajectories * Float32Array.BYTES_PER_ELEMENT;  
  
  // << static buffers >> \\
  wgpu.buffers.trajectories = wgpu.device.createBuffer({
    size: wgpu.data.trajectories.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  wgpu.device.queue.writeBuffer(wgpu.buffers.trajectories, 0, wgpu.data.trajectories);

  // << GPU will write to these buffers, so we chill 😎😎 >> \\
  wgpu.buffers.scores = wgpu.device.createBuffer({
    size: scoresByteSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  wgpu.buffers.staging = wgpu.device.createBuffer({
    size: scoresByteSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });

  // << dynamic buffer >> \\
  wgpu.buffers.entities = wgpu.device.createBuffer({
    size: 800, // 20 entities × 10 floats per entity × 4 bytes per float
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  // << create bind groups >> \\
  wgpu.bindGroup = wgpu.device.createBindGroup({
    layout: wgpu.pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource : { buffer: wgpu.buffers.entities } },
      { binding: 1, resource : { buffer: wgpu.buffers.trajectories } },
      { binding: 2, resource : { buffer: wgpu.buffers.scores } }
    ]
  });
  // console.log("Buffers & bind group setup done!! 😎😎.");
}

/**
 * Establishes WebGPU compute pipelines.
 * Sends data to GPU for parallel AI simulations.
 * Reads data back from GPU.
 * Gets the best shot possible.
 * Returns data back for game loop in Orchestrator.
 * 
 * @export
 * @async
 * @function estimateBestShotGPU
 * @return {Promise<object>}
 */
export async function estimateBestShotGPU() {
  const start = performance.now();
  
  // << safety check >> \\
  if (!wgpu.device || !wgpu.adapter) {
    throw new Error("WebGPU not initialized or unavailable!");
  }

  // << useful constants >> \\\
  const numTrajectories = wgpu.data.trajectories.length / 4;
  const scoresByteSize = numTrajectories * Float32Array.BYTES_PER_ELEMENT;  
  
  // << setup input data >> \\
  wgpu.data.entities = generateEntitiesData();
  
  // << upload JS arrays to VRAM >> \\
  wgpu.device.queue.writeBuffer(wgpu.buffers.entities, 0, wgpu.data.entities);
  // console.log("Data uploaded to VRAM buffers.");
  
  // << command & pass setup >> \\
  wgpu.encoder = wgpu.device.createCommandEncoder();
  wgpu.pass = wgpu.encoder.beginComputePass();
  // console.log("Encoder & pass ready.");
  
  // << pass down >> \\
  wgpu.pass.setPipeline(wgpu.pipeline);
  wgpu.pass.setBindGroup(0, wgpu.bindGroup);
  // console.log("Pipeline & bind group set to pass.");
  
  // << work groups >> \\
  wgpu.pass.dispatchWorkgroups(Math.ceil(numTrajectories / 32));
  wgpu.pass.end();
  // console.log("Workgroups dispatched.");
  
  // << copy GPU results to JS readable stagingBuffer >> \\
  wgpu.encoder.copyBufferToBuffer(wgpu.buffers.scores, 0, wgpu.buffers.staging, 0, scoresByteSize);
  wgpu.device.queue.submit([ wgpu.encoder.finish() ]);
  // console.log("Scores data copied.", wgpu.buffers.staging);
  // console.log("Scores data copied.", wgpu.buffers.staging);
  
  // << wait until done >> \\
  // await wgpu.device.queue.onSubmittedWorkDone();
  
  // << read results in JS >> \\
  try {
    await wgpu.buffers.staging.mapAsync(GPUMapMode.READ);
    // const mappedArray = wgpu.buffers.staging.getMappedRange(0, scoresByteSize);
    const scores = new Float32Array(wgpu.buffers.staging.getMappedRange().slice()); // cloned typed data;
    // console.log("Read scores data.");
    wgpu.buffers.staging.unmap();
    // console.log("JS processing of minimum score done.");
    
    // << get best score >> \\
    let bestIndex = 0;
    let bestScore = Infinity;
    for (let k=0; k<scores.length; k++) {
      if (scores[k] < bestScore) {
        bestScore = scores[k];
        bestIndex = k;
      }
    }
    
    // << send data for Orchestrator >> \\
    const time = performance.now() - start;
    console.log(`Time for GPU AI simulation: ${time.toFixed(3)}ms.`);
    console.log(`Scores length: ${scores.length}, best score: ${bestScore}, index: ${bestIndex}.`);
    
    return {
      x: wgpu.data.trajectories[bestIndex * 4 + 0],
      y: wgpu.data.trajectories[bestIndex * 4 + 1],
      p: wgpu.data.trajectories[bestIndex * 4 + 2],
      a: wgpu.data.trajectories[bestIndex * 4 + 3]
    };
  } catch (error) {    
    // << destroy anyway >> \\
    console.log("Failed at stagingBuffer MapAsync.", error);
  }
}