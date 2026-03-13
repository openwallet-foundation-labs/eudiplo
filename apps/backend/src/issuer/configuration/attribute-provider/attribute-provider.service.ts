import { readFileSync } from "node:fs";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { Repository } from "typeorm";
import { ConfigImportService } from "../../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../../shared/utils/config-import/config-import-orchestrator.service";
import { CreateAttributeProviderDto } from "./dto/create-attribute-provider.dto";
import { UpdateAttributeProviderDto } from "./dto/update-attribute-provider.dto";
import { AttributeProviderEntity } from "./entities/attribute-provider.entity";

@Injectable()
export class AttributeProviderService {
    constructor(
        @InjectRepository(AttributeProviderEntity)
        private readonly repo: Repository<AttributeProviderEntity>,
        private readonly configImportService: ConfigImportService,
        private readonly configImportOrchestrator: ConfigImportOrchestratorService,
    ) {
        this.configImportOrchestrator.register(
            "attribute-providers",
            ImportPhase.CORE,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    private async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<CreateAttributeProviderDto>(
            tenantId,
            {
                subfolder: "attribute-providers",
                fileExtension: ".json",
                validationClass: CreateAttributeProviderDto,
                resourceType: "attribute provider",
                checkExists: (tid, data) =>
                    this.getById(tid, data.id)
                        .then(() => true)
                        .catch(() => false),
                deleteExisting: (tid, data) =>
                    this.repo
                        .delete({ id: data.id, tenantId: tid })
                        .then(() => undefined),
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    return plainToClass(CreateAttributeProviderDto, payload);
                },
                processItem: async (tid, dto) => {
                    await this.create(tid, dto);
                },
            },
        );
    }

    getAll(tenantId: string) {
        return this.repo.find({ where: { tenantId } });
    }

    async getById(tenantId: string, id: string) {
        const entity = await this.repo.findOneBy({ id, tenantId });
        if (!entity) {
            throw new NotFoundException(`Attribute provider '${id}' not found`);
        }
        return entity;
    }

    create(tenantId: string, dto: CreateAttributeProviderDto) {
        return this.repo.save({ ...dto, tenantId });
    }

    async update(
        tenantId: string,
        id: string,
        dto: UpdateAttributeProviderDto,
    ) {
        const existing = await this.getById(tenantId, id);
        return this.repo.save({ ...existing, ...dto, id, tenantId });
    }

    async delete(tenantId: string, id: string) {
        await this.getById(tenantId, id);
        return this.repo.delete({ id, tenantId });
    }
}
