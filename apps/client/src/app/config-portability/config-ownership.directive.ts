import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ConfigOwnershipService, ConfigResourceKind } from './config-ownership.service';

@Directive({
  selector: '[appConfigManaged]',
  standalone: true,
})
export class ConfigOwnershipDirective implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) managedKind!: ConfigResourceKind;
  @Input({ required: true }) managedResourceId = '';

  managed = false;
  /** While the lookup runs (at most 10 s), clicks are held back so they cannot get past a lock. */
  pending = false;
  @HostBinding('attr.aria-busy') get ariaBusy(): string | null {
    return this.pending ? 'true' : null;
  }
  @HostBinding('attr.aria-disabled') get ariaDisabled(): string | null {
    return this.managed ? 'true' : null;
  }
  @HostBinding('attr.tabindex') get tabIndex(): string | null {
    return this.managed ? '-1' : null;
  }
  @HostBinding('class.config-managed-action') get managedClass(): boolean {
    return this.managed;
  }
  @HostBinding('style.pointer-events') get pointerEvents(): string | null {
    return this.managed ? 'none' : null;
  }
  @HostBinding('style.cursor') get cursor(): string | null {
    return this.pending ? 'progress' : null;
  }
  @HostBinding('style.opacity') get opacity(): string | null {
    return this.managed ? '0.38' : null;
  }

  private request = 0;

  constructor(
    private readonly ownership: ConfigOwnershipService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.host.nativeElement.addEventListener('click', this.preventManagedMutation, true);
    void this.refresh();
  }

  ngOnDestroy(): void {
    this.host.nativeElement.removeEventListener('click', this.preventManagedMutation, true);
  }

  ngOnChanges(): void {
    void this.refresh();
  }

  /** Runs in the capture phase, before the host's own (click) and RouterLink handlers. */
  private readonly preventManagedMutation = (event: Event): void => {
    if (!this.managed && !this.pending) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private async refresh(): Promise<void> {
    const request = ++this.request;
    if (!this.managedKind || !this.managedResourceId) {
      this.managed = false;
      this.pending = false;
      return;
    }
    this.pending = true;
    try {
      const managed = await this.ownership.isManaged(this.managedKind, this.managedResourceId);
      if (request !== this.request) return;
      this.managed = managed;
    } catch {
      // The backend remains authoritative if ownership metadata cannot be loaded.
    } finally {
      if (request === this.request) {
        this.pending = false;
        this.changeDetector.markForCheck();
      }
    }
  }
}
