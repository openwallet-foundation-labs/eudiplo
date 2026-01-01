import { PresentationConfigCreateDto } from '@eudiplo/sdk';

export interface PredefinedConfig {
  name: string;
  description: string;
  icon: string;
  config: PresentationConfigCreateDto;
}

export const configs: PredefinedConfig[] = [
  {
    name: 'PID (Personal Identity Document)',
    description: 'German Personal Identity Document configuration',
    icon: 'badge',
    config: {
      id: 'pid',
      description: 'Presentation ID',
      dcql_query: {
        credentials: [
          {
            id: 'pid',
            format: 'dc+sd-jwt',
            meta: {
              vct_values: ['<PUBLIC_URL>/credentials-metadata/vct/pid'],
            },
            claims: [
              {
                path: ['address', 'locality'],
              },
            ],
          },
        ],
      },
    },
  },
];
