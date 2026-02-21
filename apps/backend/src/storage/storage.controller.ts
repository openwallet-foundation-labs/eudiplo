import {
    Controller,
    Get,
    Param,
    Post,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Role } from "../auth/roles/role.enum";
import { Secured } from "../auth/secure.decorator";
import { Token, TokenPayload } from "../auth/token.decorator";
import { FileUploadDto } from "./dto/file-upload.dto";
import { FilesService } from "./files.service";

/**
 * Storage Controller
 */
@ApiTags("Storage")
@Controller("storage")
export class StorageController {
    /**
     * Constructor
     * @param filesService The files service
     */
    constructor(private readonly filesService: FilesService) {}

    /**
     * Upload files that belong to a tenant like images
     * @param user
     * @param file
     * @returns
     */
    @UseInterceptors(FileInterceptor("file"))
    @Secured([Role.Issuances])
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        description: "List of cats",
        type: FileUploadDto,
    })
    @Post()
    upload(
        @Token() user: TokenPayload,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.filesService.saveUserUpload(user.entity!.id, file, true);
    }

    @Get(":key")
    download(@Param("key") key: string) {
        return this.filesService.getStream(key).then(
            (stream) =>
                new StreamableFile(stream.stream, {
                    disposition: "attachment",
                    type: stream.contentType,
                    length: stream.size,
                }),
        );
    }
}
