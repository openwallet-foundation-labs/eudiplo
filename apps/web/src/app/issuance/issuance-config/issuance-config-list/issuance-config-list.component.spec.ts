import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { IssuanceConfigListComponent } from './issuance-config-list.component';

describe('IssuanceConfigListComponent', () => {
  let component: IssuanceConfigListComponent;
  let fixture: ComponentFixture<IssuanceConfigListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuanceConfigListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IssuanceConfigListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
