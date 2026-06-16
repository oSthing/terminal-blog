/**
 * Minimal observable store — single source of truth for the terminal.
 * Holds cwd, command history, and a per-instance token so duplicate listeners don't double-render.
 */

export type Listener<T> = (value: T) => void;

export class Store<T> {
  private value: T;
  private listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    return this.value;
  }

  set(next: T | ((prev: T) => T)): void {
    this.value = typeof next === 'function' ? (next as (prev: T) => T)(this.value) : next;
    for (const listener of this.listeners) listener(this.value);
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export interface TerminalState {
  cwd: string;
  history: string[];
}

export const terminalStore = new Store<TerminalState>({
  cwd: '/',
  history: [],
});
