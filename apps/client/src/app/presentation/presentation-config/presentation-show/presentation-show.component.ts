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

@Component({
  selector: 'app-presentation-show',
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    FlexLayoutModule,
    RouterModule,
  ],
  templateUrl: './presentation-show.component.html',
  styleUrls: ['./presentation-show.component.scss'],
})
export class PresentationShowComponent implements OnInit {
  presentation?: PresentationConfig;

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
        this.presentation = await this.presentationService.getPresentationById(presentationId);
      }
    } catch (error) {
      console.error('Error loading presentation:', error);
    }
  }

  deletePresentation() {
    if (this.presentation && confirm('Are you sure you want to delete this presentation?')) {
      this.presentationService
        .deleteConfiguration(this.presentation.id)
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
}
