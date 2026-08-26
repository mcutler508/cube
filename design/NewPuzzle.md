# CORELOCK — Product Requirements Document

## 1. Overview

**CORELOCK** is a tactile 3D mechanical puzzle game built around a single mysterious object that the player must physically manipulate and understand.

The player is presented with a sealed mechanical object made of rotating rings, sliding plates, locking pins, recessed controls, gears, and hidden internal mechanisms.

There are no traditional instructions.

The player learns the object by interacting with it.

The fundamental gameplay loop is:

**Touch → Manipulate → Discover → Unlock → Open**

The objective of each puzzle is simple:

> **Open the core.**

CORELOCK should feel less like a conventional mobile puzzle game and more like interacting with a real high-end mechanical puzzle or fidget object.

The game should prioritize:

* tactile interaction
* satisfying mechanical movement
* physical plausibility
* visual polish
* discovery
* subtle feedback
* rewarding reveal animations
* replayability as a digital fidget object

CORELOCK is intended to exist as an additional module/game mode inside the larger app alongside the existing 3×3 cube experience.

---

# 2. Product Vision

CORELOCK should create the feeling that the player has been handed a strange mechanical artifact with no manual.

The player should naturally think:

* What moves?
* What does this ring control?
* Why did that piece click?
* Did I just unlock something?
* What changed?
* What is inside this thing?

The game should reward experimentation rather than requiring prior knowledge.

CORELOCK must NOT feel like:

* a flat puzzle UI
* an escape room menu
* a point-and-click game
* a sequence of buttons
* a conventional combination lock
* a static 3D model with scripted animations

The player should directly manipulate the physical components of the object.

---

# 3. Core Design Principles

## 3.1 The Object Is the Interface

Avoid unnecessary buttons and overlays.

The majority of gameplay should occur by directly touching and manipulating the 3D object.

Examples:

* swipe a ring to rotate it
* drag a plate to slide it
* tap a recessed button
* rotate the entire object to inspect another side
* drag a lever
* spin a gear
* pull a released component

---

## 3.2 Mechanical Cause and Effect

Every successful action should cause a believable mechanical reaction.

Examples:

* symbols align
* a pin retracts
* a metallic click plays
* a plate shifts slightly
* an internal gear becomes visible
* another ring becomes movable
* light leaks through a seam
* vibration communicates that a mechanism unlocked

The player should frequently realize:

> "That thing I just did changed something."

---

## 3.3 Discovery Before Explanation

Do not immediately tell the player how the puzzle works.

CORELOCK should encourage experimentation.

The game may subtly communicate interactability through:

* lighting
* material separation
* cursor/touch response
* slight motion
* sound
* haptics
* small mechanical tolerances

But avoid excessive highlighting or arrows.

---

## 3.4 Satisfying Manipulation

Movement quality is critical.

Every movable component should have:

* inertia where appropriate
* constrained movement
* snapping
* resistance
* easing
* mechanical stops
* subtle sounds
* subtle vibration/haptics

Rotating a ring should feel like rotating a machined physical component rather than dragging a generic UI element.

---

# 4. MVP Scope

The first implementation should include one fully playable CORELOCK puzzle:

## CORELOCK 001 — Three Rings

A spherical or rounded mechanical object consisting of:

* outer shell
* three concentric rotating rings
* engraved symbols
* two locking pins
* one sliding shell panel
* one internal gear
* one final locking mechanism
* glowing internal core

The player must discover the correct sequence of interactions to open it.

---

# 5. CORELOCK 001 Puzzle Sequence

The intended solution sequence is:

### Stage 1 — Inspect

Player can freely rotate the entire object in 3D.

Three independent rings are visible.

Each ring contains engraved markings or symbols.

---

### Stage 2 — Align Rings

Player rotates each ring independently.

Each ring has:

* discrete rotational positions
* soft detents
* snapping between valid positions

The player must align the correct three symbols.

Correct alignment should trigger:

* distinctive mechanical click
* slight vibration
* brief ring movement
* visual confirmation without explicitly saying "Correct"

---

### Stage 3 — Release Locking Pins

When all rings are aligned:

Two locking pins retract into the object.

This should be physically visible.

Sound:

**metallic click / locking mechanism disengaging**

The player should be able to see that something has changed.

---

### Stage 4 — Slide Shell Panel

A previously locked shell section can now slide downward.

The player must drag it.

The panel should:

* resist slightly at first
* slide along visible rails
* stop at a mechanical endpoint

This exposes an internal gear.

---

### Stage 5 — Rotate Internal Gear

The player spins the gear.

The gear should visually drive an internal mechanism.

After reaching the correct position:

* another locking mechanism disengages
* an inner ring becomes active

---

### Stage 6 — Final Alignment

The newly released internal ring can now rotate.

The player aligns its marker with a reference point.

Successful alignment triggers the final unlock.

---

### Stage 7 — Open Core

The shell separates.

Suggested animation:

1. seams illuminate
2. locking pins fully retract
3. outer shell sections separate slightly
4. shell opens mechanically
5. internal glow intensifies
6. central core becomes visible

This should be the primary reward moment.

The animation should feel premium and dramatic without becoming excessively long.

---

# 6. Controls

CORELOCK should be mobile-first but support desktop.

## Camera / Object Rotation

Dragging on an empty/non-interactive area rotates the entire object.

Desired behavior:

* orbit camera around object
* smooth inertia
* controlled limits if required
* object remains centered

---

## Ring Rotation

Dragging tangentially on a ring rotates that specific ring.

Requirements:

* ring rotation follows finger movement
* discrete stop positions
* snapping when released
* small resistance at each detent
* rings cannot rotate when mechanically locked

---

## Sliding Components

Dragging in the component's valid movement axis moves it.

Movement must be constrained.

Do not allow arbitrary dragging.

---

## Buttons

Tap/click directly on the physical button.

Use:

* depression animation
* sound
* haptic response

---

## Gear Rotation

Circular drag rotates gear.

Gear should:

* respond proportionally to drag
* have physical rotational limits if applicable
* mechanically drive connected components

---

# 7. Interaction Priority System

A major technical concern is distinguishing:

**camera rotation**

from:

**component manipulation**

Recommended interaction flow:

1. Pointer/touch begins.
2. Perform raycast against interactive components.
3. If an interactive component is hit:

   * lock input to that component.
4. Otherwise:

   * interpret movement as object/camera rotation.
5. Maintain interaction ownership until pointer release.

Do not allow the interaction to switch midway through a gesture.

---

# 8. Puzzle State Architecture

The puzzle should be implemented as a state machine.

Example:

```ts
type CorelockState =
  | "sealed"
  | "rings_aligned"
  | "pins_retracted"
  | "panel_open"
  | "gear_solved"
  | "inner_ring_released"
  | "core_unlocked"
  | "opened";
```

However, individual mechanism state should remain independent where appropriate.

Example:

```ts
interface CorelockPuzzleState {
  ringA: number;
  ringB: number;
  ringC: number;

  ringsSolved: boolean;

  pinsRetracted: boolean;

  panelPosition: number;
  panelUnlocked: boolean;

  gearRotation: number;
  gearSolved: boolean;

  innerRingRotation: number;
  innerRingUnlocked: boolean;

  coreUnlocked: boolean;
  opened: boolean;
}
```

Avoid coupling visual animation state directly to puzzle logic.

Puzzle logic should determine state.

Animation should respond to state transitions.

---

# 9. Mechanism System

Build CORELOCK as a reusable mechanism framework rather than hardcoding every interaction specifically for CORELOCK 001.

Potential mechanism types:

```ts
type MechanismType =
  | "rotary"
  | "linear"
  | "button"
  | "lever"
  | "gear"
  | "latch"
  | "hinge"
  | "magnetic"
  | "spring";
```

Each interactive mechanism should ideally support:

```ts
interface Mechanism {
  id: string;
  type: MechanismType;

  enabled: boolean;
  locked: boolean;

  value: number;
  min: number;
  max: number;

  snapPoints?: number[];

  onChange?: (value: number) => void;
  onComplete?: () => void;
}
```

This will make future CORELOCK puzzles substantially easier to build.

---

# 10. Dependency System

Mechanisms should be able to unlock other mechanisms.

Example:

```text
Ring A
Ring B
Ring C
   ↓
Ring Alignment Condition
   ↓
Pins Retract
   ↓
Panel Unlocks
   ↓
Panel Opens
   ↓
Gear Accessible
   ↓
Gear Solved
   ↓
Inner Ring Unlocks
   ↓
Core Opens
```

Long term, puzzles should be describable as a graph of mechanisms and conditions.

Do not build an overly complicated editor or generalized engine in the MVP.

Just structure the code so this architecture is possible later.

---

# 11. Visual Design

Target aesthetic:

**precision-machined mysterious artifact**

Materials may include:

* brushed aluminum
* dark steel
* titanium
* polished metal
* ceramic
* glass
* subtle emissive elements

Avoid making it look overly sci-fi unless the broader app theme calls for it.

The object should feel like something that could theoretically exist.

---

# 12. Lighting

Use cinematic but readable lighting.

Requirements:

* strong material definition
* visible seams
* readable grooves
* engraved symbols clearly visible
* subtle reflections
* slightly dramatic rim lighting

Internal core may emit:

* warm gold
* electric blue
* phosphorescent green
* theme-dependent color

The implementation should allow core color to be configured.

---

# 13. Sound Design

Sound is an important part of CORELOCK.

Required sound categories:

* ring detent
* ring snap
* metal click
* pin retract
* panel slide
* gear rotation
* gear lock
* final unlock
* shell separation
* core reveal

Sounds should be short and tactile.

Avoid exaggerated arcade sound effects.

Think:

**precision machinery + premium fidget toy**

---

# 14. Haptics

On supported mobile devices:

### Light haptic

Use for:

* ring detent
* small snap
* button press

### Medium haptic

Use for:

* mechanism unlock
* panel release
* gear completion

### Strong haptic

Use sparingly for:

* final core unlock
* shell opening

Haptics should enhance the physical illusion.

---

# 15. Feedback Without UI Spam

Avoid:

* "Correct!"
* "+100"
* huge success banners
* constant arrows
* tutorial popups

Prefer physical feedback.

For example:

Player aligns ring correctly.

Instead of:

> CORRECT!

Use:

* metallic click
* small haptic
* ring settles into place
* nearby locking pin visibly moves

---

# 16. Hint System

Hints should exist, but remain optional.

Suggested hint levels:

### Hint 1 — Attention

Highlight the general area where progress can be made.

Example:

One ring briefly catches the light.

### Hint 2 — Mechanism

Explain what appears interactive.

Example:

> "The outer rings appear to move independently."

### Hint 3 — Objective

Give a stronger clue.

Example:

> "The symbols on the three rings may need to align."

### Hint 4 — Solution Assistance

Show the correct symbol target or direction.

Hints should never automatically solve the puzzle unless explicitly requested.

---

# 17. No-Instructions Opening

When entering CORELOCK 001 for the first time:

Display the object.

Minimal UI.

Optional text:

**CORELOCK 001**

Then:

**OPEN IT**

Fade the text away.

No tutorial unless the player appears stuck.

---

# 18. Stuck Detection

Possible future system:

Track whether the player has made meaningful progress.

If no state-changing interaction occurs for approximately 30–60 seconds:

Display a subtle hint button.

Do not automatically interrupt gameplay.

---

# 19. Completion Screen

Once opened:

Show minimal results.

Example:

```text
CORELOCK 001

OPENED

02:41

27 MOVES
0 HINTS

MASTERED
```

Actions:

* FREE PLAY
* RESTART
* NEXT OBJECT
* EXIT

Do not obscure the opened object immediately.

Allow the player to admire/interact with it.

---

# 20. Scoring

Track:

```ts
interface CorelockRunStats {
  startedAt: number;
  completedAt?: number;

  elapsedMs: number;

  interactions: number;
  meaningfulMoves: number;

  hintsUsed: number;

  solved: boolean;
}
```

Potential ranking:

### OPENED

Completed successfully.

### ELEGANT

Completed below a move threshold.

### MASTERED

Completed quickly with no hints.

### PERFECT MECHANISM

Near-optimal interaction count and no hints.

Exact thresholds can be tuned later.

---

# 21. Free Play Mode

After solving CORELOCK 001 once, unlock:

**FREE PLAY**

Free Play removes the puzzle requirements.

The player can:

* spin rings
* slide panels
* rotate gears
* open and close the shell
* manipulate mechanisms repeatedly
* use the object as a digital fidget

This is a major product requirement, not an optional afterthought.

Puzzle mode creates discovery.

Free Play creates retention.

---

# 22. Reset

Provide a reset control.

Reset should:

* return every mechanism to initial state
* restore locks
* reset animations
* preserve completion history
* preserve unlock of Free Play mode

Reset must be deterministic.

---

# 23. Camera Behavior

Maintain camera quality similar to the existing cube module.

Requirements:

* object always remains visible
* prevent clipping through geometry
* prevent extreme zoom
* smooth orbit
* optional pinch zoom
* sensible default viewing angle
* automatically frame object when entering module

Potential interaction:

Double tap empty space:

**recenter object**

---

# 24. UI Layout

Keep UI minimal.

Suggested layout:

### Top Left

Back button

### Top Center

CORELOCK 001

### Top Right

Pause / options

### Bottom Left

Reset

### Bottom Right

Hint

No persistent joystick or control overlays.

The object itself should dominate the screen.

---

# 25. Accessibility

Support:

* reduced motion mode
* haptics toggle
* sound toggle
* high-contrast symbol option
* optional interaction highlighting
* color-independent puzzle indicators

Puzzle solutions must not depend solely on color.

---

# 26. Performance Targets

Target smooth performance on modern mobile devices.

Aim for:

**60 FPS**

Avoid excessive geometry.

Use:

* optimized meshes
* shared materials where possible
* compressed textures
* reasonable reflection settings
* minimal dynamic lights
* controlled particle counts

Do not sacrifice interaction responsiveness for visual effects.

---

# 27. Technical Integration

CORELOCK should exist as an independent module from the existing cube game.

Suggested conceptual structure:

```text
src/
  games/
    cube/
    corelock/
      components/
      mechanisms/
      puzzles/
      state/
      audio/
      effects/
      CorelockScene.tsx
      CorelockGame.tsx
```

Exact paths should follow the existing project's architecture.

Do not reorganize unrelated parts of the application solely to support CORELOCK.

---

# 28. Suggested Components

Potential component structure:

```text
CorelockGame
 ├── CorelockScene
 │    ├── CorelockShell
 │    ├── RingMechanism
 │    ├── LockingPin
 │    ├── SlidingPanel
 │    ├── GearMechanism
 │    ├── InnerRing
 │    └── Core
 │
 ├── CorelockCameraController
 ├── InteractionController
 ├── CorelockHUD
 ├── HintSystem
 ├── AudioController
 └── CorelockStateController
```

---

# 29. Animation Architecture

Avoid placing complex animation sequencing directly inside interaction handlers.

Prefer:

```text
User Input
↓
Puzzle State Changes
↓
State Transition Event
↓
Animation
↓
Sound / Haptic / Effects
```

Example:

```ts
if (ringsSolved) {
  unlockPins();
}
```

The pin component should animate from its current physical state to its unlocked position.

---

# 30. Interaction Constraints

Every mechanism needs explicit constraints.

Example ring:

```ts
{
  minRotation: 0,
  maxRotation: Math.PI * 2,
  snapIncrement: Math.PI / 6
}
```

Example panel:

```ts
{
  axis: "y",
  minPosition: 0,
  maxPosition: -0.35
}
```

Do not allow visual geometry to drift away from logical state.

---

# 31. Physics

Full rigid-body physics are NOT required for CORELOCK 001.

Use deterministic constrained animations where possible.

Physics should only be introduced where it meaningfully improves interaction.

The puzzle must behave consistently.

Avoid building a physics simulation simply because the object is mechanical.

---

# 32. Persistence

Persist:

* puzzles unlocked
* puzzles completed
* best time
* best move count
* lowest hints used
* Free Play unlocked
* ranking achieved

Suggested structure:

```ts
interface CorelockProgress {
  puzzleId: string;

  unlocked: boolean;
  completed: boolean;

  bestTimeMs?: number;
  bestMoves?: number;
  bestHints?: number;

  freePlayUnlocked: boolean;

  bestRank?: string;
}
```

Use the application's existing persistence architecture.

Do not introduce a new backend solely for CORELOCK MVP.

---

# 33. Future CORELOCK Objects

Architecture should eventually support multiple mechanical objects.

Potential future puzzles:

## CORELOCK 002 — The Iris

Mechanical aperture.

Player must manipulate rotating plates that control an iris mechanism.

---

## CORELOCK 003 — Split Core

Two hemispheres rotate around separate axes.

Correct alignment exposes internal controls.

---

## CORELOCK 004 — Magnetic Lock

Movement of one control influences another.

Can simulate magnetic coupling without requiring true magnet physics.

---

## CORELOCK 005 — False Mechanism

Includes components that appear meaningful but behave as decoys.

Must still feel fair.

---

## CORELOCK 006 — Gearbox

Several gears interact mechanically.

Changing one affects others.

---

## CORELOCK 007 — The Vault

Combination of:

* dial
* sliders
* locks
* hidden compartment
* final core

---

# 34. Long-Term Content Model

Eventually CORELOCK puzzles could be represented by configuration.

Example conceptual structure:

```ts
interface CorelockPuzzleDefinition {
  id: string;
  name: string;

  mechanisms: MechanismDefinition[];
  conditions: PuzzleCondition[];
  transitions: PuzzleTransition[];

  theme: CorelockTheme;
}
```

Do NOT build a complete content-authoring engine during the MVP.

However, avoid architecture that makes every future puzzle require rewriting the core interaction system.

---

# 35. Connection to Larger App

CORELOCK should feel like one object within a larger collection.

Potential app hierarchy:

```text
OBJECTS

001
CUBE

002
CORELOCK

003
COMING SOON

004
COMING SOON
```

CORELOCK itself may eventually contain multiple objects:

```text
CORELOCK
001 — Three Rings
002 — The Iris
003 — Split Core
004 — Magnetic Lock
```

This should allow the broader application to evolve beyond being perceived solely as a cube game.

---

# 36. Object Numbering

Support object identification such as:

**OBJECT 002**

and puzzle identification such as:

**CORELOCK 001**

This numbering system should be cosmetic/configurable rather than deeply embedded in game logic.

---

# 37. Visual Reveal Effects

Successful opening should include restrained effects.

Potential effects:

* emissive seam glow
* subtle particles
* internal illumination
* slight bloom
* mechanical shell separation
* small camera adjustment
* controlled screen vibration
* haptic feedback

Do NOT turn the reveal into an explosion.

The reward should come primarily from seeing the mechanism finally open.

---

# 38. Failure States

CORELOCK does not need a traditional failure state.

The player cannot lose.

Possible challenge modes later may introduce:

* timer
* move limit
* limited hints

But the default experience should allow unlimited experimentation.

---

# 39. Replayability

Players should have reasons to return after completing the puzzle.

CORELOCK 001 replay hooks:

* beat best time
* reduce move count
* achieve Perfect Mechanism
* Free Play
* alternative materials
* Daily challenge variations
* hidden interactions

---

# 40. Optional Secrets

Leave architecture capable of supporting hidden interactions.

Example:

After opening the core:

A small hidden symbol may appear.

Manipulating the solved mechanism in a particular sequence could trigger:

* alternate core color
* secret sound
* collectible
* visual variant

Do not prioritize this over MVP functionality.

---

# 41. Development Priorities

## Phase 1 — Mechanical Prototype

Build:

* basic object
* camera
* three rotatable rings
* raycast interaction
* snapping
* puzzle state detection

Ignore high-end visuals initially.

Goal:

**Does manipulating the object feel good?**

---

## Phase 2 — Puzzle Mechanics

Add:

* locking pins
* panel
* gear
* internal ring
* final open sequence

Confirm entire puzzle can be completed reliably.

---

## Phase 3 — Interaction Polish

Add:

* drag resistance
* better snapping
* inertia
* mechanical stops
* hover/touch feedback
* interaction prioritization

---

## Phase 4 — Presentation

Add:

* materials
* lighting
* engraving
* internal glow
* camera polish

---

## Phase 5 — Feedback

Add:

* sound
* haptics
* microanimations
* unlock effects
* final reveal sequence

---

## Phase 6 — Game Systems

Add:

* timer
* move tracking
* rankings
* hints
* persistence
* completion screen
* Free Play

---

# 42. MVP Acceptance Criteria

CORELOCK 001 is considered functional when:

* player can freely inspect the object
* rings can be independently manipulated
* ring movement snaps correctly
* correct alignment can be detected
* locking pins retract
* shell panel becomes interactive only after unlocking
* panel can be dragged open
* gear becomes accessible
* gear can be rotated
* gear solution releases inner ring
* inner ring can be solved
* core unlock animation plays
* puzzle completion is detected
* game cannot enter an impossible state
* reset works reliably
* camera interaction does not interfere with mechanisms
* touch input works on mobile
* mouse input works on desktop

---

# 43. Polish Acceptance Criteria

CORELOCK 001 should not be considered production-ready until:

* ring rotation feels tactile
* snapping feels deliberate
* movements have believable mechanical limits
* unlocks provide clear audiovisual feedback
* player can understand that something changed without text
* object remains performant on mobile
* opening sequence feels rewarding
* sound effects sync precisely with animation
* haptic feedback is restrained
* object looks premium
* Free Play works after completion

---

# 44. Non-Goals for Initial Implementation

Do NOT include in the initial build:

* multiplayer
* leaderboards
* backend rewrite
* user-generated puzzles
* procedural puzzle generation
* puzzle editor
* real-world physics simulation
* dozens of Corelocks
* monetization
* achievements system
* social sharing
* AR
* VR

These can be considered later.

---

# 45. Claude Implementation Instruction

Before implementing CORELOCK:

1. Inspect the existing application architecture.
2. Identify the existing:

   * Three.js / React Three Fiber setup
   * camera controls
   * gesture handling
   * state management
   * audio system
   * persistence layer
   * mobile input implementation
3. Reuse existing infrastructure where practical.
4. Do not perform a broad refactor of the existing cube module.
5. Keep CORELOCK isolated enough that bugs cannot destabilize the cube experience.
6. Build CORELOCK 001 incrementally.
7. Prioritize interaction feel over visual complexity.
8. Keep puzzle state deterministic.
9. Test both pointer and touch input.
10. Do not over-engineer future puzzle configuration before the first object works.

The first milestone should NOT be a finished beautiful object.

The first milestone should be:

> **A gray-box Three Rings Corelock where the player can rotate the object, manipulate all three rings independently, feel snapping between positions, and trigger a successful three-ring alignment.**

Once that interaction feels excellent, proceed to the remaining mechanisms.

---

# 46. Core Product Test

Throughout development, evaluate every feature against one question:

> **Does this make the player feel like they are physically manipulating a mysterious mechanical object?**

If the answer is no, simplify or remove it.

CORELOCK succeeds when the player forgets that they are navigating a game interface and instead feels like they are holding, investigating, and eventually opening a strange mechanical artifact.
