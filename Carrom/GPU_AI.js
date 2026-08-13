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
 * @function generateEntitiesBuffer
 * @return {ArrayBuffer} entitiesBuffer
 */
function generateEntitiesBuffer() {
  // << setup >> \\
  const entities = Engine.getAllEntities();
  const len = entities.length;
  const entitiesBuffer = new Float32Array(20 * 10);
  for (let k=0; k<len; k++) {
    const entity = entities[k];
    const offset = k * 10;
    // << position vector >> \\
    entitiesBuffer[offset] = entity.x;
    entitiesBuffer[offset+1] = entity.y;
    // << velocity vector >> \\
    entitiesBuffer[offset+2] = entity.vx;
    entitiesBuffer[offset+3] = entity.vy;
    // << type id >> \\
    let type = 0.0;
    if (entity.type === "QUEEN") type = 1.0;
    else if (entity.type === "WHITE") type = 2.0;
    else if (entity.type === "BLACK") type = 3.0;
    entitiesBuffer[offset+4] = type;
    // << flags >> \\
    entitiesBuffer[offset+5] = entity.isActive ? 1.0 : 0.0;
    entitiesBuffer[offset+6] = entity.isGliding ? 1.0 : 0.0;
    // << radii, mass & padding >> \\
    entitiesBuffer[offset+7] = entity.r;
    entitiesBuffer[offset+8] = entity.mass;
    entitiesBuffer[offset+9] = 0.0;
  }
  return entitiesBuffer;
}

/**
 * Generates trajectory permutations list and maps them to Float32Array.
 * 
 * @function generateTrajectoriesBuffer
 * @return {ArrayBuffer}
 */
export function generateTrajectoriesBuffer() {
  const min = PureBeing.strikerLaunchBounds.min;
  const max = PureBeing.strikerLaunchBounds.max;
  const computerY = PureBeing.strikerLaunchCoords.computerY;
  const u = PureBeing.u;
  console.log(`min: ${min}, max: ${max}, u: ${u}.`);
  let list = [];
  // << setup permutations loop >> \\
  /**
   * @format {x, y, p, a}
   */
  for (let x=min; x<=max; x+=0.1*u) {
    for (let p=5; p<=15; p+=5) {
      for (let a=0.2; a<=Math.PI-0.2; a+=0.25) {
        list.push(x, computerY, p, a);
      }
    }
  }
  return new Float32Array(list);
}

/**
 * Establishes WebGPU compute pipelines.
 * Sends off data ot GPU for parallel AI simulations.
 * Reads data back from GPU.
 * Gets the best shot possible.
 * Returns data back for game loop in Orchestrator.
 * 
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
  // << setup input data >> \\
  const entitiesData = generateEntitiesBuffer();
  const trajectoriesData = generateTrajectoriesBuffer();
  const copySize = trajectoriesData.length;
  const numTrajectories = copySize / 4;
  console.log("Buffer data established.");
  // << create VRAM storage >> \\
  const entitiesBuffer = wgpu.device.createBuffer({
    size: entitiesData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const trajectoriesBuffer = wgpu.device.createBuffer({
    size: trajectoriesData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const scoresBuffer = wgpu.device.createBuffer({
    size: copySize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });
  const stagingBuffer = wgpu.device.createBuffer({
    size: copySize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });
  console.log("VRAM storage buffers ready.");
  // << upload JS arrays directly to VRAM >> \\
  wgpu.device.queue.writeBuffer(entitiesBuffer, 0, entitiesData);
  wgpu.device.queue.writeBuffer(trajectoriesBuffer, 0, trajectoriesData);
  console.log("Buffer data uploaded to VRAM.");
  // << create bind groups >> \\
  wgpu.bindGroup = wgpu.device.createBindGroup({
    layout: wgpu.pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource : { buffer: entitiesBuffer } },
      { binding: 1, resource : { buffer: trajectoriesBuffer } },
      { binding: 2, resource : { buffer: scoresBuffer } }
    ]
  });
  console.log("Binds groups enabled.");
  // << command & pass setup >> \\
  wgpu.device.pushErrorScope('validation');
  wgpu.encoder = wgpu.device.createCommandEncoder();
  wgpu.pass = wgpu.encoder.beginComputePass();
  console.log("Encoder & pass ready.");
  // << pass down >> \\
  wgpu.pass.setPipeline(wgpu.pipeline);
  wgpu.pass.setBindGroup(0, wgpu.bindGroup);
  console.log("Pipeline & bind group set to pass.");
  // << work groups >> \\
  const workgroupCount = Math.ceil(numTrajectories / 64);
  wgpu.pass.dispatchWorkgroups(workgroupCount);
  wgpu.pass.end();
  console.log("Workgroups dispatched.");
  // << copy GPU results to JS readable stagingBuffer >> \\
  wgpu.encoder.copyBufferToBuffer(scoresBuffer, 0, stagingBuffer, 0, copySize);
  wgpu.device.queue.submit([wgpu.encoder.finish()]);
  console.log("Scores data copied.", stagingBuffer);
  wgpu.device.popErrorScope().then((error) => {
    if (error) {
      console.error("WEBGPU CRASH REASON:", error.message);
    }
  });
  // << wait until done >> \\
  await wgpu.device.queue.onSubmittedWorkDone();
  // << read results in JS >> \\
  try {
    wgpu.device.pushErrorScope('validation');
    await stagingBuffer.mapAsync(GPUMapMode.READ, 0, copySize);
    const mappedArray = stagingBuffer.getMappedRange(0, copySize);
    const scores = new Float32Array(mappedArray.slice(0)); // cloned typed data;
    console.log("Read scores data.");
    stagingBuffer.unmap();
    console.log("JS processing of minimum score done.");
    // << get best score >> \\
    let bestIndex = 0;
    let bestScore = Infinity;
    for (let k=0; k<scores.length; k++) {
      if (scores[k] < bestScore) {
        bestScore = scores[k];
        bestIndex = k;
      }
    }
    // << cleanup VRAM >> \\
    entitiesBuffer.destroy();
    trajectoriesBuffer.destroy();
    scoresBuffer.destroy();
    stagingBuffer.destroy();
    console.log("VRAM freed.");
    wgpu.device.popErrorScope().then((error) => {
      if (error) {
        console.error("WEBGPU CRASH REASON:", error.message);
      }
    });
    // << send data for Orchestrator >> \\
    const time = performance.now() - start;
    console.log(`Time for GPU AI simulation: ${time.toFixed(3)}ms.`);
    console.log(`Scores length: ${scores.length}, best score: ${bestScore}, index: ${bestIndex}.`);
    return {
      x: trajectoriesData[bestIndex * 4 + 0],
      y: trajectoriesData[bestIndex * 4 + 1],
      p: trajectoriesData[bestIndex * 4 + 2],
      a: trajectoriesData[bestIndex * 4 + 3]
    };
  } catch (error) {
    // << destroy anyway >> \\
    entitiesBuffer.destroy();
    trajectoriesBuffer.destroy();
    scoresBuffer.destroy();
    stagingBuffer.destroy();
    console.log("Failed at stagingBuffer MapAsync.", error);
  }
}