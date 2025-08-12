import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialConfigListComponent } from './credential-config-list.component';

describe('CredentialConfigListComponent', () => {
  let component: CredentialConfigListComponent;
  let fixture: ComponentFixture<CredentialConfigListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialConfigListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CredentialConfigListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
