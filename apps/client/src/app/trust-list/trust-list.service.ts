import { Injectable } from '@angular/core';
import {
  TrustList,
  TrustListCreateDto,
  trustListControllerExportTrustList,
  trustListControllerGetAllTrustLists,
} from '@eudiplo/sdk-core';

@Injectable({
  providedIn: 'root',
})
export class TrustListService {
  async getAll(): Promise<TrustList[]> {
    const response = await trustListControllerGetAllTrustLists();
    return response.data;
  }

  /** The trust list as a configuration file that can be imported again. */
  async exportConfig(id: string): Promise<TrustListCreateDto> {
    const response = await trustListControllerExportTrustList({ path: { id } });
    return response.data;
  }
}
