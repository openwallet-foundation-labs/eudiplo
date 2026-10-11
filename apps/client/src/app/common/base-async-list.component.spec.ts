import { describe, expect, it, vi } from 'vitest';

import { BaseAsyncListComponent } from './base-async-list.component';

class TestList extends BaseAsyncListComponent<string> {
  protected readonly loadFailedMessage = 'Failed to load things';
  readonly fetch = vi.fn<() => Promise<string[]>>();

  get shown(): string[] {
    return this.items;
  }

  protected fetchItems(): Promise<string[]> {
    return this.fetch();
  }
}

describe('BaseAsyncListComponent', () => {
  it('keeps a failed load apart from an empty list and loads again on retry', async () => {
    const list = new TestList();
    list.fetch
      .mockRejectedValueOnce({ statusCode: 403, message: 'Forbidden resource' })
      .mockResolvedValueOnce(['a']);

    await list.loadItems();

    expect(list.loadError).toBe('Failed to load things: Forbidden resource');
    expect(list.loading).toBe(false);

    await list.loadItems();

    expect(list.loadError).toBe('');
    expect(list.shown).toEqual(['a']);
  });
});
