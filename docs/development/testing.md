# Testing

EUDIPLO is designed to be robust and easy to test both in development and CI
environments. This guide outlines how to run, write, and automate tests for the
project.

The current focus is on end-to-end (E2E) tests, which verify the overall
functionality of the application.

---

## E2E Tests

Right now EUDIPLO has only implemented end-to-end (E2E) tests that are stored in
the `/test` folder. These tests are designed to verify the overall functionality
of the application, including interactions with external services like the EUDI
Wallet.

The following command will run the E2E tests and also provide a coverage report:

```bash
pnpm run test:e2e
```

It is also accessible via
[codecov](https://app.codecov.io/github/openwallet-foundation-labs/eudiplo/tree/main).

During writing E2E tests, you can use it in watch mode to automatically re-run
tests on file changes:

```bash
pnpm run test:e2e:watch
```

---

## Linting

Before pushing code, check linting rules and fix them:

```bash
pnpm run lint
```

---

## GitHub Actions

Tests run automatically on every push to `main` or pull request via GitHub
Actions.

You can find the workflow config in `.github/workflows/ci.yml`.

---

## Running Tests Locally

To run all unit and integration tests locally:

```bash
pnpm run test
```

Or with watch mode:

```bash
pnpm run test:watch
```

This uses [Vitest](https://vitest.dev) under the hood, which is configured for
NestJS.

---

## Test Coverage

To check code coverage:

```bash
pnpm run test:cov
```

This generates a report in the `/coverage` folder. Open `coverage/index.html` in
your browser to view it.

---

## Test Structure

Tests are located next to their implementation files:

```bash
src/
  service/
    my.service.ts
    my.service.spec.ts  <-- Test file
```

Use `.spec.ts` naming to ensure Vitest picks up the test files automatically.

## 💡 Tips

- Keep unit tests isolated; mock dependencies using tools like `vitest.mock()`
  or NestJS's testing module.
- For HTTP integration tests, use
  [supertest](https://github.com/visionmedia/supertest).
- For mocking external APIs (e.g., Vault or Keycloak), consider
  [`nock`](https://github.com/nock/nock).

---

Happy testing! 🚀
