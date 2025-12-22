import { AUTH_VALIDATION_SCHEMA } from "../../../auth/auth-validation.schema";
import { CRYPTO_VALIDATION_SCHEMA } from "../../../crypto/key/crypto-implementation/crypto-validation.schema";
import { KEY_VALIDATION_SCHEMA } from "../../../crypto/key/key-validation.schema";
import { DB_VALIDATION_SCHEMA } from "../../../database/database-validation.schema";
import { ISSUER_VALIDATION_SCHEMA } from "../../../issuer/issuer-validation.schema";
import { STATUS_LIST_VALIDATION_SCHEMA } from "../../../issuer/lifecycle/status/status-list-validation.schema";
import { REGISTRAR_VALIDATION_SCHEMA } from "../../../registrar/registrar-validation.schema";
import { SESSION_VALIDATION_SCHEMA } from "../../../session/session-validation.schema";
import { STORAGE_VALIDATION_SCHEMA } from "../../../storage/storage-validation.schema";
import { LOG_VALIDATION_SCHEMA } from "../logger/log-validation.schema";
import { CONFIG_VALIDATION_SCHEMA } from "./config-validation.schema";
import { BASE_VALIDATION_SCHEMA } from "./validation.schema";

/**
 * Combined validation schema for the application configuration
 */
export const VALIDATION_SCHEMA = BASE_VALIDATION_SCHEMA.concat(
    AUTH_VALIDATION_SCHEMA,
)
    .concat(DB_VALIDATION_SCHEMA)
    .concat(CONFIG_VALIDATION_SCHEMA)
    .concat(LOG_VALIDATION_SCHEMA)
    .concat(REGISTRAR_VALIDATION_SCHEMA)
    .concat(KEY_VALIDATION_SCHEMA)
    .concat(CRYPTO_VALIDATION_SCHEMA)
    .concat(ISSUER_VALIDATION_SCHEMA)
    .concat(SESSION_VALIDATION_SCHEMA)
    .concat(STORAGE_VALIDATION_SCHEMA)
    .concat(STATUS_LIST_VALIDATION_SCHEMA);
