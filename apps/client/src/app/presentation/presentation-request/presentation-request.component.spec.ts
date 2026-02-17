import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { PresentationRequestComponent } from './presentation-request.component';

describe('PresentationRequestComponent', () => {
  let component: PresentationRequestComponent;
  let fixture: ComponentFixture<PresentationRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationRequestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
