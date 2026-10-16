// ।। ॐ नमः शिवाय ।। \\

// @date 16th October, 2026
// @acknowledgement Ported by Gemini AI using my Rust code

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class CarromEngine_Gemini {

    public enum Name {
        STRIKER,
        QUEEN,
        WHITE,
        BLACK
    }

    public static class Position {
        public float x;
        public float y;

        public Position(float x, float y) {
            this.x = x;
            this.y = y;
        }

        public Position copy() {
            return new Position(this.x, this.y);
        }

        public float getLength() {
            return (float) Math.sqrt(this.x * this.x + this.y * this.y);
        }

        public void update(Velocity vel) {
            this.x += vel.vx;
            this.y += vel.vy;
        }

        public float getDistance(Position pos) {
            float dx = pos.x - this.x;
            float dy = pos.y - this.y;
            return (float) Math.sqrt((dx * dx) + (dy * dy));
        }

        public float getDistSq(Position pos) {
            float dx = pos.x - this.x;
            float dy = pos.y - this.y;
            return (dx * dx) + (dy * dy);
        }
    }

    public static class Velocity {
        public float vx;
        public float vy;

        public Velocity(float vx, float vy) {
            this.vx = vx;
            this.vy = vy;
        }

        public Velocity copy() {
            return new Velocity(this.vx, this.vy);
        }

        public float getSpeed() {
            return (float) Math.sqrt((this.vx * this.vx) + (this.vy * this.vy));
        }

        public float getSpeedSq() {
            return (this.vx * this.vx) + (this.vy * this.vy);
        }

        public void decelerate(float friction) {
            this.vx *= 1.0f - friction;
            this.vy *= 1.0f - friction;
        }
    }

    public static final float UW = 3.84f;           // unit viewport width
    public static final float UH = 6.94f;           // unit viewport height
    public static final float U = (UW + UH) / 2.0f; // base unit

    public static final float LOGICAL_WIDTH = 40.0f * UH;
    public static final float LOGICAL_HEIGHT = 40.0f * UH;

    public static final float OFFSET = 8.0f * U;
    public static final float GAP = 4.0f * U;

    public static final Position[] BOARD_DIMENSIONS = new Position[] {
        new Position(0.0f, 0.0f),
        new Position(LOGICAL_WIDTH, 0.0f),
        new Position(0.0f, LOGICAL_HEIGHT),
        new Position(LOGICAL_WIDTH, LOGICAL_HEIGHT),
    };

    public static final Position[] BOARD_CORNERS = new Position[] {
        new Position(U, U),
        new Position(39.0f * U, U),
        new Position(U, 39.0f * U),
        new Position(39.0f * U, 39.0f * U),
    };

    public static final Position[] STRIKER_AREA = new Position[] {
        new Position(OFFSET, OFFSET - GAP),
        new Position(LOGICAL_WIDTH - OFFSET, OFFSET - GAP),
    };

    public static final float PI = (float) Math.PI;
    public static final float STRIKER_RADIUS = 1.8f * U;
    public static final float STRIKER_MASS = PI * (STRIKER_RADIUS * STRIKER_RADIUS);
    public static final float PIECE_RADIUS = 1.4f * U;
    public static final float PIECE_MASS = PI * (PIECE_RADIUS * PIECE_RADIUS);

    public static final float FRICTION = 0.03f;
    public static final float MOMENTUM_TRANSFER_RATIO = 0.85f;
    public static final int MAX_STEPS = 240;
    public static final int MAX_ENTITIES = 20;

    ///// ========================== \\\\\
    /// ++ ENTITY IMPLEMENTATION ++ \\\
    ///// ========================== \\\\\

    public static class Entity implements Cloneable {
        public Name typeName;
        public Position pos;
        public Velocity vel;
        public float r;
        public float mass;
        public boolean isActive;
        public boolean isGliding;

        public Entity(Name typeName, Position pos, Velocity vel, float r, float mass, boolean isActive, boolean isGliding) {
            this.typeName = typeName;
            this.pos = pos;
            this.vel = vel;
            this.r = r;
            this.mass = mass;
            this.isActive = isActive;
            this.isGliding = isGliding;
        }

        @Override
        public Entity clone() {
            return new Entity(typeName, pos.copy(), vel.copy(), r, mass, isActive, isGliding);
        }

        // << handles individual entity kinematics >> \\
        public void applyKinematics() {
            if (!this.isActive) return;
            if (this.vel.getSpeedSq() <= 0.00001f) { // removed sqrt here
                // << quit motion >> \\
                this.vel.vx = 0.0f;
                this.vel.vy = 0.0f;
                // << turn off flag >> \\
                this.isGliding = false;
            } else {
                // << decelerate >> \\
                this.vel.decelerate(FRICTION);
                // << update position >> \\
                this.pos.update(this.vel);
                // << keep flag active >> \\
                this.isGliding = true;
            }
        }

        // << handles individual entity boundary collisions & bouncing >> \\
        public void detectBoundaryCollision() {
            if (!this.isActive) return;
            float radius = this.r;
            // << left & right walls >> \\
            if (this.pos.x <= radius) {
                this.pos.x = radius;
                this.vel.vx *= -1.0f;
            } else if (this.pos.x >= LOGICAL_WIDTH - radius) {
                this.pos.x = LOGICAL_WIDTH - radius;
                this.vel.vx *= -1.0f;
            }
            // << top & bottom walls >> \\
            if (this.pos.y <= radius) {
                this.pos.y = radius;
                this.vel.vy *= -1.0f;
            } else if (this.pos.y >= LOGICAL_HEIGHT - radius) {
                this.pos.y = LOGICAL_HEIGHT - radius;
                this.vel.vy *= -1.0f;
            }
        }

        // << handles individual entity momentum resolution, paired with another entity >> \\
        public void resolveMomentum(Entity entity) {
            // << @optimization early exits >> \\
            if (!this.isActive && !entity.isActive) return;
            if (!this.isGliding && !entity.isGliding && this.typeName != Name.STRIKER && entity.typeName != Name.STRIKER) return;
            // << setup data >> \\
            float minDist = this.r + entity.r;
            float dx = entity.pos.x - this.pos.x;
            float dy = entity.pos.y - this.pos.y;
            float actualDist = this.pos.getDistance(entity.pos);
            // << momentum math >> \\
            if (actualDist < minDist && actualDist > 0.0f) {
                // << separate overlap >> \\
                float overlap = minDist - actualDist;
                // << normalized unit vectors: self -> entity >> \\
                float nx = dx / actualDist;
                float ny = dy / actualDist;
                // << push self backwards, entity forwards >> \\
                this.pos.x -= nx * (overlap / 2.0f);
                this.pos.y -= ny * (overlap / 2.0f);
                entity.pos.x += nx * (overlap / 2.0f);
                entity.pos.y += ny * (overlap / 2.0f);

                // << relative velocity >> \\
                float rx = this.vel.vx - entity.vel.vx;
                float ry = this.vel.vy - entity.vel.vy;
                // << relative velocity along collision normal: dot product >> \\
                float rv = (rx * nx) + (ry * ny);
                // << dont resolve if already separating >> \\
                if (rv < 0.0f) return;

                // << elastic impulse resolution >> \\
                float impulse = (MOMENTUM_TRANSFER_RATIO * 2.0f * rv) / (this.mass + entity.mass);
                // << distribute equal & opposing impulses >> \\
                this.vel.vx -= impulse * nx * entity.mass;
                this.vel.vy -= impulse * ny * entity.mass;
                entity.vel.vx += impulse * nx * this.mass;
                entity.vel.vy += impulse * ny * this.mass;
            }
        }

        // << handles individual entity pocketing >> \\
        public void checkPocketed() {
            // << ignore striker & inactive entities >> \\
            if (this.typeName == Name.STRIKER || !this.isActive) return;
            for (int i = 0; i < 4; i++) {
                Position corner = BOARD_CORNERS[i];
                float dist = this.pos.getDistSq(corner); // removed sqrt here
                float threshold = 5.0f * U * U;
                if (dist <= threshold) {
                    this.isActive = false;
                    this.isGliding = false;
                    this.vel = new Velocity(0.0f, 0.0f);
                    return;
                }
            }
        }

        // << AI implementation: gets closest pocket >> \\
        public Position getClosestPocket() {
            Position pocket = BOARD_CORNERS[0];
            float minDist = this.pos.getDistSq(pocket); // removed sqrt here
            for (int i = 1; i < 4; i++) {
                Position target = BOARD_CORNERS[i];
                float dist = this.pos.getDistSq(target); // removed sqrt here
                if (dist < minDist) {
                    pocket = target;
                    minDist = dist;
                }
            }
            return pocket;
        }
    }

    ///// ========================== \\\\\
    /// ++ ALL ENTITIES CONTAINER ++ \\\
    ///// ========================== \\\\\

    public static class AllEntities implements Cloneable {
        public Entity[] entities;

        public AllEntities(Entity[] entities) {
            this.entities = entities;
        }

        @Override
        public AllEntities clone() {
            Entity[] clonedArr = new Entity[entities.length];
            for (int i = 0; i < entities.length; i++) {
                clonedArr[i] = entities[i].clone();
            }
            return new AllEntities(clonedArr);
        }

        // << applies kinematics to all >> \\
        public void applyUniformKinematics() {
            for (Entity entity : entities) {
                entity.applyKinematics();
            }
        }

        // << apply boundary checks to all >> \\
        public void applyUniformBoundaryChecks() {
            for (Entity entity : entities) {
                entity.detectBoundaryCollision();
            }
        }

        // << applies uniform momentum resolve to all WITH SPATIAL PARTITIONING >> \\
        public void applyUniformMomentumResolve() {
            for (int i = 0; i < MAX_ENTITIES - 1; i++) {
                Entity entity = entities[i];
                for (int j = i + 1; j < MAX_ENTITIES; j++) {
                    Entity target = entities[j];
                    /*
                     * Notice:
                     * max radius sum is of striker = 1.8 * U.
                     * each piece has radii 1.4 * U.
                     * SUM = 3.2 * U
                     * 
                     * As a result, we set max-search-area to a circle of radius 3.5 * U from the entity's centre.
                     */
                    float threshold = 11.0f * U * U;
                    if (entity.pos.getDistSq(target.pos) <= threshold) { // removed sqrt here
                        entity.resolveMomentum(target);
                    }
                }
            }
        }

        // << applies uniform pocketing to all pieces >> \\
        public void applyUniformPocketing() {
            for (Entity entity : entities) {
                entity.checkPocketed();
            }
        }

        // << sets back current array to original array >> \\
        public void setBack(AllEntities original) {
            for (int i = 0; i < MAX_ENTITIES; i++) {
                this.entities[i] = original.entities[i].clone();
            }
        }

        // << checks if any pieces is still moving >> \\
        public boolean isAnyPieceMoving() {
            for (Entity entity : entities) {
                if (entity.isGliding) return true;
            }
            return false;
        }

        // << simulates one turn physics >> \\
        public void simulatePhysics(Position launchPos, float p, float a) {
            // << update & launch striker >> \\
            Entity striker = entities[0];
            striker.pos = launchPos.copy();
            striker.vel = new Velocity(p * (float) Math.cos(a), p * (float) Math.sin(a));
            striker.pos.x += striker.vel.vx;
            striker.pos.y += striker.vel.vy;

            // << simulation >> \\
            int step = 0;
            while (step < MAX_STEPS) {
                // << physics pipeline >> \\
                applyUniformKinematics();
                applyUniformBoundaryChecks();
                applyUniformMomentumResolve();
                applyUniformPocketing();
                // << @optimization early exit >> \\
                if (!isAnyPieceMoving()) break;
                step++;
            }
        }

        // << simulates one turn scores >> \\
        public float simulateScore() {
            float sum = 0.0f;
            for (Entity entity : entities) {
                sum += entity.pos.getDistance(entity.getClosestPocket());
            }
            return sum;
        }

        // Generates a randomized board layout with all 20 entities active:
        // - Striker: Placed randomly along the bottom baseline
        // - Queen & Pieces: Scattered across the board with non-overlapping bounds
        public static AllEntities newRandomizedSample() {
            class LCG {
                long seed = System.nanoTime();
                float next() {
                    seed = seed * 1664525L + 1013904223L;
                    long val = seed & 0xFFFFFFFFL;
                    return (float) val / (float) 0xFFFFFFFFL;
                }
            }
            LCG lcg = new LCG();

            Entity[] entities = new Entity[MAX_ENTITIES];

            // 1. Setup Striker at a random position along the baseline
            float strikerX = STRIKER_AREA[0].x + lcg.next() * (STRIKER_AREA[1].x - STRIKER_AREA[0].x);
            entities[0] = new Entity(
                Name.STRIKER,
                new Position(strikerX, STRIKER_AREA[0].y),
                new Velocity(0.0f, 0.0f),
                STRIKER_RADIUS,
                STRIKER_MASS,
                true,
                false
            );

            // Safe spawn boundaries for pieces (away from walls and corners)
            float minX = 3.0f * U;
            float maxX = LOGICAL_WIDTH - 3.0f * U;
            float minY = 6.0f * U;
            float maxY = LOGICAL_HEIGHT - 3.0f * U;

            // 2. Setup Queen & 18 Pieces (9 Whites, 9 Blacks)
            Name[] pieceTypes = new Name[] {
                Name.QUEEN,
                Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE,
                Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK,
            };

            for (int i = 0; i < pieceTypes.length; i++) {
                int entityIndex = i + 1; // 0 is reserved for striker
                Name typeName = pieceTypes[i];
                Position spawnPos = new Position(0.0f, 0.0f);

                // Loop until a non-overlapping spot is found
                while (true) {
                    spawnPos.x = minX + lcg.next() * (maxX - minX);
                    spawnPos.y = minY + lcg.next() * (maxY - minY);

                    boolean overlapping = false;
                    for (int idx = 0; idx < entityIndex; idx++) {
                        float minDist = PIECE_RADIUS + entities[idx].r + 0.5f; // include a small gap buffer
                        if (spawnPos.getDistance(entities[idx].pos) < minDist) {
                            overlapping = true;
                            break;
                        }
                    }
                    if (!overlapping) break;
                }

                entities[entityIndex] = new Entity(
                    typeName,
                    spawnPos,
                    new Velocity(0.0f, 0.0f),
                    PIECE_RADIUS,
                    PIECE_MASS,
                    true,
                    false
                );
            }
            return new AllEntities(entities);
        }
    }

    ///// ========================== \\\\\
    /// ++ MASTER FUNCTION ++ \\\
    ///// ========================== \\\\\

    public static class ThreadResult {
        float bestScore;
        float outcomeX;
        float outcomeP;
        float outcomeA;
        int iteration;

        public ThreadResult(float bestScore, float outcomeX, float outcomeP, float outcomeA, int iteration) {
            this.bestScore = bestScore;
            this.outcomeX = outcomeX;
            this.outcomeP = outcomeP;
            this.outcomeA = outcomeA;
            this.iteration = iteration;
        }
    }

    public static float estimateBestShot(AllEntities currentPos) {
        // << setup >> \\
        long start = System.nanoTime();
        float minX = STRIKER_AREA[0].x;
        float maxX = STRIKER_AREA[1].x;

        // << launch positions >> \\
        List<Float> launchPositions = new ArrayList<>();
        float x = minX;
        while (x <= maxX) {
            launchPositions.add(x);
            x += 0.1f * minX;
        }

        // << divide into chunks >> \\
        int chunkSize = (launchPositions.size() / 4) + 1;
        List<List<Float>> chunks = new ArrayList<>();
        for (int i = 0; i < launchPositions.size(); i += chunkSize) {
            chunks.add(launchPositions.subList(i, Math.min(i + chunkSize, launchPositions.size())));
        }

        // << spawn 4 threads using ExecutorService >> \\
        ExecutorService executor = Executors.newFixedThreadPool(4);
        List<Future<ThreadResult>> futures = new ArrayList<>();

        for (List<Float> chunk : chunks) {
            futures.add(executor.submit(() -> {
                AllEntities localBoard = currentPos.clone();
                float bestScore = Float.MAX_VALUE;
                float outcomeX = 0.0f;
                float outcomeP = 0.0f;
                float outcomeA = 0.0f;
                int iteration = 0;

                for (Float launchX : chunk) {
                    float a = 0.2f;
                    while (a <= (PI - 0.2f)) {
                        float p = 5.0f;
                        while (p <= 15.0f) {
                            Position pos = new Position(launchX, STRIKER_AREA[0].y);
                            localBoard.simulatePhysics(pos, p, a);
                            float score = localBoard.simulateScore();
                            if (score < bestScore) {
                                bestScore = score;
                                outcomeX = launchX;
                                outcomeP = p;
                                outcomeA = a;
                            }
                            localBoard.setBack(currentPos);
                            iteration++;
                            p += 5.0f;
                        }
                        a += 0.25f;
                    }
                }
                return new ThreadResult(bestScore, outcomeX, outcomeP, outcomeA, iteration);
            }));
        }

        executor.shutdown();

        List<ThreadResult> threadResults = new ArrayList<>();
        try {
            for (Future<ThreadResult> future : futures) {
                threadResults.add(future.get());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // << compare results across the threads' outputs >> \\
        float globalBestScore = Float.MAX_VALUE;
        float globalBestX = 0.0f;
        float globalBestP = 0.0f;
        float globalBestA = 0.0f;
        int globalIter = 0;

        for (ThreadResult res : threadResults) {
            globalIter += res.iteration;
            if (res.bestScore < globalBestScore) {
                globalBestScore = res.bestScore;
                globalBestX = res.outcomeX;
                globalBestP = res.outcomeP;
                globalBestA = res.outcomeA;
            }
        }

        // << outcome >> \\
        long end = System.nanoTime();
        float timeMs = (end - start) / 1_000_000.0f;
        return timeMs;
    }

    public static void runHeavyTest(int times) {
        AllEntities board = AllEntities.newRandomizedSample();
        List<Float> timestamps = new ArrayList<>();
        for (int i = 0; i < times; i++) {
            timestamps.add(estimateBestShot(board));
        }
        float sum = 0.0f;
        for (Float val : timestamps) {
            sum += val;
        }
        float average = sum / timestamps.size();
        System.out.println("Average time across " + times + " runs: " + average + "ms.");
    }

    public static void main(String[] args) {
        System.out.println("Generating mid-gameboard state with random active pieces...");
        AllEntities board = AllEntities.newRandomizedSample();

        System.out.println("Testing AI shot estimation on randomized layout...");
        estimateBestShot(board);

        runHeavyTest(100); // 126ms
    }
}
