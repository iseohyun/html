# System Level AI Rules

## Permanent Workspace System Rules
1. **Git Push Halt**: HALT all automatic `git push`. Only perform local `git commit`. Push to `origin` or merge to `main` ONLY upon explicit user request.
2. **Explicit Version Bump**: Do NOT update version files (`version.md`, `changelog.json`) automatically. Update version numbers ONLY when explicitly instructed by the user.
3. **Mandatory Auto-Accepted Summary**: Always append `### 📋 Auto-Accepted Actions` at the bottom of EVERY response summarizing tool calls or write `- 없음`.
4. **Scope Isolation**: NEVER modify `c:\git\html\small-project\janggi\` folder.
