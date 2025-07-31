# API Reference

EUDIPLO exposes a REST API based on the OpenAPI 3.0 standard. This interface
allows systems to issue credentials, verify presentations, and configure
credential behavior through standard HTTP endpoints.

## OpenAPI Endpoints

When running EUDIPLO, the following endpoints are available:

- **Swagger UI**: [http://localhost:3000/api](http://localhost:3000/api)
- **OpenAPI Spec (JSON)**:
  [http://localhost:3000/api-json](http://localhost:3000/api-json)

!!! Info

    By default it will only include the endpoints that are relevant to interact with
    it from the server side (it is excluding the routes that are relevant for e.g.
    OID4VCI and OID4VP). To generate the full OpenAPI specification, you can set the
    environment variable `SWAGGER_ALL` to `true` in your `.env` file.

You can use this OpenAPI specification to generate client libraries.

[OAD(swagger.json)]
