import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DisplayCreateDto } from "./dto/display-create.dto";
import { DisplayEntity } from "./entities/display.entity";

/**
 * Display Service
 */
@Injectable()
export class DisplayService {
    /**
     * Display Service
     * @param displayRepository
     */
    constructor(
        @InjectRepository(DisplayEntity)
        private readonly displayRepository: Repository<DisplayEntity>,
    ) {}

    /**
     * Get display information for a user
     * @param tenantId The ID of the tenant
     * @returns The display information for the tenant
     */
    get(tenantId: string): Promise<DisplayEntity | null> {
        return this.displayRepository.findOne({
            where: { tenantId },
        });
    }

    /**
     * Create a new display for a user
     * @param tenantId The ID of the tenant
     * @param displayData The display data to create
     * @returns The created display information
     */
    create(
        tenantId: string,
        displayData: DisplayCreateDto,
    ): Promise<DisplayEntity> {
        const displayEntity = this.displayRepository.create({
            ...displayData,
            tenantId,
        });
        return this.displayRepository.save(displayEntity);
    }
}
