import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyManagementShowComponent } from './key-management-show.component';

describe('KeyManagementShowComponent', () => {
  let component: KeyManagementShowComponent;
  let fixture: ComponentFixture<KeyManagementShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyManagementShowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyManagementShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
