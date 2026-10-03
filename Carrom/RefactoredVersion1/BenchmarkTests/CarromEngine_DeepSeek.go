// ।। ॐ नमः शिवाय ।। \\

// @date 25th September, 2026

// @Go @learning @engines
// @optimization
// @acknowledgment DeepSeek AI wrote this version

// This is the same carrom engine as the Rust version, ported to Go.
// Uses goroutines (via the standard library) for multi-threaded search.
// Includes spatial partitioning for the O(n²) → filtered momentum resolve.
// Also eliminates unnecessary sqrt() calls in hot paths.

package main

import (
	"fmt"
	"math"
	"sync"
	"time"
)

///// ========================== \\\\\
/// ++ SETUP ++ \\\
///// ========================== \\\\\

// Name identifies the kind of an entity on the board.
type Name int

const (
	Striker Name = iota
	Queen
	White
	Black
)

func (n Name) String() string {
	switch n {
	case Striker:
		return "STRIKER"
	case Queen:
		return "QUEEN"
	case White:
		return "WHITE"
	case Black:
		return "BLACK"
	}
	return "UNKNOWN"
}

// Position represents a 2D coordinate.
type Position struct {
	X, Y float32
}

func (p Position) Length() float32 {
	return float32(math.Sqrt(float64(p.X*p.X + p.Y*p.Y)))
}

func (p *Position) Update(v Velocity) {
	p.X += v.VX
	p.Y += v.VY
}

func (p Position) Distance(o Position) float32 {
	dx := o.X - p.X
	dy := o.Y - p.Y
	return float32(math.Sqrt(float64(dx*dx + dy*dy)))
}

func (p Position) DistSq(o Position) float32 {
	dx := o.X - p.X
	dy := o.Y - p.Y
	return dx*dx + dy*dy
}

// Velocity represents a 2D velocity vector.
type Velocity struct {
	VX, VY float32
}

func (v Velocity) Speed() float32 {
	return float32(math.Sqrt(float64(v.VX*v.VX + v.VY*v.VY)))
}

func (v Velocity) SpeedSq() float32 {
	return v.VX*v.VX + v.VY*v.VY
}

func (v *Velocity) Decelerate(friction float32) {
	v.VX *= 1.0 - friction
	v.VY *= 1.0 - friction
}

// Board constants.
const (
	UW float32 = 3.84           // unit viewport width
	UH float32 = 6.94           // unit viewport height
	U  float32 = (UW + UH) / 2.0 // base unit

	LogicalWidth  float32 = 40.0 * UH
	LogicalHeight float32 = 40.0 * UH

	Offset float32 = 8.0 * U
	Gap    float32 = 4.0 * U

	PI float32 = math.Pi

	StrikerRadius float32 = 1.8 * U
	PieceRadius   float32 = 1.4 * U

	StrikerMass float32 = PI * (StrikerRadius * StrikerRadius)
	PieceMass   float32 = PI * (PieceRadius * PieceRadius)

	Friction              float32 = 0.03
	MomentumTransferRatio float32 = 0.85
)

const (
	MaxSteps    = 240
	MaxEntities = 20
)

var (
	// boardDimensions is retained for fidelity with the original, though unused.
	boardDimensions = [4]Position{
		{0.0, 0.0},
		{LogicalWidth, 0.0},
		{0.0, LogicalHeight},
		{LogicalWidth, LogicalHeight},
	}

	boardCorners = [4]Position{
		{U, U},
		{39.0 * U, U},
		{U, 39.0 * U},
		{39.0 * U, 39.0 * U},
	}

	strikerArea = [2]Position{
		{Offset, Offset - Gap},
		{LogicalWidth - Offset, Offset - Gap},
	}
)

///// ========================== \\\\\
/// ++ STRUCT DECLARATION ++ \\\
///// ========================== \\\\\

// Entity represents a single piece (striker, queen, white, or black).
type Entity struct {
	TypeName  Name
	Pos       Position
	Vel       Velocity
	R         float32
	Mass      float32
	IsActive  bool
	IsGliding bool
}

///// ++++++++++++++++++++++++ \\\\\
/// ++ ENGINE IMPLEMENTATIONS ++ \\\
///// ++++++++++++++++++++++++ \\\\\

// ApplyKinematics handles individual entity kinematics.
func (e *Entity) ApplyKinematics() {
	if !e.IsActive {
		return
	}
	if e.Vel.SpeedSq() <= 0.00001 { // sqrt-free zero check
		e.Vel.VX = 0.0
		e.Vel.VY = 0.0
		e.IsGliding = false
	} else {
		e.Vel.Decelerate(Friction)
		e.Pos.Update(e.Vel)
		e.IsGliding = true
	}
}

// DetectBoundaryCollision handles individual entity boundary collisions & bouncing.
func (e *Entity) DetectBoundaryCollision() {
	if !e.IsActive {
		return
	}
	r := e.R

	// left & right walls
	if e.Pos.X <= r {
		e.Pos.X = r
		e.Vel.VX *= -1.0
	} else if e.Pos.X >= LogicalWidth-r {
		e.Pos.X = LogicalWidth - r
		e.Vel.VX *= -1.0
	}

	// top & bottom walls
	if e.Pos.Y <= r {
		e.Pos.Y = r
		e.Vel.VY *= -1.0
	} else if e.Pos.Y >= LogicalHeight-r {
		e.Pos.Y = LogicalHeight - r
		e.Vel.VY *= -1.0
	}
}

// ResolveMomentum handles pairwise momentum resolution.
func (e *Entity) ResolveMomentum(other *Entity) {
	// @optimization: early exits
	if !e.IsActive && !other.IsActive {
		return
	}
	if !e.IsGliding && !other.IsGliding &&
		e.TypeName != Striker && other.TypeName != Striker {
		return
	}

	// setup data
	minDist := e.R + other.R
	dx := other.Pos.X - e.Pos.X
	dy := other.Pos.Y - e.Pos.Y
	actualDist := e.Pos.Distance(other.Pos)

	// momentum math
	if actualDist < minDist && actualDist > 0.0 {
		// separate overlap
		overlap := minDist - actualDist
		nx := dx / actualDist
		ny := dy / actualDist

		e.Pos.X -= nx * (overlap / 2.0)
		e.Pos.Y -= ny * (overlap / 2.0)
		other.Pos.X += nx * (overlap / 2.0)
		other.Pos.Y += ny * (overlap / 2.0)

		// relative velocity
		rx := e.Vel.VX - other.Vel.VX
		ry := e.Vel.VY - other.Vel.VY
		rv := (rx * nx) + (ry * ny)

		// don't resolve if already separating
		if rv < 0.0 {
			return
		}

		// elastic impulse resolution
		impulse := (MomentumTransferRatio * 2.0 * rv) / (e.Mass + other.Mass)

		e.Vel.VX -= impulse * nx * other.Mass
		e.Vel.VY -= impulse * ny * other.Mass
		other.Vel.VX += impulse * nx * e.Mass
		other.Vel.VY += impulse * ny * e.Mass
	}
}

// CheckPocketed handles individual entity pocketing.
func (e *Entity) CheckPocketed() {
	if e.TypeName == Striker || !e.IsActive {
		return
	}
	for i := 0; i < 4; i++ {
		corner := boardCorners[i]
		dist := e.Pos.DistSq(corner) // sqrt-free
		threshold := float32(5.0) * U * U
		if dist <= threshold {
			e.IsActive = false
			e.IsGliding = false
			e.Vel = Velocity{0.0, 0.0}
			return
		}
	}
}

///// ++++++++++++++++++++ \\\\\
/// ++ AI IMPLEMENTATIONS ++ \\\
///// ++++++++++++++++++++ \\\\\

// ClosestPocket returns the closest corner pocket to the entity.
func (e *Entity) ClosestPocket() Position {
	pocket := boardCorners[0]
	minDist := e.Pos.DistSq(pocket) // sqrt-free
	for i := 1; i < 4; i++ {
		target := boardCorners[i]
		dist := e.Pos.DistSq(target) // sqrt-free
		if dist < minDist {
			pocket = target
			minDist = dist
		}
	}
	return pocket
}

// AllEntities represents the full set of entities on the board.
type AllEntities [MaxEntities]Entity

///// ++++++++++++++++++++++++ \\\\\
/// ++ ENGINE IMPLEMENTATIONS ++ \\\
///// ++++++++++++++++++++++++ \\\\\

// ApplyUniformKinematics applies kinematics to all entities.
//
// Note: spawning goroutines inside this hot loop is actively harmful
// (the Rust version learned the same lesson).
func (a *AllEntities) ApplyUniformKinematics() {
	for i := range a {
		a[i].ApplyKinematics()
	}
}

// ApplyUniformBoundaryChecks applies boundary checks to all entities.
func (a *AllEntities) ApplyUniformBoundaryChecks() {
	for i := range a {
		a[i].DetectBoundaryCollision()
	}
}

// ApplyUniformMomentumResolve performs pairwise momentum resolution
// with spatial partitioning.
//
// Max radius sum is striker + piece = 1.8U + 1.4U = 3.2U.
// We widen the search radius to ~3.32U (squared: 11 U²) to be safe.
func (a *AllEntities) ApplyUniformMomentumResolve() {
	for i := 0; i < MaxEntities-1; i++ {
		entity := &a[i]
		for j := i + 1; j < MaxEntities; j++ {
			target := &a[j]
			threshold := float32(11.0) * U * U
			if entity.Pos.DistSq(target.Pos) <= threshold { // sqrt-free
				entity.ResolveMomentum(target)
			}
		}
	}
}

// ApplyUniformPocketing applies pocketing checks to all entities.
func (a *AllEntities) ApplyUniformPocketing() {
	for i := range a {
		a[i].CheckPocketed()
	}
}

///// ++++++++++++++++++++ \\\\\
/// ++ AI IMPLEMENTATIONS ++ \\\
///// ++++++++++++++++++++ \\\\\

// SetBack restores the board from a saved state.
func (a *AllEntities) SetBack(original *AllEntities) {
	for i := 0; i < MaxEntities; i++ {
		a[i] = original[i]
	}
}

// IsAnyPieceMoving reports whether any piece is still gliding.
func (a *AllEntities) IsAnyPieceMoving() bool {
	for i := range a {
		if a[i].IsGliding {
			return true
		}
	}
	return false
}

// SimulatePhysics runs one full turn of physics.
func (a *AllEntities) SimulatePhysics(launchPos Position, p, angle float32) {
	// update & launch striker
	striker := &a[0]
	striker.Pos = launchPos
	striker.Vel = Velocity{
		VX: p * float32(math.Cos(float64(angle))),
		VY: p * float32(math.Sin(float64(angle))),
	}
	striker.Pos.X += striker.Vel.VX
	striker.Pos.Y += striker.Vel.VY

	// simulate
	for step := 0; step < MaxSteps; step++ {
		a.ApplyUniformKinematics()
		a.ApplyUniformBoundaryChecks()
		a.ApplyUniformMomentumResolve()
		a.ApplyUniformPocketing()

		// @optimization: early exit
		if !a.IsAnyPieceMoving() {
			break
		}
	}
}

// SimulateScore computes a score for the current board state
// (lower is better: sum of distance from each piece to its nearest pocket).
func (a *AllEntities) SimulateScore() float32 {
	var sum float32
	for i := range a {
		sum += a[i].Pos.Distance(a[i].ClosestPocket())
	}
	return sum
}

// NewRandomizedSample generates a randomized board layout with all 20
// entities active. Striker is placed randomly along the bottom baseline;
// queen and 18 pieces are scattered without overlap.
func NewRandomizedSample() AllEntities {
	// Simple LCG PRNG to avoid an external dependency.
	seed := uint32(time.Now().UnixNano())
	nextRand := func() float32 {
		seed = seed*1664525 + 1013904223
		return float32(seed) / 4294967295.0
	}

	var entities AllEntities
	for i := range entities {
		entities[i] = Entity{
			TypeName:  Black,
			Pos:       Position{0.0, 0.0},
			Vel:       Velocity{0.0, 0.0},
			R:         PieceRadius,
			Mass:      PieceMass,
			IsActive:  true,
			IsGliding: false,
		}
	}

	// 1. Setup striker at a random position along the baseline.
	strikerX := strikerArea[0].X + nextRand()*(strikerArea[1].X-strikerArea[0].X)
	entities[0] = Entity{
		TypeName:  Striker,
		Pos:       Position{strikerX, strikerArea[0].Y},
		Vel:       Velocity{0.0, 0.0},
		R:         StrikerRadius,
		Mass:      StrikerMass,
		IsActive:  true,
		IsGliding: false,
	}

	// Helper closure: is a candidate position overlapping an existing piece?
	isOverlapping := func(pos Position, radius float32, count int) bool {
		for idx := 0; idx < count; idx++ {
			minDist := radius + entities[idx].R + 0.5 // small gap buffer
			if pos.Distance(entities[idx].Pos) < minDist {
				return true
			}
		}
		return false
	}

	// Safe spawn boundaries (away from walls and corners).
	minX := 3.0 * U
	maxX := LogicalWidth - 3.0*U
	minY := 6.0 * U
	maxY := LogicalHeight - 3.0*U

	// 2. Setup queen & 18 pieces (9 white, 9 black).
	pieceTypes := []Name{
		Queen,
		White, White, White, White, White, White, White, White, White,
		Black, Black, Black, Black, Black, Black, Black, Black, Black,
	}

	for i, typeName := range pieceTypes {
		entityIndex := i + 1 // 0 is reserved for striker
		var spawnPos Position

		// Loop until a non-overlapping spot is found.
		for {
			spawnPos = Position{
				X: minX + nextRand()*(maxX-minX),
				Y: minY + nextRand()*(maxY-minY),
			}
			if !isOverlapping(spawnPos, PieceRadius, entityIndex) {
				break
			}
		}

		entities[entityIndex] = Entity{
			TypeName:  typeName,
			Pos:       spawnPos,
			Vel:       Velocity{0.0, 0.0},
			R:         PieceRadius,
			Mass:      PieceMass,
			IsActive:  true,
			IsGliding: false,
		}
	}

	return entities
}

///// ========================== \\\\\
/// ++ MASTER FUNCTION ++ \\\
///// ========================== \\\\\

// shotResult is the per-goroutine output of the shot search.
type shotResult struct {
	bestScore float32
	x         float32
	p         float32
	a         float32
	iter      int
}

// EstimateBestShot searches over launch positions, powers, and angles
// across four parallel goroutines, using each goroutine's local copy of
// the board so no shared mutation occurs.
func EstimateBestShot(currentPos *AllEntities) {
	start := time.Now()
	minX := strikerArea[0].X
	maxX := strikerArea[1].X

	// Launch positions.
	var launchPositions []float32
	for x := minX; x <= maxX; x += 0.1 * minX {
		launchPositions = append(launchPositions, x)
	}

	// Divide into ~4 chunks.
	chunkSize := (len(launchPositions) / 4) + 1
	numChunks := (len(launchPositions) + chunkSize - 1) / chunkSize
	if numChunks == 0 {
		numChunks = 1
	}

	results := make([]shotResult, numChunks)
	var wg sync.WaitGroup

	for t := 0; t < numChunks; t++ {
		startIdx := t * chunkSize
		endIdx := startIdx + chunkSize
		if endIdx > len(launchPositions) {
			endIdx = len(launchPositions)
		}
		chunk := launchPositions[startIdx:endIdx]

		wg.Add(1)
		go func(idx int, chunk []float32) {
			defer wg.Done()

			// Each goroutine owns a private copy of the board.
			localBoard := *currentPos
			var bestScore float32 = math.MaxFloat32
			var outcomeX, outcomeP, outcomeA float32
			iter := 0

			for _, launchX := range chunk {
				for a := float32(0.2); a <= PI-0.2; a += 0.25 {
					for p := float32(5.0); p <= 15.0; p += 5.0 {
						pos := Position{launchX, strikerArea[0].Y}
						localBoard.SimulatePhysics(pos, p, a)
						score := localBoard.SimulateScore()

						if score < bestScore {
							bestScore = score
							outcomeX = launchX
							outcomeP = p
							outcomeA = a
						}

						localBoard.SetBack(currentPos)
						iter++
					}
				}
			}

			results[idx] = shotResult{
				bestScore: bestScore,
				x:         outcomeX,
				p:         outcomeP,
				a:         outcomeA,
				iter:      iter,
			}
		}(t, chunk)
	}

	wg.Wait()

	// Compare results across chunks.
	var globalBestScore float32 = math.MaxFloat32
	var globalBestX, globalBestP, globalBestA float32
	globalIter := 0

	for _, r := range results {
		globalIter += r.iter
		if r.bestScore < globalBestScore {
			globalBestScore = r.bestScore
			globalBestX = r.x
			globalBestP = r.p
			globalBestA = r.a
		}
	}

	elapsed := time.Since(start).Milliseconds()
	fmt.Printf("Time for one AI simulation across 4 threads: %dms.\n", elapsed)
	fmt.Printf("Number of iteration: %d.\n", globalIter)
	fmt.Printf("Best shot: %v, %v, %v.\n", globalBestX, globalBestP, globalBestA)
}

func main() {
	fmt.Println("Generating mid-gameboard state with random active pieces...")
	board := NewRandomizedSample()

	fmt.Println("Testing AI shot estimation on randomized layout...")
	EstimateBestShot(&board)
}