import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyManagementCreateComponent } from './key-management-create.component';

describe('KeyManagementCreateComponent', () => {
  let component: KeyManagementCreateComponent;
  let fixture: ComponentFixture<KeyManagementCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyManagementCreateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyManagementCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
