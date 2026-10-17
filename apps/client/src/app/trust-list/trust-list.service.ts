import { Injectable } from '@angular/core';
import { TrustList, trustListControllerGetAllTrustLists } from '@eudiplo/sdk-core';

@Injectable({
  providedIn: 'root',
})
export class TrustListService {
  async getAll(): Promise<TrustList[]> {
    const response = await trustListControllerGetAllTrustLists();
    return response.data;
  }
}
