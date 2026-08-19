declare module 'cubejs' {
  export default class Cube {
    constructor(state?: unknown);
    static initSolver(): void;
    static fromString(s: string): Cube;
    static random(): Cube;
    static asyncInit(workerPath: string, cb: () => void): void;
    static asyncSolve(cube: Cube, cb: (algorithm: string) => void): void;
    move(alg: string): Cube;
    solve(): string;
    isSolved(): boolean;
    randomize(): void;
    toJSON(): unknown;
  }
}
