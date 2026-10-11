import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { PresentationListComponent } from './presentation-list.component';

describe('PresentationListComponent', () => {
  let component: PresentationListComponent;
  let fixture: ComponentFixture<PresentationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('PresentationListComponent loading', () => {
  it('says why the configurations could not be loaded, and retries', async () => {
    const loadConfigurations = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 403, message: 'Forbidden resource' })
      .mockResolvedValueOnce([]);
    const component = new PresentationListComponent({ loadConfigurations } as never, {} as never);

    await component.loadConfigurations();
    expect(component.loadError).toBe(
      'Failed to load presentation configurations: Forbidden resource'
    );

    await component.loadConfigurations();
    expect(component.loadError).toBe('');
  });
});
