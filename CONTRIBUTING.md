# Contributing to Better Context to AI

Thank you for your interest in contributing! This document outlines our development workflow and guidelines.

## Development Workflow

We use a GitFlow-inspired workflow with two main branches:

- **`master`** - Production-ready releases only
- **`develop`** - Integration branch for features

### Branch Structure
```
master (protected - releases only)
├── hotfix/urgent-bug-fix (born from master)
└── develop (protected - integration branch)
    ├── feature/improve-file-filtering
    ├── feature/add-export-formats
    └── bugfix/selection-state-persistence
```

### Working on Features

1. **Fork the repository** (for external contributors) or **clone it** (for collaborators)

2. **Create a feature branch from develop:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

3. **Work on your feature:**
   - Make your changes
   - Test thoroughly in VS Code Extension Development Host
   <!-- - Follow existing code style and patterns -->

4. **Submit a Pull Request:**
   - Target: `develop` branch
   - Include clear description of changes
   - Reference any related issues <!-- how to do this? -->
   <!-- - Ensure all tests pass --> 

### Branch Naming Conventions

- **Features**: `feature/description` (e.g., `feature/export-to-json`) **Born from develop. Name will be taken from an issue**
- **Bug fixes**: `bugfix/description` (e.g., `bugfix/selection-persistence`) **Born from develop**
- **Hotfixes**: `hotfix/description` (e.g., `hotfix/critical-memory-leak`) - **Born from master**
- **Releases**: `release/version` (e.g., `release/v1.4.0`) **Born from develop**

## Development Setup

1. **Prerequisites:**
   - Node.js 18+ 
   - VS Code
   - Git

2. **Installation:**
   ```bash
   git clone https://github.com/RoncoJhon/bettercontextoai.git
   cd bettercontextoai
   npm install
   ```

3. **Development:**
   ```bash
   # Watch for changes
   npm run watch
   
   # Test the extension
   # Press F5 in VS Code to open Extension Development Host
   ```

4. **Building:**
   ```bash
   # Compile
   npm run compile
   
   # Package for distribution
   npm run package
   ```

## Code Guidelines

### TypeScript Style
- Use TypeScript strict mode
<!-- - Prefer `const` over `let` when possible -->
- Use meaningful variable names
<!-- - Add JSDoc comments for public methods -->

### Extension Patterns
- Follow VS Code extension best practices
- Use event emitters for state changes
- Implement proper error handling
<!-- - Test with various workspace configurations -->

### File Organization
```
src/
├── extension.ts          # Main extension entry point
├── tree/                 # Tree view related classes
├── utils/               # Utility functions
└── commands/            # Command implementations
```

## Testing

### Manual Testing Checklist
- [ ] Extension activates without errors
- [ ] File selector shows correct file tree
- [ ] Selection state persists across refreshes
- [ ] Generated FILE_CONTENT_MAP.md is correct
- [ ] Context menu integration works
- [ ] Visual indicators appear in Explorer

### Before Submitting PR
- [ ] Code compiles without errors
- [ ] Extension loads in development host
- [ ] All features work as expected
- [ ] No console errors or warnings
- [ ] README updated if needed

## Pull Request Process

1. **Target the correct branch:**
   - Features/bugfixes → `develop`
   - Hotfixes → `master` (critical production issues only)

2. **PR Description should include:**
   - Clear summary of changes
   - Motivation and context
   <!-- - Testing steps -->
   - Screenshots/GIFs if UI changes

3. **Review Process:**
   - Maintainer will review within 2-48 hours
   - Address any feedback
   - Once approved, maintainer will merge

## Release Process

Releases follow this process:
1. Features are merged to `develop`
2. When ready for release, create `release/vX.X.X` branch from `develop`
3. Final testing and version bumping on release branch
4. Release branch merged to both `master` and `develop`
5. Tag created on `master` for the release

### Hotfix Process:
1. Create `hotfix/fix-name` branch from `master`
2. Fix the critical issue
3. Create PR targeting `master`
4. After merge, also merge the hotfix back to `develop`

## Getting Help

- **Questions**: Use GitHub Discussions
- **Bug Reports**: Create an issue with bug template
- **Feature Requests**: Create an issue with feature template
- **Direct Contact**: Open an issue and tag @RoncoJhon

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

Thank you for contributing! 🚀