import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageFieldComponent } from './image-field.component';

describe('ImageFieldComponent', () => {
  let component: ImageFieldComponent;
  let fixture: ComponentFixture<ImageFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageFieldComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
