import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { SessionConfigService, SessionCleanupMode, cleanupModes } from './session-config.service';
import { SessionStorageConfig, UpdateSessionConfigDto } from '@eudiplo/sdk-core';
import { ConfigOwnershipDirective } from '../config-portability/config-ownership.directive';
import { ConfigOwnershipNoticeComponent } from '../config-portability/config-ownership-notice.component';
import { getApiErrorMessage } from '../utils/error-message';

/** The backend accepts whole seconds only. */
function wholeNumber(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === '') return null;
  return Number.isInteger(value) ? null : { integer: true };
}

@Component({
  selector: 'app-session-config',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    FlexLayoutModule,
    ConfigOwnershipDirective,
    ConfigOwnershipNoticeComponent,
  ],
  templateUrl: './session-config.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './session-config.component.scss',
})
export class SessionConfigComponent implements OnInit {
  configForm: FormGroup;
  isLoading = true;
  isSaving = false;
  /** Set when the stored settings could not be loaded; the form stays hidden. */
  loadError = '';
  currentConfig: SessionStorageConfig | null = null;

  cleanupModes = cleanupModes;

  constructor(
    private readonly fb: FormBuilder,
    private readonly sessionConfigService: SessionConfigService,
    private readonly snackBar: MatSnackBar
  ) {
    this.configForm = this.fb.group({
      ttlSeconds: [null as number | null, [Validators.min(60), wholeNumber]],
      // null follows the instance's SESSION_CLEANUP_MODE.
      cleanupMode: [null as SessionCleanupMode | null],
    });
  }

  ngOnInit() {
    void this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';
    try {
      this.currentConfig = await this.sessionConfigService.getConfig();
    } catch (error) {
      console.error('Load error:', error);
      this.loadError = getApiErrorMessage(error, 'Failed to load the session settings');
      return;
    } finally {
      this.isLoading = false;
    }
    this.patchForm(this.currentConfig);
  }

  /**
   * The update endpoint keeps a stored cleanup mode when the field is omitted
   * and has no value to clear it, so "Use global default" is only offered while
   * no mode is stored. Reset to Defaults clears a stored mode (and the TTL).
   */
  get hasStoredCleanupMode(): boolean {
    return !!this.currentConfig?.cleanupMode;
  }

  /** Whether the tenant overrides any global default, so Reset has something to do. */
  get hasStoredOverride(): boolean {
    return this.hasStoredCleanupMode || !!this.currentConfig?.ttlSeconds;
  }

  async onSave(): Promise<void> {
    if (this.configForm.invalid || this.loadError) {
      return;
    }

    const update = this.buildUpdate();
    this.isSaving = true;
    try {
      this.currentConfig = await this.sessionConfigService.updateConfig(update);
    } catch (error) {
      this.snackBar.open(getApiErrorMessage(error, 'Failed to save configuration'), 'Close', {
        duration: 5000,
      });
      return;
    } finally {
      this.isSaving = false;
    }
    this.patchForm(this.currentConfig);
    this.snackBar.open('Session configuration saved successfully', 'Close', {
      duration: 3000,
    });
  }

  async onReset(): Promise<void> {
    if (!this.hasStoredOverride || !confirm(this.resetConfirmation())) {
      return;
    }

    this.isSaving = true;
    try {
      await this.sessionConfigService.resetConfig();
    } catch (error) {
      this.snackBar.open(getApiErrorMessage(error, 'Failed to reset configuration'), 'Close', {
        duration: 5000,
      });
      return;
    } finally {
      this.isSaving = false;
    }
    // The same state a fresh load of a tenant without overrides returns.
    this.currentConfig = {};
    this.patchForm(this.currentConfig);
    this.snackBar.open('Session configuration reset to defaults', 'Close', {
      duration: 3000,
    });
  }

  private resetConfirmation(): string {
    const removed = [
      this.currentConfig?.ttlSeconds
        ? `the TTL of ${this.formatTtl(this.currentConfig.ttlSeconds)}`
        : '',
      this.currentConfig?.cleanupMode
        ? `the cleanup mode "${this.cleanupModeLabel(this.currentConfig.cleanupMode)}"`
        : '',
    ].filter(Boolean);
    return (
      `Reset the session settings to the global defaults of this instance? ` +
      `This removes ${removed.join(' and ')}. From the next cleanup run, sessions older than ` +
      `SESSION_TTL are cleaned up with SESSION_CLEANUP_MODE, which can delete them completely. ` +
      `This cannot be undone.`
    );
  }

  /**
   * Sends only what the user set. An empty TTL is sent as null only to remove
   * a stored override; otherwise unset fields are left out, so they keep
   * following the instance defaults.
   */
  private buildUpdate(): UpdateSessionConfigDto {
    const { ttlSeconds, cleanupMode } = this.configForm.value as {
      ttlSeconds: number | null | '';
      cleanupMode: SessionCleanupMode | null;
    };
    const update: UpdateSessionConfigDto = {};
    if (ttlSeconds !== null && ttlSeconds !== '') {
      update.ttlSeconds = ttlSeconds;
    } else if (this.currentConfig?.ttlSeconds != null) {
      update.ttlSeconds = null;
    }
    if (cleanupMode) {
      update.cleanupMode = cleanupMode;
    }
    return update;
  }

  private patchForm(config: SessionStorageConfig | null): void {
    this.configForm.patchValue({
      ttlSeconds: config?.ttlSeconds ?? null,
      cleanupMode: config?.cleanupMode ?? null,
    });
  }

  /** Spells the TTL out exactly, for example "1 day 12 hours". */
  formatTtl(seconds?: number | null): string {
    if (!seconds) return 'Global default (SESSION_TTL of this instance)';
    const units: [string, number][] = [
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1],
    ];
    const parts: string[] = [];
    let rest = seconds;
    for (const [unit, size] of units) {
      const count = Math.floor(rest / size);
      if (count > 0) {
        parts.push(this.plural(count, unit));
        rest -= count * size;
      }
    }
    return parts.join(' ') || `${seconds} seconds`;
  }

  cleanupModeLabel(mode?: SessionCleanupMode | null): string {
    return (
      this.cleanupModes.find((m) => m.value === mode)?.label ??
      'Global default (SESSION_CLEANUP_MODE of this instance)'
    );
  }

  private plural(count: number, unit: string): string {
    return `${count} ${unit}${count === 1 ? '' : 's'}`;
  }
}
