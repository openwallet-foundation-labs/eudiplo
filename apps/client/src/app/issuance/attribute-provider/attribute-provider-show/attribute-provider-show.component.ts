import { Component, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { AttributeProviderEntity } from '@eudiplo/sdk-core';
import { AttributeProviderService } from '../attribute-provider.service';

@Component({
  selector: 'app-attribute-provider-show',
  imports: [
    CommonModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatTooltipModule,
    MatListModule,
    FlexLayoutModule,
    RouterModule,
  ],
  templateUrl: './attribute-provider-show.component.html',
  styleUrl: './attribute-provider-show.component.scss',
})
export class AttributeProviderShowComponent implements OnInit {
  provider: AttributeProviderEntity | undefined;

  constructor(
    private readonly attributeProviderService: AttributeProviderService,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.attributeProviderService.getById(id).then(
        (provider) => (this.provider = provider),
        (error) => {
          this.snackBar.open('Failed to load attribute provider', 'Close', { duration: 3000 });
          console.error('Load error:', error);
        }
      );
    }
  }

  getAuthType(): string {
    return this.provider?.auth?.type === 'apiKey' ? 'API Key' : 'None';
  }

  getAuthHeaderName(): string | null {
    if (this.provider?.auth?.type === 'apiKey') {
      return (this.provider.auth as any).config?.headerName || null;
    }
    return null;
  }

  deleteProvider(): void {
    if (this.provider && confirm('Are you sure you want to delete this attribute provider?')) {
      this.attributeProviderService
        .delete(this.provider.id)
        .then(() => {
          this.snackBar.open('Attribute provider deleted successfully', 'Close', {
            duration: 3000,
          });
          this.router.navigate(['../'], { relativeTo: this.route });
        })
        .catch((error) => {
          this.snackBar.open('Failed to delete attribute provider', 'Close', { duration: 3000 });
          console.error('Delete error:', error);
        });
    }
  }

  downloadConfig(): void {
    if (this.provider) {
      const config = { ...(this.provider as any) };
      delete config.tenantId;
      delete config.tenant;
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attribute-provider-${this.provider.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.snackBar.open('Configuration downloaded', 'Close', { duration: 3000 });
  }
}
