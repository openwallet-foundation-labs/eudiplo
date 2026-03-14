# API Reference

EUDIPLO exposes a REST API based on the OpenAPI 3.0 standard. This interface
allows systems to issue credentials, verify presentations, manage keys, and
configure credential behavior through standard HTTP endpoints.

The documentation also includes a [rendered OpenAPI specification](./openapi.md).

## OpenAPI Endpoints

When running EUDIPLO, the following endpoints are available:

- **Management API Swagger UI**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Protocol API Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Management API Spec (JSON)**: [http://localhost:3000/api/docs-json](http://localhost:3000/api/docs-json)
- **Protocol API Spec (JSON)**: [http://localhost:3000/docs-json](http://localhost:3000/docs-json)

!!! Info

    The API is split into two OpenAPI documents:

    - **Management API** (`/api/docs`): Endpoints for managing credentials, sessions, keys, and configurations (requires authentication).
    - **Protocol API** (`/docs`): Wallet-facing protocol endpoints for OID4VCI, OID4VP, and related standards (public).

    Because all management endpoints share the `/api/` prefix, a reverse proxy
    (e.g. nginx) can enforce additional network-level protections such as IP
    allowlisting on management routes while keeping protocol endpoints publicly
    accessible:

    ```nginx
    location /api/ {
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://backend:3000;
    }
    ```

You can use this OpenAPI specification to generate client libraries with e.g the
[OpenAPI Generator](https://openapi-generator.tech/).
