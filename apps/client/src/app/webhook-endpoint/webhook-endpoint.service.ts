import { Injectable } from '@angular/core';
import {
  WebhookEndpointEntity,
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
  webhookEndpointControllerGetAll,
  webhookEndpointControllerGetById,
  webhookEndpointControllerCreate,
  webhookEndpointControllerUpdate,
  webhookEndpointControllerDelete,
} from '@eudiplo/sdk-core';

@Injectable({
  providedIn: 'root',
})
export class WebhookEndpointService {
  async getAll(): Promise<WebhookEndpointEntity[]> {
    const response = await webhookEndpointControllerGetAll();
    return (response.data as WebhookEndpointEntity[]) || [];
  }

  async getById(id: string): Promise<WebhookEndpointEntity> {
    const response = await webhookEndpointControllerGetById({ path: { id } });
    return response.data as WebhookEndpointEntity;
  }

  async create(dto: CreateWebhookEndpointDto): Promise<any> {
    return webhookEndpointControllerCreate({ body: dto });
  }

  async update(id: string, dto: UpdateWebhookEndpointDto): Promise<any> {
    return webhookEndpointControllerUpdate({ path: { id }, body: dto });
  }

  async delete(id: string): Promise<void> {
    await webhookEndpointControllerDelete({ path: { id } });
  }
}
