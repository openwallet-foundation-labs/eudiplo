# Testing

EUDIPLO is designed to be robust and easy to test both in development and CI environments. This guide outlines how to run, write, and automate tests for the project.

---

## 🧪 Running Tests Locally

To run all unit and integration tests locally:

```bash
pnpm run test
```

Or with watch mode:

```bash
pnpm run test:watch
```

This uses [Jest](https://jestjs.io/) under the hood, which is configured for NestJS.

---

## ✅ Test Coverage

To check code coverage:

```bash
pnpm run test:cov
```

This generates a report in the `/coverage` folder. Open `coverage/index.html` in your browser to view it.

---

## 🐳 Docker-Based Testing

For end-to-end testing with dependent services (e.g., PostgreSQL, Vault), use Docker Compose:

```bash
docker compose -f docker-compose.test.yml up --build
```

Make sure your `.env` points to the test configuration or override values in `docker-compose.test.yml`.

---

## 🧩 Test Structure

Tests are located next to their implementation files:

```
src/
  service/
    my.service.ts
    my.service.spec.ts  <-- Test file
```

Use `.spec.ts` naming to ensure Jest picks up the test files automatically.

---

## 🧼 Linting

Before pushing code, check linting rules and fix them:

```bash
pnpm run lint
```

---

## 🔁 GitHub Actions

Tests run automatically on every push to `main` or pull request via GitHub Actions.

You can find the workflow config in `.github/workflows/ci.yml`.

---

## 💡 Tips

- Keep unit tests isolated; mock dependencies using tools like `jest.mock()` or NestJS's testing module.
- For HTTP integration tests, use [supertest](https://github.com/visionmedia/supertest).
- For mocking external APIs (e.g., Vault or Keycloak), consider [`nock`](https://github.com/nock/nock).

---

Happy testing! 🚀
