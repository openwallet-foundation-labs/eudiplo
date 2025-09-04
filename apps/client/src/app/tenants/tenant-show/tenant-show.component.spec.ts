import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantShowComponent } from './tenant-show.component';

describe('TenantShowComponent', () => {
  let component: TenantShowComponent;
  let fixture: ComponentFixture<TenantShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantShowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
