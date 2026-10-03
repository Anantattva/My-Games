// ।। ॐ नमः शिवाय ।। \\

// @date START 25th September, 2026
// @learning @experimenting @benchmarking
// porting my Rust 4 core Rosetta Stone carrom engine to C++
// @acknowledgment written by Gemini AI

#include <iostream>
#include <array>
#include <vector>
#include <cmath>
#include <chrono>
#include <algorithm>
#include <thread>
#include <future>

enum class Name {
  STRIKER,
  QUEEN,
  WHITE,
  BLACK
};

struct Velocity {
  float vx;
  float vy;

  float get_speed_sq() const {
    return (vx * vx) + (vy * vy);
  }

  void decelerate(float friction) {
    vx *= (1.0f - friction);
    vy *= (1.0f - friction);
  }
};

struct Position {
  float x;
  float y;

  float get_length() const {
    return std::sqrt((x * x) + (y * y));
  }

  void update(const Velocity& vel) {
    x += vel.vx;
    y += vel.vy;
  }

  float get_distance(const Position& pos) const {
    float dx = pos.x - x;
    float dy = pos.y - y;
    return std::sqrt((dx * dx) + (dy * dy));
  }

  float get_dist_sq(const Position& pos) const {
    float dx = pos.x - x;
    float dy = pos.y - y;
    return (dx * dx) + (dy * dy);
  }
};

// Constants
constexpr float UW = 3.84f;
constexpr float UH = 6.94f;
constexpr float U = (UW + UH) / 2.0f;

constexpr float LOGICAL_WIDTH  = 40.0f * UH;
constexpr float LOGICAL_HEIGHT = 40.0f * UH;

constexpr float OFFSET = 8.0f * U;
constexpr float GAP    = 4.0f * U;

const std::array<Position, 4> BOARD_CORNERS = {{
  { U,        U },
  { 39.0f * U, U },
  { U,        39.0f * U },
  { 39.0f * U, 39.0f * U }
}};

const std::array<Position, 2> STRIKER_AREA = {{
  { OFFSET,                 OFFSET - GAP },
  { LOGICAL_WIDTH - OFFSET, OFFSET - GAP }
}};

constexpr float PI = 3.14159265358979323846f;
constexpr float STRIKER_RADIUS = 1.8f * U;
constexpr float STRIKER_MASS = PI * (STRIKER_RADIUS * STRIKER_RADIUS);
constexpr float PIECE_RADIUS = 1.4f * U;
constexpr float PIECE_MASS = PI * (PIECE_RADIUS * PIECE_RADIUS);

constexpr float FRICTION = 0.03f;
constexpr float MOMENTUM_TRANSFER_RATIO = 0.85f;
constexpr uint32_t MAX_STEPS = 240;
constexpr size_t MAX_ENTITIES = 20;

struct Entity {
  Name type_name;
  Position pos;
  Velocity vel;
  float r;
  float mass;
  bool is_active;
  bool is_gliding;

  void apply_kinematics() {
    if (!is_active) { return; }
    if (vel.get_speed_sq() <= 0.00001f) { // Optimized: removed sqrt check[span_1](start_span)[span_1](end_span)
      vel.vx = 0.0f;
      vel.vy = 0.0f;
      is_gliding = false;
    } else {
      vel.decelerate(FRICTION);
      pos.update(vel);
      is_gliding = true;
    }
  }

  void detect_boundary_collision() {
    if (!is_active) { return; }
    float limit_r = r;
    if (pos.x <= limit_r) {
      pos.x = limit_r;
      vel.vx *= -1.0f;
    } else if (pos.x >= LOGICAL_WIDTH - limit_r) {
      pos.x = LOGICAL_WIDTH - limit_r;
      vel.vx *= -1.0f;
    }
    if (pos.y <= limit_r) {
      pos.y = limit_r;
      vel.vy *= -1.0f;
    } else if (pos.y >= LOGICAL_HEIGHT - limit_r) {
      pos.y = LOGICAL_HEIGHT - limit_r;
      vel.vy *= -1.0f;
    }
  }

  void resolve_momentum(Entity& entity) {
    if (!is_active && !entity.is_active) { return; }
    if (!is_gliding && !entity.is_gliding && type_name != Name::STRIKER && entity.type_name != Name::STRIKER) { return; }
    
    float min_dist = r + entity.r;
    float dx = entity.pos.x - pos.x;
    float dy = entity.pos.y - pos.y;
    float actual_dist = pos.get_distance(entity.pos);

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

      if (rv < 0.0f) { return; }

      float impulse = (MOMENTUM_TRANSFER_RATIO * 2.0f * rv) / (mass + entity.mass);
      vel.vx -= impulse * nx * entity.mass;
      vel.vy -= impulse * ny * entity.mass;
      entity.vel.vx += impulse * nx * mass;
      entity.vel.vy += impulse * ny * mass;
    }
  }

  void check_pocketed() {
    if (type_name == Name::STRIKER || !is_active) { return; }
    for (int i = 0; i < 4; i++) {
      Position corner = BOARD_CORNERS[i];
      float dist_sq = pos.get_dist_sq(corner); // Optimized: squared distance check[span_2](start_span)[span_2](end_span)
      float threshold = 5.0f * U * U;
      if (dist_sq <= threshold) {
        is_active = false;
        is_gliding = false;
        vel = {0.0f, 0.0f};
        return;
      }
    }
  }

  Position get_closest_pocket() const {
    Position pocket = BOARD_CORNERS[0];
    float min_dist_sq = pos.get_dist_sq(pocket); // Optimized[span_3](start_span)[span_3](end_span)
    for (int i = 1; i < 4; i++) {
      Position target = BOARD_CORNERS[i];
      float dist_sq = pos.get_dist_sq(target);
      if (dist_sq < min_dist_sq) {
        pocket = target;
        min_dist_sq = dist_sq;
      }
    }
    return pocket;
  }
};

struct AllEntities {
  std::array<Entity, MAX_ENTITIES> entities;

  void apply_uniform_kinematics() {
    for (auto& entity : entities) {
      entity.apply_kinematics();
    }
  }

  void apply_uniform_boundary_checks() {
    for (auto& entity : entities) {
      entity.detect_boundary_collision();
    }
  }

  // Spatial Partitioning Optimization
  void apply_uniform_momentum_resolve() {
    for (size_t i = 0; i < MAX_ENTITIES - 1; i++) {
      for (size_t j = i + 1; j < MAX_ENTITIES; j++) {
        // Spatial partitioning check: max radius sum threshold squared = 11.0 * U^2[span_4](start_span)[span_4](end_span)
        constexpr float threshold = 11.0f * U * U;
        if (entities[i].pos.get_dist_sq(entities[j].pos) <= threshold) {
          entities[i].resolve_momentum(entities[j]);
        }
      }
    }
  }

  void apply_uniform_pocketing() {
    for (auto& entity : entities) {
      entity.check_pocketed();
    }
  }

  void set_back(const AllEntities& original) {
    entities = original.entities;
  }

  bool is_any_piece_moving() const {
    for (const auto& entity : entities) {
      if (entity.is_gliding) return true;
    }
    return false;
  }

  void simulate_physics(Position launch_pos, float p, float a) {
    Entity& striker = entities[0];
    striker.pos = launch_pos;
    striker.vel = {p * std::cos(a), p * std::sin(a)};
    striker.pos.x += striker.vel.vx;
    striker.pos.y += striker.vel.vy;

    uint32_t step = 0;
    while (step < MAX_STEPS) {
      apply_uniform_kinematics();
      apply_uniform_boundary_checks();
      apply_uniform_momentum_resolve();
      apply_uniform_pocketing();
      if (!is_any_piece_moving()) { break; }
      step++;
    }
  }

  float simulate_score() const {
    float total_score = 0.0f;
    for (const auto& entity : entities) {
      total_score += entity.pos.get_distance(entity.get_closest_pocket());
    }
    return total_score;
  }

  static AllEntities new_randomized_sample() {
    auto nanos = std::chrono::high_resolution_clock::now().time_since_epoch().count();
    uint32_t seed = static_cast<uint32_t>(nanos);
    auto next_rand = [&seed]() -> float {
      seed = seed * 1664525 + 1013904223;
      return static_cast<float>(seed) / static_cast<float>(UINT32_MAX);
    };

    AllEntities board;
    board.entities.fill(Entity{
      Name::BLACK, {0.0f, 0.0f}, {0.0f, 0.0f}, PIECE_RADIUS, PIECE_MASS, true, false
    });

    float striker_x = STRIKER_AREA[0].x + next_rand() * (STRIKER_AREA[1].x - STRIKER_AREA[0].x);
    board.entities[0] = Entity{
      Name::STRIKER, {striker_x, STRIKER_AREA[0].y}, {0.0f, 0.0f}, STRIKER_RADIUS, STRIKER_MASS, true, false
    };

    auto is_overlapping = [](const Position& pos, float radius, size_t count, const std::array<Entity, 20>& list) -> bool {
      for (size_t idx = 0; idx < count; idx++) {
        float min_dist = radius + list[idx].r + 0.5f;
        if (pos.get_distance(list[idx].pos) < min_dist) {
          return true;
        }
      }
      return false;
    };

    float min_x = 3.0f * U;
    float max_x = LOGICAL_WIDTH - 3.0f * U;
    float min_y = 6.0f * U;
    float max_y = LOGICAL_HEIGHT - 3.0f * U;

    std::array<Name, 19> piece_types = {{
      Name::QUEEN,
      Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE, Name::WHITE,
      Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK, Name::BLACK
    }};

    for (size_t i = 0; i < piece_types.size(); i++) {
      size_t entity_index = i + 1;
      Position spawn_pos = {0.0f, 0.0f};

      while (true) {
        spawn_pos.x = min_x + next_rand() * (max_x - min_x);
        spawn_pos.y = min_y + next_rand() * (max_y - min_y);

        if (!is_overlapping(spawn_pos, PIECE_RADIUS, entity_index, board.entities)) {
          break;
        }
      }

      board.entities[entity_index] = Entity{
        piece_types[i], spawn_pos, {0.0f, 0.0f}, PIECE_RADIUS, PIECE_MASS, true, false
      };
    }

    return board;
  }
};

// Multi-threaded AI Estimation (Equivalent to Rust Version 3)
void estimate_best_shot(const AllEntities& current_pos) {
  auto start = std::chrono::high_resolution_clock::now();
  float min_x = STRIKER_AREA[0].x;
  float max_x = STRIKER_AREA[1].x;

  std::vector<float> launch_positions;
  float x = min_x;
  while (x <= max_x) {
    launch_positions.push_back(x);
    x += 0.1f * min_x;
  }

  size_t chunk_size = (launch_positions.size() / 4) + 1;
  std::vector<std::vector<float>> chunks;
  for (size_t i = 0; i < launch_positions.size(); i += chunk_size) {
    auto last = std::min(launch_positions.size(), i + chunk_size);
    chunks.emplace_back(launch_positions.begin() + i, launch_positions.begin() + last);
  }

  // Struct to hold thread outputs
  struct ThreadResult {
    float best_score;
    float outcome_x;
    float outcome_p;
    float outcome_a;
    uint32_t iteration;
  };

  std::vector<ThreadResult> results(chunks.size());
  std::vector<std::thread> threads;
  threads.reserve(chunks.size());

  // Spawn raw native threads (closer to Rust's thread::scope performance)
  for (size_t t_idx = 0; t_idx < chunks.size(); ++t_idx) {
    threads.emplace_back([t_idx, &chunks, &current_pos, &results]() {
      AllEntities local_board = current_pos;
      float best_score = 300000.0f;
      float outcome_x = 0.0f;
      float outcome_p = 0.0f;
      float outcome_a = 0.0f;
      uint32_t iteration = 0;

      for (float launch_x : chunks[t_idx]) {
        for (float a = 0.2f; a <= (PI - 0.2f); a += 0.25f) {
          for (float p = 5.0f; p <= 15.0f; p += 5.0f) {
            Position pos = {launch_x, STRIKER_AREA[0].y};
            local_board.simulate_physics(pos, p, a);
            float score = local_board.simulate_score();

            if (score < best_score) {
              best_score = score;
              outcome_x = launch_x;
              outcome_p = p;
              outcome_a = a;
            }

            local_board.set_back(current_pos);
            iteration++;
          }
        }
      }
      results[t_idx] = {best_score, outcome_x, outcome_p, outcome_a, iteration};
    });
  }

  // Join threads
  for (auto& th : threads) {
    th.join();
  }

  // Aggregate global bests
  float global_best_score = 300000.0f;
  float global_best_x = 0.0f;
  float global_best_p = 0.0f;
  float global_best_a = 0.0f;
  uint32_t global_iter = 0;

  for (const auto& res : results) {
    global_iter += res.iteration;
    if (res.best_score < global_best_score) {
      global_best_score = res.best_score;
      global_best_x = res.outcome_x;
      global_best_p = res.outcome_p;
      global_best_a = res.outcome_a;
    }
  }

  auto end = std::chrono::high_resolution_clock::now();
  auto time = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

  std::cout << "Time for one AI simulation across 4 native threads: " << time << "ms.\n"; // takes about 90ms, slower than 80ms Rust
  std::cout << "Number of iteration: " << global_iter << ".\n";
  std::cout << "Best shot: " << global_best_x << ", " << global_best_p << ", " << global_best_a << ".\n";
}

int main() {
  std::cout << "Generating mid-gameboard state with random active pieces...\n";
  AllEntities board = AllEntities::new_randomized_sample();

  std::cout << "Testing optimized AI shot estimation across 4 threads...\n";
  estimate_best_shot(board);
  return 0;
}
