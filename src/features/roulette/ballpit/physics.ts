import { Vector3 } from "three";
import { secureRandomIndex } from "../lib/random";
import { BALLPIT_SETTINGS } from "./settings";

export type Bounds = { x: number; y: number; z: number };
type Ball = { position: Vector3; velocity: Vector3; radius: number };

// Adapted from the supplied React Bits Ballpit: gravity, friction, sphere
// separation and wall bounce. A fixed time step keeps motion display-rate independent.
export class BallpitPhysics {
  readonly balls: Ball[];
  readonly pointer = new Vector3();
  pointerActive = false;
  private readonly difference = new Vector3();
  private accumulator = 0;

  constructor(count: number, private bounds: Bounds) {
    const random = () => secureRandomIndex(1_000_000) / 1_000_000;
    this.balls = Array.from({ length: count }, (_, index) => {
      const radius = (0.55 + random() * 0.27) * BALLPIT_SETTINGS.capsuleScale;
      return {
        radius,
        position: new Vector3(
          (random() * 2 - 1) * (bounds.x - radius),
          (index / count * 2 - 1) * (bounds.y - radius),
          (random() * 2 - 1) * (bounds.z - radius)
        ),
        velocity: new Vector3(
          (random() - 0.5) * 0.06,
          (index % 2 === 0 ? 1 : -1) * (0.008 + random() * 0.008),
          (random() - 0.5) * 0.02
        )
      };
    });
  }

  resize(bounds: Bounds) {
    this.bounds = bounds;
    this.balls.forEach((ball) => this.constrain(ball));
  }

  step(delta: number) {
    this.accumulator += Math.min(Math.max(delta, 0), 0.05);
    while (this.accumulator >= 1 / 60) {
      this.integrate();
      this.accumulator -= 1 / 60;
    }
  }

  nudge() {
    for (const ball of this.balls) this.pushFromPointer(ball);
  }

  private pushFromPointer(ball: Ball) {
    this.difference.copy(ball.position).sub(this.pointer);
    const distance = this.difference.length();
    const reach = ball.radius + 1.25;
    if (distance < reach) {
      if (distance < 0.00001) this.difference.set(1, 0, 0);
      else this.difference.multiplyScalar(1 / distance);
      ball.velocity.addScaledVector(this.difference, (reach - distance) * 0.09);
    }
  }

  private integrate() {
    for (const ball of this.balls) {
      ball.velocity.y -= (BALLPIT_SETTINGS.gravity / 60) * ball.radius;
      // Let collision/pointer impulses settle, but keep a gentle weightless drift.
      ball.velocity.multiplyScalar(0.9975).clampLength(BALLPIT_SETTINGS.minDriftSpeed, 0.15);
      ball.position.add(ball.velocity);
    }
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      for (let j = i + 1; j < this.balls.length; j++) {
        const other = this.balls[j];
        this.difference.copy(other.position).sub(ball.position);
        const distance = this.difference.length();
        const overlap = ball.radius + other.radius - distance;
        if (overlap <= 0) continue;
        if (distance < 0.00001) this.difference.set(1, 0, 0);
        else this.difference.multiplyScalar(1 / distance);
        this.difference.multiplyScalar(overlap / 2);
        ball.position.sub(this.difference);
        other.position.add(this.difference);
        ball.velocity.addScaledVector(this.difference, -0.65);
        other.velocity.addScaledVector(this.difference, 0.65);
      }
      if (this.pointerActive) {
        this.pushFromPointer(ball);
      }
    }
    // Constrain after all pair corrections, including balls changed by a later pair.
    this.balls.forEach((ball) => this.constrain(ball));
  }

  private constrain(ball: Ball) {
    for (const axis of ["x", "y", "z"] as const) {
      const limit = Math.max(0, this.bounds[axis] - ball.radius);
      if (Math.abs(ball.position[axis]) > limit) {
        const side = Math.sign(ball.position[axis]);
        ball.position[axis] = side * limit;
        if (ball.velocity[axis] * side > 0) ball.velocity[axis] *= -0.95;
      }
    }
  }
}
