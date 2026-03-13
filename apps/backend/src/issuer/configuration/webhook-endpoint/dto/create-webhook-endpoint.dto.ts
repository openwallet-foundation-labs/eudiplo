import { OmitType } from "@nestjs/swagger";
import { WebhookEndpointEntity } from "../entities/webhook-endpoint.entity";

export class CreateWebhookEndpointDto extends OmitType(WebhookEndpointEntity, [
    "tenantId",
    "tenant",
]) {}
