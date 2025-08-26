import {
    Controller,
    Get,
    Param,
    Post,
    StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiSecurity } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/auth.guard";
import { Token, TokenPayload } from "../auth/token.decorator";
import { FileUploadDto } from "./dto/file-upload.dto";
import { FilesService } from "./files.service";

/**
 * Storage Controller
 */
@Controller("storage")
export class StorageController {
    /**
     * Constructor
     * @param filesService The files service
     */
    constructor(private filesService: FilesService) {}

    /**
     * Upload files that belong to a tenant like images
     * @param user
     * @param file
     * @returns
     */
    @UseInterceptors(FileInterceptor("file"))
    @UseGuards(JwtAuthGuard)
    @ApiSecurity("oauth2")
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
        return this.filesService.saveUserUpload(user.sub, file, true);
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
