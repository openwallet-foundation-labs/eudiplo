import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { certControllerGetCertificates, type CertEntity } from '@eudiplo/sdk-angular';

@Component({
  selector: 'app-certificates-overview',
  imports: [
    CommonModule,
    MatTableModule,
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

  constructor(private readonly router: Router) {}

  ngOnInit() {
    certControllerGetCertificates({}).then((response) => (this.certificates = response.data));
  }

  navigateToKey(keyId: string): void {
    this.router.navigate(['/key-management', keyId]);
  }
}
