# Contributing to Both Sides

Thank you for your interest in contributing to the Both Sides project! This document provides guidelines and information for contributors.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd both-sides-app
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Fill in your environment variables (see ENVIRONMENT.md)
   ```

4. **Start development server:**
   ```bash
   yarn dev
   ```

## Code Quality Standards

### Before Committing
Run these commands to ensure code quality:

```bash
# Check all code quality standards
yarn check-all

# Or run individually:
yarn type-check    # TypeScript compilation
yarn lint          # ESLint checks
yarn format:check  # Prettier formatting
```

### Auto-fixing Issues
```bash
yarn lint:fix      # Fix ESLint issues
yarn format        # Format with Prettier
```

## Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear and consistent commit messages.

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Scopes
- `ui`: User interface components
- `api`: Backend API changes
- `auth`: Authentication related
- `db`: Database related
- `config`: Configuration changes
- `deps`: Dependency updates

### Examples
```bash
feat(ui): add debate room interface
fix(auth): resolve login redirect issue
docs(api): update environment setup guide
chore(deps): update Next.js to v15.4.6
```

## Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `chore/description` - Maintenance tasks

Examples:
- `feature/debate-matching-algorithm`
- `fix/authentication-redirect`
- `docs/environment-setup`

## Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat(scope): your commit message"
   ```

3. **Push to your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots for UI changes
   - Test results

### PR Requirements
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated if needed
- [ ] No merge conflicts
- [ ] Reviewed by at least one team member

## Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type when possible
- Use meaningful variable and function names

### React Components
- Use functional components with hooks
- Follow the component structure:
  ```tsx
  // Imports
  import React from 'react';
  
  // Types
  interface ComponentProps {
    // ...
  }
  
  // Component
  export function Component({ prop }: ComponentProps) {
    // Hooks
    // Event handlers
    // Render
    return (
      // JSX
    );
  }
  ```

### File Organization
```
src/
├── app/              # Next.js app router pages
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   └── ...          # Custom components
├── lib/             # Utility functions
├── types/           # TypeScript type definitions
└── utils/           # Helper functions
```

## Testing Guidelines

### Writing Tests
- Write tests for all new features
- Test both happy path and error cases
- Use descriptive test names
- Group related tests with `describe` blocks

### Running Tests
```bash
yarn test           # Run all tests
yarn test:watch     # Run tests in watch mode
yarn test:coverage  # Run tests with coverage
```

## Environment Variables

- Never commit `.env.local` or actual secrets
- Update `.env.example` when adding new variables
- Document new environment variables in `ENVIRONMENT.md`
- Use the validation system in `src/lib/env.ts`

## Getting Help

- Check existing issues and documentation first
- Ask questions in team chat or create an issue
- For bugs, provide reproduction steps and environment details
- For features, discuss the approach before implementing

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a positive development environment

Thank you for contributing to Both Sides! 🚀
