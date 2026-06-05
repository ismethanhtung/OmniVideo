# FAST-UX-028 Add Command-click open behavior to Inspiration Vault

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-UX-028
- Phase: P2
- Target Phase: P2
- Domain: UX / Inspiration Vault
- Task Type: Bugfix
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Review

## 2. Context

- Ly do: User wants normal click on Inspiration Vault content to keep copying, while Command+Click opens the saved URL in a new tab.
- Bai toan can giai quyet: support modifier-click navigation without regressing the existing click-to-copy behavior.
- Tai lieu lien quan: `src/features/inspiration-vault/inspiration-vault-panel.tsx`.

## 3. Scope

- In scope: content-cell click handler, source-level regression test, version/changelog/board updates.
- Out of scope: changing vault data model, adding edit actions, changing non-URL item behavior.

## 5. Acceptance Criteria

1. Plain click on Inspiration Vault content still copies `item.raw`.
2. Command+Click on URL content opens the URL in a new tab.
3. Ctrl+Click also opens the URL in a new tab for non-mac keyboard parity.
4. Command+Click on non-URL content falls back to copy.
5. Regression test is updated for the modifier-click behavior.

## 6. Technical Plan

1. Add URL parsing helper for vault raw content.
2. Update content button click handler to branch on `metaKey` or `ctrlKey`.
3. Update Inspiration Vault panel test, changelog, board, and version.

## 7. Test Plan

1. Run `npm run test -- --run src/features/inspiration-vault/inspiration-vault-panel.test.ts`.
2. Run `npm run guard:version`.
3. Run `git diff --check`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  `src/features/inspiration-vault/inspiration-vault-panel.test.ts`
- Test commands executed:
  `npm run test -- --run src/features/inspiration-vault/inspiration-vault-panel.test.ts`
  `npm run guard:version`
  `git diff --check`
- Test results summary:
  Pass (1 file / 3 tests), version guard pass, diff check pass.
