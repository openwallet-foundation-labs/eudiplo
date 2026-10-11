import { DataSource } from "typeorm";
import {
    addTokensValidAfterContract,
    addTokensValidAfterEntities,
} from "../../test/persistence/add-tokens-valid-after.contract.js";

addTokensValidAfterContract(() =>
    new DataSource({
        type: "better-sqlite3",
        database: ":memory:",
        entities: addTokensValidAfterEntities,
        synchronize: true,
    }).initialize(),
);
