[![Build Status](https://github.com/cre8/eudiplo/actions/workflows/ci.yml/badge.svg)](https://github.com/cre8/eudiplo/actions)
![License](https://img.shields.io/github/license/cre8/eudiplo)
[![Website](https://img.shields.io/badge/website-eudiplo-blue)](https://cre8.github.io/eudiplo/)
[![Documentation](https://cre8.github.io/eudiplo/compodoc/images/coverage-badge-documentation.svg)](https://cre8.github.io/eudiplo/compodoc/coverage.html)

# EUDIPLO – Your Diplomatic Layer for EUDI Wallet Integration

**EUDIPLO** is a lightweight, open-source middleware that acts as a **protocol
translator** between your backend service and **EUDI Wallets**.

---

## ✨ Features

- 🔐 Supports OID4VCI, OID4VP, SD-JWT VC, and OAuth Token Status List
- 🧱 JSON-based credential configuration
- 🗃️ Pluggable database and key management
- 📦 Runs via Docker with `.env` config
- 🚫 Privacy by design – no external calls

---

## 🚀 Quickstart

```bash
docker run --env-file .env -v $(pwd)/config:/app/config ghcr.io/cre8/eudiplo:latest
```

See the full
[Installation Guide](https://cre8.github.io/eudiplo/getting-started/installation)
for details and environment variables.

---

## 📚 Documentation

- [Getting Started](https://cre8.github.io/eudiplo/getting-started/installation/)
- [Architecture](https://cre8.github.io/eudiplo/architecture/overview/)
- [Supported Protocols](https://cre8.github.io/eudiplo/#supported-protocols)

---

## 🤝 Contribute

We welcome contributions from wallet providers, institutions, and developers.
See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 License

Apache 2.0 — see [LICENSE](LICENSE)
