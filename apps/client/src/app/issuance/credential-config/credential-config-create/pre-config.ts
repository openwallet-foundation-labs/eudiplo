export const configs = [
  {
    name: 'PID (Personal Identity Document)',
    description: 'German Personal Identity Document configuration',
    icon: 'badge',
    config: {
      id: 'pid', // Short, simple identifier
      config: {
        format: 'dc+sd-jwt',
        scope: 'pid',
        display: [
          {
            name: 'PID',
            background_color: '#FFFF00',
            background_image: {
              uri: '<PUBLIC_URL>/bdr/credential.png',
              url: '<PUBLIC_URL>/bdr/credential.png',
            },
            description: 'PID Credential',
            locale: 'en-US',
            logo: {
              uri: '<PUBLIC_URL>/issuer.png',
              url: '<PUBLIC_URL>/issuer.png',
            },
            text_color: '#000000',
          },
        ],
      },
      keyId: '',
      lifeTime: 3600,
      statusManagement: true,
      keyBinding: true,
      claims: {
        issuing_country: 'DE',
        issuing_authority: 'DE',
        given_name: 'ERIKA',
        family_name: 'MUSTERMANN',
        birth_family_name: 'GABLER',
        birthdate: '1964-08-12',
        age_birth_year: 1964,
        age_in_years: 59,
        age_equal_or_over: {
          '12': true,
          '14': true,
          '16': true,
          '18': true,
          '21': true,
          '65': false,
        },
        place_of_birth: {
          locality: 'BERLIN',
        },
        address: {
          locality: 'KÖLN',
          postal_code: '51147',
          street_address: 'HEIDESTRAẞE 17',
        },
        nationalities: ['DE'],
      },
      disclosureFrame: {
        _sd: [
          'issuing_country',
          'issuing_authority',
          'given_name',
          'family_name',
          'birth_family_name',
          'birthdate',
          'age_birth_year',
          'age_in_years',
          'age_equal_or_over',
          'place_of_birth',
          'address',
          'nationalities',
        ],
        address: {
          _sd: ['locality', 'postal_code', 'street_address'],
        },
      },
    },
  },
  {
    name: 'Academic Diploma',
    description: 'University academic diploma credential',
    icon: 'school',
    config: {
      id: 'diploma', // Short, simple identifier
      config: {
        format: 'dc+sd-jwt',
        display: [
          {
            name: 'Academic Diploma',
            background_color: '#1976D2',
            description: 'University Academic Diploma',
            locale: 'en-US',
            text_color: '#FFFFFF',
          },
        ],
      },
      keyId: '',
      lifeTime: 31536000,
      statusManagement: true,
      keyBinding: false,
      claims: {
        degree: 'Bachelor of Science',
        field_of_study: 'Computer Science',
        institution: 'Example University',
        graduation_date: '2024-06-15',
        gpa: '3.8',
        honors: 'Magna Cum Laude',
      },
      disclosureFrame: {
        _sd: ['degree', 'field_of_study', 'institution', 'graduation_date', 'gpa', 'honors'],
      },
    },
  },
];
