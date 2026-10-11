import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { StatusListConfigService, bitsOptions } from './status-list-config.service';
import { StatusListConfig } from '@eudiplo/sdk-core';
import { ConfigOwnershipDirective } from '../config-portability/config-ownership.directive';
import { ConfigOwnershipNoticeComponent } from '../config-portability/config-ownership-notice.component';
import { LoadErrorComponent } from '../common/load-error.component';
import { getApiErrorMessage } from '../utils/error-message';
import { openErrorSnackBar } from '../utils/error-snackbar';

@Component({
  selector: 'app-status-list-config',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    FlexLayoutModule,
    ConfigOwnershipDirective,
    ConfigOwnershipNoticeComponent,
    LoadErrorComponent,
  ],
  templateUrl: './status-list-config.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './status-list-config.component.scss',
})
export class StatusListConfigComponent implements OnInit {
  configForm: FormGroup;
  isLoading = true;
  isSaving = false;
  /** Set when the stored settings could not be loaded; the form stays hidden until a retry. */
  loadError = '';
  currentConfig: StatusListConfig | null = null;

  bitsOptions = bitsOptions;
  Math = Math;

  constructor(
    private readonly fb: FormBuilder,
    private readonly statusListConfigService: StatusListConfigService,
    private readonly snackBar: MatSnackBar
  ) {
    this.configForm = this.fb.group({
      capacity: [null, [Validators.min(100)]],
      bits: [1],
      ttl: [null, [Validators.min(60)]],
      immediateUpdate: [false],
      enableAggregation: [true],
    });
  }

  ngOnInit() {
    this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';
    try {
      this.currentConfig = await this.statusListConfigService.getConfig();
      this.configForm.patchValue({
        capacity: this.currentConfig?.capacity ?? null,
        bits: this.currentConfig?.bits ?? 1,
        ttl: this.currentConfig?.ttl ?? null,
        immediateUpdate: this.currentConfig?.immediateUpdate ?? false,
        enableAggregation: this.currentConfig?.enableAggregation ?? true,
      });
    } catch (error) {
      console.error('Load error:', error);
      this.loadError = getApiErrorMessage(error, 'Failed to load status list configuration');
    } finally {
      this.isLoading = false;
    }
  }

  /** Whether the tenant stores any setting, so Reset has something to remove. */
  get hasStoredOverride(): boolean {
    return Object.values(this.currentConfig ?? {}).some((value) => value != null);
  }

  async onSave(): Promise<void> {
    if (this.configForm.invalid || this.loadError) {
      return;
    }

    this.isSaving = true;
    try {
      const formValue = this.configForm.value;
      // Convert empty string to null for capacity and ttl
      if (formValue.capacity === '' || formValue.capacity === null) {
        formValue.capacity = null;
      }
      if (formValue.ttl === '' || formValue.ttl === null) {
        formValue.ttl = null;
      }
      this.currentConfig = await this.statusListConfigService.updateConfig(formValue);
      this.snackBar.open('Status list configuration saved successfully', 'Close', {
        duration: 3000,
      });
    } catch (error) {
      openErrorSnackBar(this.snackBar, getApiErrorMessage(error, 'Failed to save configuration'));
    } finally {
      this.isSaving = false;
    }
  }

  async onReset(): Promise<void> {
    if (!this.hasStoredOverride || !confirm(this.resetConfirmation())) {
      return;
    }

    this.isSaving = true;
    try {
      await this.statusListConfigService.resetConfig();
      this.currentConfig = null;
      this.configForm.patchValue({
        capacity: null,
        bits: 1,
        ttl: null,
        immediateUpdate: false,
        enableAggregation: true,
      });
      this.snackBar.open('Status list configuration reset to defaults', 'Close', {
        duration: 3000,
      });
    } catch (error) {
      openErrorSnackBar(this.snackBar, getApiErrorMessage(error, 'Failed to reset configuration'));
    } finally {
      this.isSaving = false;
    }
  }

  private resetConfirmation(): string {
    const labels: Record<keyof StatusListConfig, string> = {
      capacity: 'the capacity',
      bits: 'the bits per entry',
      ttl: 'the TTL',
      immediateUpdate: 'the update mode',
      enableAggregation: 'the aggregation setting',
    };
    const removed = (Object.keys(labels) as (keyof StatusListConfig)[])
      .filter((key) => this.currentConfig?.[key] != null)
      .map((key) => labels[key]);
    const list =
      removed.length > 1
        ? `${removed.slice(0, -1).join(', ')} and ${removed[removed.length - 1]}`
        : removed[0];
    return (
      `Reset the status list settings to the global defaults of this instance? ` +
      `This removes ${list} stored for this tenant. All status lists then follow STATUS_TTL, ` +
      `STATUS_IMMEDIATE_UPDATE and STATUS_ENABLE_AGGREGATION; status lists created afterwards ` +
      `use STATUS_CAPACITY and STATUS_BITS.`
    );
  }

  formatCapacity(capacity?: number | null): string {
    if (!capacity) return 'Using global default (10,000)';
    return `${capacity.toLocaleString()} entries`;
  }

  formatTtl(ttl?: number | null): string {
    if (!ttl) return 'Using global default (1 hour)';
    if (ttl >= 3600) {
      const hours = ttl / 3600;
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    if (ttl >= 60) {
      const minutes = ttl / 60;
      return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    }
    return ttl === 1 ? '1 second' : `${ttl} seconds`;
  }

  getSelectedBitsLabel(): string {
    const value = this.configForm.get('bits')?.value;
    return this.bitsOptions.find((o) => o.value === value)?.label ?? '';
  }
}
