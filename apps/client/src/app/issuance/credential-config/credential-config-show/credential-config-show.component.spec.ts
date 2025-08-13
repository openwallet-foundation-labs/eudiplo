import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialConfigShowComponent } from './credential-config-show.component';

describe('CredentialConfigShowComponent', () => {
  let component: CredentialConfigShowComponent;
  let fixture: ComponentFixture<CredentialConfigShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialConfigShowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CredentialConfigShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
