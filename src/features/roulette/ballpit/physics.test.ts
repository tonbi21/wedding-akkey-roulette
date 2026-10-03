import { describe, expect, it } from "vitest";
import { BallpitPhysics } from "./physics";

describe("Ballpit physics", () => {
  it("does not pull an isolated stationary capsule down with zero gravity", () => {
    const physics = new BallpitPhysics(1, { x: 100, y: 100, z: 100 });
    const ball = physics.balls[0];
    ball.position.set(0, 0, 0);
    ball.velocity.set(0, 0, 0);
    for (let frame = 0; frame < 600; frame++) physics.step(1 / 60);
    expect(ball.position.toArray()).toEqual([0, 0, 0]);
  });

  it("starts capsules drifting both upward and downward", () => {
    const physics = new BallpitPhysics(48, { x: 12, y: 9, z: 1.8 });
    expect(physics.balls.some((ball) => ball.velocity.y > 0)).toBe(true);
    expect(physics.balls.some((ball) => ball.velocity.y < 0)).toBe(true);
  });

  it("keeps a gentle drift after a minute without pointer input", () => {
    const physics = new BallpitPhysics(1, { x: 100, y: 100, z: 100 });
    const ball = physics.balls[0];
    ball.position.set(0, 0, 0);
    ball.velocity.set(0.02, 0.02, 0);
    for (let frame = 0; frame < 3600; frame++) physics.step(1 / 60);
    expect(ball.velocity.x).toBeGreaterThan(0.005);
    expect(ball.velocity.y).toBeGreaterThan(0.005);
    expect(ball.velocity.length()).toBeLessThan(0.03);
  });

  it("scales all capsule collision radii to 1.5 times the original range", () => {
    const physics = new BallpitPhysics(48, { x: 12, y: 9, z: 1.8 });
    for (const ball of physics.balls) {
      expect(ball.radius).toBeGreaterThanOrEqual(0.825);
      expect(ball.radius).toBeLessThan(1.23);
    }
  });

  it("keeps all 48 capsules finite and inside resized walls through a long simulation", () => {
    const physics = new BallpitPhysics(48, { x: 12, y: 9, z: 1.8 });
    expect(physics.balls).toHaveLength(48);
    for (let frame = 0; frame < 900; frame++) physics.step(1 / 60);
    physics.resize({ x: 3.8, y: 9, z: 1.8 });
    for (let frame = 0; frame < 300; frame++) physics.step(1 / 60);
    for (const ball of physics.balls) {
      expect(Number.isFinite(ball.position.length())).toBe(true);
      expect(Math.abs(ball.position.x) + ball.radius).toBeLessThanOrEqual(3.801);
      expect(Math.abs(ball.position.y) + ball.radius).toBeLessThanOrEqual(9.001);
      expect(Math.abs(ball.position.z) + ball.radius).toBeLessThanOrEqual(1.801);
    }
  });

  it("bounces a falling ball and separates coincident balls without NaN", () => {
    const physics = new BallpitPhysics(2, { x: 5, y: 5, z: 2 });
    physics.balls.forEach((ball) => { ball.position.set(0, -5 + ball.radius, 0); ball.velocity.set(0, -0.1, 0); });
    physics.step(1 / 60);
    expect(physics.balls[0].position.distanceTo(physics.balls[1].position)).toBeGreaterThan(0);
    expect(physics.balls.every((ball) => Number.isFinite(ball.velocity.length()))).toBe(true);
    expect(physics.balls.some((ball) => ball.velocity.y > 0)).toBe(true);
  });

  it("pointer repulsion moves capsules without hiding or adding a 49th ball", () => {
    const physics = new BallpitPhysics(48, { x: 12, y: 9, z: 1.8 });
    physics.balls[0].position.set(0.1, 0, 0);
    physics.balls[0].velocity.set(0, 0, 0);
    // Keep random initial neighbors away so this assertion isolates pointer repulsion.
    physics.balls.slice(1).forEach((ball) => { ball.position.x = 8; });
    physics.pointer.set(0, 0, 0);
    physics.pointerActive = true;
    physics.step(1 / 60);
    expect(physics.balls[0].velocity.x).toBeGreaterThan(0);
    expect(physics.balls).toHaveLength(48);
  });
});
