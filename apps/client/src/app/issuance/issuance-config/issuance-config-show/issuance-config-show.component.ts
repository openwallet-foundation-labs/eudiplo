import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { IssuanceConfig } from '@eudiplo/sdk';
import { IssuanceConfigService } from '../issuance-config.service';
import { WebhookConfigShowComponent } from '../../../utils/webhook-config-show/webhook-config-show.component';

@Component({
  selector: 'app-issuance-config-show',
  imports: [
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    MatExpansionModule,
    MatChipsModule,
    MatDividerModule,
    FlexLayoutModule,
    RouterModule,
    WebhookConfigShowComponent,
  ],
  templateUrl: './issuance-config-show.component.html',
  styleUrl: './issuance-config-show.component.scss',
})
export class IssuanceConfigShowComponent implements OnInit {
  config?: IssuanceConfig;

  constructor(
    private issuanceConfigService: IssuanceConfigService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  private loadConfig(): void {
    this.issuanceConfigService.getConfig().then(
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

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
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
      a.download = `issuance-config.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.snackBar.open('Configuration downloaded', 'Close', {
      duration: 3000,
    });
  }
}
