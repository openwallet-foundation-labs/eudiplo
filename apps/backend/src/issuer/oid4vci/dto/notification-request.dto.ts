import { NotificationEvent } from "@openid4vc/openid4vci";
import { IsEnum, IsString } from "class-validator";

export class NotificationRequestDto {
    @IsString()
    notification_id: string;

    @IsEnum(["credential_accepted", "credential_revoked"])
    event: NotificationEvent;
}
