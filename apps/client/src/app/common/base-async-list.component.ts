import { Directive, OnInit } from '@angular/core';

import { getApiErrorMessage } from '../utils/error-message';

@Directive()
export abstract class BaseAsyncListComponent<T> implements OnInit {
  protected items: T[] = [];
  loading = true;
  /** Set when the items could not be loaded, so the page does not show an empty list. */
  loadError = '';

  /** Message when loading fails, such as "Failed to load webhook endpoints". */
  protected abstract readonly loadFailedMessage: string;

  ngOnInit(): void {
    void this.loadItems();
  }

  protected abstract fetchItems(): Promise<T[]>;

  async loadItems(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      this.items = await this.fetchItems();
    } catch (error) {
      console.error(`${this.loadFailedMessage}:`, error);
      this.loadError = getApiErrorMessage(error, this.loadFailedMessage);
    } finally {
      this.loading = false;
    }
  }
}
