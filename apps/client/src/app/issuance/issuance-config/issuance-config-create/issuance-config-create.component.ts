import { Component, type OnInit } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormBuilder,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { IssuanceDto } from '@eudiplo/sdk-core';
import { IssuanceConfigService } from '../issuance-config.service';
import { issuanceConfigSchema } from '../../../utils/schemas';
import { JsonViewDialogComponent } from '../../credential-config/credential-config-create/json-view-dialog/json-view-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggle, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ImageFieldComponent } from '../../../utils/image-field/image-field.component';

@Component({
  selector: 'app-issuance-config-create',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule,
    MatSlideToggleModule,
    MatSlideToggle,
    ImageFieldComponent,
  ],
  templateUrl: './issuance-config-create.component.html',
  styleUrl: './issuance-config-create.component.scss',
})
export class IssuanceConfigCreateComponent implements OnInit {
  public form: FormGroup;
  public loading = false;

  constructor(
    private readonly issuanceConfigService: IssuanceConfigService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private readonly fb: FormBuilder
  ) {
    this.form = new FormGroup({
      display: this.fb.array([]),
      authServers: this.fb.array([]),
      batchSize: new FormControl(1, [Validators.min(1)]),
      dPopRequired: new FormControl(false),
      walletAttestationRequired: new FormControl(false),
      walletProviderTrustLists: this.fb.array([]),
    } as { [k in keyof IssuanceDto]: any });
  }

  ngOnInit(): void {
    this.loadConfigForEdit();
  }

  private async loadConfigForEdit(): Promise<void> {
    try {
      const config = await this.issuanceConfigService.getConfig();
      if (!config) {
        this.snackBar.open('Configuration not found', 'Close', {
          duration: 3000,
        });
        this.router.navigate(['../'], { relativeTo: this.route });
        return;
      }

      // Load display configurations
      const displayArray = this.form.get('display') as FormArray;
      displayArray.clear();
      if (config.display && Array.isArray(config.display)) {
        for (const entry of config.display) {
          displayArray.push(
            this.fb.group({
              name: [entry.name || '', Validators.required],
              locale: [entry.locale || '', Validators.required],
              logo: this.fb.group({
                uri: [entry.logo?.uri || '', Validators.required],
              }),
            })
          );
        }
      }

      // Load auth servers
      const authServersArray = this.form.get('authServers') as FormArray;
      authServersArray.clear();
      if (config.authServers && Array.isArray(config.authServers)) {
        for (const server of config.authServers) {
          authServersArray.push(new FormControl(server, [Validators.required]));
        }
      }

      // Load wallet provider trust lists
      const walletTrustListsArray = this.form.get('walletProviderTrustLists') as FormArray;
      walletTrustListsArray.clear();
      if (config.walletProviderTrustLists && Array.isArray(config.walletProviderTrustLists)) {
        for (const url of config.walletProviderTrustLists) {
          walletTrustListsArray.push(new FormControl(url, [Validators.required]));
        }
      }

      // Patch other form values
      this.form.patchValue({
        batchSize: config.batchSize,
        dPopRequired: config.dPopRequired,
        walletAttestationRequired: config.walletAttestationRequired ?? false,
      });
    } catch (error) {
      console.error('Error loading config:', error);
      this.snackBar.open('Failed to load configuration', 'Close', {
        duration: 3000,
      });
    }
  }

  onSubmit(): void {
    this.loading = true;
    const formValue = this.form.value;

    const issuanceDto: IssuanceDto = {
      batchSize: formValue.batchSize,
      display: formValue.display,
      dPopRequired: formValue.dPopRequired,
      authServers: formValue.authServers?.length > 0 ? formValue.authServers : undefined,
      walletAttestationRequired: formValue.walletAttestationRequired,
      walletProviderTrustLists:
        formValue.walletProviderTrustLists?.length > 0
          ? formValue.walletProviderTrustLists
          : undefined,
    };

    this.issuanceConfigService
      .saveConfiguration(issuanceDto)
      .then(
        () => {
          this.snackBar.open(`Configuration saved successfully`, 'Close', { duration: 3000 });
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        (error: string) => {
          this.snackBar.open(`Failed to save configuration: ${error}`, 'Close', {
            duration: 3000,
          });
        }
      )
      .finally(() => {
        this.loading = false;
      });
  }

  getFormGroup(controlName: string): FormGroup {
    return this.form.get(controlName) as FormGroup;
  }

  getControl(value: any): FormControl {
    return value as FormControl;
  }

  get displays(): FormArray {
    return this.form.get('display') as FormArray;
  }

  addDisplay(): void {
    const displayGroup = this.fb.group({
      name: ['', Validators.required],
      locale: ['', Validators.required],
      logo: this.fb.group({
        uri: ['', Validators.required],
      }),
    });
    this.displays.push(displayGroup);
  }

  removeDisplay(index: number): void {
    this.displays.removeAt(index);
  }

  get authServers(): FormArray {
    return this.form.get('authServers') as FormArray;
  }

  addAuthServer(): void {
    this.authServers.push(new FormControl('', [Validators.required]));
  }

  removeAuthServer(index: number): void {
    this.authServers.removeAt(index);
  }

  get walletProviderTrustLists(): FormArray {
    return this.form.get('walletProviderTrustLists') as FormArray;
  }

  addWalletProviderTrustList(): void {
    this.walletProviderTrustLists.push(new FormControl('', [Validators.required]));
  }

  removeWalletProviderTrustList(index: number): void {
    this.walletProviderTrustLists.removeAt(index);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Open JSON view dialog to show/edit the complete configuration
   */
  viewAsJson(): void {
    const currentConfig = this.form.value;
    currentConfig.id = this.route.snapshot.params['id'];
    currentConfig.credentialConfigs = undefined;

    const dialogRef = this.dialog.open(JsonViewDialogComponent, {
      data: {
        title: 'Complete Configuration JSON',
        jsonData: currentConfig,
        readonly: false,
        schema: issuanceConfigSchema,
      },
      disableClose: true,
      minWidth: '60vw',
      maxWidth: '95vw',
      maxHeight: '95vh',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.form.patchValue(result);
      }
    });
  }
}
