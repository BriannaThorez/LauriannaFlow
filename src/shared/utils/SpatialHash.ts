export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Set<string>>;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getHash(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  clear() {
    this.grid.clear();
  }

  insert(id: string, x: number, y: number, width: number, height: number) {
    const startX = x - width / 2;
    const startY = y - height / 2;
    const endX = x + width / 2;
    const endY = y + height / 2;

    for (let ix = startX; ix <= endX + this.cellSize; ix += this.cellSize) {
      for (let iy = startY; iy <= endY + this.cellSize; iy += this.cellSize) {
        const hash = this.getHash(Math.min(ix, endX), Math.min(iy, endY));
        if (!this.grid.has(hash)) {
          this.grid.set(hash, new Set());
        }
        this.grid.get(hash)!.add(id);
      }
    }
  }

  query(x: number, y: number, width: number, height: number): Set<string> {
    const result = new Set<string>();
    const startX = x - width / 2;
    const startY = y - height / 2;
    const endX = x + width / 2;
    const endY = y + height / 2;

    for (let ix = startX; ix <= endX + this.cellSize; ix += this.cellSize) {
      for (let iy = startY; iy <= endY + this.cellSize; iy += this.cellSize) {
        const hash = this.getHash(Math.min(ix, endX), Math.min(iy, endY));
        const cell = this.grid.get(hash);
        if (cell) {
          cell.forEach(id => result.add(id));
        }
      }
    }
    return result;
  }
}
