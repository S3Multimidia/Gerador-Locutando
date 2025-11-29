# AI Instructions for Version Control

## Versioning Protocol

**CRITICAL RULE**: Whenever you make changes to the codebase that affect functionality, UI, or logic, you **MUST** update the version number in `package.json`.

### How to Update
1.  Read `package.json` to get the current version.
2.  Increment the version number according to Semantic Versioning (SemVer):
    -   **Patch** (x.x.X): Bug fixes, minor UI tweaks, refactoring.
    -   **Minor** (x.X.x): New features, significant changes.
    -   **Major** (X.x.x): Breaking changes, complete rewrites.
3.  Update the `version` field in `package.json`.

### Example
If current version is `1.0.1` and you fix a bug:
-   New version: `1.0.2`

If current version is `1.0.1` and you add a new page:
-   New version: `1.1.0`

## Why?
This ensures that the deployed application and the user know exactly which version is running and that the AI is tracking the evolution of the project.
