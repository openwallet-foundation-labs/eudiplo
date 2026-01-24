import { CommonModule } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import {
  certControllerGetCertificates,
  certControllerExportConfig,
  type CertEntity,
} from '@eudiplo/sdk-core';

@Component({
  selector: 'app-certificates-overview',
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    RouterModule,
    FlexLayoutModule,
  ],
  templateUrl: './certificates-overview.component.html',
  styleUrl: './certificates-overview.component.scss',
})
export class CertificatesOverviewComponent implements OnInit {
  certificates: CertEntity[] = [];
  displayedColumns: string[] = ['id', 'keyId', 'types', 'description', 'actions'];

  constructor(
    private readonly router: Router,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    certControllerGetCertificates({}).then((response) => (this.certificates = response.data));
  }

  navigateToKey(keyId: string): void {
    this.router.navigate(['/keys', keyId]);
  }

  async downloadConfig(cert: CertEntity): Promise<void> {
    try {
      const config = await certControllerExportConfig({
        path: { certId: cert.id },
      }).then((res) => res.data);

      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', `certificate-${cert.id}-config.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      this.snackBar.open('Certificate configuration downloaded', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error downloading config:', error);
      this.snackBar.open('Failed to download configuration', 'Close', { duration: 3000 });
    }
  }
}
