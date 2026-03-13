import { PartialType } from "@nestjs/swagger";
import { CreateWebhookEndpointDto } from "./create-webhook-endpoint.dto";

export class UpdateWebhookEndpointDto extends PartialType(
    CreateWebhookEndpointDto,
) {}
