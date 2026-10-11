import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NavSectionsService } from '../../services/nav-sections.service';
import { NavSectionComponent } from './nav-section.component';

@Component({
  imports: [NavSectionComponent],
  template: `<app-nav-section section="crypto" icon="key" label="Cryptographic Assets">
    <a href="/keys">Keys</a>
  </app-nav-section>`,
})
class HostComponent {}

describe('NavSectionComponent', () => {
  beforeEach(() => localStorage.clear());

  function render() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      header: element.querySelector('button') as HTMLButtonElement,
      group: element.querySelector('#nav-section-crypto') as HTMLElement,
    };
  }

  it('names the header after the section and points it at the entries', () => {
    const { header, group } = render();

    // The icons are hidden from assistive technology, so the label is the name.
    expect(header.querySelector('span')?.textContent).toBe('Cryptographic Assets');
    expect(header.getAttribute('aria-controls')).toBe('nav-section-crypto');
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(group.textContent?.trim()).toBe('Keys');
  });

  it('collapses and expands its entries from the header', () => {
    const { fixture, header, group } = render();

    header.click();
    fixture.detectChanges();

    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(group.hidden).toBe(true);
    expect(TestBed.inject(NavSectionsService).isCollapsed('crypto')).toBe(true);

    header.click();
    fixture.detectChanges();

    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(group.hidden).toBe(false);
  });
});
