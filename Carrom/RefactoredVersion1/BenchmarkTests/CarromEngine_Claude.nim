# ।। ॐ नमः शिवाय ।।
# @acknowledgment Ported by Claude AI using my Rust code

# Nim port of CarromEngine3.rs

import std/[times, monotimes, math]

#===========================#
#  ++ SETUP ++              #
#===========================#

type
  Name = enum
    STRIKER, QUEEN, WHITE, BLACK

  Position = object
    x, y: float32

  Velocity = object
    vx, vy: float32

# << Position >> #
proc getLength(self: Position): float32 {.inline.} =
  sqrt(self.x * self.x + self.y * self.y)

proc update(self: var Position, vel: Velocity) {.inline.} =
  self.x += vel.vx
  self.y += vel.vy

proc getDistance(self, pos: Position): float32 {.inline.} =
  let dx = pos.x - self.x
  let dy = pos.y - self.y
  sqrt(dx * dx + dy * dy)

proc getDistSq(self, pos: Position): float32 {.inline.} =
  let dx = pos.x - self.x
  let dy = pos.y - self.y
  dx * dx + dy * dy

# << Velocity >> #
proc getSpeed(self: Velocity): float32 {.inline.} =
  sqrt(self.vx * self.vx + self.vy * self.vy)

proc getSpeedSq(self: Velocity): float32 {.inline.} =
  self.vx * self.vx + self.vy * self.vy

proc decelerate(self: var Velocity, friction: float32) {.inline.} =
  self.vx *= 1.0'f32 - friction
  self.vy *= 1.0'f32 - friction

const
  UW = 3.84'f32            # unit viewport width
  UH = 6.94'f32            # unit viewport height
  U  = (UW + UH) / 2.0'f32 # base unit

  LOGICAL_WIDTH  = 40.0'f32 * UH
  LOGICAL_HEIGHT = 40.0'f32 * UH

  OFFSET = 8.0'f32 * U
  GAP    = 4.0'f32 * U

  BOARD_DIMENSIONS = [
    Position(x: 0.0'f32,         y: 0.0'f32),
    Position(x: LOGICAL_WIDTH,   y: 0.0'f32),
    Position(x: 0.0'f32,         y: LOGICAL_HEIGHT),
    Position(x: LOGICAL_WIDTH,   y: LOGICAL_HEIGHT),
  ]

  BOARD_CORNERS = [
    Position(x: U,             y: U),
    Position(x: 39.0'f32 * U,  y: U),
    Position(x: U,             y: 39.0'f32 * U),
    Position(x: 39.0'f32 * U,  y: 39.0'f32 * U),
  ]

  STRIKER_AREA = [
    Position(x: OFFSET,                 y: OFFSET - GAP),
    Position(x: LOGICAL_WIDTH - OFFSET, y: OFFSET - GAP),
  ]

  PI32 = float32(PI)
  STRIKER_RADIUS = 1.8'f32 * U
  STRIKER_MASS   = PI32 * (STRIKER_RADIUS * STRIKER_RADIUS)
  PIECE_RADIUS   = 1.4'f32 * U
  PIECE_MASS     = PI32 * (PIECE_RADIUS * PIECE_RADIUS)

  FRICTION = 0.03'f32
  MOMENTUM_TRANSFER_RATIO = 0.85'f32
  MAX_STEPS = 240
  MAX_ENTITIES = 20

  F32_MAX = 3.402823466e+38'f32

#===========================#
#  ++ STRUCT DECLARATION ++ #
#===========================#

type
  Entity = object
    typeName: Name
    pos: Position
    vel: Velocity
    r: float32
    mass: float32
    isActive: bool
    isGliding: bool

  AllEntities = array[MAX_ENTITIES, Entity]

#---------------------------#
#  ++ ENGINE (Entity) ++    #
#---------------------------#

# << handles individual entity kinematics >> #
proc applyKinematics(self: var Entity) {.inline.} =
  if not self.isActive: return
  if self.vel.getSpeedSq() <= 0.00001'f32: # no sqrt here
    # << quit motion >> #
    self.vel.vx = 0.0'f32
    self.vel.vy = 0.0'f32
    # << turn off flag >> #
    self.isGliding = false
  else:
    # << decelerate >> #
    self.vel.decelerate(FRICTION)
    # << update position >> #
    self.pos.update(self.vel)
    # << keep flag active >> #
    self.isGliding = true

# << handles individual entity boundary collisions & bouncing >> #
proc detectBoundaryCollision(self: var Entity) {.inline.} =
  if not self.isActive: return
  let r = self.r
  # << left & right walls >> #
  if self.pos.x <= r:
    self.pos.x = r
    self.vel.vx *= -1.0'f32
  elif self.pos.x >= LOGICAL_WIDTH - r:
    self.pos.x = LOGICAL_WIDTH - r
    self.vel.vx *= -1.0'f32
  # << top & bottom walls >> #
  if self.pos.y <= r:
    self.pos.y = r
    self.vel.vy *= -1.0'f32
  elif self.pos.y >= LOGICAL_HEIGHT - r:
    self.pos.y = LOGICAL_HEIGHT - r
    self.vel.vy *= -1.0'f32

# << handles momentum resolution between two entities >> #
proc resolveMomentum(self: var Entity, entity: var Entity) {.inline.} =
  # << early exits >> #
  if not self.isActive and not entity.isActive: return
  if not self.isGliding and not entity.isGliding and
     self.typeName != STRIKER and entity.typeName != STRIKER: return
  # << setup data >> #
  let minDist = self.r + entity.r
  let dx = entity.pos.x - self.pos.x
  let dy = entity.pos.y - self.pos.y
  let actualDist = self.pos.getDistance(entity.pos)
  # << momentum math >> #
  if actualDist < minDist and actualDist > 0.0'f32:
    # << separate overlap >> #
    let overlap = minDist - actualDist
    # << normalized unit vectors: self -> entity >> #
    let nx = dx / actualDist
    let ny = dy / actualDist
    # << push self backwards, entity forwards >> #
    self.pos.x -= nx * (overlap / 2.0'f32)
    self.pos.y -= ny * (overlap / 2.0'f32)
    entity.pos.x += nx * (overlap / 2.0'f32)
    entity.pos.y += ny * (overlap / 2.0'f32)

    # << relative velocity >> #
    let rx = self.vel.vx - entity.vel.vx
    let ry = self.vel.vy - entity.vel.vy
    # << relative velocity along collision normal: dot product >> #
    let rv = (rx * nx) + (ry * ny)
    # << don't resolve if already separating >> #
    if rv < 0.0'f32: return

    # << elastic impulse resolution >> #
    let impulse = (MOMENTUM_TRANSFER_RATIO * 2.0'f32 * rv) / (self.mass + entity.mass)
    # << distribute equal & opposing impulses >> #
    self.vel.vx -= impulse * nx * entity.mass
    self.vel.vy -= impulse * ny * entity.mass
    entity.vel.vx += impulse * nx * self.mass
    entity.vel.vy += impulse * ny * self.mass

# << handles individual entity pocketing >> #
proc checkPocketed(self: var Entity) {.inline.} =
  # << ignore striker & inactive entities >> #
  if self.typeName == STRIKER or not self.isActive: return
  const threshold = 5.0'f32 * U * U
  for i in 0 ..< 4:
    let dist = self.pos.getDistSq(BOARD_CORNERS[i]) # no sqrt here
    if dist <= threshold:
      self.isActive = false
      self.isGliding = false
      self.vel = Velocity(vx: 0.0'f32, vy: 0.0'f32)
      return

#---------------------------#
#  ++ AI (Entity) ++        #
#---------------------------#

proc getClosestPocket(self: Entity): Position {.inline.} =
  result = BOARD_CORNERS[0]
  var minDist = self.pos.getDistSq(result) # no sqrt here
  for i in 1 ..< 4:
    let target = BOARD_CORNERS[i]
    let dist = self.pos.getDistSq(target)
    if dist < minDist:
      result = target
      minDist = dist

#---------------------------#
#  ++ ENGINE (All) ++       #
#---------------------------#

# << applies kinematics to all >> #
# NOTE: never spawn threads inside a hot physics loop.
proc applyUniformKinematics(self: var AllEntities) =
  for i in 0 ..< MAX_ENTITIES:
    self[i].applyKinematics()

# << applies boundary checks to all >> #
proc applyUniformBoundaryChecks(self: var AllEntities) =
  for i in 0 ..< MAX_ENTITIES:
    self[i].detectBoundaryCollision()

# << applies uniform momentum resolve to all >> #
# << WITH SPATIAL FILTERING >> #
proc applyUniformMomentumResolve(self: var AllEntities) {.inline.} =
  # max radius sum is striker + piece = 1.8 * U + 1.4 * U = 3.2 * U
  # so the max search area is a circle of radius 3.5 * U (squared: 12.25 * U^2);
  # the original uses 11.0 * U^2 as its squared threshold, kept as-is here.
  const threshold = 11.0'f32 * U * U
  for i in 0 ..< MAX_ENTITIES - 1:
    for j in i + 1 ..< MAX_ENTITIES:
      if self[i].pos.getDistSq(self[j].pos) <= threshold: # no sqrt here
        resolveMomentum(self[i], self[j])

# << applies uniform pocketing to all pieces >> #
proc applyUniformPocketing(self: var AllEntities) =
  for i in 0 ..< MAX_ENTITIES:
    self[i].checkPocketed()

#---------------------------#
#  ++ AI (All) ++           #
#---------------------------#

# << sets back current array to original array >> #
proc setBack(self: var AllEntities, original: AllEntities) {.inline.} =
  for i in 0 ..< MAX_ENTITIES:
    self[i] = original[i]

# << checks if any piece is still moving >> #
proc isAnyPieceMoving(self: AllEntities): bool {.inline.} =
  for i in 0 ..< MAX_ENTITIES:
    if self[i].isGliding: return true
  false

# << simulates one turn of physics >> #
proc simulatePhysics(self: var AllEntities, launchPos: Position, p, a: float32) =
  # << update & launch striker >> #
  self[0].pos = launchPos
  self[0].vel = Velocity(vx: p * cos(a), vy: p * sin(a))
  self[0].pos.x += self[0].vel.vx
  self[0].pos.y += self[0].vel.vy

  # << simulation >> #
  var step = 0
  while step < MAX_STEPS:
    # << physics pipeline >> #
    self.applyUniformKinematics()
    self.applyUniformBoundaryChecks()
    self.applyUniformMomentumResolve()
    self.applyUniformPocketing()
    # << early exit >> #
    if not self.isAnyPieceMoving(): break
    inc step

# << scores the current board: lower is better >> #
proc simulateScore(self: AllEntities): float32 =
  for i in 0 ..< MAX_ENTITIES:
    result += self[i].pos.getDistance(self[i].getClosestPocket())

# Generates a randomized board layout with all 20 entities active:
# - Striker: placed randomly along the bottom baseline
# - Queen & pieces: scattered across the board with non-overlapping bounds
proc newRandomizedSample(): AllEntities =
  # Simple LCG PRNG, no external dependencies
  var seed = uint32(getTime().nanosecond)
  proc nextRand(): float32 =
    seed = seed * 1664525'u32 + 1013904223'u32 # unsigned math wraps in Nim
    float32(seed) / float32(high(uint32))

  var entities: AllEntities
  for i in 0 ..< MAX_ENTITIES:
    entities[i] = Entity(
      typeName: BLACK,
      pos: Position(x: 0.0'f32, y: 0.0'f32),
      vel: Velocity(vx: 0.0'f32, vy: 0.0'f32),
      r: PIECE_RADIUS,
      mass: PIECE_MASS,
      isActive: true,
      isGliding: false,
    )

  # 1. Striker at a random position along the baseline
  let strikerX = STRIKER_AREA[0].x +
                 nextRand() * (STRIKER_AREA[1].x - STRIKER_AREA[0].x)
  entities[0] = Entity(
    typeName: STRIKER,
    pos: Position(x: strikerX, y: STRIKER_AREA[0].y),
    vel: Velocity(vx: 0.0'f32, vy: 0.0'f32),
    r: STRIKER_RADIUS,
    mass: STRIKER_MASS,
    isActive: true,
    isGliding: false,
  )

  # Helper: ensures new pieces don't overlap with existing ones
  proc isOverlapping(pos: Position, radius: float32, count: int,
                     list: AllEntities): bool =
    for idx in 0 ..< count:
      let minDist = radius + list[idx].r + 0.5'f32 # small gap buffer
      if pos.getDistance(list[idx].pos) < minDist:
        return true
    false

  # Safe spawn boundaries for pieces (away from walls and corners)
  let minX = 3.0'f32 * U
  let maxX = LOGICAL_WIDTH - 3.0'f32 * U
  let minY = 6.0'f32 * U
  let maxY = LOGICAL_HEIGHT - 3.0'f32 * U

  # 2. Queen & 18 pieces (9 whites, 9 blacks)
  const pieceTypes = [
    QUEEN,
    WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE,
    BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK,
  ]

  for i, typeName in pieceTypes:
    let entityIndex = i + 1 # 0 is reserved for striker
    var spawnPos = Position(x: 0.0'f32, y: 0.0'f32)

    # Loop until a non-overlapping spot is found
    while true:
      spawnPos.x = minX + nextRand() * (maxX - minX)
      spawnPos.y = minY + nextRand() * (maxY - minY)
      if not isOverlapping(spawnPos, PIECE_RADIUS, entityIndex, entities):
        break

    entities[entityIndex] = Entity(
      typeName: typeName,
      pos: spawnPos,
      vel: Velocity(vx: 0.0'f32, vy: 0.0'f32),
      r: PIECE_RADIUS,
      mass: PIECE_MASS,
      isActive: true,
      isGliding: false,
    )
  entities

#===========================#
#  ++ MASTER FUNCTION ++    #
#===========================#

type
  ShotResult = object
    score: float32
    x, p, a: float32
    iterations: uint32

  # Everything a worker thread needs, passed as a single argument.
  # The original board and launch positions are only ever read.
  WorkerArgs = object
    original: ptr AllEntities
    xs: ptr UncheckedArray[float32]
    lo, hi: int            # this thread's chunk: xs[lo ..< hi]
    output: ptr ShotResult # each thread writes only to its own slot

proc worker(args: WorkerArgs) {.thread.} =
  # << each thread gets its own copy of the board >> #
  var localBoard = args.original[]
  var best = ShotResult(score: F32_MAX)

  for idx in args.lo ..< args.hi:
    let launchX = args.xs[idx]
    var a = 0.2'f32
    while a <= (PI32 - 0.2'f32):
      var p = 5.0'f32
      while p <= 15.0'f32:
        let pos = Position(x: launchX, y: STRIKER_AREA[0].y)
        localBoard.simulatePhysics(pos, p, a)
        let score = localBoard.simulateScore()
        if score < best.score:
          best.score = score
          best.x = launchX
          best.p = p
          best.a = a
        localBoard.setBack(args.original[])
        inc best.iterations
        p += 5.0'f32
      a += 0.25'f32

  # << hand the result back through this thread's output slot >> #
  args.output[] = best

proc estimateBestShot(currentPos: var AllEntities) =
  # << setup >> #
  let start = getMonoTime()
  let minX = STRIKER_AREA[0].x
  let maxX = STRIKER_AREA[1].x

  # << launch positions >> #
  var launchPositions: seq[float32]
  var x = minX
  while x <= maxX:
    launchPositions.add x
    x += 0.1'f32 * minX

  # << divide into (up to) 4 chunks >> #
  let chunkSize = launchPositions.len div 4 + 1
  let numChunks = (launchPositions.len + chunkSize - 1) div chunkSize

  # << spawn one thread per chunk >> #
  var threads = newSeq[Thread[WorkerArgs]](numChunks)
  var results = newSeq[ShotResult](numChunks)
  let xsPtr = cast[ptr UncheckedArray[float32]](addr launchPositions[0])

  for c in 0 ..< numChunks:
    let lo = c * chunkSize
    let hi = min(lo + chunkSize, launchPositions.len)
    createThread(threads[c], worker, WorkerArgs(
      original: addr currentPos,
      xs: xsPtr,
      lo: lo,
      hi: hi,
      output: addr results[c],
    ))
  joinThreads(threads)

  # << compare results across the threads' outputs >> #
  var globalBest = ShotResult(score: F32_MAX)
  var globalIter = 0'u32
  for r in results:
    globalIter += r.iterations
    if r.score < globalBest.score:
      globalBest = r

  # << outcome >> #
  let time = (getMonoTime() - start).inMilliseconds
  echo "Time for one AI simulation across ", numChunks, " threads: ", time, "ms."
  echo "Number of iteration: ", globalIter, "."
  echo "Best shot: ", globalBest.x, ", ", globalBest.p, ", ", globalBest.a, "."

when isMainModule:
  echo "Generating mid-gameboard state with random active pieces..."
  var board = newRandomizedSample()

  echo "Testing AI shot estimation on randomized layout..."
  estimateBestShot(board)
