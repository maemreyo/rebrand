# Contributing to DocRebrander

We welcome contributions to the DocRebrander project! By contributing, you help us improve and expand the capabilities of this AI-powered document processing pipeline. Please take a moment to review this guide before making your contribution.

## Table of Contents

1.  [Code of Conduct](#1-code-of-conduct)
2.  [How to Contribute](#2-how-to-contribute)
    *   [Reporting Bugs](#reporting-bugs)
    *   [Suggesting Enhancements](#suggesting-enhancements)
    *   [Submitting Pull Requests](#submitting-pull-requests)
3.  [Development Setup](#3-development-setup)
4.  [Coding Guidelines](#4-coding-guidelines)
5.  [Commit Message Guidelines](#5-commit-message-guidelines)
6.  [License](#6-license)

## 1. Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [your-email@example.com].

## 2. How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on the [GitHub Issues page](https://github.com/your-repo/docrebrander/issues). When reporting a bug, please include:

*   A clear and concise description of the bug.
*   Steps to reproduce the behavior.
*   Expected behavior.
*   Screenshots or error messages if applicable.
*   Your operating system and browser version.

### Suggesting Enhancements

We love new ideas! If you have a suggestion for an enhancement, please open an issue on the [GitHub Issues page](https://github.com/your-repo/docrebrander/issues). Describe your idea clearly and explain why it would be beneficial to the project.

### Submitting Pull Requests

1.  **Fork** the repository.
2.  **Clone** your forked repository to your local machine.
3.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/your-feature-name` or `git checkout -b bugfix/your-bug-fix`.
4.  **Make your changes** and ensure they adhere to the [Coding Guidelines](#4-coding-guidelines).
5.  **Test your changes** thoroughly.
6.  **Commit your changes** using the [Commit Message Guidelines](#5-commit-message-guidelines).
7.  **Push your branch** to your forked repository: `git push origin feature/your-feature-name`.
8.  **Open a Pull Request** to the `main` branch of the original repository. Provide a clear description of your changes.

## 3. Development Setup

To set up your local development environment, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/docrebrander.git
    cd docrebrander
    ```
2.  **Install dependencies (using pnpm):**
    ```bash
    pnpm install
    ```
3.  **Set up environment variables:** Create a `.env.local` file in the root directory and add your `NEXT_PUBLIC_GEMINI_API_KEY` and other necessary environment variables as specified in `.env.example`.

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 4. Coding Guidelines

*   Adhere to the existing code style and conventions.
*   Write clear, concise, and well-commented code.
*   Ensure your code is type-safe (TypeScript).
*   Follow the [Separation of Concerns](#separation-of-concerns) principle.
*   Implement robust error handling.

### Separation of Concerns

Maintain a clear separation between logic (business logic), presentation (UI/view), and data access layers. Modules should have single responsibilities.

## 5. Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for commit messages. This helps with automated changelog generation and understanding the history of the project.

Examples:

*   `feat: Add new document processing flow`
*   `fix: Correct PDF generation error`
*   `docs: Update contributing guidelines`
*   `refactor: Improve adapter performance`

## 6. License

By contributing to DocRebrander, you agree that your contributions will be licensed under its [MIT License](LICENSE).
