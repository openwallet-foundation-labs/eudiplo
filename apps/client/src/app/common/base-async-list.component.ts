import { Directive, ElementRef, inject, Injector, OnInit, ViewChild } from '@angular/core';

import { getApiErrorMessage } from '../utils/error-message';
import { focusAfterRenderIfLost } from './focus-if-lost.util';

/**
 * Base of a list screen that loads its items on init and again on Retry.
 * The page heading carries `#listHeading` and `tabindex="-1"`: a retry
 * removes the error card with its focused Retry button, so after a
 * successful retry focus continues from the heading, unless the user has
 * moved it elsewhere meanwhile.
 */
@Directive()
export abstract class BaseAsyncListComponent<T> implements OnInit {
  protected items: T[] = [];
  loading = true;
  /** Set when the items could not be loaded, so the page does not show an empty list. */
  loadError = '';

  /** Message when loading fails, such as "Failed to load webhook endpoints". */
  protected abstract readonly loadFailedMessage: string;

  @ViewChild('listHeading') private readonly listHeading?: ElementRef<HTMLElement>;
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    void this.loadItems();
  }

  protected abstract fetchItems(): Promise<T[]>;

  async loadItems(): Promise<void> {
    const retrying = this.loadError !== '';
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
    if (retrying && !this.loadError) {
      focusAfterRenderIfLost(this.injector, () => this.listHeading?.nativeElement);
    }
  }
}
