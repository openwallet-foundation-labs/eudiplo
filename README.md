# EUDIPLO – Your Diplomatic Layer for EUDI Wallet Integration

**EUDIPLO** is a lightweight, open-source middleware that acts as a **protocol translator** between your backend service and **EUDI Wallets**.

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

See the full [Installation Guide](https://cre8.github.io/eudiplo/getting-started/installation) for details and environment variables.

---

## 📚 Documentation

- [Getting Started](https://cre8.github.io/eudiplo/getting-started/)
- [Configuration](https://cre8.github.io/eudiplo/configuration/)
- [Supported Protocols](https://cre8.github.io/eudiplo/supported-protocols/)
- [Credential Flows](https://cre8.github.io/eudiplo/architecture/flows)

---

## 🤝 Contribute

We welcome contributions from wallet providers, institutions, and developers.
See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 License

Apache 2.0 — see [LICENSE](LICENSE)
