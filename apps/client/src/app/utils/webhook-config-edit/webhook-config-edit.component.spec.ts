import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebhookConfigEditComponent } from './webhook-config-edit.component';

describe('WebhookConfigEditComponent', () => {
  let component: WebhookConfigEditComponent;
  let fixture: ComponentFixture<WebhookConfigEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebhookConfigEditComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WebhookConfigEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
