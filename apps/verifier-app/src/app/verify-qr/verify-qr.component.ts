import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { VerifyService } from './verify.service';

@Component({
  standalone: true,
  selector: 'app-verify-qr',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatProgressSpinnerModule, FlexLayoutModule],
  templateUrl: './verify-qr.component.html',
  styleUrls: ['./verify-qr.component.scss'],
})
export class VerifyQrComponent {
  url?: string;
  qrSrc?: string;
  loading = false;
  error?: string;

  constructor(public verify: VerifyService) {}

  async start() {
    this.loading = true;
    this.error = undefined;
    this.url = undefined;
    this.qrSrc = undefined;

    try {
      const result = await this.verify.start();
      this.url = result;
      if (this.url) {
        // Generate data URL for QR locally using `qrcode` package.
        try {
          this.qrSrc = await QRCode.toDataURL(this.url, { width: 300 });
        } catch (err) {
          this.error = `Failed to generate QR: ${err}`;
        }
      } else {
        this.error = 'No URL returned from start()';
      }
    } catch (e: any) {
      this.error = e?.message || String(e);
    } finally {
      this.loading = false;
    }
  }
}
