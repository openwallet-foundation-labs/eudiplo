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
import { CreateWebhookEndpointDto } from "./dto/create-webhook-endpoint.dto";
import { UpdateWebhookEndpointDto } from "./dto/update-webhook-endpoint.dto";
import { WebhookEndpointEntity } from "./entities/webhook-endpoint.entity";

@Injectable()
export class WebhookEndpointService {
    constructor(
        @InjectRepository(WebhookEndpointEntity)
        private readonly repo: Repository<WebhookEndpointEntity>,
        private readonly configImportService: ConfigImportService,
        private readonly configImportOrchestrator: ConfigImportOrchestratorService,
    ) {
        this.configImportOrchestrator.register(
            "webhook-endpoints",
            ImportPhase.CORE,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    private async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<CreateWebhookEndpointDto>(
            tenantId,
            {
                subfolder: "webhook-endpoints",
                fileExtension: ".json",
                validationClass: CreateWebhookEndpointDto,
                resourceType: "webhook endpoint",
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
                    return plainToClass(CreateWebhookEndpointDto, payload);
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
            throw new NotFoundException(`Webhook endpoint '${id}' not found`);
        }
        return entity;
    }

    create(tenantId: string, dto: CreateWebhookEndpointDto) {
        return this.repo.save({ ...dto, tenantId });
    }

    async update(tenantId: string, id: string, dto: UpdateWebhookEndpointDto) {
        const existing = await this.getById(tenantId, id);
        return this.repo.save({ ...existing, ...dto, id, tenantId });
    }

    async delete(tenantId: string, id: string) {
        await this.getById(tenantId, id);
        return this.repo.delete({ id, tenantId });
    }
}
