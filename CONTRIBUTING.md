# Contributing to ZeroCheck AI (yte-agent)

Thank you for your interest in contributing to ZeroCheck AI! We welcome contributions to help improve healthcare compliance validation, XML 130 verification rules, and medical knowledge retrieval.

## How to Contribute

### 1. Reporting Issues
- Use GitHub Issues to submit bug reports or feature requests.
- Provide a clear description, steps to reproduce, and sample data (ensure all patient data is anonymized or mocked).

### 2. Development Setup
ZeroCheck AI is organized as a monorepo with three core components:

- **AI Validation API (`api-validation/`)**:
  - Runtime: .NET 10 SDK, PostgreSQL with `pgvector`.
  - Commands:
    ```bash
    cd api-validation/AIValidation.Api
    dotnet restore
    dotnet build
    dotnet test ../AIValidation.Tests
    ```
- **Web Admin (`web-admin/`)**:
  - Runtime: Node.js 20+, Angular 20.
  - Commands:
    ```bash
    cd web-admin
    npm install
    npm start
    ```
- **Chrome Extension (`extension-his/`)**:
  - Runtime: TypeScript, Vite.
  - Commands:
    ```bash
    cd extension-his/extension
    npm install
    npm run build
    ```

### 3. Pull Request Guidelines
- Branch naming: `feature/<feature-name>` or `fix/<issue-number>`.
- Never commit real patient data, credentials, or private keys.
- Ensure all automated unit tests pass before opening a PR.
- Follow existing code style and naming conventions.

## Community & Code of Conduct
Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all project interactions.
