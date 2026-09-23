# ।। ॐ नमः शिवाय ।।
# @date 21st September, 2026
# Absolute max pure-CPython optimization.
# @acknowledgement DeepSeek AI wrote this version
# Flat lists, no objects in hot loop, inlined pipeline, snapshot reset.
# ----------------------------------------------------------------------
# Entity layout (list of floats, index):
#   0: x
#   1: y
#   2: vx
#   3: vy
#   4: r
#   5: mass
#   6: is_active  (0.0 / 1.0)
#   7: is_gliding (0.0 / 1.0)
#   8: type_id    (0 = STRIKER, 1 = QUEEN, 2 = WHITE, 3 = BLACK)
# ----------------------------------------------------------------------

import math
import time

# --- constants ---
UW = 3.84
UH = 6.94
U = (UW + UH) * 0.5
PI = math.pi

LOGICAL_WIDTH  = 40.0 * UH
LOGICAL_HEIGHT = 40.0 * UH

OFFSET = 8.0 * U
GAP    = 4.0 * U

FRICTION = 0.03
ONE_MINUS_FRICTION = 1.0 - FRICTION
MOMENTUM_TRANSFER_RATIO = 0.85
MT2 = MOMENTUM_TRANSFER_RATIO * 2.0

MAX_STEPS = 240
MAX_ENTITIES = 20

STRIKER_RADIUS = 1.8 * U
STRIKER_MASS   = PI * STRIKER_RADIUS * STRIKER_RADIUS
PIECE_RADIUS   = 1.4 * U
PIECE_MASS     = PI * PIECE_RADIUS * PIECE_RADIUS

# type ids
T_STRIKER = 0
T_QUEEN   = 1
T_WHITE   = 2
T_BLACK   = 3

# corners as flat tuples (cx, cy)
CORNERS = (
    (U,        U),
    (39.0 * U, U),
    (U,        39.0 * U),
    (39.0 * U, 39.0 * U),
)
POCKET_R2 = (2.5 * U) * (2.5 * U)

# striker area
STRIKER_MIN_X = OFFSET
STRIKER_MAX_X = LOGICAL_WIDTH - OFFSET
STRIKER_Y     = OFFSET - GAP

# local-bound math functions (locals are faster than module attribute lookup)
_sqrt = math.sqrt
_cos  = math.cos
_sin  = math.sin

# precomputed wall limits
RW_LIMIT = LOGICAL_WIDTH  # right wall x-coordinate
BH_LIMIT = LOGICAL_HEIGHT # bottom wall y-coordinate


# ============================================================
# ++ PHYSICS PIPELINE (fully inlined) ++
# ============================================================

def _simulate(entities, launch_x, launch_y, p, a):
    """
    One full shot simulation on a flat list-of-lists.
    Mutates `entities` in place.
    """
    # ---- launch striker ----
    s = entities[0]
    s[0] = launch_x
    s[1] = launch_y
    vx = p * _cos(a)
    vy = p * _sin(a)
    s[2] = vx
    s[3] = vy
    s[6] = 1.0          # is_active
    s[7] = 1.0          # is_gliding
    s[0] += vx
    s[1] += vy

    # ---- local bindings (crucial for CPython speed) ----
    ents = entities
    N = MAX_ENTITIES
    LW = LOGICAL_WIDTH
    LH = LOGICAL_HEIGHT
    OMFR = ONE_MINUS_FRICTION
    MTR2 = MT2

    step = 0
    while step < MAX_STEPS:
        # ============================================
        # 1. KINEMATICS  (all entities)
        # ============================================
        for e in ents:
            if e[6] == 0.0:
                continue
            ex = e[2]; ey = e[3]
            sp2 = ex * ex + ey * ey
            if sp2 <= 1e-6:       # speed <= 0.001
                e[2] = 0.0
                e[3] = 0.0
                e[7] = 0.0
            else:
                ex *= OMFR
                ey *= OMFR
                e[2] = ex
                e[3] = ey
                e[0] += ex
                e[1] += ey
                e[7] = 1.0

        # ============================================
        # 2. BOUNDARY COLLISIONS (all entities)
        # ============================================
        for e in ents:
            if e[6] == 0.0:
                continue
            r = e[4]
            x = e[0]; y = e[1]
            if x <= r:
                e[0] = r
                e[2] = -e[2]
            elif x >= LW - r:
                e[0] = LW - r
                e[2] = -e[2]
            if y <= r:
                e[1] = r
                e[3] = -e[3]
            elif y >= LH - r:
                e[1] = LH - r
                e[3] = -e[3]

        # ============================================
        # 3. MOMENTUM RESOLVE (all pairs)
        # ============================================
        # Fully inlined pair loop. No helper calls.
        i = 0
        while i < N - 1:
            a_e = ents[i]
            a_act = a_e[6]
            a_gl  = a_e[7]
            a_t   = a_e[8]
            a_x   = a_e[0]; a_y = a_e[1]
            a_r   = a_e[4]; a_m = a_e[5]
            a_vx  = a_e[2]; a_vy = a_e[3]

            j = i + 1
            while j < N:
                b_e = ents[j]
                if a_act == 0.0 and b_e[6] == 0.0:
                    j += 1
                    continue
                if (a_gl == 0.0 and b_e[7] == 0.0
                        and a_t != T_STRIKER and b_e[8] != T_STRIKER):
                    j += 1
                    continue

                b_x = b_e[0]; b_y = b_e[1]
                dx = b_x - a_x
                dy = b_y - a_y
                min_d = a_r + b_e[4]
                d2 = dx * dx + dy * dy

                if d2 < min_d * min_d and d2 > 0.0:
                    d = _sqrt(d2)
                    overlap = min_d - d
                    nx = dx / d
                    ny = dy / d

                    half_ov = overlap * 0.5
                    a_x -= nx * half_ov
                    a_y -= ny * half_ov
                    b_e[0] = b_x + nx * half_ov
                    b_e[1] = b_y + ny * half_ov

                    b_vx = b_e[2]; b_vy = b_e[3]
                    rx = a_vx - b_vx
                    ry = a_vy - b_vy
                    rv = rx * nx + ry * ny

                    if rv >= 0.0:
                        b_m = b_e[5]
                        impulse = (MTR2 * rv) / (a_m + b_m)
                        a_vx -= impulse * nx * b_m
                        a_vy -= impulse * ny * b_m
                        b_e[2] = b_vx + impulse * nx * a_m
                        b_e[3] = b_vy + impulse * ny * a_m

                j += 1

            # write back a's mutated values
            a_e[0] = a_x
            a_e[1] = a_y
            a_e[2] = a_vx
            a_e[3] = a_vy
            i += 1

        # ============================================
        # 4. POCKETING
        # ============================================
        for e in ents:
            if e[6] == 0.0 or e[8] == T_STRIKER:
                continue
            ex = e[0]; ey = e[1]
            for cx, cy in CORNERS:
                dx = ex - cx; dy = ey - cy
                if dx * dx + dy * dy <= POCKET_R2:
                    e[6] = 0.0
                    e[7] = 0.0
                    e[2] = 0.0
                    e[3] = 0.0
                    break

        # ============================================
        # 5. STOP CHECK
        # ============================================
        moving = False
        for e in ents:
            if e[7] == 1.0:
                moving = True
                break
        if not moving:
            break

        step += 1

    return entities


# ============================================================
# ++ SCORING (inlined) ++
# ============================================================

def _simulate_score(entities):
    """
    Sum of distance from each active non-striker entity to its nearest pocket.
    """
    total = 0.0
    for e in entities:
        if e[6] == 0.0:
            continue
        ex = e[0]; ey = e[1]

        # corner 0
        dx = ex - CORNERS[0][0]; dy = ey - CORNERS[0][1]
        best = dx * dx + dy * dy
        # corner 1
        dx = ex - CORNERS[1][0]; dy = ey - CORNERS[1][1]
        d2 = dx * dx + dy * dy
        if d2 < best: best = d2
        # corner 2
        dx = ex - CORNERS[2][0]; dy = ey - CORNERS[2][1]
        d2 = dx * dx + dy * dy
        if d2 < best: best = d2
        # corner 3
        dx = ex - CORNERS[3][0]; dy = ey - CORNERS[3][1]
        d2 = dx * dx + dy * dy
        if d2 < best: best = d2

        total += _sqrt(best)

    return total


# ============================================================
# ++ SNAPSHOT (fast reset) ++
# ============================================================

def _snapshot(entities):
    # Each entity is a list; list(e) is a C-level shallow copy.
    return [e[:] for e in entities]


def _restore(entities, snap):
    # Slice assignment at C level, no attribute writes.
    for i in range(MAX_ENTITIES):
        entities[i][:] = snap[i]


# ============================================================
# ++ AI LOOP ++
# ============================================================

def estimate_best_shot(entities):
    t0 = time.perf_counter()

    snapshot = _snapshot(entities)

    best_score = 3.0e8
    outcome_x  = STRIKER_MIN_X
    outcome_p  = 5.0
    outcome_a  = 0.2
    outcome_it = 0
    iteration  = 0

    # local binds
    sim   = _simulate
    score = _simulate_score
    restore = _restore
    snap  = snapshot
    ents  = entities

    x_step  = 0.1 * STRIKER_MIN_X
    launch_x = STRIKER_MIN_X
    max_x    = STRIKER_MAX_X
    y        = STRIKER_Y

    # precompute angle list once — avoids repeated `a += 0.25` float drift
    angles = []
    a = 0.2
    a_max = PI - 0.2
    while a <= a_max:
        angles.append(a)
        a += 0.25

    while launch_x <= max_x:
        for a in angles:
            p = 5.0
            while p <= 15.0:
                sim(ents, launch_x, y, p, a)
                s = score(ents)
                if s < best_score:
                    best_score = s
                    outcome_x  = launch_x
                    outcome_p  = p
                    outcome_a  = a
                    outcome_it = iteration
                restore(ents, snap)
                p += 5.0
                iteration += 1
        launch_x += x_step

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    print(f"Time for one AI simulation: {elapsed_ms:.0f}ms.")
    print(f"Number of iteration: {iteration}.")
    print(f"Best shot: {outcome_x}, {outcome_p}, {outcome_a}.")
    print(f"Found at iteration: {outcome_it}.")


# ============================================================
# ++ BOARD SAMPLER ++
# ============================================================

def new_randomized_sample():
    seed = time.time_ns() & 0xFFFFFFFF

    def rnd():
        nonlocal seed
        seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
        return seed / 4294967295.0

    entities = []

    # striker
    sx = STRIKER_MIN_X + rnd() * (STRIKER_MAX_X - STRIKER_MIN_X)
    entities.append([
        sx, STRIKER_Y, 0.0, 0.0,
        STRIKER_RADIUS, STRIKER_MASS,
        1.0, 0.0, float(T_STRIKER)
    ])

    types = ([T_QUEEN]
             + [T_WHITE] * 9
             + [T_BLACK] * 9)

    min_x = 3.0 * U
    max_x = LOGICAL_WIDTH  - 3.0 * U
    min_y = 6.0 * U
    max_y = LOGICAL_HEIGHT - 3.0 * U

    for t in types:
        while True:
            x = min_x + rnd() * (max_x - min_x)
            y = min_y + rnd() * (max_y - min_y)
            ok = True
            for e in entities:
                dx = x - e[0]; dy = y - e[1]
                gap = PIECE_RADIUS + e[4] + 0.5
                if dx * dx + dy * dy < gap * gap:
                    ok = False
                    break
            if ok:
                break
        entities.append([
            x, y, 0.0, 0.0,
            PIECE_RADIUS, PIECE_MASS,
            1.0, 0.0, float(t)
        ])

    return entities


# ============================================================
# ++ MAIN ++
# ============================================================

def main():
    print("Generating mid-gameboard state with random active pieces...")
    board = new_randomized_sample()

    print("Testing AI shot estimation on randomized layout...")
    estimate_best_shot(board)


if __name__ == "__main__":
    main()

"""
  Generating mid-gameboard state with random active pieces...
  Testing AI shot estimation on randomized layout...
  Time for one AI simulation: 30790ms.
  Number of iteration: 1485.
  Best shot: 116.42399999999996, 15.0, 1.7.
  Found at iteration: 581.

  [Program finished]

  Took about 30s
"""