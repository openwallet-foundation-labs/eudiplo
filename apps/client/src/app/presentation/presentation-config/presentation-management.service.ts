import { Injectable } from '@angular/core';
import { OfferResponse, PresentationConfig, PresentationRequest } from '../../generated';
import { client } from '../../generated/client.gen';
import {
  presentationManagementControllerConfiguration,
  presentationManagementControllerDeleteConfiguration,
  presentationManagementControllerGetOffer,
  presentationManagementControllerStorePresentationConfig,
} from '../../generated/sdk.gen';

@Injectable({
  providedIn: 'root',
})
export class PresentationManagementService {
  createConfiguration(value: PresentationConfig) {
    return presentationManagementControllerStorePresentationConfig({ client, body: value }).then(
      (response) => response.data as PresentationConfig
    );
  }
  getPresentationById(presentationId: string) {
    return this.loadConfigurations().then((configs) => {
      return configs.find((config) => config.id === presentationId);
    });
  }
  loadConfigurations(): PromiseLike<PresentationConfig[]> {
    return presentationManagementControllerConfiguration({ client }).then((response) => {
      return response.data || [];
    });
  }

  deleteConfiguration(id: string) {
    return presentationManagementControllerDeleteConfiguration({
      client,
      path: { id },
    });
  }

  getOffer(offerRequest: PresentationRequest): Promise<OfferResponse> {
    return presentationManagementControllerGetOffer({ client, body: offerRequest }).then(
      (response) => response.data as OfferResponse
    );
  }
}
