// ।। ॐ नमः शिवाय ।। \\

// @date 1st October, 2026
// @acknowledgement Ported by Gemini AI using my Rust code

// @Swift @benchmarking @Gemini
// Takes about 90ms - same as C++
// Go took 100ms
// 🥇 Rust still reigning at 80ms

///// ========================== \\\\\
/// ++ SETUP ++ \\\
///// ========================== \\\\\

import Foundation
import Dispatch

public enum Name: Equatable {
  case striker
  case queen
  case white
  case black
}

public struct Position {
  var x: Float
  var y: Float
  
  public func getLength() -> Float {
    return (x * x + y * y).squareRoot()
  }
  
  public mutating func update(vel: Velocity) {
    self.x += vel.vx
    self.y += vel.vy
  }
  
  public func getDistance(to pos: Position) -> Float {
    let dx = pos.x - self.x
    let dy = pos.y - self.y
    return (dx * dx + dy * dy).squareRoot()
  }
  
  public func getDistSq(to pos: Position) -> Float {
    let dx = pos.x - self.x
    let dy = pos.y - self.y
    return (dx * dx + dy * dy)
  }
}

public struct Velocity {
  var vx: Float
  var vy: Float
  
  public func getSpeed() -> Float {
    return (vx * vx + vy * vy).squareRoot()
  }
  
  public func getSpeedSq() -> Float {
    return (vx * vx + vy * vy)
  }
  
  public mutating func decelerate(friction: Float) {
    self.vx *= 1.0 - friction
    self.vy *= 1.0 - friction
  }
}

let UW: Float = 3.84           // unit viewport width
let UH: Float = 6.94           // unit viewport height
let U: Float = (UW + UH) / 2.0 // base unit

let LOGICAL_WIDTH: Float = 40.0 * UH
let LOGICAL_HEIGHT: Float = 40.0 * UH

let OFFSET: Float = 8.0 * U
let GAP: Float = 4.0 * U

let BOARD_DIMENSIONS: [Position] = [
  Position(x: 0.0, y: 0.0),
  Position(x: LOGICAL_WIDTH, y: 0.0),
  Position(x: 0.0, y: LOGICAL_HEIGHT),
  Position(x: LOGICAL_WIDTH, y: LOGICAL_HEIGHT)
]

let BOARD_CORNERS: [Position] = [
  Position(x: U, y: U),
  Position(x: 39.0 * U, y: U),
  Position(x: U, y: 39.0 * U),
  Position(x: 39.0 * U, y: 39.0 * U)
]

let STRIKER_AREA: [Position] = [
  Position(x: OFFSET, y: OFFSET - GAP),
  Position(x: LOGICAL_WIDTH - OFFSET, y: OFFSET - GAP)
]

let STRIKER_RADIUS: Float = 1.8 * U
let STRIKER_MASS: Float = Float.pi * (STRIKER_RADIUS * STRIKER_RADIUS)
let PIECE_RADIUS: Float = 1.4 * U
let PIECE_MASS: Float = Float.pi * (PIECE_RADIUS * PIECE_RADIUS)

let FRICTION: Float = 0.03
let MOMENTUM_TRANSFER_RATIO: Float = 0.85
let MAX_STEPS: Int = 240
let MAX_ENTITIES: Int = 20

///// ========================== \\\\\
/// ++ STRUCT DECLARATION ++ \\\
///// ========================== \\\\\

public struct Entity {
  var typeName: Name
  var pos: Position
  var vel: Velocity
  var r: Float
  var mass: Float
  var isActive: Bool
  var isGliding: Bool
  
  ///// ++++++++++++++++++++++++ \\\\\
  /// ++ ENGINE IMPLEMENTATIONS ++ \\\
  ///// ++++++++++++++++++++++++ \\\\\
  
  // << handles individual entity kinematics >> \\
  public mutating func applyKinematics() {
    guard isActive else { return }
    if vel.getSpeedSq() <= 0.00001 { // removed sqrt here
      // << quit motion >> \\
      vel.vx = 0.0
      vel.vy = 0.0
      // << turn off flag >> \\
      isGliding = false
    } else {
      // << decelerate >> \\
      vel.decelerate(friction: FRICTION)
      // << update position >> \\
      pos.update(vel: vel)
      // << keep flag active >> \\
      isGliding = true
    }
  }
  
  // << handles individual entity boundary collisions & bouncing >> \\
  public mutating func detectBoundaryCollision() {
    guard isActive else { return }
    let radius = r
    // << left & right walls >> \\
    if pos.x <= radius {
      pos.x = radius
      vel.vx *= -1.0
    } else if pos.x >= LOGICAL_WIDTH - radius {
      pos.x = LOGICAL_WIDTH - radius
      vel.vx *= -1.0
    }
    // << top & bottom walls >> \\
    if pos.y <= radius {
      pos.y = radius
      vel.vy *= -1.0
    } else if pos.y >= LOGICAL_HEIGHT - radius {
      pos.y = LOGICAL_HEIGHT - radius
      vel.vy *= -1.0
    }
  }
  
  // << handles individual entity momentum resolution, paired with another entity >> \\
  public static func resolveMomentum(e1: inout Entity, e2: inout Entity) {
    // << @optimization early exits >> \\
    if !e1.isActive && !e2.isActive { return }
    if !e1.isGliding && !e2.isGliding && e1.typeName != .striker && e2.typeName != .striker { return }
    
    // << setup data >> \\
    let minDist = e1.r + e2.r
    let dx = e2.pos.x - e1.pos.x
    let dy = e2.pos.y - e1.pos.y
    let actualDist = e1.pos.getDistance(to: e2.pos)
    
    // << momentum math >> \\
    if actualDist < minDist && actualDist > 0.0 {
      // << separate overlap >> \\
      let overlap = minDist - actualDist
      // << normalized unit vectors: self -> entity >> \\
      let nx = dx / actualDist
      let ny = dy / actualDist
      
      // << push self backwards, entity forwards >> \\
      e1.pos.x -= nx * (overlap / 2.0)
      e1.pos.y -= ny * (overlap / 2.0)
      e2.pos.x += nx * (overlap / 2.0)
      e2.pos.y += ny * (overlap / 2.0)
      
      // << relative velocity >> \\
      let rx = e1.vel.vx - e2.vel.vx
      let ry = e1.vel.vy - e2.vel.vy
      // << relative velocity along collision normal: dot product >> \\
      let rv = (rx * nx) + (ry * ny)
      
      // << dont resolve if already separating >> \\
      if rv < 0.0 { return }
      
      // << elastic impulse resolution >> \\
      let impulse = (MOMENTUM_TRANSFER_RATIO * 2.0 * rv) / (e1.mass + e2.mass)
      
      // << distribute equal & opposing impulses >> \\
      e1.vel.vx -= impulse * nx * e2.mass
      e1.vel.vy -= impulse * ny * e2.mass
      e2.vel.vx += impulse * nx * e1.mass
      e2.vel.vy += impulse * ny * e1.mass
    }
  }
  
  // << handles individual entity pocketing >> \\
  public mutating func checkPocketed() {
    // << ignore striker & inactive entities >> \\
    if typeName == .striker || !isActive { return }
    for corner in BOARD_CORNERS {
      let dist = pos.getDistSq(to: corner) // removed sqrt here
      let threshold = 5.0 * U * U
      if dist <= threshold {
        isActive = false
        isGliding = false
        vel = Velocity(vx: 0.0, vy: 0.0)
        return
      }
    }
  }

  ///// ++++++++++++++++++++ \\\\\
  /// ++ AI IMPLEMENTATIONS ++ \\\
  ///// ++++++++++++++++++++ \\\\\

  public func getClosestPocket() -> Position {
    var pocket = BOARD_CORNERS[0]
    var minDist = pos.getDistSq(to: pocket) // removed sqrt here
    for i in 1..<4 {
      let target = BOARD_CORNERS[i]
      let dist = pos.getDistSq(to: target) // removed sqrt here
      if dist < minDist {
        pocket = target
        minDist = dist
      }
    }
    return pocket
  }
}

public struct AllEntities {
  var entities: [Entity]
  
  public init(entities: [Entity]) {
    self.entities = entities
  }

  ///// ++++++++++++++++++++++++ \\\\\
  /// ++ ENGINE IMPLEMENTATIONS ++ \\\
  ///// ++++++++++++++++++++++++ \\\\\

  // << applies kinematics to all >> \\
  public mutating func applyUniformKinematics() {
    for i in 0..<entities.count {
      entities[i].applyKinematics()
    }
  }

  // << apply boundary checks to all >> \\
  public mutating func applyUniformBoundaryChecks() {
    for i in 0..<entities.count {
      entities[i].detectBoundaryCollision()
    }
  }

  // << applies uniform momentum resolve to all >> \\
  // << WITH SPATIAL PARTITIONING >> \\
  public mutating func applyUniformMomentumResolve() {
    entities.withUnsafeMutableBufferPointer { buffer in
      guard let base = buffer.baseAddress else { return }
      for i in 0..<(MAX_ENTITIES - 1) {
        for j in (i + 1)..<MAX_ENTITIES {
          /*
           * Notice:
           * max radius sum is of striker = 1.8 * U.
           * each piece has radii 1.4 * U.
           * SUM = 3.2 * U
           * 
           * As a result, we set max-search-area to a circle of radius 3.5 * U from the entity's centre.
           */
          let threshold: Float = 11.0 * U * U
          if base[i].pos.getDistSq(to: base[j].pos) <= threshold { // removed sqrt here
            Entity.resolveMomentum(e1: &base[i], e2: &base[j])
          }
        }
      }
    }
  }

  // << applies uniform pocketing to all pieces >> \\
  public mutating func applyUniformPocketing() {
    for i in 0..<entities.count {
      entities[i].checkPocketed()
    }
  }

  ///// ++++++++++++++++++++ \\\\\
  /// ++ AI IMPLEMENTATIONS ++ \\\
  ///// ++++++++++++++++++++ \\\\\

  // << sets back current array to original array >> \\
  public mutating func setBack(original: AllEntities) {
    self.entities = original.entities
  }

  // << checks if any pieces is still moving >> \\
  public func isAnyPieceMoving() -> Bool {
    return entities.contains(where: { $0.isGliding })
  }

  // << simulates one turn physics >> \\
  public mutating func simulatePhysics(launchPos: Position, p: Float, a: Float) {
    // << update & launch striker >> \\
    entities[0].pos = launchPos
    entities[0].vel = Velocity(vx: p * cosf(a), vy: p * sinf(a))
    entities[0].pos.x += entities[0].vel.vx
    entities[0].pos.y += entities[0].vel.vy

    // << simulation >> \\
    var step = 0
    while step < MAX_STEPS {
      // << physics pipeline >> \\
      applyUniformKinematics()
      applyUniformBoundaryChecks()
      applyUniformMomentumResolve()
      applyUniformPocketing()
      // << @optimization early exit >> \\
      if !isAnyPieceMoving() { break }
      step += 1
    }
  }

  // << simulates one turn scores >> \\
  public func simulateScore() -> Float {
    return entities.reduce(0.0) { sum, entity in
      sum + entity.pos.getDistance(to: entity.getClosestPocket())
    }
  }
  
  // Generates a randomized board layout with all 20 entities active:
  // - Striker: Placed randomly along the bottom baseline
  // - Queen & Pieces: Scattered across the board with non-overlapping bounds
  public static func newRandomizedSample() -> AllEntities {
    var seed = UInt32(Date().timeIntervalSince1970.truncatingRemainder(dividingBy: 1) * 1_000_000_000)
    let nextRand: () -> Float = {
      seed = seed &* 1664525 &+ 1013904223
      return Float(seed) / Float(UInt32.max)
    }

    let defaultEntity = Entity(
      typeName: .black,
      pos: Position(x: 0.0, y: 0.0),
      vel: Velocity(vx: 0.0, vy: 0.0),
      r: PIECE_RADIUS,
      mass: PIECE_MASS,
      isActive: true,
      isGliding: false
    )
    var entitiesList = [Entity](repeating: defaultEntity, count: MAX_ENTITIES)

    // 1. Setup Striker at a random position along the baseline
    let strikerX = STRIKER_AREA[0].x + nextRand() * (STRIKER_AREA[1].x - STRIKER_AREA[0].x)
    entitiesList[0] = Entity(
      typeName: .striker,
      pos: Position(x: strikerX, y: STRIKER_AREA[0].y),
      vel: Velocity(vx: 0.0, vy: 0.0),
      r: STRIKER_RADIUS,
      mass: STRIKER_MASS,
      isActive: true,
      isGliding: false
    )

    // Helper function to ensure new pieces don't overlap with existing ones
    let isOverlapping = { (pos: Position, radius: Float, count: Int, list: [Entity]) -> Bool in
      for idx in 0..<count {
        let minDist = radius + list[idx].r + 0.5 // include a small gap buffer
        if pos.getDistance(to: list[idx].pos) < minDist {
          return true
        }
      }
      return false
    }

    // Safe spawn boundaries for pieces (away from walls and corners)
    let minX = 3.0 * U
    let maxX = LOGICAL_WIDTH - 3.0 * U
    let minY = 6.0 * U
    let maxY = LOGICAL_HEIGHT - 3.0 * U

    // 2. Setup Queen & 18 Pieces (9 Whites, 9 Blacks)
    let pieceTypes: [Name] = [
      .queen,
      .white, .white, .white, .white, .white, .white, .white, .white, .white,
      .black, .black, .black, .black, .black, .black, .black, .black, .black
    ]

    for (i, typeName) in pieceTypes.enumerated() {
      let entityIndex = i + 1 // 0 is reserved for striker
      var spawnPos = Position(x: 0.0, y: 0.0)
      
      // Loop until a non-overlapping spot is found
      while true {
        spawnPos.x = minX + nextRand() * (maxX - minX)
        spawnPos.y = minY + nextRand() * (maxY - minY)

        if !isOverlapping(spawnPos, PIECE_RADIUS, entityIndex, entitiesList) {
          break
        }
      }

      entitiesList[entityIndex] = Entity(
        typeName: typeName,
        pos: spawnPos,
        vel: Velocity(vx: 0.0, vy: 0.0),
        r: PIECE_RADIUS,
        mass: PIECE_MASS,
        isActive: true,
        isGliding: false
      )
    }
    
    return AllEntities(entities: entitiesList)
  }
}

///// ========================== \\\\\
/// ++ MASTER FUNCTION ++ \\\
///// ========================== \\\\\

public func estimateBestShot(currentPos: AllEntities) {
  // << setup >> \\
  let start = DispatchTime.now()
  let minX: Float = STRIKER_AREA[0].x
  let maxX: Float = STRIKER_AREA[1].x

  // << launch positions >> \\
  var launchPositions: [Float] = []
  var x: Float = minX
  while x <= maxX {
    launchPositions.append(x)
    x += 0.1 * minX
  }

  // << divide into 4 chunks >> \\
  let totalCount = launchPositions.count
  let chunkSize = (totalCount / 4) + 1
  var chunks: [[Float]] = []
  for i in stride(from: 0, to: totalCount, by: chunkSize) {
    let end = min(i + chunkSize, totalCount)
    chunks.append(Array(launchPositions[i..<end]))
  }

  struct ThreadResult {
    var score: Float
    var x: Float
    var p: Float
    var a: Float
    var iteration: UInt32
  }

  var threadResults = [ThreadResult](
    repeating: ThreadResult(score: .greatestFiniteMagnitude, x: 0, p: 0, a: 0, iteration: 0),
    count: chunks.count
  )

  // << spawn 4 parallel execution blocks via GCD >> \\
  DispatchQueue.concurrentPerform(iterations: chunks.count) { threadIdx in
    let chunk = chunks[threadIdx]
    var localBoard = currentPos
    var bestScore: Float = .greatestFiniteMagnitude
    var outcomeX: Float = 0.0
    var outcomeP: Float = 0.0
    var outcomeA: Float = 0.0
    var iteration: UInt32 = 0
    
    for launchX in chunk {
      var a: Float = 0.2
      while a <= (Float.pi - 0.2) {
        var p: Float = 5.0
        while p <= 15.0 {
          let pos = Position(x: launchX, y: STRIKER_AREA[0].y)
          localBoard.simulatePhysics(launchPos: pos, p: p, a: a)
          let score = localBoard.simulateScore()
          if score < bestScore {
            bestScore = score
            outcomeX = launchX
            outcomeP = p
            outcomeA = a
          }
          localBoard.setBack(original: currentPos)
          iteration += 1
          p += 5.0
        }
        a += 0.25
      }
    }
    
    threadResults[threadIdx] = ThreadResult(
      score: bestScore,
      x: outcomeX,
      p: outcomeP,
      a: outcomeA,
      iteration: iteration
    )
  }

  // << compare results across the 4 threads' outputs >> \\
  var globalBestScore: Float = .greatestFiniteMagnitude
  var globalBestX: Float = 0.0
  var globalBestP: Float = 0.0
  var globalBestA: Float = 0.0
  var globalIter: UInt32 = 0

  for result in threadResults {
    globalIter += result.iteration
    if result.score < globalBestScore {
      globalBestScore = result.score
      globalBestX = result.x
      globalBestP = result.p
      globalBestA = result.a
    }
  }
  
  // << outcome >> \\  
  let end = DispatchTime.now()
  let nanoTime = end.uptimeNanoseconds - start.uptimeNanoseconds
  let timeMs = Double(nanoTime) / 1_000_000.0
  
  print("Time for one AI simulation across 4 threads: \(String(format: "%.2f", timeMs))ms.")
  print("Number of iteration: \(globalIter).")
  print("Best shot: \(globalBestX), \(globalBestP), \(globalBestA).")
}

print("Generating mid-gameboard state with random active pieces...")
var board = AllEntities.newRandomizedSample()

print("Testing AI shot estimation on randomized layout...")
estimateBestShot(currentPos: board)
