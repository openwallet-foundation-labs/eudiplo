import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Role } from "../../../auth/roles/role.enum";
import { Secured } from "../../../auth/secure.decorator";
import { Token, TokenPayload } from "../../../auth/token.decorator";
import { CreateWebhookEndpointDto } from "./dto/create-webhook-endpoint.dto";
import { UpdateWebhookEndpointDto } from "./dto/update-webhook-endpoint.dto";
import { WebhookEndpointService } from "./webhook-endpoint.service";

@ApiTags("Issuer")
@Secured([Role.Issuances])
@Controller("issuer/webhook-endpoints")
export class WebhookEndpointController {
    constructor(private readonly service: WebhookEndpointService) {}

    @Get()
    @ApiOperation({ summary: "List all webhook endpoints" })
    @ApiResponse({ status: 200, description: "List of webhook endpoints" })
    getAll(@Token() user: TokenPayload) {
        return this.service.getAll(user.entity!.id);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a webhook endpoint by ID" })
    @ApiResponse({ status: 200, description: "The webhook endpoint" })
    @ApiResponse({ status: 404, description: "Webhook endpoint not found" })
    getById(@Param("id") id: string, @Token() user: TokenPayload) {
        return this.service.getById(user.entity!.id, id);
    }

    @Post()
    @ApiOperation({ summary: "Create a new webhook endpoint" })
    @ApiResponse({ status: 201, description: "Webhook endpoint created" })
    @ApiBody({ type: CreateWebhookEndpointDto })
    create(@Body() dto: CreateWebhookEndpointDto, @Token() user: TokenPayload) {
        return this.service.create(user.entity!.id, dto);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update a webhook endpoint" })
    @ApiResponse({ status: 200, description: "Webhook endpoint updated" })
    @ApiResponse({ status: 404, description: "Webhook endpoint not found" })
    @ApiBody({ type: UpdateWebhookEndpointDto })
    update(
        @Param("id") id: string,
        @Body() dto: UpdateWebhookEndpointDto,
        @Token() user: TokenPayload,
    ) {
        return this.service.update(user.entity!.id, id, dto);
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete a webhook endpoint" })
    @ApiResponse({ status: 200, description: "Webhook endpoint deleted" })
    @ApiResponse({ status: 404, description: "Webhook endpoint not found" })
    delete(@Param("id") id: string, @Token() user: TokenPayload) {
        return this.service.delete(user.entity!.id, id);
    }
}
