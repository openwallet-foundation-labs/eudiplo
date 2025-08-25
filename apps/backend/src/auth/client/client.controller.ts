import { Controller, Delete, Param, UseGuards } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth.guard";
import { TenantService } from "../tenant.service";
import { Token, TokenPayload } from "../token.decorator";

@UseGuards(JwtAuthGuard)
@ApiSecurity("oauth2")
@Controller("client")
export class ClientController {
    constructor(private readonly clientService: TenantService) {}

    /**
     * Deletes a client by ID
     * @param id The ID of the client to delete
     */
    @Delete(":id")
    async deleteClient(@Param("id") id: string, @Token() user: TokenPayload) {
        await this.clientService.deleteClient(id, user);
    }
}
