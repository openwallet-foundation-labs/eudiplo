# Development

This project is built with [NestJS](https://nestjs.com/), a progressive Node.js
framework for building efficient, scalable server-side applications using
TypeScript.

## Documentation with Compodoc

[Compodoc](https://compodoc.app) provides a comprehensive overview of the
codebase, including:

- Modules
- Controllers
- Services
- DTOs
- Dependencies

```bash
pnpm run compodoc:start
```

A rendered version of the build is included [here](../compodoc).

## Source Code Structure

Each module typically contains its own:

- `controller.ts` — API endpoints
- `service.ts` — Business logic
- `dto/` — Data Transfer Objects
- `entities/` — TypeORM entities (if needed)

## Additional Documentation

- [API Authentication](../api/authentication.md) - Guide for using OAuth2
  authentication with the API
- [Contributing Guidelines](contributing.md) - How to contribute to the project
- [Testing Guide](testing.md) - How to run and write tests
- [Session Logging](session-logging.md) - Understanding session logging

## Scripts

Useful development scripts:

```bash
pnpm run start:dev        # Start the app in watch mode
pnpm run test             # Run unit tests
pnpm run compodoc         # Generate Compodoc documentation
pnpm run compodoc:serve   # Serve the generated docs locally
```

> 💡 Compodoc output is stored in the `doc/compodoc` folder and served
> statically by the application.

---

## Contributions

Feel free to contribute by improving documentation, fixing bugs, or extending
functionality. Make sure to follow the coding standards and write tests where
applicable.
