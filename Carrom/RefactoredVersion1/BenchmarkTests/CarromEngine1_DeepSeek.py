# ।। ॐ नमः शिवाय ।।
# @date 21st September, 2026
# Carrom physics + AI engine — Python port
# Mirrors CarromEngine.rs and the CarromAI.js / Engine.js pair.
# @acknowledgement DeepSeek AI wrote this version

import math
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import List


# ============================================================
# ++ SETUP ++
# ============================================================

UW = 3.84
UH = 6.94
U = (UW + UH) / 2.0

PI = math.pi

LOGICAL_WIDTH  = 40.0 * UH
LOGICAL_HEIGHT = 40.0 * UH

OFFSET = 8.0 * U
GAP    = 4.0 * U

FRICTION = 0.03
MOMENTUM_TRANSFER_RATIO = 0.85
MAX_STEPS = 240
MAX_ENTITIES = 20


# ============================================================
# ++ DATA TYPES ++
# ============================================================

class Name(Enum):
    STRIKER = auto()
    QUEEN   = auto()
    WHITE   = auto()
    BLACK   = auto()


@dataclass
class Position:
    x: float = 0.0
    y: float = 0.0

    def get_length(self) -> float:
        return math.sqrt(self.x * self.x + self.y * self.y)

    def update(self, vel: "Velocity") -> None:
        self.x += vel.vx
        self.y += vel.vy

    def get_distance(self, other: "Position") -> float:
        dx = other.x - self.x
        dy = other.y - self.y
        return math.sqrt(dx * dx + dy * dy)


@dataclass
class Velocity:
    vx: float = 0.0
    vy: float = 0.0

    def get_speed(self) -> float:
        return math.sqrt(self.vx * self.vx + self.vy * self.vy)

    def decelerate(self, friction: float) -> None:
        self.vx *= (1.0 - friction)
        self.vy *= (1.0 - friction)


# --- board geometry ---

BOARD_DIMENSIONS = [
    Position(0.0,           0.0),
    Position(LOGICAL_WIDTH, 0.0),
    Position(0.0,           LOGICAL_HEIGHT),
    Position(LOGICAL_WIDTH, LOGICAL_HEIGHT),
]

BOARD_CORNERS = [
    Position(U,         U),
    Position(39.0 * U,  U),
    Position(U,         39.0 * U),
    Position(39.0 * U,  39.0 * U),
]

STRIKER_AREA = [
    Position(OFFSET,                 OFFSET - GAP),
    Position(LOGICAL_WIDTH - OFFSET, OFFSET - GAP),
]

STRIKER_RADIUS = 1.8 * U
STRIKER_MASS   = PI * (STRIKER_RADIUS * STRIKER_RADIUS)
PIECE_RADIUS   = 1.4 * U
PIECE_MASS     = PI * (PIECE_RADIUS * PIECE_RADIUS)


# ============================================================
# ++ ENTITY ++
# ============================================================

@dataclass
class Entity:
    type_name:  Name
    pos:        Position
    vel:        Velocity
    r:          float
    mass:       float
    is_active:  bool = True
    is_gliding: bool = False

    # ---------- ENGINE ----------

    def apply_kinematics(self) -> None:
        if not self.is_active:
            return
        if self.vel.get_speed() <= 0.001:
            self.vel.vx = 0.0
            self.vel.vy = 0.0
            self.is_gliding = False
        else:
            self.vel.decelerate(FRICTION)
            self.pos.update(self.vel)
            self.is_gliding = True

    def detect_boundary_collision(self) -> None:
        if not self.is_active:
            return
        r = self.r
        # left / right
        if self.pos.x <= r:
            self.pos.x = r
            self.vel.vx *= -1.0
        elif self.pos.x >= LOGICAL_WIDTH - r:
            self.pos.x = LOGICAL_WIDTH - r
            self.vel.vx *= -1.0
        # top / bottom
        if self.pos.y <= r:
            self.pos.y = r
            self.vel.vy *= -1.0
        elif self.pos.y >= LOGICAL_HEIGHT - r:
            self.pos.y = LOGICAL_HEIGHT - r
            self.vel.vy *= -1.0

    def resolve_momentum(self, other: "Entity") -> None:
        # early exits
        if not self.is_active and not other.is_active:
            return
        if (not self.is_gliding and not other.is_gliding
                and self.type_name != Name.STRIKER
                and other.type_name != Name.STRIKER):
            return

        min_dist = self.r + other.r
        dx = other.pos.x - self.pos.x
        dy = other.pos.y - self.pos.y
        actual_dist = self.pos.get_distance(other.pos)

        if actual_dist < min_dist and actual_dist > 0.0:
            overlap = min_dist - actual_dist
            nx = dx / actual_dist
            ny = dy / actual_dist

            # separate overlap
            self.pos.x  -= nx * (overlap / 2.0)
            self.pos.y  -= ny * (overlap / 2.0)
            other.pos.x += nx * (overlap / 2.0)
            other.pos.y += ny * (overlap / 2.0)

            # relative velocity along normal
            rx = self.vel.vx - other.vel.vx
            ry = self.vel.vy - other.vel.vy
            rv = (rx * nx) + (ry * ny)

            if rv < 0.0:
                return

            impulse = (MOMENTUM_TRANSFER_RATIO * 2.0 * rv) / (self.mass + other.mass)

            self.vel.vx  -= impulse * nx * other.mass
            self.vel.vy  -= impulse * ny * other.mass
            other.vel.vx += impulse * nx * self.mass
            other.vel.vy += impulse * ny * self.mass

    def check_pocketed(self) -> None:
        if self.type_name == Name.STRIKER or not self.is_active:
            return
        for corner in BOARD_CORNERS:
            if self.pos.get_distance(corner) <= 2.5 * U:
                self.is_active  = False
                self.is_gliding = False
                self.vel.vx = 0.0
                self.vel.vy = 0.0
                return

    # ---------- AI ----------

    def get_closest_pocket(self) -> Position:
        pocket = BOARD_CORNERS[0]
        min_dist = self.pos.get_distance(pocket)
        for i in range(1, 4):
            target = BOARD_CORNERS[i]
            d = self.pos.get_distance(target)
            if d < min_dist:
                pocket = target
                min_dist = d
        return pocket


# ============================================================
# ++ ALL ENTITIES ++
# ============================================================

class AllEntities:
    def __init__(self, entities: List[Entity]):
        self.entities: List[Entity] = entities

    # ---------- ENGINE ----------

    def apply_uniform_kinematics(self) -> None:
        for e in self.entities:
            e.apply_kinematics()

    def apply_uniform_boundary_checks(self) -> None:
        for e in self.entities:
            e.detect_boundary_collision()

    def apply_uniform_momentum_resolve(self) -> None:
        n = len(self.entities)
        for i in range(n - 1):
            for j in range(i + 1, n):
                self.entities[i].resolve_momentum(self.entities[j])

    def apply_uniform_pocketing(self) -> None:
        for e in self.entities:
            e.check_pocketed()

    # ---------- AI ----------

    def set_back(self, original: "AllEntities") -> None:
        for i in range(MAX_ENTITIES):
            src = original.entities[i]
            dst = self.entities[i]
            dst.type_name  = src.type_name
            dst.pos.x      = src.pos.x
            dst.pos.y      = src.pos.y
            dst.vel.vx     = src.vel.vx
            dst.vel.vy     = src.vel.vy
            dst.r          = src.r
            dst.mass       = src.mass
            dst.is_active  = src.is_active
            dst.is_gliding = src.is_gliding

    def is_any_piece_moving(self) -> bool:
        return any(e.is_gliding for e in self.entities)

    def simulate_physics(self, launch_pos: Position, p: float, a: float) -> None:
        striker = self.entities[0]
        striker.pos = Position(launch_pos.x, launch_pos.y)
        striker.vel = Velocity(p * math.cos(a), p * math.sin(a))
        striker.pos.x += striker.vel.vx
        striker.pos.y += striker.vel.vy
        striker.is_gliding = True
        striker.is_active  = True

        step = 0
        while step < MAX_STEPS:
            self.apply_uniform_kinematics()
            self.apply_uniform_boundary_checks()
            self.apply_uniform_momentum_resolve()
            self.apply_uniform_pocketing()
            if not self.is_any_piece_moving():
                break
            step += 1

    def simulate_score(self) -> float:
        score = 0.0
        for e in self.entities:
            pocket = e.get_closest_pocket()
            score += e.pos.get_distance(pocket)
        return score

    # ---------- SAMPLE GENERATION ----------

    @staticmethod
    def new_randomized_sample() -> "AllEntities":
        # Simple LCG PRNG (mirrors the Rust version)
        import time
        seed = int(time.time_ns()) & 0xFFFFFFFF

        def next_rand() -> float:
            nonlocal seed
            seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
            return seed / 0xFFFFFFFF

        # 1) striker
        striker_x = STRIKER_AREA[0].x + next_rand() * (STRIKER_AREA[1].x - STRIKER_AREA[0].x)
        striker = Entity(
            type_name = Name.STRIKER,
            pos       = Position(striker_x, STRIKER_AREA[0].y),
            vel       = Velocity(0.0, 0.0),
            r         = STRIKER_RADIUS,
            mass      = STRIKER_MASS,
            is_active = True,
            is_gliding= False,
        )

        entities: List[Entity] = [striker]

        # 2) piece types
        piece_types = (
            [Name.QUEEN]
            + [Name.WHITE] * 9
            + [Name.BLACK] * 9
        )

        min_x = 3.0 * U
        max_x = LOGICAL_WIDTH  - 3.0 * U
        min_y = 6.0 * U
        max_y = LOGICAL_HEIGHT - 3.0 * U

        for type_name in piece_types:
            while True:
                x = min_x + next_rand() * (max_x - min_x)
                y = min_y + next_rand() * (max_y - min_y)
                pos = Position(x, y)
                # non-overlap check
                ok = True
                for other in entities:
                    if pos.get_distance(other.pos) < (PIECE_RADIUS + other.r + 0.5):
                        ok = False
                        break
                if ok:
                    break

            entities.append(Entity(
                type_name = type_name,
                pos       = pos,
                vel       = Velocity(0.0, 0.0),
                r         = PIECE_RADIUS,
                mass      = PIECE_MASS,
                is_active = True,
                is_gliding= False,
            ))

        return AllEntities(entities)


# ============================================================
# ++ MASTER FUNCTION ++
# ============================================================

def estimate_best_shot(current: AllEntities) -> None:
    import time
    start = time.perf_counter()

    original = AllEntities([Entity(
        type_name  = e.type_name,
        pos        = Position(e.pos.x, e.pos.y),
        vel        = Velocity(e.vel.vx, e.vel.vy),
        r          = e.r,
        mass       = e.mass,
        is_active  = e.is_active,
        is_gliding = e.is_gliding,
    ) for e in current.entities])

    best_score = 300000.0
    outcome_x = STRIKER_AREA[0].x
    outcome_p = 5.0
    outcome_a = 0.2
    outcome_iteration = 0
    iteration = 0

    launch_x = STRIKER_AREA[0].x
    launch_y = STRIKER_AREA[0].y

    while launch_x <= STRIKER_AREA[1].x:
        a = 0.2
        while a <= PI - 0.2:
            p = 5.0
            while p <= 15.0:
                pos = Position(launch_x, launch_y)
                current.simulate_physics(pos, p, a)
                score = current.simulate_score()

                if score < best_score:
                    best_score = score
                    outcome_x = launch_x
                    outcome_p = p
                    outcome_a = a
                    outcome_iteration = iteration

                current.set_back(original)
                p += 5.0
                iteration += 1
            a += 0.25
        launch_x += 0.1 * (STRIKER_AREA[0].x)   # matches Rust `0.1 * min`

    end = time.perf_counter()
    time_ms = (end - start) * 1000.0

    print(f"Time for one AI simulation: {time_ms:.0f}ms.")
    print(f"Number of iteration: {iteration}.")
    print(f"Best shot: {outcome_x}, {outcome_p}, {outcome_a}.")
    print(f"Found at iteration: {outcome_iteration}.")


# ============================================================
# ++ ENTRY POINT ++
# ============================================================

def main() -> None:
    print("Generating mid-gameboard state with random active pieces...")
    board = AllEntities.new_randomized_sample()

    print("Testing AI shot estimation on randomized layout...")
    estimate_best_shot(board)


if __name__ == "__main__":
    main()

"""
  Generating mid-gameboard state with random active pieces...
  Testing AI shot estimation on randomized layout...
  Time for one AI simulation: 89464ms.
  Number of iteration: 1485.
  Best shot: 47.432, 15.0, 1.2.
  Found at iteration: 47.

  [Program finished]

  Took about 90s. hell slow 😭😭🤖🤖
"""