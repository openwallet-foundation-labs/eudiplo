# Contributing to Eudiplo

Thanks for your interest in contributing to **Eudiplo** – your help is highly appreciated! 🎉

This guide will walk you through the steps to report issues, suggest features, and contribute code or documentation.

---

## 🐛 Reporting Issues

If you find a bug, glitch, or unclear behavior:

1. **Search** existing [issues](https://github.com/cre8/eudiplo/issues) to avoid duplicates.
2. If not found, **open a new issue** and include:
   - A short description
   - Steps to reproduce
   - Your environment (OS, Docker version, etc.)
   - Logs or screenshots if possible

---

## 💡 Suggesting Enhancements

Have an idea to improve Eudiplo?

- Check if a [feature request](https://github.com/cre8/eudiplo/issues) already exists
- Open a new issue with a `feature request` label and describe:
  - The problem you want to solve
  - The proposed solution
  - Alternatives considered (if any)

---

## 🔧 Development Setup

1. Fork this repo and clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/eudiplo
   cd eudiplo
   ```

2. Install dependencies (requires Node.js + Docker):
   ```bash
   pnpm install
   ```

3. Run with Docker:
   ```bash
   docker compose up
   ```

4. Use a local `.env` file for config. See the [installation guide](docs/getting-started/installation.md) for details.

---

## ✅ Pull Request Checklist

Before submitting:

- [ ] Code is tested and builds without errors
- [ ] Linting passes (`pnpm run lint`)
- [ ] You’ve added/updated documentation as needed
- [ ] PR is focused on a single topic

Please **create your PR against the `main` branch**.

---

## 📚 Documentation Contributions

Docs are in the `docs/` folder and use [MkDocs](https://www.mkdocs.org/). To preview locally:

```bash
pip install mkdocs
mkdocs serve
```

---

## 🙌 Community & Conduct

We follow a [Code of Conduct](CODE_OF_CONDUCT.md) to foster an inclusive and respectful environment. Please be kind and constructive.

---

## 💬 Need Help?

- Open a discussion or issue on [GitHub](https://github.com/cre8/eudiplo/issues)
- Contact the maintainers for guidance

Thanks for helping improve Eudiplo!
