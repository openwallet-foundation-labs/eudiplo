import { Injectable } from '@angular/core';
import {
  TrustList,
  trustListControllerExportTrustList,
  trustListControllerGetAllTrustLists,
} from '@eudiplo/sdk-core';
import { downloadJsonFile } from '../common/download-json.util';

@Injectable({
  providedIn: 'root',
})
export class TrustListService {
  async getAll(): Promise<TrustList[]> {
    const response = await trustListControllerGetAllTrustLists();
    return response.data;
  }

  /**
   * Saves the trust list as a configuration file that can be imported again.
   * Unlike other features, the file is saved here so that the list and the
   * detail page name it the same.
   */
  async downloadConfig(id: string): Promise<void> {
    const response = await trustListControllerExportTrustList({ path: { id } });
    downloadJsonFile(response.data, `trustlist-${id}-config.json`);
  }
}
