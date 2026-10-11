import { describe } from 'vitest';
import { describeListStates } from '../../../common/base-async-list.testing';
import { AttributeProviderService } from '../attribute-provider.service';
import { AttributeProviderListComponent } from './attribute-provider-list.component';

describe('AttributeProviderListComponent', () => {
  describeListStates({
    component: AttributeProviderListComponent,
    service: AttributeProviderService,
    fetchMethod: 'getAll',
    item: { id: 'crm', name: 'CRM', url: 'https://crm.example', auth: { type: 'none' } },
    loading: 'Loading attribute providers',
    empty: 'No attribute providers yet.',
    create: 'Create Attribute Provider',
    createButton: 'Create New Attribute Provider',
    failure: 'Failed to load attribute providers',
  });
});
