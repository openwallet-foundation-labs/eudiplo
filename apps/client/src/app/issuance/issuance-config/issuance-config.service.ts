import { Injectable } from '@angular/core';
import {
  type IssuanceDto,
  issuanceControllerGetIssuanceConfigurations,
  issuanceControllerStoreIssuanceConfiguration,
  issuerManagementControllerGetOffer,
  type OfferRequestDto,
} from '../../generated';

@Injectable({
  providedIn: 'root',
})
export class IssuanceConfigService {
  getConfig() {
    return issuanceControllerGetIssuanceConfigurations().then((response) => response.data);
  }

  /**
   * Save or update an issuance configuration
   */
  saveConfiguration(config: IssuanceDto) {
    return issuanceControllerStoreIssuanceConfiguration({ body: config }).then(
      (response) => response.data
    );
  }

  getOffer(values: OfferRequestDto) {
    return issuerManagementControllerGetOffer({ body: values }).then((response) => response.data);
  }
}
