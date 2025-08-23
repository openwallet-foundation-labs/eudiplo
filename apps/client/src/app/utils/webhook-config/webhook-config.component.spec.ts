import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebhookConfigComponent } from './webhook-config.component';

describe('WebhookConfigComponent', () => {
  let component: WebhookConfigComponent;
  let fixture: ComponentFixture<WebhookConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebhookConfigComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WebhookConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
