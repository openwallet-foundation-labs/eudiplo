import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebhookConfigShowComponent } from './webhook-config-show.component';

describe('WebhookConfigShowComponent', () => {
  let component: WebhookConfigShowComponent;
  let fixture: ComponentFixture<WebhookConfigShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebhookConfigShowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WebhookConfigShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
