import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { IssuanceOfferComponent } from './issuance-offer.component';

describe('IssuanceOfferComponent', () => {
  let component: IssuanceOfferComponent;
  let fixture: ComponentFixture<IssuanceOfferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssuanceOfferComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IssuanceOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
