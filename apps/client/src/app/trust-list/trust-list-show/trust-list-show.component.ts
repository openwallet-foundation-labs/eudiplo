import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  TrustList,
  trustListControllerDeleteTrustList,
  trustListControllerGetTrustList,
} from '@eudiplo/sdk';
import { decodeJwt } from 'jose';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { EditorComponent } from '../../utils/editor/editor.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-trust-list-show',
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    FlexLayoutModule,
    RouterModule,
    EditorComponent,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './trust-list-show.component.html',
  styleUrl: './trust-list-show.component.scss',
})
export class TrustListShowComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  form = new FormGroup({
    payload: new FormControl('', []),
  });

  trustList?: TrustList;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    trustListControllerGetTrustList({ path: { id } }).then(
      (res) => {
        this.trustList = res.data;
        this.form.patchValue({ payload: JSON.stringify(decodeJwt(this.trustList.jwt), null, 2) });
      },
      () => {
        this.snackBar.open('Error loading trust list', 'Close', { duration: 3000 });
        this.router.navigate(['/trust-list']);
      }
    );
  }

  delete() {
    if (!confirm('Are you sure you want to delete this trust list?')) {
      return;
    }
    const id = this.route.snapshot.paramMap.get('id')!;
    trustListControllerDeleteTrustList({ path: { id } }).then(
      () => {
        this.snackBar.open('Trust list deleted', 'Close', { duration: 3000 });
        this.router.navigate(['/trust-list']);
      },
      () => {
        this.snackBar.open('Error deleting trust list', 'Close', { duration: 3000 });
      }
    );
  }

  /**
   * Downloads the current configuration as a JSON file.
   */
  download() {
    if (this.trustList) {
      const blob = new Blob([JSON.stringify(this.trustList, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trust-list-${this.trustList.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.snackBar.open('Configuration downloaded', 'Close', {
      duration: 3000,
    });
  }
}
