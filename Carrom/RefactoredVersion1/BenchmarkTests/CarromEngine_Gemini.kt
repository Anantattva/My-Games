// ।। ॐ नमः शिवाय ।। \\
// @date 17th October, 2026
// @acknowledgement Ported by Gemini using my Rust code

import kotlin.math.*
import java.util.Random
import java.util.concurrent.Executors
import java.util.concurrent.Callable

enum class Name {
    STRIKER,
    QUEEN,
    WHITE,
    BLACK
}

data class Position(var x: Float, var y: Float) {
    fun getLength(): Float = sqrt(x * x + y * y)
    
    fun update(vel: Velocity) {
        x += vel.vx
        y += vel.vy
    }
    
    fun getDistance(pos: Position): Float {
        val dx = pos.x - x
        val dy = pos.y - y
        return sqrt(dx * dx + dy * dy)
    }
    
    fun getDistSq(pos: Position): Float {
        val dx = pos.x - x
        val dy = pos.y - y
        return (dx * dx) + (dy * dy)
    }
}

data class Velocity(var vx: Float, var vy: Float) {
    fun getSpeed(): Float = sqrt(vx * vx + vy * vy)
    
    fun getSpeedSq(): Float = (vx * vx) + (vy * vy)
    
    fun decelerate(friction: Float) {
        vx *= 1.0f - friction
        vy *= 1.0f - friction
    }
}

const val UW: Float = 3.84f
const val UH: Float = 6.94f
const val U: Float = (UW + UH) / 2.0f

const val LOGICAL_WIDTH: Float = 40.0f * UH
const val LOGICAL_HEIGHT: Float = 40.0f * UH

const val OFFSET: Float = 8.0f * U
const val GAP: Float = 4.0f * U

val BOARD_DIMENSIONS = arrayOf(
    Position(0.0f, 0.0f),
    Position(LOGICAL_WIDTH, 0.0f),
    Position(0.0f, LOGICAL_HEIGHT),
    Position(LOGICAL_WIDTH, LOGICAL_HEIGHT)
)

val BOARD_CORNERS = arrayOf(
    Position(U, U),
    Position(39.0f * U, U),
    Position(U, 39.0f * U),
    Position(39.0f * U, 39.0f * U)
)

val STRIKER_AREA = arrayOf(
    Position(OFFSET, OFFSET - GAP),
    Position(LOGICAL_WIDTH - OFFSET, OFFSET - GAP)
)

const val PI: Float = Math.PI.toFloat()
const val STRIKER_RADIUS: Float = 1.8f * U
const val STRIKER_MASS: Float = PI * (STRIKER_RADIUS * STRIKER_RADIUS)
const val PIECE_RADIUS: Float = 1.4f * U
const val PIECE_MASS: Float = PI * (PIECE_RADIUS * PIECE_RADIUS)

const val FRICTION: Float = 0.03f
const val MOMENTUM_TRANSFER_RATIO: Float = 0.85f
const val MAX_STEPS: Int = 240
const val MAX_ENTITIES: Int = 20

data class Entity(
    var typeName: Name,
    var pos: Position,
    var vel: Velocity,
    var r: Float,
    var mass: Float,
    var isActive: Boolean,
    var isGliding: Boolean
) {
    fun applyKinematics() {
        if (!isActive) return
        if (vel.getSpeedSq() <= 0.00001f) {
            vel.vx = 0.0f
            vel.vy = 0.0f
            isGliding = false
        } else {
            vel.decelerate(FRICTION)
            pos.update(vel)
            isGliding = true
        }
    }

    fun detectBoundaryCollision() {
        if (!isActive) return
        if (pos.x <= r) {
            pos.x = r
            vel.vx *= -1.0f
        } else if (pos.x >= LOGICAL_WIDTH - r) {
            pos.x = LOGICAL_WIDTH - r
            vel.vx *= -1.0f
        }

        if (pos.y <= r) {
            pos.y = r
            vel.vy *= -1.0f
        } else if (pos.y >= LOGICAL_HEIGHT - r) {
            pos.y = LOGICAL_HEIGHT - r
            vel.vy *= -1.0f
        }
    }

    fun resolveMomentum(entity: Entity) {
        if (!isActive && !entity.isActive) return
        if (!isGliding && !entity.isGliding && typeName != Name.STRIKER && entity.typeName != Name.STRIKER) return

        val minDist = r + entity.r
        val dx = entity.pos.x - pos.x
        val dy = entity.pos.y - pos.y
        val actualDist = pos.getDistance(entity.pos)

        if (actualDist < minDist && actualDist > 0.0f) {
            val overlap = minDist - actualDist
            val nx = dx / actualDist
            val ny = dy / actualDist

            pos.x -= nx * (overlap / 2.0f)
            pos.y -= ny * (overlap / 2.0f)
            entity.pos.x += nx * (overlap / 2.0f)
            entity.pos.y += ny * (overlap / 2.0f)

            val rx = vel.vx - entity.vel.vx
            val ry = vel.vy - entity.vel.vy
            val rv = (rx * nx) + (ry * ny)

            if (rv < 0.0f) return

            val impulse = (MOMENTUM_TRANSFER_RATIO * 2.0f * rv) / (mass + entity.mass)
            vel.vx -= impulse * nx * entity.mass
            vel.vy -= impulse * ny * entity.mass
            entity.vel.vx += impulse * nx * mass
            entity.vel.vy += impulse * ny * mass
        }
    }

    fun checkPocketed() {
        if (typeName == Name.STRIKER || !isActive) return
        for (i in 0 until 4) {
            val corner = BOARD_CORNERS[i]
            val dist = pos.getDistSq(corner)
            val threshold = 5.0f * U * U
            if (dist <= threshold) {
                isActive = false
                isGliding = false
                vel = Velocity(0.0f, 0.0f)
                return
            }
        }
    }

    fun getClosestPocket(): Position {
        var pocket = BOARD_CORNERS[0]
        var minDist = pos.getDistSq(pocket)
        for (i in 1 until 4) {
            val target = BOARD_CORNERS[i]
            val dist = pos.getDistSq(target)
            if (dist < minDist) {
                pocket = target
                minDist = dist
            }
        }
        return pocket
    }
}

class AllEntities(val entities: Array<Entity>) : Cloneable {
    public override fun clone(): AllEntities {
        val clonedEntities = Array(MAX_ENTITIES) { i ->
            val e = entities[i]
            Entity(e.typeName, e.pos.copy(), e.vel.copy(), e.r, e.mass, e.isActive, e.isGliding)
        }
        return AllEntities(clonedEntities)
    }

    fun applyUniformKinematics() {
        for (entity in entities) {
            entity.applyKinematics()
        }
    }

    fun applyUniformBoundaryChecks() {
        for (entity in entities) {
            entity.detectBoundaryCollision()
        }
    }

    fun applyUniformMomentumResolve() {
        for (i in 0 until (MAX_ENTITIES - 1)) {
            val entity = entities[i]
            for (j in (i + 1) until MAX_ENTITIES) {
                val target = entities[j]
                val threshold = 11.0f * U * U
                if (entity.pos.getDistSq(target.pos) <= threshold) {
                    entity.resolveMomentum(target)
                }
            }
        }
    }

    fun applyUniformPocketing() {
        for (entity in entities) {
            entity.checkPocketed()
        }
    }

    fun setBack(original: AllEntities) {
        for (i in 0 until MAX_ENTITIES) {
            val orig = original.entities[i]
            entities[i] = Entity(orig.typeName, orig.pos.copy(), orig.vel.copy(), orig.r, orig.mass, orig.isActive, orig.isGliding)
        }
    }

    fun isAnyPieceMoving(): Boolean {
        return entities.any { it.isGliding }
    }

    fun simulatePhysics(launchPos: Position, p: Float, a: Float) {
        val striker = entities[0]
        striker.pos = launchPos.copy()
        striker.vel = Velocity(p * cos(a), p * sin(a))
        striker.pos.x += striker.vel.vx
        striker.pos.y += striker.vel.vy

        var step = 0
        while (step < MAX_STEPS) {
            applyUniformKinematics()
            applyUniformBoundaryChecks()
            applyUniformMomentumResolve()
            applyUniformPocketing()
            if (!isAnyPieceMoving()) break
            step++
        }
    }

    fun simulateScore(): Float {
        return entities.sumOf { entity ->
            entity.pos.getDistance(entity.getClosestPocket()).toDouble()
        }.toFloat()
    }

    companion object {
        fun newRandomizedSample(): AllEntities {
            val random = Random()
            val entities = Array(MAX_ENTITIES) {
                Entity(
                    Name.BLACK,
                    Position(0.0f, 0.0f),
                    Velocity(0.0f, 0.0f),
                    PIECE_RADIUS,
                    PIECE_MASS,
                    true,
                    false
                )
            }

            val strikerX = STRIKER_AREA[0].x + random.nextFloat() * (STRIKER_AREA[1].x - STRIKER_AREA[0].x)
            entities[0] = Entity(
                Name.STRIKER,
                Position(strikerX, STRIKER_AREA[0].y),
                Velocity(0.0f, 0.0f),
                STRIKER_RADIUS,
                STRIKER_MASS,
                true,
                false
            )

            val isOverlapping = { pos: Position, radius: Float, count: Int, list: Array<Entity> ->
                var overlapping = false
                for (idx in 0 until count) {
                    val minDist = radius + list[idx].r + 0.5f
                    if (pos.getDistance(list[idx].pos) < minDist) {
                        overlapping = true
                        break
                    }
                }
                overlapping
            }

            val minX = 3.0f * U
            val maxX = LOGICAL_WIDTH - 3.0f * U
            val minY = 6.0f * U
            val maxY = LOGICAL_HEIGHT - 3.0f * U

            val pieceTypes = arrayOf(
                Name.QUEEN,
                Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE,
                Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK
            )

            for ((i, typeName) in pieceTypes.withIndex()) {
                val entityIndex = i + 1
                var spawnPos = Position(0.0f, 0.0f)

                while (true) {
                    spawnPos.x = minX + random.nextFloat() * (maxX - minX)
                    spawnPos.y = minY + random.nextFloat() * (maxY - minY)

                    if (!isOverlapping(spawnPos, PIECE_RADIUS, entityIndex, entities)) {
                        break
                    }
                }

                entities[entityIndex] = Entity(
                    typeName,
                    spawnPos,
                    Velocity(0.0f, 0.0f),
                    PIECE_RADIUS,
                    PIECE_MASS,
                    true,
                    false
                )
            }

            return AllEntities(entities)
        }
    }
}

fun estimateBestShot(currentPos: AllEntities): Float {
    val start = System.currentTimeMillis()
    val minX = STRIKER_AREA[0].x
    val maxX = STRIKER_AREA[1].x

    val launchPositions = mutableListOf<Float>()
    var x = minX
    while (x <= maxX) {
        launchPositions.add(x)
        x += 0.1f * minX
    }

    val chunkSize = (launchPositions.size / 4) + 1
    val chunks = launchPositions.chunked(chunkSize)

    val executor = Executors.newFixedThreadPool(4)
    val futures = chunks.map { chunk ->
        executor.submit(Callable {
            val localBoard = currentPos.clone()
            var bestScore = Float.MAX_VALUE
            var outcomeX = 0.0f
            var outcomeP = 0.0f
            var outcomeA = 0.0f
            var iteration = 0

            for (launchX in chunk) {
                var a = 0.2f
                while (a <= (PI - 0.2f)) {
                    var p = 5.0f
                    while (p <= 15.0f) {
                        val pos = Position(launchX, STRIKER_AREA[0].y)
                        localBoard.simulatePhysics(pos, p, a)
                        val score = localBoard.simulateScore()
                        if (score < bestScore) {
                            bestScore = score
                            outcomeX = launchX
                            outcomeP = p
                            outcomeA = a
                        }
                        localBoard.setBack(currentPos)
                        iteration++
                        p += 5.0f
                    }
                    a += 0.25f
                }
            }
            floatArrayOf(bestScore, outcomeX, outcomeP, outcomeA, iteration.toFloat())
        })
    }

    executor.shutdown()

    var globalBestScore = Float.MAX_VALUE
    var globalBestX = 0.0f
    var globalBestP = 0.0f
    var globalBestA = 0.0f
    var globalIter = 0

    for (future in futures) {
        val res = future.get()
        val score = res[0]
        val iter = res[4].toInt()
        globalIter += iter
        if (score < globalBestScore) {
            globalBestScore = score
            globalBestX = res[1]
            globalBestP = res[2]
            globalBestA = res[3]
        }
    }

    val time = (System.currentTimeMillis() - start).toFloat()
    return time
}

fun runHeavyTest(times: Int) {
    val board = AllEntities.newRandomizedSample()
    val timestamps = mutableListOf<Float>()
    for (i in 0 until times) {
        timestamps.add(estimateBestShot(board))
    }
    val average = timestamps.sum() / timestamps.size
    println("Average time across $times runs: $average ms.")
}

fun main() {
    println("Generating mid-gameboard state with random active pieces...")
    val board = AllEntities.newRandomizedSample()

    println("Testing AI shot estimation on randomized layout...")
    estimateBestShot(board)

    runHeavyTest(10) // 136ms
}
