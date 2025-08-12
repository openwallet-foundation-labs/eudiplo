import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
import { IssuanceConfig } from '../../../generated';
import { IssuanceConfigService } from '../issuance-config.service';

@Component({
  selector: 'app-issuance-config-show',
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
  templateUrl: './issuance-config-show.component.html',
  styleUrl: './issuance-config-show.component.scss',
})
export class IssuanceConfigShowComponent implements OnInit {
  config: IssuanceConfig | undefined;

  constructor(
    private issuanceConfigService: IssuanceConfigService,
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
      this.issuanceConfigService.getConfig(configId).then(
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
      this.issuanceConfigService
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

  formatDate(dateString?: string): string {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  }

  getAuthenticationType(authConfig: any): string {
    if (!authConfig || Object.keys(authConfig).length === 0) {
      return 'Pre-authorized code flow (no authentication)';
    }
    const keys = Object.keys(authConfig);
    if (keys.includes('presentationDuringIssuance')) {
      return 'Presentation during issuance (OID4VP)';
    } else if (keys.includes('auth')) {
      return 'Authorized code flow (user authentication)';
    }
    return 'Custom authentication';
  }
}
