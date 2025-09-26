import { ConfigService } from "@nestjs/config";
import { ServeStaticModuleOptions } from "@nestjs/serve-static";
import { isAbsolute, join } from "path";

/**
 * Factory function for configuring the serve static module
 * @param configService The config service instance
 * @returns The serve static module configuration
 */
export const createServeStaticOptions = (
    configService: ConfigService,
): ServeStaticModuleOptions[] => {
    const folder = configService.getOrThrow<string>("FOLDER");
    const rootPath = isAbsolute(folder)
        ? join(folder, "public")
        : join(__dirname, "../", folder, "public");
    return [
        {
            rootPath,
        },
    ];
};
