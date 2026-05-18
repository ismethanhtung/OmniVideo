# [FAST-OPS-006] Notify When Background Tasks Finish

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
- Task ID: FAST-OPS-006
- Phase: FAST
- Target Phase: Runtime observability UX
- Domain: Operations / Progress Center
- Task Type: Feature
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Finished jobs such as transcript translation and workspace flows already appear in `Background Progress`, but users can miss completion if they are not watching the modal.
- Desired behavior: visible in-app completion feedback while OmniVideo is open, and OS/browser notifications when OmniVideo is in a background tab and notification permission has been granted.

## 3. Scope
- In scope:
  - detect task transitions from active to finished;
  - show top-right in-app completion toasts while the document is visible;
  - show browser notifications while the document is hidden and permission is already granted;
  - provide a user-triggered control to request browser notification permission.
- Out of scope:
  - server-side push notifications;
  - notifications for historical persisted tasks loaded after refresh;
  - redesigning the entire notification system.

## 4. Acceptance Criteria
1. A task that transitions from running/queued to success or failed produces one completion notification only.
2. While the OmniVideo tab is visible, completion feedback appears as an in-app toast.
3. While the OmniVideo tab is hidden and browser notification permission is granted, completion feedback uses a browser notification instead of an in-app toast.
4. Hydrated historical finished tasks do not create fresh notifications on page load.
5. Users can explicitly enable browser notifications from the Progress modal when the API is available.
6. After permission is granted, users can send a test browser notification from the Progress modal and see an explanation that real background notifications fire when tasks finish.

## 5. Technical Plan
1. Add a reusable completion-notification hook around the existing progress snapshot stream.
2. Render a lightweight toast stack in `Topbar` and expose notification-permission controls in `ProgressModal`.
3. Add regression tests for transition detection and notification routing.

## 6. Test Plan
1. Unit-test completion transition detection and duplicate suppression.
2. Unit-test visible-tab toast vs hidden-tab browser notification routing.
3. `npm run test -- --run src/lib/ui/progress-notifications.test.ts src/components/layout/topbar.test.ts`
4. `npm run build`
5. `npm run guard:version`

## 7. Changelog Note
- Background Progress now announces newly finished tasks with in-app toasts and optional browser notifications.

## 8. Execution Notes
- Browser notifications require explicit user permission, so the system-notification path is best-effort rather than automatic on first use.
- Follow-up validation showed that `Notifications enabled` alone is easy to misread as an immediate proof of delivery, so the modal now includes a direct test button and explanatory copy.

## 9. Test Evidence
- `npm run test -- --run src/lib/ui/progress-notifications.test.ts src/components/layout/topbar.test.ts` ✅
- `npm run build` ✅
  - Existing repo warning remains: ESLint circular-config serialization warning during build output.
- `npm run guard:version` ✅
- `git diff --check` ✅
