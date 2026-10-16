import type { TrustListCreateDto } from "./dto/trust-list-create.dto.js";
import type { TrustList } from "./entities/trust-list.entity.js";

/**
 * The trust list in the format that creates it: the response of its export
 * endpoint and the `spec` of its configuration document. A nullable column
 * comes back as null; the create schema only accepts an absent field, so it
 * is left out to keep the result importable.
 */
export function trustListConfig(
    trustList: Pick<
        TrustList,
        "id" | "description" | "keyChainId" | "entityConfig" | "data"
    >,
): TrustListCreateDto {
    return {
        id: trustList.id,
        description: trustList.description ?? undefined,
        keyChainId: trustList.keyChainId,
        entities: trustList.entityConfig ?? [],
        data: trustList.data,
    };
}
