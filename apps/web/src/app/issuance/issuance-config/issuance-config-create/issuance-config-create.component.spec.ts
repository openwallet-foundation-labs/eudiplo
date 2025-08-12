import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { IssuanceConfigCreateComponent } from './issuance-config-create.component';

describe('IssuanceConfigCreateComponent', () => {
  let component: IssuanceConfigCreateComponent;
  let fixture: ComponentFixture<IssuanceConfigCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuanceConfigCreateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IssuanceConfigCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
