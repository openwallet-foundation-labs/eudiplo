import { Injectable } from '@angular/core';
import { OfferResponse, PresentationConfig, PresentationRequest } from '@eudiplo/sdk';
import {
  presentationManagementControllerConfiguration,
  presentationManagementControllerDeleteConfiguration,
  presentationManagementControllerGetOffer,
  presentationManagementControllerStorePresentationConfig,
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
    return this.loadConfigurations().then((configs) => {
      return configs.find((config) => config.id === presentationId);
    });
  }
  loadConfigurations(): PromiseLike<PresentationConfig[]> {
    return presentationManagementControllerConfiguration().then((response) => {
      return response.data || [];
    });
  }

  deleteConfiguration(id: string) {
    return presentationManagementControllerDeleteConfiguration({
      path: { id },
    });
  }

  getOffer(offerRequest: PresentationRequest): Promise<OfferResponse> {
    return presentationManagementControllerGetOffer({ body: offerRequest }).then(
      (response) => response.data as OfferResponse
    );
  }
}
