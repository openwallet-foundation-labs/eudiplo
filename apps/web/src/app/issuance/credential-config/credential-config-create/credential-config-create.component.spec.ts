import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialConfigCreateComponent } from './credential-config-create.component';

describe('CredentialConfigCreateComponent', () => {
  let component: CredentialConfigCreateComponent;
  let fixture: ComponentFixture<CredentialConfigCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialConfigCreateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CredentialConfigCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
