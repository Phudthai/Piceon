/**
 * Message types between main thread and game loop worker.
 */

export interface TickResult {
  type: 'tick';
  mapDeltas: Array<{
    mapName: string;
    players: Record<string, {
      id: string;
      name: string;
      class: string;
      x: number;
      y: number;
      hp: number;
      maxHp: number;
      action: string;
      direction: number;
    }>;
  }>;
}

export interface WorkerCommand {
  type: 'start' | 'stop';
}

export type MainToWorker = WorkerCommand;
export type WorkerToMain = TickResult;
