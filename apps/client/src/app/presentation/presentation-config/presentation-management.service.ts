import { Injectable } from '@angular/core';
import {
  PresentationConfig,
  presentationManagementControllerGetConfiguration,
  PresentationRequest,
  presentationManagementControllerConfiguration,
  presentationManagementControllerDeleteConfiguration,
  presentationManagementControllerStorePresentationConfig,
  verifierOfferControllerGetOffer,
} from '@eudiplo/sdk';

@Injectable({
  providedIn: 'root',
})
export class PresentationManagementService {
  createConfiguration(value: PresentationConfig) {
    return presentationManagementControllerStorePresentationConfig({ body: value }).then(
      (response) => response.data as PresentationConfig
    );
  }
  getPresentationById(presentationId: string) {
    return presentationManagementControllerGetConfiguration({ path: { id: presentationId } }).then(
      (response) => response.data
    );
  }
  loadConfigurations() {
    return presentationManagementControllerConfiguration().then((response) => {
      return response.data || [];
    });
  }

  deleteConfiguration(id: string) {
    return presentationManagementControllerDeleteConfiguration({
      path: { id },
    });
  }

  getOffer(offerRequest: PresentationRequest) {
    return verifierOfferControllerGetOffer({ body: offerRequest }).then(
      (response) => response.data
    );
  }
}
