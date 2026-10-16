import type { Provider, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expect, vi } from 'vitest';
import { ConfigDocumentService } from './config-document.service';
import type { ConfigResourceKind } from './config-ownership.service';

/**
 * Renders a page while the configuration document `downloading` is being
 * downloaded and returns its "Download configuration" button, or null when the
 * page does not show it. `loaded` says when the page has its resource.
 */
export async function renderDownloadButton<T>(
  component: Type<T>,
  {
    providers,
    loaded,
    downloading,
    canDownload = true,
    label = 'Download configuration',
  }: {
    providers: Provider[];
    loaded: (component: T) => boolean;
    downloading: [ConfigResourceKind, string];
    canDownload?: boolean;
    label?: string;
  }
): Promise<HTMLButtonElement | null> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      ...providers,
      {
        provide: ConfigDocumentService,
        useValue: {
          canDownload: () => canDownload,
          isDownloading: (kind: ConfigResourceKind, id: string) =>
            kind === downloading[0] && id === downloading[1],
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  await vi.waitFor(() => expect(loaded(fixture.componentInstance)).toBe(true));
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`
  );
}
