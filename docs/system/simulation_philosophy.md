# Weedbreed.AI — Simulation Philosophy Deep Dive

This section details the core design philosophies that underpin each major subsystem of the simulation. It focuses on the "why" behind the mechanics, providing insight into the intended player experience and architectural goals.

## 1. Time & Simulation Loop: Stability and Fairness

- **Philosophy**: The game world must be predictable and fair, progressing at a constant rate regardless of the user's hardware. A simulation's integrity depends on its timekeeping.
- **Implementation Rationale**: It is important to decouple the simulation's "tick rate" from the UI's "frame rate". A tick represents a fixed unit of game time (default 5 minutes), ensuring that a player on a 144Hz monitor experiences the same game progression as a player on a 60Hz monitor. The "catch-up" mechanism, which limits ticks per frame, embodies a user-centric philosophy: **responsiveness is more important than perfect simulation.** The game will never freeze the UI to catch up; it will instead fast-forward gracefully, maintaining a fluid player experience.
- **Example**: In a browser-based tech-stack we probably would use a `requestAnimationFrame` loop with a time accumulator instead of `setInterval`.

## 2. Environmental Model: Emergent Complexity from Simple Rules

- **Philosophy**: A believable and engaging environment should arise from the interaction of simple, understandable rules, rather than a complex, monolithic formula. The goal is emergent complexity.
- **Implementation Rationale**: The delta-based system is the cornerstone of this philosophy. Each object in a zone—a lamp, a plant, the outside air—contributes a small, simple "delta" (a positive or negative change) to the environment each tick. A lamp adds heat; an AC unit removes it. The complex, dynamic behavior of the zone's climate is the _emergent result_ of summing these simple deltas. This makes the system transparent to the player ("My room is hot because I have too many lamps") and highly extensible for developers (adding a new device just requires defining its delta).

## 3. Plant Growth Model: The Core Feedback Loop

- **Philosophy**: The central challenge and reward of the game should be the player's mastery of the cultivation process. The relationship between player action, environmental quality, and plant outcome must be direct, transparent, and meaningful.
- **Implementation Rationale**: The `Stress -> Health -> Growth` cascade is the mechanical expression of this philosophy. It's a clear feedback loop:
  1.  **Input**: The player manages the environment.
  2.  **Problem**: The environment's deviation from the plant's ideal conditions creates `Stress`.
  3.  **State**: `Stress` negatively impacts the plant's `Health`.
  4.  **Output**: `Health` directly multiplies the plant's potential `Growth`.
      This design turns cultivation into an optimization puzzle, not a black box. The player is empowered to diagnose problems (high stress) and see a direct correlation between their solutions and the rewards (better health and yield).

## 4. Personnel & AI: Autonomous Agents and Indirect Control

- **Philosophy**: The player is a manager, not a micromanager. The gameplay should focus on high-level strategic decisions, with the simulation's agents (employees) intelligently handling the low-level execution. This is a game of indirect control.
- **Implementation Rationale**: The Task & AI system embodies this. The `taskEngine` acts like a "manager" that observes the state of the world and creates a "to-do list" (the task queue). The employees are autonomous agents who "pull" tasks from this list based on their role and skills. The player doesn't tell a specific employee to harvest a plant; they ensure they have hired enough skilled gardeners, and the system handles the rest. This shifts the player's focus from tedious clicking to strategic questions like "Is my workforce balanced?" and "Do I have enough breakrooms to keep my staff energized?".

## 5. Economic Model: Constant Pressure and Rewarding Mastery

- **Philosophy**: A compelling tycoon game needs both persistent challenges and strong incentives for skillful play. The economy is designed to create a gentle but constant financial pressure, forcing players to be efficient, while simultaneously offering outsized rewards for true mastery of the game's systems.
- **Implementation Rationale**:
  - **Constant Pressure**: Operating costs (rent, salaries, power) are calculated _per tick_. This constant drain prevents a passive "sit and wait" strategy and forces the player to build an operation that is consistently profitable.
  - **Rewarding Mastery**: The price function for harvested goods is deliberately non-linear. A harvest of average quality might sell for the base price, but a high-quality harvest—achieved only by mastering the environmental and plant health systems—receives an exponential price bonus. This creates a powerful incentive to go beyond "good enough" and strive for perfection.

## 6. Genetics & Breeding: Player-Driven Discovery

- **Philosophy**: The long-term replayability and "end-game" of a simulation often lie in creative expression and player-driven goals. The breeding system is designed to be this creative outlet.
- **Implementation Rationale**: The system of averaging parental traits with a slight, deterministic mutation provides a perfect balance of predictability and discovery. Players can strategically combine parents to aim for a specific outcome (e.g., higher THC), but the random mutation factor means there's always a chance for a surprisingly good (or bad) result. This encourages experimentation and gives the player a powerful tool to create their own "ultimate strain," a goal that is defined and pursued entirely by them. It transforms the player from a consumer of pre-defined strains into a creator of new ones.
