import { inject, Injectable } from '@angular/core';
import { TrustList, trustListControllerGetAllTrustLists } from '@eudiplo/sdk-core';
import { ConfigDocumentService } from '../config-portability/config-document.service';

@Injectable({
  providedIn: 'root',
})
export class TrustListService {
  private readonly configDocuments = inject(ConfigDocumentService);

  async getAll(): Promise<TrustList[]> {
    const response = await trustListControllerGetAllTrustLists();
    return response.data;
  }

  /**
   * Saves the trust list as a configuration document that the config folder
   * and configuration bundles import, for the list and the detail page alike.
   */
  async downloadConfig(id: string): Promise<void> {
    await this.configDocuments.download('TrustList', id);
  }
}
