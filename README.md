[![Build Status](https://github.com/cre8/eudiplo/actions/workflows/ci-and-release.yml/badge.svg)](https://github.com/cre8/eudiplo/actions)
![License](https://img.shields.io/github/license/cre8/eudiplo)
[![Website](https://img.shields.io/badge/website-eudiplo-blue)](https://cre8.github.io/eudiplo/)
[![Documentation Coverage](https://cre8.github.io/eudiplo/compodoc/images/coverage-badge-documentation.svg)](https://cre8.github.io/eudiplo/compodoc/coverage.html)
[![codecov](https://codecov.io/github/cre8/eudiplo/graph/badge.svg?token=pt4TLHJYrO)](https://codecov.io/github/cre8/eudiplo)

# EUDIPLO

**Your Diplomatic Layer for EUDI Wallet Integration**

EUDIPLO is an open-source middleware that bridges your backend and EUDI Wallets
using a unified API and standardized protocols.

---

## 🧭 Overview

Organizations joining the EUDI Wallet ecosystem face a tough choice: patch
together protocol libraries that may not exist for their stack, or rely on
proprietary solutions that risk vendor lock-in.

**EUDIPLO** solves this by providing a lightweight, source-available, protocol
abstraction layer. It communicates over HTTP and integrates easily with your
existing backend stack—so you can focus on your business logic, not
cryptographic plumbing.

It supports all core flows of electronic attribute attestations—**issuing**,
**requesting**, and even **requesting during issuance**—and is already
compatible with production-grade EUDI Wallets like **Animo**.

While still in early development, EUDIPLO is built for production: secure key
management, scalable database support, and clean API boundaries.

## ![Overview](./docs/overview.excalidraw.svg)

## 🧩 Features

- ✅ Supports **OID4VCI**, **OID4VP**, **SD-JWT VC**, and **OAuth Token Status
  List**
- ✅ JSON-based credential configuration
- ✅ Runs via Docker with `.env` config
- ✅ HTTP-based integration with any backend
- ✅ Secure key management & pluggable storage
- ✅ Privacy-friendly: no external calls, no long-term storage

---

## 🚀 Quick Start

```bash
docker run -p 3000:3000 \
  -e PUBLIC_URL=https://example.com \
  -e AUTH_API_KEY=a_very_secure_api_key \
  -v $(pwd)/config:/app/config \
  ghcr.io/cre8/eudiplo:1
```

📚 API:
[https://cre8.github.io/eudiplo/api/](https://cre8.github.io/eudiplo/api/)  
📦 Full setup:
[Quickstart Guide](https://cre8.github.io/eudiplo/getting-started/quick-start/)

---

## 📚 Documentation

- [Architecture](https://cre8.github.io/eudiplo/architecture/overview/)
- [Supported Protocols](https://cre8.github.io/eudiplo/architecture/supported-protocols/)
- [Compodoc](https://cre8.github.io/eudiplo/compodoc/)

---

## 🤝 Contributing

We welcome PRs from wallet developers, institutions, and contributors interested
in advancing the EUDI Wallet ecosystem.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📝 License

Licensed under the [Apache 2.0 License](LICENSE)
