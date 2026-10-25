# ।। ॐ नमः शिवाय ।। 
# @date 25th October, 2026
# @acknowledgement Ported by DeepSeek AI using my Rust code

defmodule CarromEngine3 do
  @moduledoc """
  Carrom engine v3 — spatial partitioning + parallel AI search.

  Ported from Rust `CarromEngine3.rs`.

  Optimizations retained:
    * Spatial partitioning: momentum is resolved only between pairs whose
      squared distance is below `(r_striker + r_piece)²` — filters out
      the ~95% of pairs that are far apart.
    * Squared distances everywhere possible (no `sqrt` in hot paths).
    * Early exit from the physics loop when nothing is gliding.
    * Parallel AI search across `System.schedulers_online/0` cores, capped
      at 4 (matching the Rust `thread::scope` fan-out).

  Idiomatic adaptation notes:
    * `Vec` / `[Entity; 20]`  ->  tuple of `%Entity{}` structs (O(1) `elem/put_elem`).
    * `&mut` aliasing        ->  reduce over the tuple, re-fetching entity `i`
                                 from the running accumulator each iteration.
    * `thread::scope`        ->  `Task.async_stream/3` (BEAM processes scheduled
                                 across cores; no manual handle plumbing).
    * LCG PRNG               ->  `:rand` with a nanosecond seed.
    * f32                    ->  f64 (Elixir has one float type; slightly *more*
                                 precise, all comparisons remain valid).
  """

  # ==========================================================================
  # Constants
  # ==========================================================================

  @uw 3.84
  @uh 6.94
  @u (@uw + @uh) / 2.0

  @logical_width 40.0 * @uh
  @logical_height 40.0 * @uh

  @offset 8.0 * @u
  @gap 4.0 * @u

  @striker_radius 1.8 * @u
  @striker_mass :math.pi() * @striker_radius * @striker_radius
  @piece_radius 1.4 * @u
  @piece_mass :math.pi() * @piece_radius * @piece_radius

  @friction 0.03
  @momentum_transfer_ratio 0.85
  @max_steps 240
  @max_entities 20

  @board_corners [
    {@u, @u},
    {39.0 * @u, @u},
    {@u, 39.0 * @u},
    {39.0 * @u, 39.0 * @u}
  ]

  @striker_area_x {@offset, @logical_width - @offset}
  @striker_y @offset - @gap

  # (striker_r + piece_r)² = (3.2U)² ≈ 10.24U².  11U² is a safe upper bound.
  @collision_threshold_sq 11.0 * @u * @u
  @pocket_threshold_sq 5.0 * @u * @u

  @f32_max 3.4028234663852886e38

  # ==========================================================================
  # Entity
  # ==========================================================================

  defmodule Entity do
    @moduledoc "A carrom piece or the striker."
    @enforce_keys [:type, :pos, :vel, :r, :mass, :is_active, :is_gliding]
    defstruct [:type, :pos, :vel, :r, :mass, :is_active, :is_gliding]
  end

  @type pos :: {float(), float()}
  @type entity :: %Entity{}
  @type board :: tuple()

  # ==========================================================================
  # Geometry helpers
  # ==========================================================================

  @inline true
  defp dist_sq({x1, y1}, {x2, y2}) do
    dx = x2 - x1
    dy = y2 - y1
    dx * dx + dy * dy
  end

  defp dist(p1, p2), do: :math.sqrt(dist_sq(p1, p2))

  defp generate_range(from, to, step) do
    Stream.iterate(from, &(&1 + step))
    |> Stream.take_while(&(&1 <= to))
    |> Enum.to_list()
  end

  # ==========================================================================
  # Individual entity physics
  # ==========================================================================

  defp apply_kinematics(%Entity{is_active: false} = e), do: e

  defp apply_kinematics(%Entity{vel: {vx, vy}} = e) do
    if vx * vx + vy * vy <= 0.00001 do
      %{e | vel: {0.0, 0.0}, is_gliding: false}
    else
      nvx = vx * (1.0 - @friction)
      nvy = vy * (1.0 - @friction)
      {px, py} = e.pos
      %{e | vel: {nvx, nvy}, pos: {px + nvx, py + nvy}, is_gliding: true}
    end
  end

  defp detect_boundary_collision(%Entity{is_active: false} = e), do: e

  defp detect_boundary_collision(%Entity{pos: {px, py}, vel: {vx, vy}, r: r} = e) do
    {npx, nvx} = clamp_axis(px, vx, r, @logical_width)
    {npy, nvy} = clamp_axis(py, vy, r, @logical_height)
    %{e | pos: {npx, npy}, vel: {nvx, nvy}}
  end

  defp clamp_axis(p, v, r, max) do
    cond do
      p <= r -> {r, -v}
      p >= max - r -> {max - r, -v}
      true -> {p, v}
    end
  end

  # ==========================================================================
  # Momentum resolution (pure: two in, two out)
  # ==========================================================================

  defp resolve_momentum(%Entity{} = e1, %Entity{} = e2) do
    cond do
      not e1.is_active and not e2.is_active ->
        {e1, e2}

      not e1.is_gliding and not e2.is_gliding and
          e1.type != :striker and e2.type != :striker ->
        {e1, e2}

      true ->
        do_resolve_momentum(e1, e2)
    end
  end

  defp do_resolve_momentum(
         %Entity{pos: {x1, y1}, vel: {vx1, vy1}, r: r1, mass: m1} = e1,
         %Entity{pos: {x2, y2}, vel: {vx2, vy2}, r: r2, mass: m2} = e2
       ) do
    dx = x2 - x1
    dy = y2 - y1
    dsq = dx * dx + dy * dy
    min_dist = r1 + r2

    if dsq < min_dist * min_dist and dsq > 0.0 do
      d = :math.sqrt(dsq)
      overlap = min_dist - d
      nx = dx / d
      ny = dy / d

      px1 = x1 - nx * (overlap * 0.5)
      py1 = y1 - ny * (overlap * 0.5)
      px2 = x2 + nx * (overlap * 0.5)
      py2 = y2 + ny * (overlap * 0.5)

      rv = (vx1 - vx2) * nx + (vy1 - vy2) * ny

      if rv < 0.0 do
        # Already separating — only un-overlap.
        {%{e1 | pos: {px1, py1}}, %{e2 | pos: {px2, py2}}}
      else
        impulse = @momentum_transfer_ratio * 2.0 * rv / (m1 + m2)

        {%{
           e1
           | pos: {px1, py1},
             vel: {vx1 - impulse * nx * m2, vy1 - impulse * ny * m2}
         },
         %{
           e2
           | pos: {px2, py2},
             vel: {vx2 + impulse * nx * m1, vy2 + impulse * ny * m1}
         }}
      end
    else
      {e1, e2}
    end
  end

  # ==========================================================================
  # Pocketing
  # ==========================================================================

  defp check_pocketed(%Entity{type: :striker} = e), do: e
  defp check_pocketed(%Entity{is_active: false} = e), do: e

  defp check_pocketed(%Entity{pos: pos} = e) do
    if Enum.any?(@board_corners, &(dist_sq(pos, &1) <= @pocket_threshold_sq)) do
      %{e | is_active: false, is_gliding: false, vel: {0.0, 0.0}}
    else
      e
    end
  end

  # ==========================================================================
  # Board-wide pipelines
  # ==========================================================================

  @inline true
  defp apply_uniform_kinematics(board) do
    board |> Tuple.to_list() |> Enum.map(&apply_kinematics/1) |> List.to_tuple()
  end

  @inline true
  defp apply_uniform_boundary_checks(board) do
    board |> Tuple.to_list() |> Enum.map(&detect_boundary_collision/1) |> List.to_tuple()
  end

  @inline true
  defp apply_uniform_momentum_resolve(board) do
    # Pairwise over the upper triangle. Spatial partition test is cheap and
    # filters out ~95% of pairs before touching the entity structs.
    Enum.reduce(0..(@max_entities - 2), board, fn i, acc ->
      Enum.reduce((i + 1)..(@max_entities - 1), acc, fn j, acc2 ->
        e1 = elem(acc2, i)
        e2 = elem(acc2, j)

        if dist_sq(e1.pos, e2.pos) <= @collision_threshold_sq do
          {n1, n2} = resolve_momentum(e1, e2)
          acc2 |> put_elem(i, n1) |> put_elem(j, n2)
        else
          acc2
        end
      end)
    end)
  end

  @inline true
  defp apply_uniform_pocketing(board) do
    board |> Tuple.to_list() |> Enum.map(&check_pocketed/1) |> List.to_tuple()
  end

  # ==========================================================================
  # Simulation loop
  # ==========================================================================

  defp is_any_piece_moving(board) do
    board |> Tuple.to_list() |> Enum.any?(& &1.is_gliding)
  end

  defp simulate_physics(board, {lx, ly}, p, a) do
    vx = p * :math.cos(a)
    vy = p * :math.sin(a)
    striker = elem(board, 0)
    new_striker = %{striker | pos: {lx + vx, ly + vy}, vel: {vx, vy}}
    do_simulate(put_elem(board, 0, new_striker), 0)
  end

  defp do_simulate(board, step) when step >= @max_steps, do: board

  defp do_simulate(board, step) do
    board =
      board
      |> apply_uniform_kinematics()
      |> apply_uniform_boundary_checks()
      |> apply_uniform_momentum_resolve()
      |> apply_uniform_pocketing()

    if is_any_piece_moving(board), do: do_simulate(board, step + 1), else: board
  end

  defp simulate_score(board) do
    board
    |> Tuple.to_list()
    |> Enum.reduce(0.0, fn e, acc ->
      acc + dist(e.pos, closest_pocket(e.pos))
    end)
  end

  defp closest_pocket(pos) do
    Enum.min_by(@board_corners, &dist_sq(pos, &1))
  end

  # ==========================================================================
  # AI shot estimation (parallel)
  # ==========================================================================

  @doc """
  Sweeps launch position × angle × power, returning elapsed ms.

  Parallelism mirrors the Rust `thread::scope` — chunked over launch
  positions, one BEAM process per chunk.
  """
  def estimate_best_shot(current_board) do
    t0 = System.monotonic_time(:millisecond)

    {min_x, max_x} = @striker_area_x
    launch_positions = generate_range(min_x, max_x, 0.1 * min_x)

    workers = min(System.schedulers_online(), 4)
    chunk_size = div(length(launch_positions) + workers - 1, workers)
    chunks = Enum.chunk_every(launch_positions, chunk_size)

    results =
      chunks
      |> Task.async_stream(&best_in_chunk(current_board, &1),
        max_concurrency: workers,
        ordered: false,
        timeout: :infinity
      )
      |> Enum.map(fn {:ok, r} -> r end)

    {best_score, best_x, best_p, best_a, total_iters} =
      Enum.reduce(results, {@f32_max, 0.0, 0.0, 0.0, 0}, fn
        {score, x, p, a, n}, {bs, bx, bp, ba, bn} ->
          if score < bs, do: {score, x, p, a, bn + n}, else: {bs, bx, bp, ba, bn + n}
      end)

    elapsed = System.monotonic_time(:millisecond) - t0
    IO.puts("Time for one AI simulation across #{length(chunks)} workers: #{elapsed}ms.")
    IO.puts("Number of iterations: #{total_iters}.")
    IO.puts(
      "Best shot: x=#{Float.round(best_x, 2)}, power=#{Float.round(best_p, 2)}, angle=#{Float.round(best_a, 3)}. Best score: #{Float.round(best_score, 2)}."
    )

    elapsed
  end

  defp best_in_chunk(board, launch_positions) do
    angles = generate_range(0.2, :math.pi() - 0.2, 0.25)
    powers = [5.0, 10.0, 15.0]

    Enum.reduce(launch_positions, {@f32_max, 0.0, 0.0, 0.0, 0}, fn launch_x,
                                                                   {bs, bx, bp, ba, bi} ->
      Enum.reduce(angles, {bs, bx, bp, ba, bi}, fn a, {bs2, bx2, bp2, ba2, bi2} ->
        Enum.reduce(powers, {bs2, bx2, bp2, ba2, bi2}, fn p, {bs3, bx3, bp3, ba3, bi3} ->
          score =
            board
            |> simulate_physics({launch_x, @striker_y}, p, a)
            |> simulate_score()

          if score < bs3 do
            {score, launch_x, p, a, bi3 + 1}
          else
            {bs3, bx3, bp3, ba3, bi3 + 1}
          end
        end)
      end)
    end)
  end

  # ==========================================================================
  # Random board generation
  # ==========================================================================

  def new_randomized_sample do
    seed_rand()

    {min_x, max_x} = @striker_area_x
    striker_x = min_x + :rand.uniform() * (max_x - min_x)

    striker = %Entity{
      type: :striker,
      pos: {striker_x, @striker_y},
      vel: {0.0, 0.0},
      r: @striker_radius,
      mass: @striker_mass,
      is_active: true,
      is_gliding: false
    }

    types = [:queen | List.duplicate(:white, 9) ++ List.duplicate(:black, 9)]

    {pieces, _placed} =
      Enum.map_reduce(types, [striker], fn type, placed ->
        pos = find_free_position(placed)

        entity = %Entity{
          type: type,
          pos: pos,
          vel: {0.0, 0.0},
          r: @piece_radius,
          mass: @piece_mass,
          is_active: true,
          is_gliding: false
        }

        {entity, [entity | placed]}
      end)

    List.to_tuple([striker | pieces])
  end

  defp find_free_position(placed) do
    pos =
      {3.0 * @u + :rand.uniform() * (@logical_width - 6.0 * @u),
       6.0 * @u + :rand.uniform() * (@logical_height - 9.0 * @u)}

    if Enum.any?(placed, fn e -> dist(pos, e.pos) < @piece_radius + e.r + 0.5 end) do
      find_free_position(placed)
    else
      pos
    end
  end

  defp seed_rand do
    :rand.seed(:exsss, {
      System.system_time(:nanosecond),
      :erlang.phash2(self()),
      :erlang.unique_integer([:positive])
    })
  end

  # ==========================================================================
  # Driver
  # ==========================================================================

  def run_heavy_test(times) do
    board = new_randomized_sample()
    timestamps = for _ <- 1..times, do: estimate_best_shot(board)
    avg = Enum.sum(timestamps) / times
    IO.puts("Average time across #{times} runs: #{avg}ms.")
  end

  def run do
    IO.puts("Generating mid-gameboard state with random active pieces...")
    board = new_randomized_sample()

    IO.puts("Testing AI shot estimation on randomized layout...")
    estimate_best_shot(board)

    run_heavy_test(1)
    # run_heavy_test(100)
    # run_heavy_test(250)
    # run_heavy_test(800)
    # run_heavy_test(1500)
  end
end

CarromEngine3.run()