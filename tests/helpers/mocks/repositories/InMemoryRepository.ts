export abstract class InMemoryRepository<T extends { id: string }> {
  protected items: T[] = [];

  async findById(id: string): Promise<T | null> {
    return this.items.find(item => item.id === id) ?? null;
  }

  async findAll(): Promise<T[]> {
    return [...this.items];
  }

  async save(item: T): Promise<void> {
    const index = this.items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      this.items[index] = item;
    } else {
      this.items.push(item);
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(item => item.id !== id);
  }

  async clear(): Promise<void> {
    this.items = [];
  }

  async count(): Promise<number> {
    return this.items.length;
  }

  async exists(id: string): Promise<boolean> {
    return this.items.some(item => item.id === id);
  }
}

