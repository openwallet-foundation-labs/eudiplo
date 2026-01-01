import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "../../auth/roles/role.enum";
import { Secured } from "../../auth/secure.decorator";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { TrustListCreateDto } from "./dto/trust-list-create.dto";
import { TrustListService } from "./trustlist.service";

/**
 * Controller for managing trust lists.
 */
@Secured([Role.Issuances, Role.Presentations])
@ApiTags("Issuer")
@Controller("trust-list")
export class TrustListController {
    constructor(private readonly trustListService: TrustListService) {}

    /**
     * Creates a new trust list for the tenant
     * @param body
     * @returns
     */
    @Post()
    createTrustList(
        @Body() body: TrustListCreateDto,
        @Token() token: TokenPayload,
    ) {
        return this.trustListService
            .create(body, token.entity!)
            .catch((err) => {
                console.log(err);
                throw new ConflictException(err.message);
            });
    }

    /**
     * Returns all trust lists for the tenant
     * @param token
     * @returns
     */
    @Get()
    getAllTrustLists(@Token() token: TokenPayload) {
        return this.trustListService.findAll(token.entity!);
    }

    /**
     * Returns the trust list by id for the tenant
     * @param tenantId
     * @param id
     * @returns
     */
    @Get(":id")
    getTrustList(@Token() token: TokenPayload, @Param("id") id: string) {
        return this.trustListService.findOne(token.entity!.id, id).catch(() => {
            throw new ConflictException("Trust list not found");
        });
    }

    /**
     * Updates a trust list
     * @param id
     * @param body
     * @param token
     * @returns
     */
    @Patch(":id")
    updateTrustList(
        @Param("id") id: string,
        @Body() body: Partial<TrustListCreateDto>,
        @Token() token: TokenPayload,
    ) {
        return this.trustListService.update(token.entity!.id, id, body);
    }

    /**
     * Deletes a trust list
     * @param id
     * @param token
     * @returns
     */
    @Delete(":id")
    deleteTrustList(@Param("id") id: string, @Token() token: TokenPayload) {
        return this.trustListService.remove(token.entity!.id, id);
    }
}
