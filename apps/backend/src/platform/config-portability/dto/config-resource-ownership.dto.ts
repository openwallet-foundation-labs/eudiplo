import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
    ConfigOwnership,
    ConfigResourceKind,
} from "../config-resource.types.js";
import { CONFIG_RESOURCE_KINDS } from "../config-resource.types.js";

/** Ownership of one resource, as screens need it to lock file-managed resources. */
export class ConfigResourceOwnershipDto {
    @ApiProperty({
        enum: CONFIG_RESOURCE_KINDS,
        description: "Resource kind, as in the config bundle format",
    })
    kind!: ConfigResourceKind;

    @ApiProperty({
        description: "Resource ID, or the singleton ID such as `issuance`",
    })
    resourceId!: string;

    @ApiProperty({
        enum: ["unmanaged", "file-managed", "detached"],
        description:
            "`file-managed` resources reject API and web client changes with 409 until they are detached.",
    })
    ownership!: ConfigOwnership;

    @ApiProperty({ description: "Generation of the stored definition" })
    generation!: number;

    @ApiPropertyOptional({
        description:
            "File or bundle that provisioned the resource. Kept after detaching.",
    })
    source?: string;

    @ApiPropertyOptional({
        type: String,
        format: "date-time",
        description:
            "Last time an import, detach or reattach changed the ownership",
    })
    lastAppliedAt?: Date;
}
