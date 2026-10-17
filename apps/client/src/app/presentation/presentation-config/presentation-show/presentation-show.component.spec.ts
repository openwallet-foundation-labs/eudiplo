import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { PresentationShowComponent } from './presentation-show.component';

describe('PresentationShowComponent', () => {
  let component: PresentationShowComponent;
  let fixture: ComponentFixture<PresentationShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationShowComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('PresentationShowComponent loading', () => {
  it('says why the configuration could not be loaded instead of a blank page, and retries', async () => {
    const getPresentationById = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 404, message: 'Not found' })
      .mockResolvedValueOnce({ id: 'age-check' });
    const component = new PresentationShowComponent(
      { getPresentationById } as never,
      { snapshot: { paramMap: { get: () => 'age-check' } } } as never,
      { open: vi.fn() } as never,
      { navigate: vi.fn() } as never,
      {} as never,
      {} as never
    );

    await component.loadPresentation();
    expect(component.loadError).toBe('Failed to load presentation configuration: Not found');

    await component.loadPresentation();
    expect(component.loadError).toBe('');
    expect(component.config?.id).toBe('age-check');
  });
});

describe('PresentationShowComponent download', () => {
  function create(download: ReturnType<typeof vi.fn>) {
    const snackBar = { open: vi.fn() };
    const configDocuments = { download, canDownload: () => true };
    const component = new PresentationShowComponent(
      {} as never,
      {} as never,
      snackBar as never,
      {} as never,
      {} as never,
      configDocuments as never
    );
    component.config = { id: 'age-check' } as never;
    return { component, snackBar };
  }

  it('downloads the configuration document', async () => {
    const download = vi.fn().mockResolvedValue('Configuration downloaded');
    const { component, snackBar } = create(download);

    await component.downloadConfig();

    expect(download).toHaveBeenCalledWith('PresentationConfig', 'age-check');
    expect(snackBar.open.mock.lastCall?.[0]).toBe('Configuration downloaded');
  });

  it("shows the backend's reason when the download fails", async () => {
    const download = vi.fn().mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' });
    const { component, snackBar } = create(download);

    await component.downloadConfig();

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to download configuration: Forbidden resource'
    );
  });
});
