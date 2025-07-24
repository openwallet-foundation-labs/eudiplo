// This script imports the schemas that are in the issuance and presentation folder

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const url = process.env.API_URL || 'http://localhost:3000';
const clientId = process.env.CLIENT_ID || 'root';
const clientSecret = process.env.CLIENT_SECRET || 'root';
const maxRetries = parseInt(process.env.MAX_RETRIES || '3');
const retryDelay = parseInt(process.env.RETRY_DELAY || '1000');

type LoginResponse = {
    access_token: string;
};

type ImportConfig = {
    directory: string;
    endpoint: string;
    name: string;
};

type ImportResult = {
    fileName: string;
    success: boolean;
    error?: string;
    retries: number;
};

type ImportStats = {
    total: number;
    successful: number;
    failed: number;
    duration: number;
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateJsonFile(filePath: string): boolean {
    try {
        const content = readFileSync(filePath, 'utf-8');
        JSON.parse(content);
        return true;
    } catch {
        return false;
    }
}

async function getAccessToken(): Promise<string> {
    try {
        const response = await fetch(`${url}/auth/oauth2/token`, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
            }),
        });

        if (!response.ok) {
            throw new Error(
                `Authentication failed: ${response.status} ${response.statusText}`,
            );
        }

        const data: LoginResponse = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Failed to get access token:', error);
        throw error;
    }
}

async function importFileWithRetry(
    filePath: string,
    endpoint: string,
    accessToken: string,
    fileName: string,
): Promise<ImportResult> {
    const result: ImportResult = {
        fileName,
        success: false,
        retries: 0,
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Add delay for retry attempts
            if (attempt > 0) {
                await sleep(retryDelay);
            }

            // Read and validate file content
            const content = readFileSync(filePath, 'utf-8');
            const module = JSON.parse(content);
            module.id = fileName.replace('.json', '');

            const response = await fetch(`${url}${endpoint}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(module),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            result.success = true;
            result.retries = attempt;
            return result;
        } catch (error) {
            result.error =
                error instanceof Error ? error.message : String(error);
            result.retries = attempt;

            if (attempt === maxRetries) {
                console.error(
                    `❌ Failed to import ${fileName} after ${attempt + 1} attempts:`,
                    error,
                );
                break;
            } else {
                console.warn(
                    `⚠️  Retry ${attempt + 1}/${maxRetries} for ${fileName}: ${result.error}`,
                );
            }
        }
    }

    return result;
}

async function importDirectory(
    config: ImportConfig,
    accessToken: string,
): Promise<ImportStats> {
    const startTime = Date.now();

    try {
        // Check if directory exists
        if (!existsSync(config.directory)) {
            console.warn(`⚠️  Directory not found: ${config.directory}`);
            return { total: 0, successful: 0, failed: 0, duration: 0 };
        }

        const allFiles = readdirSync(config.directory);
        const jsonFiles = allFiles.filter((file) => file.endsWith('.json'));

        if (jsonFiles.length === 0) {
            console.warn(`⚠️  No JSON files found in: ${config.directory}`);
            return { total: 0, successful: 0, failed: 0, duration: 0 };
        }

        // Validate files before processing
        const validFiles = jsonFiles.filter((file) => {
            const filePath = join(config.directory, file);
            const isValid = validateJsonFile(filePath);
            if (!isValid) {
                console.warn(`⚠️  Skipping invalid JSON file: ${file}`);
            }
            return isValid;
        });

        console.log(
            `\n📁 Importing ${config.name} (${validFiles.length} valid files of ${allFiles.length} total)...`,
        );

        const results: ImportResult[] = [];

        // Process files sequentially to ensure complete order control
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            console.log(
                `  📄 Processing file ${i + 1}/${validFiles.length}: ${file}`,
            );

            const result = await importFileWithRetry(
                join(config.directory, file),
                config.endpoint,
                accessToken,
                file,
            );

            results.push(result);

            if (result.success) {
                console.log(
                    `  ✅ ${result.fileName}${result.retries > 0 ? ` (after ${result.retries} retries)` : ''}`,
                );
            } else {
                console.error(`  ❌ ${result.fileName}: ${result.error}`);
            }
        }

        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        const duration = Date.now() - startTime;

        console.log(
            `✅ Completed importing ${config.name}: ${successful} successful, ${failed} failed (${duration}ms)`,
        );

        return {
            total: validFiles.length,
            successful,
            failed,
            duration,
        };
    } catch (error) {
        console.error(
            `❌ Failed to import directory ${config.directory}:`,
            error,
        );
        throw error;
    }
}

async function run(): Promise<void> {
    const overallStartTime = Date.now();

    try {
        console.log('🔐 Authenticating...');
        const accessToken = await getAccessToken();
        console.log('✅ Authentication successful');

        // Import order is critical: credentials must be imported before issuance configurations
        // since issuance configurations reference credential schemas
        const importConfigs: ImportConfig[] = [
            {
                directory: 'scripts/issuance/credentials',
                endpoint: '/issuer-management/credentials',
                name: 'credentials',
            },
            {
                directory: 'scripts/issuance/issuance',
                endpoint: '/issuer-management/issuance',
                name: 'issuance configurations',
            },
            {
                directory: 'scripts/presentation',
                endpoint: '/presentation-management',
                name: 'presentations',
            },
        ];

        const allStats: ImportStats[] = [];

        // Process imports sequentially to maintain dependencies
        // Credentials must be imported before issuance configurations
        for (const config of importConfigs) {
            console.log(`\n🔄 Starting import phase: ${config.name}`);
            const stats = await importDirectory(config, accessToken);
            allStats.push(stats);

            // Stop if this phase failed and it's a dependency for the next
            if (stats.failed > 0 && config.name === 'credentials') {
                console.error(
                    '\n❌ Credential import failed. Stopping import process as issuance configurations depend on credentials.',
                );
                process.exit(1);
            }
        }

        // Summary
        const totalFiles = allStats.reduce(
            (sum, stats) => sum + stats.total,
            0,
        );
        const totalSuccessful = allStats.reduce(
            (sum, stats) => sum + stats.successful,
            0,
        );
        const totalFailed = allStats.reduce(
            (sum, stats) => sum + stats.failed,
            0,
        );
        const overallDuration = Date.now() - overallStartTime;

        console.log('\n📊 Import Summary:');
        console.log(`  Total files processed: ${totalFiles}`);
        console.log(`  Successful imports: ${totalSuccessful}`);
        console.log(`  Failed imports: ${totalFailed}`);
        console.log(
            `  Success rate: ${totalFiles > 0 ? ((totalSuccessful / totalFiles) * 100).toFixed(1) : 0}%`,
        );
        console.log(`  Total duration: ${overallDuration}ms`);

        if (totalFailed > 0) {
            console.log(
                '\n⚠️  Some imports failed. Check the logs above for details.',
            );
            process.exit(1);
        } else {
            console.log('\n🎉 All imports completed successfully!');
        }
    } catch (error) {
        console.error('💥 Import process failed:', error);
        process.exit(1);
    }
}

// Run the script
run().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});
