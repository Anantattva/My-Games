-- ।। ॐ नमः शिवाय ।।
-- @date 22nd September, 2026
-- Perfected & Bug-Fixed LuaJIT Carrom Engine
-- @acknowledgement Gemini AI wrote this version
local ffi = require("ffi")

if jit then
    jit.opt.start("3", "hotloop=10")
end

-- ============================================================
-- ++ CONSTANTS ++
-- ============================================================

local UW = 3.84
local UH = 6.94
local U  = (UW + UH) * 0.5
local PI = math.pi

local LOGICAL_WIDTH  = 40.0 * UH
local LOGICAL_HEIGHT = 40.0 * UH

local OFFSET = 8.0 * U
local GAP    = 4.0 * U

local FRICTION = 0.03
local ONE_MINUS_FRICTION = 1.0 - FRICTION
local MOMENTUM_TRANSFER_RATIO = 0.85
local MT2 = MOMENTUM_TRANSFER_RATIO * 2.0

local MAX_STEPS    = 240
local MAX_ENTITIES = 20

local STRIKER_RADIUS = 1.8 * U
local STRIKER_MASS   = PI * STRIKER_RADIUS * STRIKER_RADIUS
local PIECE_RADIUS   = 1.4 * U
local PIECE_MASS     = PI * PIECE_RADIUS * PIECE_RADIUS

local T_STRIKER = 0
local T_QUEEN   = 1
local T_WHITE   = 2
local T_BLACK   = 3

-- Standard 1-indexed Lua tables for Corners to avoid FFI bounds confusion
local CORNERS_X = { U, 39.0 * U, U,        39.0 * U }
local CORNERS_Y = { U, U,        39.0 * U, 39.0 * U }
local POCKET_R2 = (2.5 * U) * (2.5 * U)

local STRIKER_MIN_X = OFFSET
local STRIKER_MAX_X = LOGICAL_WIDTH - OFFSET
local STRIKER_Y     = OFFSET - GAP

-- ============================================================
-- ++ ENTITY STRUCT (C layout, FFI) ++
-- ============================================================

ffi.cdef[[
typedef struct {
    double x, y, vx, vy;
    double r, mass;
    int    is_active;
    int    is_gliding;
    int    type_id;
} Entity;
]]

local board    = ffi.new("Entity[?]", MAX_ENTITIES)
local snapshot = ffi.new("Entity[?]", MAX_ENTITIES)

-- ============================================================
-- ++ PHYSICS ++
-- ============================================================

local sqrt = math.sqrt
local cos  = math.cos
local sin  = math.sin

local function simulate(entities, launch_x, launch_y, p, a)
    local s = entities[0]
    local vx = p * cos(a)
    local vy = p * sin(a)
    s.x = launch_x + vx
    s.y = launch_y + vy
    s.vx = vx
    s.vy = vy
    s.is_active  = 1
    s.is_gliding = 1

    local OMFR = ONE_MINUS_FRICTION
    local MTR2 = MT2
    local LW = LOGICAL_WIDTH
    local LH = LOGICAL_HEIGHT
    local SMALL = 1e-6

    for _ = 1, MAX_STEPS do
        -- 1. KINEMATICS
        for i = 0, MAX_ENTITIES - 1 do
            local e = entities[i]
            if e.is_active == 1 then
                local ex = e.vx
                local ey = e.vy
                local sp2 = ex * ex + ey * ey
                if sp2 <= SMALL then
                    e.vx = 0.0
                    e.vy = 0.0
                    e.is_gliding = 0
                else
                    ex = ex * OMFR
                    ey = ey * OMFR
                    e.vx = ex
                    e.vy = ey
                    e.x = e.x + ex
                    e.y = e.y + ey
                    e.is_gliding = 1
                end
            end
        end

        -- 2. BOUNDARIES
        for i = 0, MAX_ENTITIES - 1 do
            local e = entities[i]
            if e.is_active == 1 then
                local r = e.r
                local x = e.x
                local y = e.y
                if x <= r then
                    e.x = r
                    e.vx = -e.vx
                elseif x >= LW - r then
                    e.x = LW - r
                    e.vx = -e.vx
                end
                if y <= r then
                    e.y = r
                    e.vy = -e.vy
                elseif y >= LH - r then
                    e.y = LH - r
                    e.vy = -e.vy
                end
            end
        end

        -- 3. MOMENTUM RESOLVE
        for i = 0, MAX_ENTITIES - 2 do
            local ae = entities[i]
            local a_act = ae.is_active
            local a_gl  = ae.is_gliding
            local a_t   = ae.type_id
            local a_x   = ae.x
            local a_y   = ae.y
            local a_r   = ae.r
            local a_m   = ae.mass
            local a_vx  = ae.vx
            local a_vy  = ae.vy

            for j = i + 1, MAX_ENTITIES - 1 do
                local be = entities[j]
                local b_act = be.is_active
                if a_act == 1 or b_act == 1 then
                    local b_gl = be.is_gliding
                    local b_t  = be.type_id
                    if a_gl == 1 or b_gl == 1 or a_t == T_STRIKER or b_t == T_STRIKER then
                        local b_x = be.x
                        local b_y = be.y
                        local dx = b_x - a_x
                        local dy = b_y - a_y
                        local min_d = a_r + be.r
                        local d2 = dx * dx + dy * dy
                        if d2 < min_d * min_d and d2 > 0.0 then
                            local d = sqrt(d2)
                            local overlap = min_d - d
                            local nx = dx / d
                            local ny = dy / d
                            local half = overlap * 0.5

                            a_x = a_x - nx * half
                            a_y = a_y - ny * half
                            be.x = b_x + nx * half
                            be.y = b_y + ny * half

                            local b_vx = be.vx
                            local b_vy = be.vy
                            local rx = a_vx - b_vx
                            local ry = a_vy - b_vy
                            local rv = rx * nx + ry * ny

                            if rv >= 0.0 then
                                local b_m = be.mass
                                local impulse = (MTR2 * rv) / (a_m + b_m)
                                a_vx = a_vx - impulse * nx * b_m
                                a_vy = a_vy - impulse * ny * b_m
                                be.vx = b_vx + impulse * nx * a_m
                                be.vy = be.vy + impulse * ny * a_m
                            end
                        end
                    end
                end
            end

            ae.x  = a_x
            ae.y  = a_y
            ae.vx = a_vx
            ae.vy = a_vy
        end

        -- 4. POCKETING
        for i = 0, MAX_ENTITIES - 1 do
            local e = entities[i]
            if e.is_active == 1 and e.type_id ~= T_STRIKER then
                local ex = e.x
                local ey = e.y
                for k = 1, 4 do
                    local dx = ex - CORNERS_X[k]
                    local dy = ey - CORNERS_Y[k]
                    if dx * dx + dy * dy <= POCKET_R2 then
                        e.is_active  = 0
                        e.is_gliding = 0
                        e.vx = 0.0
                        e.vy = 0.0
                        break
                    end
                end
            end
        end

        -- 5. STOP CHECK
        local moving = false
        for i = 0, MAX_ENTITIES - 1 do
            if entities[i].is_gliding == 1 then
                moving = true
                break
            end
        end
        if not moving then break end
    end
end

-- ============================================================
-- ++ SCORING ++
-- ============================================================

local function simulate_score(entities)
    local total = 0.0
    for i = 0, MAX_ENTITIES - 1 do
        local e = entities[i]
        if e.is_active == 1 and e.type_id ~= T_STRIKER then
            local ex = e.x
            local ey = e.y
            local best = 1e30
            for k = 1, 4 do
                local dx = ex - CORNERS_X[k]
                local dy = ey - CORNERS_Y[k]
                local d2 = dx * dx + dy * dy
                if d2 < best then best = d2 end
            end
            total = total + sqrt(best)
        end
    end
    return total
end

-- ============================================================
-- ++ SNAPSHOT & RESTORE ++
-- ============================================================

local function snapshot_board(entities, snap)
    ffi.copy(snap, entities, ffi.sizeof("Entity") * MAX_ENTITIES)
end

local function restore_board(entities, snap)
    ffi.copy(entities, snap, ffi.sizeof("Entity") * MAX_ENTITIES)
end

-- ============================================================
-- ++ BOARD SAMPLER ++
-- ============================================================

local function new_randomized_sample(entities)
    local seed = tonumber(tostring(os.time()):reverse()) + math.floor(os.clock() * 1000000)
    math.randomseed(seed)
    math.random(); math.random(); math.random()

    local sx = STRIKER_MIN_X + math.random() * (STRIKER_MAX_X - STRIKER_MIN_X)
    entities[0].x = sx
    entities[0].y = STRIKER_Y
    entities[0].vx = 0.0
    entities[0].vy = 0.0
    entities[0].r = STRIKER_RADIUS
    entities[0].mass = STRIKER_MASS
    entities[0].is_active  = 1
    entities[0].is_gliding = 0
    entities[0].type_id = T_STRIKER

    local types = { T_QUEEN }
    for _ = 1, 9 do types[#types + 1] = T_WHITE end
    for _ = 1, 9 do types[#types + 1] = T_BLACK end

    local min_x = 3.0 * U
    local max_x = LOGICAL_WIDTH - 3.0 * U
    local min_y = 6.0 * U
    local max_y = LOGICAL_HEIGHT - 3.0 * U

    for k = 1, #types do
        local placed = false
        local px, py
        while not placed do
            px = min_x + math.random() * (max_x - min_x)
            py = min_y + math.random() * (max_y - min_y)
            local ok = true

            for m = 0, k - 1 do
                local oe = entities[m]
                local dx = px - oe.x
                local dy = py - oe.y
                local gap = PIECE_RADIUS + oe.r + 0.5
                if dx * dx + dy * dy < gap * gap then
                    ok = false
                    break
                end
            end
            if ok then placed = true end
        end

        local idx = k
        entities[idx].x = px
        entities[idx].y = py
        entities[idx].vx = 0.0
        entities[idx].vy = 0.0
        entities[idx].r = PIECE_RADIUS
        entities[idx].mass = PIECE_MASS
        entities[idx].is_active  = 1
        entities[idx].is_gliding = 0
        entities[idx].type_id = types[k]
    end
end

-- ============================================================
-- ++ AI SEARCH ++
-- ============================================================

local function estimate_best_shot(entities)
    local t0 = os.clock()

    -- TAKE THE SNAPSHOT HERE AFTER BOARD HAS BEEN GENERATED
    snapshot_board(entities, snapshot)

    local best_score = 3.0e8
    local best_x = STRIKER_MIN_X
    local best_p = 5.0
    local best_a = 0.2
    local best_it = -1
    local iteration = 0

    local angles = {}
    local a = 0.2
    local a_max = PI - 0.2
    while a <= a_max do
        angles[#angles + 1] = a
        a = a + 0.25
    end

    local x_step = 0.1 * STRIKER_MIN_X
    local launch_x = STRIKER_MIN_X
    local max_x = STRIKER_MAX_X
    local y = STRIKER_Y

    while launch_x <= max_x do
        for ai = 1, #angles do
            local aa = angles[ai]
            local p = 5.0
            while p <= 15.0 do
                simulate(entities, launch_x, y, p, aa)
                local s = simulate_score(entities)
                if s < best_score then
                    best_score = s
                    best_x = launch_x
                    best_p = p
                    best_a = aa
                    best_it = iteration
                end
                restore_board(entities, snapshot)
                p = p + 5.0
                iteration = iteration + 1
            end
        end
        launch_x = launch_x + x_step
    end

    local elapsed_ms = (os.clock() - t0) * 1000.0
    print(string.format("Time for one AI simulation: %.0fms.", elapsed_ms))
    print(string.format("Number of iteration: %d.", iteration))
    print(string.format("Best shot: %.4f, %.1f, %.4f.", best_x, best_p, best_a))
    print(string.format("Best score: %.4f.", best_score))
end

-- ============================================================
-- ++ MAIN ++
-- ============================================================

local function main()
    print("Generating unique randomized mid-gameboard state...")
    new_randomized_sample(board)

    print("Warming up JIT (first simulation)...")
    snapshot_board(board, snapshot)
    simulate(board, STRIKER_MIN_X, STRIKER_Y, 5.0, 0.5)
    simulate_score(board)
    restore_board(board, snapshot)

    print("Testing AI shot estimation on randomized layout...")
    estimate_best_shot(board)
end

main()

--[[
  ➜  ~ luajit -O "$HOME/storage/shared/My Learning Projects/Extras/CarromEngine1_Gemini.lua" -o test
  Generating unique randomized mid-gameboard state...
  Warming up JIT (first simulation)...
  Testing AI shot estimation on randomized layout...
  Time for one AI simulation: 1178ms.
  Number of iteration: 1485.
  Best shot: 43.1200, 15.0, 0.4500.
  Best score: 1043.4946.
  ➜  ~

  Average time is 1.7s
  Best observed: 1.1s
]]