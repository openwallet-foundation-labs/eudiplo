import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { PresentationCreateComponent } from './presentation-create.component';

describe('PresentationCreateComponent', () => {
  let component: PresentationCreateComponent;
  let fixture: ComponentFixture<PresentationCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationCreateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
