# ।। ॐ नमः शिवाय ।।
# @date 21st September, 2026
# ABSOLUTE PYTHON POWER: NumPy + fork-based multiprocessing.
# @acknowledgment DeepSeek AI wrote this version
# Pydroid-safe: no 'spawn', no __spec__ dependency, auto-fallback to serial.
# ----------------------------------------------------------------------
# Entity array layout (2D numpy, shape (20, 9), dtype float32):
#   col 0: x
#   col 1: y
#   col 2: vx
#   col 3: vy
#   col 4: r
#   col 5: mass
#   col 6: is_active  (0/1)
#   col 7: is_gliding (0/1)
#   col 8: type_id    (0=STRIKER, 1=QUEEN, 2=WHITE, 3=BLACK)
# ----------------------------------------------------------------------

import math
import time
import os
import multiprocessing as mp
import numpy as np

# ---- constants ----
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

T_STRIKER = 0
T_QUEEN   = 1
T_WHITE   = 2
T_BLACK   = 3

CORNERS = np.array([
    [U,         U],
    [39.0 * U,  U],
    [U,         39.0 * U],
    [39.0 * U,  39.0 * U],
], dtype=np.float32)

POCKET_R2 = np.float32((2.5 * U) ** 2)

STRIKER_MIN_X = OFFSET
STRIKER_MAX_X = LOGICAL_WIDTH - OFFSET
STRIKER_Y     = OFFSET - GAP

# precomputed pairwise index arrays (190 pairs)
I_IDX, J_IDX = np.triu_indices(MAX_ENTITIES, k=1)
NP_PAIRS = I_IDX.shape[0]

_f32 = np.float32


# ============================================================
# ++ PHYSICS (fully vectorized) ++
# ============================================================

def simulate(entities, launch_x, launch_y, p, a):
    """Vectorized physics on entities array. Mutates in place."""
    sx = _f32(launch_x)
    sy = _f32(launch_y)
    vx = _f32(p * math.cos(a))
    vy = _f32(p * math.sin(a))
    entities[0, 0] = sx + vx
    entities[0, 1] = sy + vy
    entities[0, 2] = vx
    entities[0, 3] = vy
    entities[0, 6] = 1.0
    entities[0, 7] = 1.0

    LW = _f32(LOGICAL_WIDTH)
    LH = _f32(LOGICAL_HEIGHT)
    OMFR = _f32(ONE_MINUS_FRICTION)
    MTR2 = _f32(MT2)
    SMALL = _f32(1e-6)

    for _step in range(MAX_STEPS):
        # 1. KINEMATICS
        active = entities[:, 6] != 0.0
        vx_all = entities[:, 2]
        vy_all = entities[:, 3]
        sp2 = vx_all * vx_all + vy_all * vy_all

        moving = active & (sp2 > SMALL)
        still  = active & (sp2 <= SMALL)

        entities[moving, 2] = vx_all[moving] * OMFR
        entities[moving, 3] = vy_all[moving] * OMFR
        entities[moving, 0] = entities[moving, 0] + entities[moving, 2]
        entities[moving, 1] = entities[moving, 1] + entities[moving, 3]
        entities[moving, 7] = 1.0

        entities[still, 2] = 0.0
        entities[still, 3] = 0.0
        entities[still, 7] = 0.0

        # 2. BOUNDARY COLLISIONS
        act = entities[:, 6] != 0.0
        r = entities[:, 4]
        x = entities[:, 0]
        y = entities[:, 1]

        left   = act & (x <= r)
        right  = act & (x >= LW - r)
        top    = act & (y <= r)
        bottom = act & (y >= LH - r)

        if left.any():
            entities[left, 0] = r[left]
            entities[left, 2] = -entities[left, 2]
        if right.any():
            entities[right, 0] = LW - r[right]
            entities[right, 2] = -entities[right, 2]
        if top.any():
            entities[top, 1] = r[top]
            entities[top, 3] = -entities[top, 3]
        if bottom.any():
            entities[bottom, 1] = LH - r[bottom]
            entities[bottom, 3] = -entities[bottom, 3]

        # 3. MOMENTUM RESOLVE — pull data, then scatter
        x_i = entities[I_IDX, 0]; y_i = entities[I_IDX, 1]
        x_j = entities[J_IDX, 0]; y_j = entities[J_IDX, 1]
        r_i = entities[I_IDX, 4]; r_j = entities[J_IDX, 4]
        m_i = entities[I_IDX, 5]; m_j = entities[J_IDX, 5]
        vx_i = entities[I_IDX, 2]; vy_i = entities[I_IDX, 3]
        vx_j = entities[J_IDX, 2]; vy_j = entities[J_IDX, 3]
        act_i = entities[I_IDX, 6]; act_j = entities[J_IDX, 6]
        gl_i  = entities[I_IDX, 7]; gl_j  = entities[J_IDX, 7]
        t_i   = entities[I_IDX, 8]; t_j   = entities[J_IDX, 8]

        dx = x_j - x_i
        dy = y_j - y_i
        min_d = r_i + r_j
        d2 = dx * dx + dy * dy

        both_active = (act_i != 0.0) | (act_j != 0.0)
        any_gl_or_striker = ((gl_i != 0.0) | (gl_j != 0.0)
                             | (t_i == T_STRIKER) | (t_j == T_STRIKER))
        colliding = (both_active
                     & any_gl_or_striker
                     & (d2 < min_d * min_d)
                     & (d2 > 0.0))

        if colliding.any():
            d = np.sqrt(d2[colliding])
            overlap = min_d[colliding] - d
            nx = dx[colliding] / d
            ny = dy[colliding] / d
            half = overlap * _f32(0.5)

            i_c = I_IDX[colliding]
            j_c = J_IDX[colliding]

            np.add.at(entities, (i_c, 0), -nx * half)
            np.add.at(entities, (i_c, 1), -ny * half)
            np.add.at(entities, (j_c, 0),  nx * half)
            np.add.at(entities, (j_c, 1),  ny * half)

            rx = vx_i[colliding] - vx_j[colliding]
            ry = vy_i[colliding] - vy_j[colliding]
            rv = rx * nx + ry * ny

            resolve = rv >= 0.0
            if resolve.any():
                i_r = i_c[resolve]
                j_r = j_c[resolve]
                nxr = nx[resolve]
                nyr = ny[resolve]
                rvr = rv[resolve]
                m_ir = m_i[colliding][resolve]
                m_jr = m_j[colliding][resolve]

                impulse = (MTR2 * rvr) / (m_ir + m_jr)

                dvx_i = -impulse * nxr * m_jr
                dvy_i = -impulse * nyr * m_jr
                dvx_j =  impulse * nxr * m_ir
                dvy_j =  impulse * nyr * m_ir

                np.add.at(entities, (i_r, 2), dvx_i)
                np.add.at(entities, (i_r, 3), dvy_i)
                np.add.at(entities, (j_r, 2), dvx_j)
                np.add.at(entities, (j_r, 3), dvy_j)

        # 4. POCKETING
        act = entities[:, 6] != 0.0
        is_piece = entities[:, 8] != T_STRIKER
        pocket_candidate = act & is_piece

        if pocket_candidate.any():
            idx = np.where(pocket_candidate)[0]
            px = entities[idx, 0][:, None]
            py = entities[idx, 1][:, None]
            cdx = px - CORNERS[None, :, 0]
            cdy = py - CORNERS[None, :, 1]
            cdist2 = cdx * cdx + cdy * cdy
            pocketed = (cdist2 <= POCKET_R2).any(axis=1)
            if pocketed.any():
                pidx = idx[pocketed]
                entities[pidx, 6] = 0.0
                entities[pidx, 7] = 0.0
                entities[pidx, 2] = 0.0
                entities[pidx, 3] = 0.0

        # 5. STOP CHECK
        if not (entities[:, 7] != 0.0).any():
            break

    return entities


def simulate_score(entities):
    """Vectorized: sum of distances from each active non-striker to nearest pocket."""
    act = entities[:, 6] != 0.0
    is_piece = entities[:, 8] != T_STRIKER
    mask = act & is_piece
    if not mask.any():
        return 0.0

    px = entities[mask, 0][:, None]
    py = entities[mask, 1][:, None]
    cdx = px - CORNERS[None, :, 0]
    cdy = py - CORNERS[None, :, 1]
    cdist2 = cdx * cdx + cdy * cdy
    nearest = np.sqrt(cdist2.min(axis=1))
    return float(nearest.sum())


# ============================================================
# ++ SEARCH SPACE ++
# ============================================================

def build_search_space():
    xs = np.arange(STRIKER_MIN_X, STRIKER_MAX_X + 1e-6,
                   0.1 * STRIKER_MIN_X, dtype=np.float32)
    angles = np.arange(0.2, PI - 0.2 + 1e-6, 0.25, dtype=np.float32)
    ps = np.arange(5.0, 15.0 + 1e-6, 5.0, dtype=np.float32)

    # careful: we want (x, a, p) -> then convert to (x, p, a) tuples
    grid = np.stack(np.meshgrid(xs, angles, ps, indexing='ij'), axis=-1)
    flat = grid.reshape(-1, 3)
    return [(float(x), float(p), float(a)) for x, a, p in flat]


# ============================================================
# ++ CHUNK RUNNER (used by both serial & parallel paths) ++
# ============================================================

def _run_chunk(original_arr, subset):
    """Run a subset of shots on a copy of the board. Returns best."""
    working = original_arr.copy()
    snap = original_arr.copy()

    best_score = 3.0e8
    outcome_x = STRIKER_MIN_X
    outcome_p = 5.0
    outcome_a = 0.2
    outcome_local_it = -1

    for local_it, (x, p, a) in enumerate(subset):
        simulate(working, x, STRIKER_Y, p, a)
        s = simulate_score(working)
        if s < best_score:
            best_score = s
            outcome_x = x
            outcome_p = p
            outcome_a = a
            outcome_local_it = local_it
        working[:] = snap

    return (best_score, outcome_x, outcome_p, outcome_a)


# ============================================================
# ++ WORKER (top-level so 'fork' can pickle it) ++
# ============================================================

def worker(args):
    """Pool worker. args = (chunk_id, original_bytes, subset)."""
    _chunk_id, original_bytes, subset = args
    original = np.frombuffer(original_bytes, dtype=np.float32).reshape(
        MAX_ENTITIES, 9).copy()
    return _run_chunk(original, subset)


# ============================================================
# ++ MULTIPROCESSING PROBE (Pydroid-safe) ++
# ============================================================

def _try_fork():
    """Return a fork context if it actually works, else None."""
    try:
        ctx = mp.get_context("fork")
    except (RuntimeError, ValueError):
        return None
    try:
        q = ctx.Queue()
        def _probe(q):
            q.put(1)
        p = ctx.Process(target=_probe, args=(q,))
        p.start()
        p.join(timeout=5)
        if p.exitcode != 0:
            return None
        # drain queue so it doesn't leak
        try:
            q.get_nowait()
        except Exception:
            pass
        return ctx
    except Exception:
        return None


# ============================================================
# ++ ORCHESTRATOR ++
# ============================================================

def estimate_best_shot(entities):
    t0 = time.perf_counter()

    space = build_search_space()
    n = len(space)
    print(f"Total search space: {n} combinations.")

    ctx = _try_fork()
    use_mp = ctx is not None
    n_cores = (4) if use_mp else 1
    print(f"Multiprocessing: {'ON' if use_mp else 'OFF (serial fallback)'} "
          f"| cores: {n_cores}")

    best_score = 3.0e8
    best_x = STRIKER_MIN_X
    best_p = 5.0
    best_a = 0.2

    if not use_mp:
        # ---- SERIAL ----
        best_score, best_x, best_p, best_a = _run_chunk(entities, space)
    else:
        # ---- PARALLEL (fork Pool) ----
        original_bytes = entities.tobytes()
        chunks = [space[i::n_cores] for i in range(n_cores)]
        tasks = [(k, original_bytes, chunks[k]) for k in range(n_cores)]

        try:
            with ctx.Pool(processes=n_cores) as pool:
                for (s, x, p, a) in pool.map(worker, tasks):
                    if s < best_score:
                        best_score = s
                        best_x = x
                        best_p = p
                        best_a = a
        except Exception as e:
            print(f"Parallel failed ({e}); falling back to serial.")
            best_score, best_x, best_p, best_a = _run_chunk(entities, space)

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    print(f"Time for one AI simulation: {elapsed_ms:.0f}ms.")
    print(f"Number of iterations: {n}.")
    print(f"Best shot: {best_x}, {best_p}, {best_a}.")
    print(f"Best score: {best_score}.")


# ============================================================
# ++ BOARD SAMPLER ++
# ============================================================

def new_randomized_sample():
    rng = np.random.default_rng()

    arr = np.zeros((MAX_ENTITIES, 9), dtype=np.float32)

    sx = STRIKER_MIN_X + rng.random() * (STRIKER_MAX_X - STRIKER_MIN_X)
    arr[0] = [sx, STRIKER_Y, 0, 0,
              STRIKER_RADIUS, STRIKER_MASS,
              1, 0, T_STRIKER]

    types = [T_QUEEN] + [T_WHITE] * 9 + [T_BLACK] * 9

    min_x = 3.0 * U
    max_x = LOGICAL_WIDTH  - 3.0 * U
    min_y = 6.0 * U
    max_y = LOGICAL_HEIGHT - 3.0 * U

    positions = []
    for t in types:
        while True:
            x = min_x + rng.random() * (max_x - min_x)
            y = min_y + rng.random() * (max_y - min_y)
            ok = True
            for (px, py, pr) in positions:
                ddx = x - px
                ddy = y - py
                gap = PIECE_RADIUS + pr + 0.5
                if ddx * ddx + ddy * ddy < gap * gap:
                    ok = False
                    break
            if ok:
                ddx = x - sx
                ddy = y - STRIKER_Y
                gap = PIECE_RADIUS + STRIKER_RADIUS + 0.5
                if ddx * ddx + ddy * ddy < gap * gap:
                    ok = False
            if ok:
                positions.append((x, y, PIECE_RADIUS))
                break

    for k, t in enumerate(types):
        x, y, _r = positions[k]
        arr[k + 1] = [x, y, 0, 0, PIECE_RADIUS, PIECE_MASS, 1, 0, t]

    return arr


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
  Total search space: 1485 combinations.
  Multiprocessing: ON | cores: 4
  Time for one AI simulation: 43140ms.
  Number of iterations: 1485.
  Best shot: 112.11199951171875, 15.0, 1.1999999284744263.
  Best score: 1014.4178466796875.

  [Program finished]

  Took about 43s
"""