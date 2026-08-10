import { describe, expect, it } from "vitest";
import { GameSimulation, INITIAL_WOOD, MAX_WAVE, WALL_MAX_HP } from "../../src/core/game";

describe("GameSimulation", () => {
  it("starts in preparation with initial resources", () => {
    const game = new GameSimulation();

    expect(game.getState()).toMatchObject({
      phase: "PREPARE",
      wave: 0,
      wood: INITIAL_WOOD,
      wallHp: WALL_MAX_HP,
    });
  });

  it("builds a tower through a validated command", () => {
    const game = new GameSimulation();
    const result = game.dispatch({
      type: "build_tower",
      definitionId: "machine_gun",
      slotId: "slot-1",
    });

    expect(result.accepted).toBe(true);
    expect(game.getState().buildings).toHaveLength(1);
    expect(game.getState().wood).toBe(INITIAL_WOOD - 40);
  });

  it("pauses simulation time and resumes the previous phase", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "start_wave" });
    const beforePause = game.getState().waveTimeRemainingSeconds;

    game.dispatch({ type: "pause" });
    game.tick(10);
    expect(game.getState().phase).toBe("PAUSED");
    expect(game.getState().waveTimeRemainingSeconds).toBe(beforePause);

    game.dispatch({ type: "resume" });
    expect(game.getState().phase).toBe("COMBAT");
  });

  it("enters defeat once when the wall reaches zero", () => {
    const game = new GameSimulation();
    game.dispatch({ type: "start_wave" });
    game.damageWall(WALL_MAX_HP);
    game.damageWall(10);

    expect(game.getState().phase).toBe("DEFEAT");
    expect(game.getState().wallHp).toBe(0);
  });

  it("completes the fixed wave sequence", () => {
    const game = new GameSimulation();

    for (let wave = 0; wave < MAX_WAVE; wave += 1) {
      expect(game.dispatch({ type: "start_wave" }).accepted).toBe(true);
      game.tick(5);
    }

    expect(game.getState().wave).toBe(MAX_WAVE);
    expect(game.getState().phase).toBe("VICTORY");
  });
});
