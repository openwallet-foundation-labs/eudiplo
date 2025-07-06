
# EUDIPLO – Your diplomatic layer for EUDI Wallet integration

**EUDIPLO** is a lightweight, open-source middleware that acts as a protocol translator between your backend service and EUDI Wallets. It exposes a simple JSON-based interface while handling the complexity of EUDI protocols internally.

EUDIPLO is designed to run **on-premise**. It does **not act as an intermediary** or forward data to external services, ensuring that all wallet interactions stay within your infrastructure.

- [Configuration](docs/config.md)
- [Databases](docs/databases.md)
- [Key Management](docs/key-management.md)
- [Supported Protocols](docs/supported-protocols.md)

---

## Credential Issuance Flow

This flow describes how a backend service initiates the issuance of a verifiable credential via the OID4VCI protocol. The end-user receives an offer link, opens it in their wallet, and receives the credential directly from EUDIPLO.

```plantuml
@startuml
actor EUDI_Wallet
participant Middleware
participant End_Service

End_Service -> Middleware : Request OID4VCI offer generation
Middleware --> End_Service : Return offer link
End_Service -> EUDI_Wallet : Present offer link to user
EUDI_Wallet -> Middleware : Start OID4VCI flow
Middleware <-> EUDI_Wallet : OID4VCI credential issuance
Middleware -> End_Service : Notify successful issuance
@enduml
```

---

## Credential Presentation Flow

This flow describes how a backend service requests a credential presentation (e.g., to authorize a user or verify an attribute). EUDIPLO creates the OID4VP request and handles the protocol flow with the wallet.

```plantuml
@startuml
actor EUDI_Wallet
participant Middleware
participant End_Service

End_Service -> Middleware : Request OID4VP presentation request
Middleware --> End_Service : Return presentation request link
End_Service -> EUDI_Wallet : Present link to user
EUDI_Wallet -> Middleware : Start OID4VP flow
Middleware <-> EUDI_Wallet : OID4VP presentation exchange
Middleware -> End_Service : Send presented data
@enduml
```

---

## Credential Presentation During Issuance Flow

This flow describes an advanced scenario where the end-user is required to **present a credential** during the issuance of another credential. This is useful when a prior attribute (e.g. student ID, PID) is needed to qualify for the new credential.

```plantuml
@startuml
actor EUDI_Wallet
participant Middleware
participant End_Service

End_Service -> Middleware : Request OID4VCI offer generation
Middleware --> End_Service : Return offer link
End_Service -> EUDI_Wallet : Present offer link to user
EUDI_Wallet -> Middleware : Start OID4VCI flow
Middleware -> EUDI_Wallet : Request credential presentation
EUDI_Wallet -> Middleware : Present credential
Middleware -> End_Service : Send presented credential
End_Service -> Middleware : Provide data for issuance
Middleware <-> EUDI_Wallet : OID4VCI credential issuance
Middleware -> End_Service : Notify successful issuance
@enduml
```

---
