import { Application } from 'pixi.js';
import { MapRenderer, type MapData } from './renderer/MapRenderer';
import { Camera } from './renderer/Camera';
import { PlayerSprite } from './renderer/PlayerSprite';
import { MonsterSprite } from './renderer/MonsterSprite';
import { NpcSprite } from './renderer/NpcSprite';
import { DropSprite } from './renderer/DropSprite';
import { DamageText } from './renderer/DamageText';
import { ZenyText } from './renderer/ZenyText';
import { resolveEffect, createAttackEffect, type AttackEffect } from './renderer/effects';
import { screenToTile, tileToScreen } from './renderer/isometric';
import { findPath } from './systems/pathfinding';
import type { MonsterState, DropState, CombatResult } from '@ro-game/shared';
import { PLAYER_MOVE_INTERVAL_MS } from '@ro-game/shared';

/** Monster definition id → display name mapping (loaded from data) */
import monsterDefs from '../../../data/monsters/monsters.json';
import itemDefs from '../../../data/items/items.json';

const MONSTER_NAMES: Record<number, string> = {};
for (const m of monsterDefs) {
  MONSTER_NAMES[m.id] = m.displayName;
}

const ITEM_NAMES: Record<number, string> = {};
for (const item of itemDefs) {
  ITEM_NAMES[item.id] = item.name;
}

export interface GameEngineOptions {
  /** Engine creates its own <canvas> inside this element — a canvas's WebGL
   * context cannot be reused after destroy, so each engine needs a fresh one */
  container: HTMLElement;
  width: number;
  height: number;
  mapData: MapData;
  playerName: string;
  characterId: string;
  playerClass: string;
  startX: number;
  startY: number;
  onMoveRequest?: (path: Array<{ x: number; y: number }>) => void;
  onAttackRequest?: (targetId: string) => void;
  onPickupRequest?: (dropId: string) => void;
  onNpcTalk?: (npcId: string) => void;
}

export class GameEngine {
  private app!: Application;
  private mapRenderer!: MapRenderer;
  private camera!: Camera;
  private localPlayer!: PlayerSprite;
  private otherPlayers: Map<string, PlayerSprite> = new Map();
  private monsters: Map<string, MonsterSprite> = new Map();
  private npcs: Map<string, NpcSprite> = new Map();
  private drops: Map<string, DropSprite> = new Map();
  private damageTexts: DamageText[] = [];
  private zenyTexts: ZenyText[] = [];
  private attackEffects: AttackEffect[] = [];
  private mapData: MapData;
  private characterId: string;
  private localPlayerClass: string;
  private onMoveRequest?: (path: Array<{ x: number; y: number }>) => void;
  private onAttackRequest?: (targetId: string) => void;
  private onPickupRequest?: (dropId: string) => void;
  private onNpcTalk?: (npcId: string) => void;
  private initialized = false;
  private destroyed = false;

  // Click-and-drag walking state
  private dragging = false;
  private lastPointer = { clientX: 0, clientY: 0 };
  private lastDragTile: { x: number; y: number } | null = null;
  private lastDragAttackId: string | null = null;
  private dragPathTimer = 0;

  // Server reconciliation — the destination tile of the client's current predicted
  // walk, used to re-derive a corrected path from the server's tile instead of
  // teleporting when prediction drifts (see reconcileLocalPosition)
  private moveTargetTile: { x: number; y: number } | null = null;
  private static readonly SOFT_DRIFT_TILES = 3;
  private static readonly HARD_SNAP_TILES = 10;

  // Debounce duplicate move commands to the same tile (e.g. a fast double-click)
  // so the server doesn't recompute a fresh path mid-walk and diverge from the
  // client's prediction
  private lastMoveRequestTarget: { x: number; y: number } | null = null;
  private lastMoveRequestAt = 0;
  private static readonly MOVE_REQUEST_DEBOUNCE_MS = 200;

  // Bound once so removeEventListener can actually detach them
  private pointerDownHandler = this.handlePointerDown.bind(this);
  private pointerMoveHandler = this.handlePointerMove.bind(this);
  private pointerUpHandler = this.handlePointerUp.bind(this);

  constructor(private options: GameEngineOptions) {
    this.mapData = options.mapData;
    this.characterId = options.characterId;
    this.localPlayerClass = options.playerClass;
    this.onMoveRequest = options.onMoveRequest;
    this.onAttackRequest = options.onAttackRequest;
    this.onPickupRequest = options.onPickupRequest;
    this.onNpcTalk = options.onNpcTalk;
  }

  async init(): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: this.options.width,
      height: this.options.height,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // destroy() was called while awaiting (React StrictMode double-mount) —
    // abort before attaching to the DOM so no ghost engine survives
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }

    this.app.canvas.style.display = 'block';
    this.options.container.appendChild(this.app.canvas);

    // Map
    this.mapRenderer = new MapRenderer(this.app, this.mapData);

    // Camera
    this.camera = new Camera(this.app.stage, this.options.width, this.options.height);

    // Local player
    this.localPlayer = new PlayerSprite(
      'local',
      this.options.playerName,
      this.options.startX,
      this.options.startY,
      0xe94560,
      true
    );
    this.mapRenderer.entities.addChild(this.localPlayer.container);

    // NPCs (static, from map data)
    for (const npc of this.mapData.npcPositions ?? []) {
      const sprite = new NpcSprite(npc.id, npc.name, npc.x, npc.y);
      this.npcs.set(npc.id, sprite);
      this.mapRenderer.entities.addChild(sprite.container);
    }

    // Center camera on player
    const startPos = tileToScreen(this.options.startX, this.options.startY);
    this.camera.follow(startPos.x, startPos.y);
    this.camera.snap();

    // Pointer handlers: tap to interact/walk, hold-and-drag to walk continuously
    this.app.canvas.addEventListener('pointerdown', this.pointerDownHandler);
    window.addEventListener('pointermove', this.pointerMoveHandler);
    window.addEventListener('pointerup', this.pointerUpHandler);

    // Game loop
    this.app.ticker.add(this.gameLoop.bind(this));

    this.initialized = true;
  }

  /** Convert a pointer event to world (stage-local) coordinates */
  private eventToWorld(clientX: number, clientY: number): { worldX: number; worldY: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    const scaleX = this.app.canvas.width / rect.width;
    const scaleY = this.app.canvas.height / rect.height;
    return {
      worldX: (clientX - rect.left) * scaleX - this.app.stage.x,
      worldY: (clientY - rect.top) * scaleY - this.app.stage.y,
    };
  }

  private handlePointerDown(event: PointerEvent): void {
    const { worldX, worldY } = this.eventToWorld(event.clientX, event.clientY);

    // Check if clicked on an NPC (within 16px radius)
    for (const [id, npc] of this.npcs) {
      const dx = worldX - npc.container.x;
      const dy = worldY - (npc.container.y - 10);
      if (dx * dx + dy * dy < 16 * 16) {
        this.onNpcTalk?.(id);
        return;
      }
    }

    // Check if clicked on a monster (within 16px radius)
    for (const [id, monster] of this.monsters) {
      const dx = worldX - monster.container.x;
      const dy = worldY - (monster.container.y - 10); // offset for body center
      if (dx * dx + dy * dy < 16 * 16) {
        this.onAttackRequest?.(id);
        this.dragging = true;
        this.lastPointer = { clientX: event.clientX, clientY: event.clientY };
        this.lastDragTile = null;
        this.lastDragAttackId = id;
        this.dragPathTimer = 0;
        return;
      }
    }

    // Check if clicked on a drop (within 12px radius)
    for (const [id, drop] of this.drops) {
      const dx = worldX - drop.container.x;
      const dy = worldY - drop.container.y;
      if (dx * dx + dy * dy < 12 * 12) {
        this.onPickupRequest?.(id);
        return;
      }
    }

    // Ground: start drag-walking (a plain click is just a very short drag)
    this.dragging = true;
    this.lastPointer = { clientX: event.clientX, clientY: event.clientY };
    this.lastDragTile = null;
    this.lastDragAttackId = null;
    this.moveTowardPointer();
    this.dragPathTimer = 0;
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    this.lastPointer = { clientX: event.clientX, clientY: event.clientY };
  }

  private handlePointerUp(): void {
    this.dragging = false;
    this.lastDragTile = null;
    this.lastDragAttackId = null;
  }

  /** Path toward the tile under the pointer (throttled by dragPathTimer), or
   * request an attack instead if the drag has landed on a monster — the
   * server auto-approaches to weapon range before firing, so melee classes
   * walk adjacent and ranged classes stop at range. */
  private moveTowardPointer(): void {
    const { worldX, worldY } = this.eventToWorld(this.lastPointer.clientX, this.lastPointer.clientY);

    for (const [id, monster] of this.monsters) {
      const dx = worldX - monster.container.x;
      const dy = worldY - (monster.container.y - 10);
      if (dx * dx + dy * dy < 16 * 16) {
        if (this.lastDragAttackId !== id) {
          this.onAttackRequest?.(id);
          this.lastDragAttackId = id;
          this.lastDragTile = null;
        }
        return;
      }
    }
    this.lastDragAttackId = null;

    const tile = screenToTile(worldX, worldY);

    // Bounds + walkability
    if (
      tile.x < 0 || tile.x >= this.mapData.width ||
      tile.y < 0 || tile.y >= this.mapData.height ||
      !this.mapData.walkable[tile.y][tile.x]
    ) {
      return;
    }

    // Skip if the pointer is still over the same target tile or our own tile
    if (this.lastDragTile && this.lastDragTile.x === tile.x && this.lastDragTile.y === tile.y) return;
    if (tile.x === this.localPlayer.tileX && tile.y === this.localPlayer.tileY) return;

    const path = findPath(
      this.mapData.walkable,
      this.localPlayer.tileX,
      this.localPlayer.tileY,
      tile.x,
      tile.y
    );

    if (path.length > 1) {
      const now = performance.now();
      const isDuplicateTarget =
        this.lastMoveRequestTarget &&
        this.lastMoveRequestTarget.x === tile.x &&
        this.lastMoveRequestTarget.y === tile.y &&
        now - this.lastMoveRequestAt < GameEngine.MOVE_REQUEST_DEBOUNCE_MS;

      if (!isDuplicateTarget) {
        this.onMoveRequest?.(path);
        this.lastMoveRequestTarget = tile;
        this.lastMoveRequestAt = now;
      }

      this.moveTargetTile = tile;
      this.moveAlongPath(path);
      this.lastDragTile = tile;
    }
  }

  private currentPath: Array<{ x: number; y: number }> = [];
  private pathIndex = 0;
  private moveTimer = 0;
  // Must match server movement speed (PLAYER_MOVE_TICKS) or reconciliation snaps
  private readonly MOVE_INTERVAL = PLAYER_MOVE_INTERVAL_MS;

  private moveAlongPath(path: Array<{ x: number; y: number }>): void {
    this.currentPath = path;
    this.pathIndex = 1; // skip first (current position)
    this.moveTimer = 0;
  }

  private gameLoop(ticker: { deltaMS: number }): void {
    // Drag-walking: re-path toward the pointer at most once per move interval
    if (this.dragging) {
      this.dragPathTimer += ticker.deltaMS;
      if (this.dragPathTimer >= PLAYER_MOVE_INTERVAL_MS) {
        this.dragPathTimer = 0;
        this.moveTowardPointer();
      }
    }

    // Path movement
    if (this.pathIndex < this.currentPath.length) {
      this.moveTimer += ticker.deltaMS;
      if (this.moveTimer >= this.MOVE_INTERVAL) {
        this.moveTimer -= this.MOVE_INTERVAL;
        const next = this.currentPath[this.pathIndex];
        this.localPlayer.moveTo(next.x, next.y);
        this.pathIndex++;
        if (this.pathIndex >= this.currentPath.length) {
          this.moveTargetTile = null;
        }
      }
    }

    // Update sprites
    this.localPlayer.update();
    for (const player of this.otherPlayers.values()) {
      player.update();
    }
    for (const monster of this.monsters.values()) {
      monster.update();
    }
    for (const drop of this.drops.values()) {
      drop.update();
    }

    // Update damage texts
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dt = this.damageTexts[i];
      dt.update(ticker.deltaMS);
      if (dt.done) {
        this.mapRenderer.effects.removeChild(dt.text);
        dt.destroy();
        this.damageTexts.splice(i, 1);
      }
    }

    // Update zeny texts
    for (let i = this.zenyTexts.length - 1; i >= 0; i--) {
      const zt = this.zenyTexts[i];
      zt.update(ticker.deltaMS);
      if (zt.done) {
        this.mapRenderer.effects.removeChild(zt.text);
        zt.destroy();
        this.zenyTexts.splice(i, 1);
      }
    }

    // Update attack effects
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      const effect = this.attackEffects[i];
      effect.update(ticker.deltaMS);
      if (effect.done) {
        this.mapRenderer.effects.removeChild(effect.view);
        effect.destroy();
        this.attackEffects.splice(i, 1);
      }
    }

    // Camera follow
    const pos = tileToScreen(this.localPlayer.tileX, this.localPlayer.tileY);
    this.camera.follow(pos.x, pos.y);
    this.camera.update();

    // Depth sort
    this.mapRenderer.sortEntities();
  }

  // ─── Monster Management ──────────────────────────

  updateMonster(id: string, state: MonsterState): void {
    if (state.action === 'dead') {
      this.removeMonster(id);
      return;
    }

    let sprite = this.monsters.get(id);
    if (!sprite) {
      const name = MONSTER_NAMES[state.definitionId] || `Monster #${state.definitionId}`;
      sprite = new MonsterSprite(id, state.definitionId, name, state.x, state.y, state.hp, state.maxHp, !!state.isShiny);
      this.monsters.set(id, sprite);
      this.mapRenderer.entities.addChild(sprite.container);
    } else {
      sprite.moveTo(state.x, state.y);
      sprite.setHp(state.hp, state.maxHp);
    }
    sprite.setStatus(state.status);
  }

  removeMonster(id: string): void {
    const sprite = this.monsters.get(id);
    if (sprite) {
      this.mapRenderer.entities.removeChild(sprite.container);
      sprite.destroy();
      this.monsters.delete(id);
    }
  }

  /** Floating gold "+Nz" text at a tile position, shown when a monster drops zeny on death */
  showZenyGain(tileX: number, tileY: number, zeny: number): void {
    if (zeny <= 0) return;
    const pos = tileToScreen(tileX, tileY);
    const zt = new ZenyText(pos.x, pos.y, zeny);
    this.zenyTexts.push(zt);
    this.mapRenderer.effects.addChild(zt.text);
  }

  // ─── Drop Management ─────────────────────────────

  updateDrop(id: string, state: DropState): void {
    if (this.drops.has(id)) return; // already exists

    const name = ITEM_NAMES[state.itemId] || `Item #${state.itemId}`;
    const sprite = new DropSprite(id, state.itemId, name, state.x, state.y);
    this.drops.set(id, sprite);
    this.mapRenderer.entities.addChild(sprite.container);
  }

  removeDrop(id: string): void {
    const sprite = this.drops.get(id);
    if (sprite) {
      this.mapRenderer.entities.removeChild(sprite.container);
      sprite.destroy();
      this.drops.delete(id);
    }
  }

  addDrop(dropId: string, itemId: number, x: number, y: number): void {
    this.updateDrop(dropId, { id: dropId, itemId, x, y });
  }

  // ─── Combat Visuals ──────────────────────────────

  showCombatResult(result: CombatResult): void {
    // Find the target's screen position
    let targetX = 0;
    let targetY = 0;

    // Check if target is a monster
    const monster = this.monsters.get(result.targetId);
    if (monster) {
      targetX = monster.container.x;
      targetY = monster.container.y;
    } else {
      // Check if target is a player
      const player = this.otherPlayers.get(result.targetId);
      if (player) {
        targetX = player.container.x;
        targetY = player.container.y;
      } else if (result.targetId === this.characterId) {
        targetX = this.localPlayer.container.x;
        targetY = this.localPlayer.container.y;
      } else {
        return; // target not found
      }
    }

    const dt = new DamageText(targetX, targetY, result.damage, result.isCrit, result.isMiss);
    this.damageTexts.push(dt);
    this.mapRenderer.effects.addChild(dt.text);

    // Find the attacker's screen position + class, to pick and place the attack effect
    let attackerX = targetX;
    let attackerY = targetY;
    let attackerClass = '';

    const attackerMonster = this.monsters.get(result.attackerId);
    if (attackerMonster) {
      attackerX = attackerMonster.container.x;
      attackerY = attackerMonster.container.y;
    } else {
      const attackerPlayer = this.otherPlayers.get(result.attackerId);
      if (attackerPlayer) {
        attackerX = attackerPlayer.container.x;
        attackerY = attackerPlayer.container.y;
        attackerClass = attackerPlayer.characterClass;
      } else if (result.attackerId === this.characterId) {
        attackerX = this.localPlayer.container.x;
        attackerY = this.localPlayer.container.y;
        attackerClass = this.localPlayerClass;
      }
    }

    const spec = resolveEffect(result, attackerClass);
    const effect = createAttackEffect(spec, attackerX, attackerY, targetX, targetY);
    this.attackEffects.push(effect);
    this.mapRenderer.effects.addChild(effect.view);
  }

  // ─── Player Management ───────────────────────────

  /** Add or update another player on the map */
  updatePlayer(
    id: string,
    name: string,
    tileX: number,
    tileY: number,
    color: number = 0x3498db,
    characterClass: string = '',
    status?: string
  ): void {
    let sprite = this.otherPlayers.get(id);
    if (!sprite) {
      sprite = new PlayerSprite(id, name, tileX, tileY, color, false, characterClass);
      this.otherPlayers.set(id, sprite);
      this.mapRenderer.entities.addChild(sprite.container);
    } else {
      sprite.moveTo(tileX, tileY);
      sprite.characterClass = characterClass;
    }
    sprite.setStatus(status);
  }

  /** Remove a player from the map */
  removePlayer(id: string): void {
    const sprite = this.otherPlayers.get(id);
    if (sprite) {
      this.mapRenderer.entities.removeChild(sprite.container);
      sprite.destroy();
      this.otherPlayers.delete(id);
    }
  }

  /** Update local player position (from server state) */
  setLocalPosition(tileX: number, tileY: number): void {
    this.localPlayer.snapTo(tileX, tileY);
    this.currentPath = [];
    this.pathIndex = 0;
    this.moveTargetTile = null;
  }

  /** Reconcile predicted position against the server's — small drift is trusted as
   *  normal prediction lag, moderate drift is corrected by smoothly re-routing toward
   *  the same destination (no visual pop), and only extreme drift with no coherent
   *  path back falls through to a hard teleport. */
  reconcileLocalPosition(tileX: number, tileY: number): void {
    const dist = Math.max(
      Math.abs(this.localPlayer.tileX - tileX),
      Math.abs(this.localPlayer.tileY - tileY)
    );

    // No local ground-click prediction in flight (e.g. the server is auto-walking us
    // into weapon range to attack a monster, or any other server-driven repositioning) —
    // there's no local path to trust or drift against, so just follow the server's tile
    // with the normal smooth lerp every update, exactly like other players' sprites do.
    if (!this.moveTargetTile) {
      if (dist > GameEngine.HARD_SNAP_TILES) {
        this.setLocalPosition(tileX, tileY);
      } else if (dist > 0) {
        this.localPlayer.moveTo(tileX, tileY);
      }
      return;
    }

    if (dist <= GameEngine.SOFT_DRIFT_TILES) return;

    if (dist <= GameEngine.HARD_SNAP_TILES) {
      const path = findPath(this.mapData.walkable, tileX, tileY, this.moveTargetTile.x, this.moveTargetTile.y);
      if (path.length > 1) {
        // Correct the logical tile (and lerp target) without touching the on-screen
        // position — the sprite's existing lerp then glides toward the corrected route.
        this.localPlayer.moveTo(tileX, tileY);
        this.moveAlongPath(path);
        return;
      }
    }

    this.setLocalPosition(tileX, tileY);
  }

  resize(width: number, height: number): void {
    if (!this.initialized) return;
    this.app.renderer.resize(width, height);
    this.camera.resize(width, height);
  }

  destroy(): void {
    this.destroyed = true;
    // Not yet initialized: init() will see the flag and clean up when it resolves
    if (!this.initialized) return;
    this.app.canvas.removeEventListener('pointerdown', this.pointerDownHandler);
    window.removeEventListener('pointermove', this.pointerMoveHandler);
    window.removeEventListener('pointerup', this.pointerUpHandler);
    for (const player of this.otherPlayers.values()) {
      player.destroy();
    }
    for (const monster of this.monsters.values()) {
      monster.destroy();
    }
    for (const npc of this.npcs.values()) {
      npc.destroy();
    }
    for (const drop of this.drops.values()) {
      drop.destroy();
    }
    for (const dt of this.damageTexts) {
      dt.destroy();
    }
    for (const zt of this.zenyTexts) {
      zt.destroy();
    }
    for (const effect of this.attackEffects) {
      effect.destroy();
    }
    this.localPlayer.destroy();
    this.mapRenderer.destroy();
    this.app.canvas.remove();
    this.app.destroy(true);
    this.initialized = false;
  }
}
