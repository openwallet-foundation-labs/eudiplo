import { Injectable, NotImplementedException } from "@nestjs/common";
import { CreateUserDto } from "../dto/create-user.dto";
import { ManagedUserDto } from "../dto/managed-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { UsersProvider } from "../user.provider";

@Injectable()
export class InternalUsersProvider extends UsersProvider {
    private unsupported(): never {
        throw new NotImplementedException(
            "Human user management is only available when EUDIPLO is configured with an external OIDC provider.",
        );
    }

    getUsers(_tenantId: string): Promise<ManagedUserDto[]> {
        this.unsupported();
    }

    getUser(_tenantId: string, _userId: string): Promise<ManagedUserDto> {
        this.unsupported();
    }

    addUser(_tenantId: string, _dto: CreateUserDto): Promise<ManagedUserDto> {
        this.unsupported();
    }

    updateUser(
        _tenantId: string,
        _userId: string,
        _dto: UpdateUserDto,
    ): Promise<ManagedUserDto> {
        this.unsupported();
    }

    removeUser(_tenantId: string, _userId: string): Promise<void> {
        this.unsupported();
    }
}
