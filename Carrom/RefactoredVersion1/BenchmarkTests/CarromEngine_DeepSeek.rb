# ।। ॐ नमः शिवाय ।। \\

# @date 17th October, 2026
# Optimized Ruby port of CarromEngine.rs
# Same constants, same physics pipeline, same AI search — just faster.
# @acknowledgement Ported by DeepSeek AI

require 'securerandom'

module Carrom
  # ---------------- constants (unchanged) ----------------
  UW = 3.84
  UH = 6.94
  U  = (UW + UH) / 2.0

  LOGICAL_WIDTH  = 40.0 * UH
  LOGICAL_HEIGHT = 40.0 * UH

  OFFSET = 8.0 * U
  GAP    = 4.0 * U

  PI = Math::PI
  STRIKER_RADIUS = 1.8 * U
  STRIKER_MASS   = PI * (STRIKER_RADIUS * STRIKER_RADIUS)
  PIECE_RADIUS   = 1.4 * U
  PIECE_MASS     = PI * (PIECE_RADIUS * PIECE_RADIUS)

  FRICTION                = 0.03
  MOMENTUM_TRANSFER_RATIO = 0.85
  MAX_STEPS               = 240
  MAX_ENTITIES            = 20

  # Flat arrays — indexed [i] — that back every entity in the hot loop.
  # Index 0 is always the striker.
  class Board
    attr_accessor :px, :py, :vx, :vy,
                  :type, :r, :mass, :active, :gliding

    def initialize
      @px      = Array.new(MAX_ENTITIES, 0.0)
      @py      = Array.new(MAX_ENTITIES, 0.0)
      @vx      = Array.new(MAX_ENTITIES, 0.0)
      @vy      = Array.new(MAX_ENTITIES, 0.0)
      @type    = Array.new(MAX_ENTITIES, :BLACK)
      @r       = Array.new(MAX_ENTITIES, PIECE_RADIUS)
      @mass    = Array.new(MAX_ENTITIES, PIECE_MASS)
      @active  = Array.new(MAX_ENTITIES, true)
      @gliding = Array.new(MAX_ENTITIES, false)
    end

    # Snapshot only the fields that change during simulation.
    # Returns a Hash of frozen arrays (we replace, not mutate, on restore).
    def snapshot
      {
        px:      @px.dup, py:      @py.dup,
        vx:      @vx.dup, vy:      @vy.dup,
        active:  @active.dup, gliding: @gliding.dup
      }
    end

    # Restore via Array#replace — O(n) memcpy, no allocation per element.
    def restore!(snap)
      @px.replace(snap[:px])
      @py.replace(snap[:py])
      @vx.replace(snap[:vx])
      @vy.replace(snap[:vy])
      @active.replace(snap[:active])
      @gliding.replace(snap[:gliding])
    end

    def is_any_piece_moving?
      @gliding.any?
    end

    # ------------------------------------------------------------------
    # The entire physics step, inlined. Called up to 240× per simulation.
    # We avoid all method dispatch and all intermediate object creation.
    # ------------------------------------------------------------------
    def step!
      px = @px; py = @py; vx = @vx; vy = @vy
      r  = @r;  mass = @mass
      active = @active; gliding = @gliding

      # --- 1. kinematics + 2. boundary (fused per entity) ---
      i = 0
      while i < MAX_ENTITIES
        if active[i]
          spd2 = vx[i] * vx[i] + vy[i] * vy[i]
          if spd2 <= 1.0e-6            # speed <= 0.001 squared
            vx[i] = 0.0
            vy[i] = 0.0
            gliding[i] = false
          else
            f = 1.0 - FRICTION
            vx[i] *= f
            vy[i] *= f
            px[i] += vx[i]
            py[i] += vy[i]
            gliding[i] = true
          end

          # boundary bounce (only if active)
          ri = r[i]
          if px[i] <= ri
            px[i] = ri; vx[i] = -vx[i]
          elsif px[i] >= LOGICAL_WIDTH - ri
            px[i] = LOGICAL_WIDTH - ri; vx[i] = -vx[i]
          end
          if py[i] <= ri
            py[i] = ri; vy[i] = -vy[i]
          elsif py[i] >= LOGICAL_HEIGHT - ri
            py[i] = LOGICAL_HEIGHT - ri; vy[i] = -vy[i]
          end
        end
        i += 1
      end

      # --- 3. pairwise momentum resolution ---
      i = 0
      while i < MAX_ENTITIES - 1
        j = i + 1
        while j < MAX_ENTITIES
          ai = active[i]; aj = active[j]
          gi = gliding[i]; gj = gliding[j]
          ti = @type[i]; tj = @type[j]

          # early exits (same as Rust)
          unless (!ai && !aj) ||
                 (!gi && !gj && ti != :STRIKER && tj != :STRIKER)
            min_dist = r[i] + r[j]
            dx = px[j] - px[i]
            dy = py[j] - py[i]
            dist2 = dx * dx + dy * dy
            if dist2 < min_dist * min_dist && dist2 > 0.0
              dist = Math.sqrt(dist2)
              overlap = min_dist - dist
              nx = dx / dist
              ny = dy / dist

              px[i] -= nx * (overlap * 0.5)
              py[i] -= ny * (overlap * 0.5)
              px[j] += nx * (overlap * 0.5)
              py[j] += ny * (overlap * 0.5)

              rx = vx[i] - vx[j]
              ry = vy[i] - vy[j]
              rv = rx * nx + ry * ny
              if rv >= 0.0
                inv = (MOMENTUM_TRANSFER_RATIO * 2.0 * rv) / (mass[i] + mass[j])
                ix = inv * nx
                iy = inv * ny
                vx[i] -= ix * mass[j]
                vy[i] -= iy * mass[j]
                vx[j] += ix * mass[i]
                vy[j] += iy * mass[i]
              end
            end
          end
          j += 1
        end
        i += 1
      end

      # --- 4. pocketing ---
      # Precompute corner coords & pocket radius (squared compare).
      pock2 = (2.5 * U) * (2.5 * U)
      corners_x = [U, 39.0 * U, U, 39.0 * U]
      corners_y = [U, U, 39.0 * U, 39.0 * U]

      i = 1                           # skip striker
      while i < MAX_ENTITIES
        if active[i]
          xi = px[i]; yi = py[i]
          k = 0
          while k < 4
            dx = corners_x[k] - xi
            dy = corners_y[k] - yi
            if dx * dx + dy * dy <= pock2
              active[i]  = false
              gliding[i] = false
              vx[i] = 0.0
              vy[i] = 0.0
              break
            end
            k += 1
          end
        end
        i += 1
      end
    end

    # score = sum of distance-to-nearest-pocket over all entities
    def score
      cx = [U, 39.0 * U, U, 39.0 * U]
      cy = [U, U, 39.0 * U, 39.0 * U]
      total = 0.0
      i = 0
      while i < MAX_ENTITIES
        xi = @px[i]; yi = @py[i]
        best = Float::INFINITY
        k = 0
        while k < 4
          dx = cx[k] - xi
          dy = cy[k] - yi
          d = dx * dx + dy * dy
          best = d if d < best
          k += 1
        end
        total += Math.sqrt(best)
        i += 1
      end
      total
    end

    def simulate!(launch_x, launch_y, p, a)
      cos_a = Math.cos(a)
      sin_a = Math.sin(a)

      # launch striker (index 0)
      @px[0] = launch_x + p * cos_a
      @py[0] = launch_y + p * sin_a
      @vx[0] = p * cos_a
      @vy[0] = p * sin_a
      @active[0]  = true
      @gliding[0] = true

      step = 0
      while step < MAX_STEPS
        step!
        break unless is_any_piece_moving?
        step += 1
      end
    end

    # Build a Board from an Entity-style object list (kept for API parity).
    def self.from_entities(entities)
      b = new
      entities.each_with_index do |e, i|
        b.px[i] = e.pos.x
        b.py[i] = e.pos.y
        b.vx[i] = e.vel.vx
        b.vy[i] = e.vel.vy
        b.type[i] = e.type_name
        b.r[i] = e.r
        b.mass[i] = e.mass
        b.active[i] = e.is_active
        b.gliding[i] = e.is_gliding
      end
      b
    end

    def self.new_randomized_sample
      seed = SecureRandom.random_number(2**32)
      next_rand = lambda do
        seed = (seed * 1_664_525 + 1_013_904_223) & 0xFFFF_FFFF
        seed.to_f / 0xFFFF_FFFF
      end

      b = new

      # striker
      striker_x = STRIKER_AREA_X0 + next_rand.call * (STRIKER_AREA_X1 - STRIKER_AREA_X0)
      b.px[0] = striker_x
      b.py[0] = STRIKER_AREA_Y
      b.type[0] = :STRIKER
      b.r[0] = STRIKER_RADIUS
      b.mass[0] = STRIKER_MASS

      is_overlapping = lambda do |x, y, radius, count|
        (0...count).any? do |idx|
          min = radius + b.r[idx] + 0.5
          dx = x - b.px[idx]
          dy = y - b.py[idx]
          dx * dx + dy * dy < min * min
        end
      end

      min_x = 3.0 * U
      max_x = LOGICAL_WIDTH - 3.0 * U
      min_y = 6.0 * U
      max_y = LOGICAL_HEIGHT - 3.0 * U

      piece_types = [:QUEEN, *Array.new(9, :WHITE), *Array.new(9, :BLACK)]

      piece_types.each_with_index do |t, i|
        idx = i + 1
        x = y = 0.0
        loop do
          x = min_x + next_rand.call * (max_x - min_x)
          y = min_y + next_rand.call * (max_y - min_y)
          break unless is_overlapping.call(x, y, PIECE_RADIUS, idx)
        end
        b.px[idx] = x
        b.py[idx] = y
        b.type[idx] = t
        b.r[idx] = PIECE_RADIUS
        b.mass[idx] = PIECE_MASS
      end
      b
    end
  end

  STRIKER_AREA_X0 = OFFSET
  STRIKER_AREA_X1 = LOGICAL_WIDTH - OFFSET
  STRIKER_AREA_Y  = OFFSET - GAP

  # ------------------------------------------------------------------
  # AI search. Same grid, same scoring, same outputs — just tight.
  # ------------------------------------------------------------------
  def self.estimate_best_shot(board)
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    snap        = board.snapshot
    best_score  = 300_000.0
    outcome_x   = STRIKER_AREA_X0
    outcome_p   = 5.0
    outcome_a   = 0.2
    outcome_it  = 0
    iteration   = 0

    min   = STRIKER_AREA_X0
    max_x = STRIKER_AREA_X1
    y     = STRIKER_AREA_Y

    # Precompute the p-grid (5,10,15) and angle grid — constant across launches.
    ps = [5.0, 10.0, 15.0]

    launch_x = min
    while launch_x <= max_x
      a = 0.2
      while a <= PI - 0.2
        ps.each do |p|
          board.simulate!(launch_x, y, p, a)
          s = board.score
          if s < best_score
            best_score = s
            outcome_x  = launch_x
            outcome_p  = p
            outcome_a  = a
            outcome_it = iteration
          end
          board.restore!(snap)
          iteration += 1
        end
        a += 0.25
      end
      launch_x += 0.1 * min
    end

    elapsed = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000.0
    puts "Time for one AI simulation: #{elapsed.round}ms."
    puts "Number of iteration: #{iteration}."
    puts "Best shot: #{outcome_x}, #{outcome_p}, #{outcome_a}."
    puts "Found at iteration: #{outcome_it}."
  end
end

# ==========================
# ++ MAIN ++
# ==========================
puts "Generating mid-gameboard state with random active pieces..."
board = Carrom::Board.new_randomized_sample

puts "Testing AI shot estimation on randomized layout..."
Carrom.estimate_best_shot(board) # took 17s