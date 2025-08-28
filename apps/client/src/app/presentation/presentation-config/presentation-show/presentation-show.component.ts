import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { PresentationConfig } from '../../../generated';
import { PresentationManagementService } from '../presentation-management.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-presentation-show',
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    FlexLayoutModule,
    RouterModule,
  ],
  templateUrl: './presentation-show.component.html',
  styleUrls: ['./presentation-show.component.scss'],
})
export class PresentationShowComponent implements OnInit {
  config?: PresentationConfig;

  constructor(
    private presentationService: PresentationManagementService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private router: Router
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
