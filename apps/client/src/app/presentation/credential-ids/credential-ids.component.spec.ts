import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CredentialIdsComponent } from './credential-ids.component';

describe('CredentialIdsComponent', () => {
  let component: CredentialIdsComponent;
  let fixture: ComponentFixture<CredentialIdsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CredentialIdsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CredentialIdsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
