import { Injectable } from '@angular/core';
import {
  type IssuanceDto,
  issuanceConfigControllerGetIssuanceConfigurations,
  issuanceConfigControllerStoreIssuanceConfiguration,
  credentialOfferControllerGetOffer,
  type OfferRequestDto,
} from '@eudiplo/sdk';

@Injectable({
  providedIn: 'root',
})
export class IssuanceConfigService {
  getConfig() {
    return issuanceConfigControllerGetIssuanceConfigurations().then((response) => response.data);
  }

  /**
   * Save or update an issuance configuration
   */
  saveConfiguration(config: IssuanceDto) {
    return issuanceConfigControllerStoreIssuanceConfiguration({ body: config }).then(
      (response) => response.data
    );
  }

  getOffer(values: OfferRequestDto) {
    return credentialOfferControllerGetOffer({ body: values }).then((response) => response.data);
  }
}
