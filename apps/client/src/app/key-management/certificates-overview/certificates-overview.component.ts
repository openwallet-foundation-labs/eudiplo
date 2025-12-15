import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { certControllerGetCertificates, type CertEntity } from '@eudiplo/sdk';

@Component({
  selector: 'app-certificates-overview',
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    RouterModule,
    FlexLayoutModule,
  ],
  templateUrl: './certificates-overview.component.html',
  styleUrl: './certificates-overview.component.scss',
})
export class CertificatesOverviewComponent implements OnInit {
  certificates: CertEntity[] = [];
  displayedColumns: string[] = ['id', 'keyId', 'types', 'description', 'actions'];

  constructor(private router: Router) {}

  async ngOnInit(): Promise<void> {
    try {
      const response = await certControllerGetCertificates({});
      this.certificates = response.data;
    } catch (error) {
      console.error('Error loading certificates:', error);
    }
  }

  navigateToKey(keyId: string): void {
    this.router.navigate(['/key-management', keyId]);
  }

  getTypeLabel(type: string): string {
    return type === 'signing' ? 'Signing' : 'Access';
  }

  getTypeColor(type: string): 'primary' | 'accent' {
    return type === 'signing' ? 'primary' : 'accent';
  }
}
