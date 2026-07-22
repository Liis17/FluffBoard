# FluffBoard — Ubiquitous language

## Terms

- **Board user** — a person allowed to sign in to FluffBoard. A board user has a local login identity and may be linked to one GitHub account and one Telegram account.
- **GitHub assignee** — the GitHub account assigned to a GitHub issue. It is the same person as the linked board user when a `GitHubLogin` is configured.
- **Telegram identity** — a numeric Telegram user ID linked to a board user. It is an identity mapping for future notifications, not an authentication method yet.
- **Task** — a GitHub issue from the board's single configured repository. Pull requests are never tasks.
- **Workflow status** — the Kanban placement of a task: `todo`, `in-progress`, or `done`. It is represented in GitHub by the corresponding label; marking a task done also closes its issue.
- **Board repository** — the one GitHub owner/repository pair configured for this FluffBoard instance.
