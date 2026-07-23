import { Container } from 'pixi.js';

const LERP_FACTOR = 0.08;

export class Camera {
  private targetX = 0;
  private targetY = 0;

  constructor(
    private stage: Container,
    private screenWidth: number,
    private screenHeight: number
  ) {}

  /** Set the target position the camera should follow (in world coordinates) */
  follow(worldX: number, worldY: number): void {
    this.targetX = -worldX + this.screenWidth / 2;
    this.targetY = -worldY + this.screenHeight / 2;
  }

  /** Smoothly interpolate toward the target each frame */
  update(): void {
    this.stage.x += (this.targetX - this.stage.x) * LERP_FACTOR;
    this.stage.y += (this.targetY - this.stage.y) * LERP_FACTOR;
  }

  /** Immediately snap to target (no lerp) */
  snap(): void {
    this.stage.x = this.targetX;
    this.stage.y = this.targetY;
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }
}
