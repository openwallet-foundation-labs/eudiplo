import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { PresentationOfferComponent } from './presentation-offer.component';

describe('PresentationOfferComponent', () => {
  let component: PresentationOfferComponent;
  let fixture: ComponentFixture<PresentationOfferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationOfferComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
