# API Reference

EUDIPLO exposes a REST API based on the OpenAPI 3.0 standard. This interface
allows systems to issue credentials, verify presentations, manage keys, and
configure credential behavior through standard HTTP endpoints.

The documentation also includes a [rendered OpenAPI specification](./openapi.md).

## OpenAPI Endpoints

When running EUDIPLO, the following endpoints are available:

- **Swagger UI**: [http://localhost:3000/api](http://localhost:3000/api)
- **OpenAPI Spec (JSON)**:
  [http://localhost:3000/api-json](http://localhost:3000/api-json)

!!! Info

    By default it will only include the endpoints that are relevant to interact with
    it from the server side (it is excluding the routes that are relevant for e.g.
    OID4VCI and OID4VP). To generate the full OpenAPI specification, you can set the
    environment variable `SWAGGER_ALL` to `true` when starting the service like `SWAGGER_ALL=true pnpm run start:dev`.

You can use this OpenAPI specification to generate client libraries with e.g the
[OpenAPI Generator](https://openapi-generator.tech/).
