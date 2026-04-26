import { CreateUserDto } from "./dto/create-user.dto";
import { ManagedUserDto } from "./dto/managed-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

export const USERS_PROVIDER = "USERS_PROVIDER";

export abstract class UsersProvider {
    abstract getUsers(tenantId: string): Promise<ManagedUserDto[]>;

    abstract getUser(tenantId: string, userId: string): Promise<ManagedUserDto>;

    abstract addUser(
        tenantId: string,
        dto: CreateUserDto,
    ): Promise<ManagedUserDto>;

    abstract updateUser(
        tenantId: string,
        userId: string,
        dto: UpdateUserDto,
    ): Promise<ManagedUserDto>;

    abstract removeUser(tenantId: string, userId: string): Promise<void>;
}
