// ।। ॐ नमः शिवाय ।। \\
// @date 4th November, 2026
// @acknowledgment Ported by Gemini AI using my Rust code

import std.stdio;
import std.math : PI, sqrt, sin, cos;
import std.datetime.stopwatch : StopWatch, AutoStart;
import std.datetime : Duration;
import std.parallelism : parallel;
import std.array : array;

enum Name {
  STRIKER,
  QUEEN,
  WHITE,
  BLACK,
}

struct Position {
  float x;
  float y;

  float getLength() const {
    return sqrt(x * x + y * y);
  }

  void update(const ref Velocity vel) {
    x += vel.vx;
    y += vel.vy;
  }

  // Passed by value to prevent rvalue reference errors
  float getDistance(Position pos) const {
    float dx = pos.x - x;
    float dy = pos.y - y;
    return sqrt((dx * dx) + (dy * dy));
  }

  float getDistSq(Position pos) const {
    float dx = pos.x - x;
    float dy = pos.y - y;
    return (dx * dx) + (dy * dy);
  }
}

struct Velocity {
  float vx;
  float vy;

  float getSpeed() const {
    return sqrt((vx * vx) + (vy * vy));
  }

  float getSpeedSq() const {
    return (vx * vx) + (vy * vy);
  }

  // Passed by value since it's a primitive scalar
  void decelerate(float friction) {
    vx *= 1.0f - friction;
    vy *= 1.0f - friction;
  }
}

enum float UW = 3.84f;
enum float UH = 6.94f;
enum float U = (UW + UH) / 2.0f;

enum float LOGICAL_WIDTH = 40.0f * UH;
enum float LOGICAL_HEIGHT = 40.0f * UH;

enum float OFFSET = 8.0f * U;
enum float GAP = 4.0f * U;

immutable Position[4] BOARD_CORNERS = [
  Position(U, U),
  Position(39.0f * U, U),
  Position(U, 39.0f * U),
  Position(39.0f * U, 39.0f * U),
];

immutable Position[2] STRIKER_AREA = [
  Position(OFFSET, OFFSET - GAP),
  Position(LOGICAL_WIDTH - OFFSET, OFFSET - GAP),
];

enum float STRIKER_RADIUS = 1.8f * U;
enum float STRIKER_MASS = PI * (STRIKER_RADIUS * STRIKER_RADIUS);
enum float PIECE_RADIUS = 1.4f * U;
enum float PIECE_MASS = PI * (PIECE_RADIUS * PIECE_RADIUS);

enum float FRICTION = 0.03f;
enum float MOMENTUM_TRANSFER_RATIO = 0.85f;
enum uint MAX_STEPS = 240;
enum uint MAX_ENTITIES = 20;

struct Entity {
  Name typeName;
  Position pos;
  Velocity vel;
  float r;
  float mass;
  bool isActive;
  bool isGliding;

  void applyKinematics() {
    if (!isActive) return;
    if (vel.getSpeedSq() <= 0.00001f) {
      vel.vx = 0.0f;
      vel.vy = 0.0f;
      isGliding = false;
    } else {
      vel.decelerate(FRICTION);
      pos.update(vel);
      isGliding = true;
    }
  }

  void detectBoundaryCollision() {
    if (!isActive) return;
    float radius = r;
    if (pos.x <= radius) {
      pos.x = radius;
      vel.vx *= -1.0f;
    } else if (pos.x >= LOGICAL_WIDTH - radius) {
      pos.x = LOGICAL_WIDTH - radius;
      vel.vx *= -1.0f;
    }
    if (pos.y <= radius) {
      pos.y = radius;
      vel.vy *= -1.0f;
    } else if (pos.y >= LOGICAL_HEIGHT - radius) {
      pos.y = LOGICAL_HEIGHT - radius;
      vel.vy *= -1.0f;
    }
  }

  void resolveMomentum(ref Entity entity) {
    if (!isActive && !entity.isActive) return;
    if (!isGliding && !entity.isGliding && typeName != Name.STRIKER && entity.typeName != Name.STRIKER) return;
    
    float min_dist = r + entity.r;
    float dx = entity.pos.x - pos.x;
    float dy = entity.pos.y - pos.y;
    float actual_dist = pos.getDistance(entity.pos);

    if (actual_dist < min_dist && actual_dist > 0.0f) {
      float overlap = min_dist - actual_dist;
      float nx = dx / actual_dist;
      float ny = dy / actual_dist;

      pos.x -= nx * (overlap / 2.0f);
      pos.y -= ny * (overlap / 2.0f);
      entity.pos.x += nx * (overlap / 2.0f);
      entity.pos.y += ny * (overlap / 2.0f);

      float rx = vel.vx - entity.vel.vx;
      float ry = vel.vy - entity.vel.vy;
      float rv = (rx * nx) + (ry * ny);
      if (rv < 0.0f) return;

      float impulse = (MOMENTUM_TRANSFER_RATIO * 2.0f * rv) / (mass + entity.mass);
      vel.vx -= impulse * nx * entity.mass;
      vel.vy -= impulse * ny * entity.mass;
      entity.vel.vx += impulse * nx * mass;
      entity.vel.vy += impulse * ny * mass;
    }
  }

  void checkPocketed() {
    if (typeName == Name.STRIKER || !isActive) return;
    foreach (i; 0..4) {
      Position corner = BOARD_CORNERS[i];
      float dist = pos.getDistSq(corner);
      float threshold = 5.0f * U * U;
      if (dist <= threshold) {
        isActive = false;
        isGliding = false;
        vel = Velocity(0.0f, 0.0f);
        return;
      }
    }
  }

  Position getClosestPocket() const {
    Position pocket = BOARD_CORNERS[0];
    float min_dist = pos.getDistSq(pocket);
    foreach (i; 1..4) {
      Position target = BOARD_CORNERS[i];
      float dist = pos.getDistSq(target);
      if (dist < min_dist) {
        pocket = target;
        min_dist = dist;
      }
    }
    return pocket;
  }
}

struct AllEntities {
  Entity[MAX_ENTITIES] entities;

  void applyUniformKinematics() {
    foreach (ref entity; entities) {
      entity.applyKinematics();
    }
  }

  void applyUniformBoundaryChecks() {
    foreach (ref entity; entities) {
      entity.detectBoundaryCollision();
    }
  }

  void applyUniformMomentumResolve() {
    foreach (i; 0..(MAX_ENTITIES - 1)) {
      Entity* entity = &entities[i];
      foreach (j; (i + 1)..MAX_ENTITIES) {
        Entity* target = &entities[j];
        float threshold = 11.0f * U * U;
        if (entity.pos.getDistSq(target.pos) <= threshold) {
          entity.resolveMomentum(*target);
        }
      }
    }
  }

  void applyUniformPocketing() {
    foreach (ref entity; entities) {
      entity.checkPocketed();
    }
  }

  void setBack(const ref AllEntities original) {
    foreach (i; 0..MAX_ENTITIES) {
      entities[i] = original.entities[i];
    }
  }

  bool isAnyPieceMoving() const {
    foreach (entity; entities) {
      if (entity.isGliding) return true;
    }
    return false;
  }

  void simulatePhysics(Position launch_pos, float p, float a) {
    Entity* striker = &entities[0];
    striker.pos = launch_pos;
    striker.vel = Velocity(p * cos(a), p * sin(a));
    striker.pos.x += striker.vel.vx;
    striker.pos.y += striker.vel.vy;

    uint step = 0;
    while (step < MAX_STEPS) {
      applyUniformKinematics();
      applyUniformBoundaryChecks();
      applyUniformMomentumResolve();
      applyUniformPocketing();
      if (!isAnyPieceMoving()) break;
      step++;
    }
  }

  float simulateScore() const {
    float sum = 0.0f;
    foreach (entity; entities) {
      sum += entity.pos.getDistance(entity.getClosestPocket());
    }
    return sum;
  }

  static AllEntities newRandomizedSample() {
    import std.datetime : Clock;
    ulong nanos = Clock.currTime().stdTime;
    uint seed = cast(uint)nanos;
    auto nextRand = delegate float() {
      seed = seed * 1664525 + 1013904223;
      return cast(float)seed / cast(float)uint.max;
    };

    Entity[MAX_ENTITIES] ents;
    foreach (ref e; ents) {
      e = Entity(Name.BLACK, Position(0.0f, 0.0f), Velocity(0.0f, 0.0f), PIECE_RADIUS, PIECE_MASS, true, false);
    }

    float striker_x = STRIKER_AREA[0].x + nextRand() * (STRIKER_AREA[1].x - STRIKER_AREA[0].x);
    ents[0] = Entity(Name.STRIKER, Position(striker_x, STRIKER_AREA[0].y), Velocity(0.0f, 0.0f), STRIKER_RADIUS, STRIKER_MASS, true, false);

    auto isOverlapping = (const ref Position pos, float radius, size_t count, const ref Entity[MAX_ENTITIES] list) {
      foreach (idx; 0..count) {
        float min_dist = radius + list[idx].r + 0.5f;
        if (pos.getDistance(list[idx].pos) < min_dist) {
          return true;
        }
      }
      return false;
    };

    float min_x = 3.0f * U;
    float max_x = LOGICAL_WIDTH - 3.0f * U;
    float min_y = 6.0f * U;
    float max_y = LOGICAL_HEIGHT - 3.0f * U;

    Name[19] piece_types = [
      Name.QUEEN,
      Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE, Name.WHITE,
      Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK, Name.BLACK,
    ];

    foreach (i, type_name; piece_types) {
      size_t entity_index = i + 1;
      Position spawn_pos;
      while (true) {
        spawn_pos.x = min_x + nextRand() * (max_x - min_x);
        spawn_pos.y = min_y + nextRand() * (max_y - min_y);
        if (!isOverlapping(spawn_pos, PIECE_RADIUS, entity_index, ents)) {
          break;
        }
      }
      ents[entity_index] = Entity(type_name, spawn_pos, Velocity(0.0f, 0.0f), PIECE_RADIUS, PIECE_MASS, true, false);
    }

    return AllEntities(ents);
  }
}

struct ThreadResult {
  float best_score;
  float outcome_x;
  float outcome_p;
  float outcome_a;
  uint iteration;
}

float estimateBestShot(ref AllEntities current_pos) {
  auto sw = StopWatch(AutoStart.yes);
  float min_x = STRIKER_AREA[0].x;
  float max_x = STRIKER_AREA[1].x;

  float[] launch_positions;
  float x = min_x;
  while (x <= max_x) {
    launch_positions ~= x;
    x += 0.1f * min_x;
  }

  size_t chunkSize = (launch_positions.length / 4) + 1;
  float[][] chunks;
  for (size_t i = 0; i < launch_positions.length; i += chunkSize) {
    size_t end = i + chunkSize;
    if (end > launch_positions.length) end = launch_positions.length;
    chunks ~= launch_positions[i .. end];
  }

  ThreadResult[] thread_results = new ThreadResult[chunks.length];

  // Using D's clean parallel loop over chunks
  foreach (i, chunk; chunks.parallel) {
    AllEntities local_board = current_pos;
    float best_score = float.max;
    float outcome_x = 0.0f;
    float outcome_p = 0.0f;
    float outcome_a = 0.0f;
    uint iteration = 0;

    foreach (launch_x; chunk) {
      float a = 0.2f;
      while (a <= (PI - 0.2f)) {
        float p = 5.0f;
        while (p <= 15.0f) {
          Position pos = Position(launch_x, STRIKER_AREA[0].y);
          local_board.simulatePhysics(pos, p, a);
          float score = local_board.simulateScore();
          if (score < best_score) {
            best_score = score;
            outcome_x = launch_x;
            outcome_p = p;
            outcome_a = a;
          }
          local_board.setBack(current_pos);
          iteration++;
          p += 5.0f;
        }
        a += 0.25f;
      }
    }
    thread_results[i] = ThreadResult(best_score, outcome_x, outcome_p, outcome_a, iteration);
  }

  float global_best_score = float.max;
  float global_best_x = 0.0f;
  float global_best_p = 0.0f;
  float global_best_a = 0.0f;
  uint global_iter = 0;

  foreach (res; thread_results) {
    global_iter += res.iteration;
    if (res.best_score < global_best_score) {
      global_best_score = res.best_score;
      global_best_x = res.outcome_x;
      global_best_p = res.outcome_p;
      global_best_a = res.outcome_a;
    }
  }

  Duration elapsed = sw.peek();
  float time = cast(float)elapsed.total!"msecs";
  // writefln("Time for one AI simulation across threads: %fms.", time);
  // writefln("Number of iteration: %d.", global_iter);
  // writefln("Best shot: %f, %f, %f.", global_best_x, global_best_p, global_best_a);
  return time;
}

void runHeavyTest(uint times) {
  AllEntities board = AllEntities.newRandomizedSample();
  float[] timestamps;
  foreach (_; 0..times) {
    timestamps ~= estimateBestShot(board);
  }
  float sum = 0.0f;
  foreach (t; timestamps) sum += t;
  float average = sum / cast(float)timestamps.length;
  writefln("Average time across %d runs: %fms.", times, average);
}

void main() {
  writeln("Generating mid-gameboard state with random active pieces...");
  AllEntities board = AllEntities.newRandomizedSample();

  writeln("Testing AI shot estimation on randomized layout...");
  estimateBestShot(board);

  runHeavyTest(1);
  runHeavyTest(100);
}
