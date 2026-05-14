// Interfaces for credential configuration forms

export interface DisplayFormValue {
  name: string;
  description?: string;
  locale: string;
  background_color?: string;
  text_color?: string;
  logo?: {
    uri?: string;
    url?: string;
  };
  background_image?: {
    uri?: string;
    url?: string;
  };
}
