import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { NavSection, NavSectionsService } from '../../services/nav-sections.service';

/** A section of the side navigation whose header collapses the entries inside it. */
@Component({
  selector: 'app-nav-section',
  imports: [MatDividerModule, MatIconModule, MatListModule],
  templateUrl: './nav-section.component.html',
  styleUrl: './nav-section.component.scss',
  // The open state also changes on navigation, outside this component.
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class NavSectionComponent {
  @Input({ required: true }) section!: NavSection;
  @Input({ required: true }) icon = '';
  @Input({ required: true }) label = '';

  constructor(public readonly navSections: NavSectionsService) {}

  get groupId(): string {
    return `nav-section-${this.section}`;
  }
}
