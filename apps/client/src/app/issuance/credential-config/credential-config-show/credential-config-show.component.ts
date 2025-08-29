import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CredentialConfig } from '../../../generated';
import { CredentialConfigService } from '../credential-config.service';

@Component({
  selector: 'app-credential-config-show',
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    MatExpansionModule,
    MatChipsModule,
    MatDividerModule,
    FlexLayoutModule,
    RouterModule,
  ],
  templateUrl: './credential-config-show.component.html',
  styleUrl: './credential-config-show.component.scss',
})
export class CredentialConfigShowComponent implements OnInit {
  config: CredentialConfig | undefined;

  constructor(
    private credentialConfigService: CredentialConfigService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  private loadConfig(): void {
    const configId = this.route.snapshot.paramMap.get('id');
    if (configId) {
      this.credentialConfigService.getConfig(configId).then(
        (config) => {
          this.config = config;
        },
        (error) => {
          this.snackBar.open('Failed to load config', 'Close', {
            duration: 3000,
          });
          console.error('Load error:', error);
        }
      );
    }
  }

  deleteConfig() {
    if (this.config && confirm('Are you sure you want to delete this configuration?')) {
      this.credentialConfigService
        .deleteConfiguration(this.config.id)
        .then(() => {
          this.snackBar.open('Configuration deleted successfully', 'Close', {
            duration: 3000,
          });
          this.router.navigate(['../'], { relativeTo: this.route });
        })
        .catch((error) => {
          this.snackBar.open('Failed to delete configuration', 'Close', {
            duration: 3000,
          });
          console.error('Delete error:', error);
        });
    }
  }

  formatLifetime(seconds?: number): string {
    if (!seconds) return 'Not set';

    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds > 1 ? 's' : ''}`;
    }
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  formatJsonValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value, null, 2);
  }

  /**
   * Downloads the current configuration as a JSON file.
   */
  downloadConfig() {
    if (this.config) {
      const blob = new Blob([JSON.stringify(this.config, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credential-config-${this.config.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.snackBar.open('Configuration downloaded', 'Close', {
      duration: 3000,
    });
  }

  asAny(obj: any) {
    return obj as any;
  }
}
