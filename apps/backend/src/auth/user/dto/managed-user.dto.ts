import { ApiProperty } from "@nestjs/swagger";
import { Role } from "../../roles/role.enum";

export class ManagedUserDto {
    @ApiProperty({ example: "5a3412a4-9ccf-41aa-b79c-f7e2a8a9b0d1" })
    id!: string;

    @ApiProperty({ example: "alice" })
    username!: string;

    @ApiProperty({ example: "alice@example.com", required: false })
    email?: string;

    @ApiProperty({ example: "Alice", required: false })
    firstName?: string;

    @ApiProperty({ example: "Admin", required: false })
    lastName?: string;

    @ApiProperty({ example: true })
    enabled!: boolean;

    @ApiProperty({ enum: Role, isArray: true })
    roles!: Role[];

    @ApiProperty({ example: "tenant-a", required: false })
    tenantId?: string;
}
