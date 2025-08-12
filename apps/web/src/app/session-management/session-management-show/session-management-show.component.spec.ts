import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionManagementShowComponent } from './session-management-show.component';

describe('SessionManagementShowComponent', () => {
  let component: SessionManagementShowComponent;
  let fixture: ComponentFixture<SessionManagementShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionManagementShowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionManagementShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
