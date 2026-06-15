import type { ResourceType, Stockpile } from "../types";

export class ResourceSystem {
  readonly stockpile: Stockpile;

  constructor(starting: Stockpile) {
    this.stockpile = { ...starting };
  }

  canAfford(cost: Partial<Stockpile>): boolean {
    return (Object.entries(cost) as [ResourceType, number][]).every(
      ([type, amount]) => this.stockpile[type] >= amount,
    );
  }

  spend(cost: Partial<Stockpile>): boolean {
    if (!this.canAfford(cost)) return false;
    for (const [type, amount] of Object.entries(cost) as [ResourceType, number][]) {
      this.stockpile[type] -= amount;
    }
    return true;
  }

  add(type: ResourceType, amount: number): void {
    this.stockpile[type] += amount;
  }
}
