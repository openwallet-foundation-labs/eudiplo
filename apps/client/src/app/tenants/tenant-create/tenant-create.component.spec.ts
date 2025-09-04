import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantCreateComponent } from './tenant-create.component';

describe('TenantCreateComponent', () => {
  let component: TenantCreateComponent;
  let fixture: ComponentFixture<TenantCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantCreateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
