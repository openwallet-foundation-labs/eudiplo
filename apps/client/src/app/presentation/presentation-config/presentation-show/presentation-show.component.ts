import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { PresentationConfig } from '@eudiplo/sdk-angular';
import { PresentationManagementService } from '../presentation-management.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WebhookConfigShowComponent } from '../../../utils/webhook-config-show/webhook-config-show.component';

@Component({
  selector: 'app-presentation-show',
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    MatListModule,
    MatChipsModule,
    MatDividerModule,
    MatExpansionModule,
    FlexLayoutModule,
    RouterModule,
    ClipboardModule,
    WebhookConfigShowComponent,
  ],
  templateUrl: './presentation-show.component.html',
  styleUrls: ['./presentation-show.component.scss'],
})
export class PresentationShowComponent implements OnInit {
  config?: PresentationConfig;

  constructor(
    private readonly presentationService: PresentationManagementService,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly clipboard: Clipboard
  ) {}

  ngOnInit(): void {
    this.loadPresentation();
  }

  async loadPresentation(): Promise<void> {
    try {
      const presentationId = this.route.snapshot.paramMap.get('id');
      if (presentationId) {
        this.config = await this.presentationService.getPresentationById(presentationId);
      }
    } catch (error) {
      console.error('Error loading presentation:', error);
    }
  }

  get credentialQueries(): any[] {
    return this.config?.dcql_query?.credentials || [];
  }

  copyToClipboard(value: string, label: string): void {
    this.clipboard.copy(value);
    this.snackBar.open(`${label} copied to clipboard`, 'Close', {
      duration: 2000,
    });
  }

  formatLifetime(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  }

  formatJsonValue(value: any): string {
    return JSON.stringify(value, null, 2);
  }

  deletePresentation() {
    if (this.config && confirm('Are you sure you want to delete this presentation?')) {
      this.presentationService
        .deleteConfiguration(this.config.id)
        .then(() => {
          this.snackBar.open('Presentation deleted successfully', 'Close', {
            duration: 3000,
          });
          this.router.navigate(['../'], { relativeTo: this.route });
        })
        .catch((error) => {
          this.snackBar.open('Failed to delete presentation', 'Close', {
            duration: 3000,
          });
          console.error('Delete error:', error);
        });
    }
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
      a.download = `presentation-config-${this.config.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.snackBar.open('Configuration downloaded', 'Close', {
      duration: 3000,
    });
  }
}
