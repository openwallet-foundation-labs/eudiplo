import { Injectable } from '@angular/core';
import {
  AttributeProviderEntity,
  CreateAttributeProviderDto,
  UpdateAttributeProviderDto,
  attributeProviderControllerGetAll,
  attributeProviderControllerGetById,
  attributeProviderControllerCreate,
  attributeProviderControllerUpdate,
  attributeProviderControllerDelete,
} from '@eudiplo/sdk-core';

@Injectable({
  providedIn: 'root',
})
export class AttributeProviderService {
  async getAll(): Promise<AttributeProviderEntity[]> {
    const response = await attributeProviderControllerGetAll();
    return (response.data as AttributeProviderEntity[]) || [];
  }

  async getById(id: string): Promise<AttributeProviderEntity> {
    const response = await attributeProviderControllerGetById({ path: { id } });
    return response.data as AttributeProviderEntity;
  }

  async create(dto: CreateAttributeProviderDto): Promise<any> {
    return attributeProviderControllerCreate({ body: dto });
  }

  async update(id: string, dto: UpdateAttributeProviderDto): Promise<any> {
    return attributeProviderControllerUpdate({ path: { id }, body: dto });
  }

  async delete(id: string): Promise<void> {
    await attributeProviderControllerDelete({ path: { id } });
  }
}
