import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { focusIfFocusWasLost } from './focus-if-lost.util';

/**
 * Takes the place of a page's content when its data could not be loaded, so
 * the page shows neither an empty list nor a form with made-up values, and
 * offers a retry. Content between the tags is shown next to the Retry button.
 */
@Component({
  selector: 'app-load-error',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <mat-card appearance="outlined" class="load-error">
      <mat-card-content>
        <mat-icon>error</mat-icon>
        <div class="text" role="alert">
          <strong>{{ message }}</strong>
          @if (hint) {
            <p>{{ hint }}</p>
          }
        </div>
        <div class="actions">
          <ng-content />
          <button #retryButton mat-stroked-button type="button" (click)="retry.emit()">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './load-error.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadErrorComponent implements AfterViewInit {
  @Input({ required: true }) message = '';
  /** What the user can or cannot do until the data is loaded. */
  @Input() hint = '';
  @Output() readonly retry = new EventEmitter<void>();

  @ViewChild('retryButton', { read: ElementRef })
  private readonly retryButton?: ElementRef<HTMLButtonElement>;

  /**
   * A retry removes the card, and with it the focused Retry button. When the
   * retry fails again, the new card takes the focus back, unless the user
   * has moved it elsewhere in the meantime.
   */
  ngAfterViewInit(): void {
    focusIfFocusWasLost(this.retryButton?.nativeElement);
  }
}
