export enum Role {
    //to manage presentation resources
    Presentations = "presentation:manage",
    // to create offers
    PresentationOffer = "presentation:offer",
    // to manage issuance resources
    Issuances = "issuance:manage",
    // to create offers
    IssuanceOffer = "issuance:offer",
    // to manage client resources
    Clients = "clients:manage",
    // to manage tenant resources
    Tenants = "tenants:manage",
}

export function getRoles(type: "all") {
    if (type === "all") {
        return Object.values(Role);
    }
    return [];
}
