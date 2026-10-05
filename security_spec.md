# Security Specification — Cheran Foods Firestore Rules

## 1. Data Invariants

1. **Default-Deny Catch-All**: All paths not explicitly matched in `/databases/{database}/documents` are unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity & Admin Authority**:
   - All mutating operations require `request.auth != null` and `request.auth.token.email_verified == true`.
   - Administrative operations on `/menuItems/{itemId}` and `/stockLogs/{logId}` require `isAdmin()`, which verifies `email_verified == true` and either existence of `/admins/$(request.auth.uid)` or the bootstrapped runtime admin email (`lalithmurugan57@gmail.com`).
3. **Path Variable Hardening**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates its document ID with `isValidId(id)` (`size >= 1 && size <= 128 && matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Strict Blueprint Schema & Anti-Update-Gap**:
   - Every `create` and `update` invokes `isValidMenuItem(incoming())`, `isValidFeedback(incoming())`, `isValidStockLog(incoming())`, or `isValidAdminRole(incoming())`.
   - Every string field enforces exact `minLength` and `maxLength` bounds from `firebase-blueprint.json`.
   - Every update uses action-based `incoming().diff(existing()).affectedKeys().hasOnly(...)` gates, preserves immutable `createdAt` / `authorUid` fields, and requires `incoming().updatedAt == request.time`.
5. **Relational & Atomic Consistency (`exists` / `existsAfter`)**:
   - Creating a `/stockLogs/{logId}` entry requires that the referenced `/menuItems/$(incoming().itemId)` exists (`exists(...) || existsAfter(...)`) and that `incoming().adminUid == request.auth.uid`.
6. **Secure List Queries (Query Enforcer)**:
   - No blanket `allow list: if true;` or `allow list: if isSignedIn();`.
   - `/menuItems` list requires `resource.data.priceInr > 0`.
   - `/feedbacks` list requires `resource.data.rating >= 1`.
   - `/stockLogs` list requires `isAdmin() && resource.data.adminUid == request.auth.uid`.
   - `/admins` list is strictly forbidden (`allow list: if false;`).

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 — Unverified Email Spoof on Admin Menu Write**:
   - Target: `/menuItems/grapes-stick` (`update`)
   - Auth: `{ uid: "spoof1", token: { email: "lalithmurugan57@gmail.com", email_verified: false } }`
   - Expected: `PERMISSION_DENIED`
2. **Payload 2 — Shadow Field Injection on MenuItem Create**:
   - Target: `/menuItems/grapes-stick` (`create`)
   - Payload includes required keys plus `"isSuperFeatured": true`.
   - Expected: `PERMISSION_DENIED` (blocked by `data.keys().hasOnly(...)`).
3. **Payload 3 — Negative Price Poisoning on MenuItem Update**:
   - Target: `/menuItems/chocobar` (`update`)
   - Payload sets `priceInr: -50`.
   - Expected: `PERMISSION_DENIED` (blocked by `isValidMenuItem` requiring `priceInr > 0 && priceInr <= 10000`).
4. **Payload 4 — Unauthenticated Customer Feedback Creation**:
   - Target: `/feedbacks/fb-1` (`create`)
   - Auth: `null`
   - Expected: `PERMISSION_DENIED`
5. **Payload 5 — Identity Spoofing on Customer Feedback (`authorUid` mismatch)**:
   - Target: `/feedbacks/fb-2` (`create`)
   - Auth: `{ uid: "userA", token: { email_verified: true } }`
   - Payload: `{ authorUid: "userB", customerName: "Arun", favoriteItem: "Chocobar", rating: 5, comment: "Great!", createdAt: SERVER_TIMESTAMP }`
   - Expected: `PERMISSION_DENIED`
6. **Payload 6 — Out-of-Bounds Star Rating (`rating: 6`)**:
   - Target: `/feedbacks/fb-3` (`create`)
   - Payload sets `rating: 6`.
   - Expected: `PERMISSION_DENIED`
7. **Payload 7 — Resource Exhaustion String in Feedback (`comment` > 600 chars)**:
   - Target: `/feedbacks/fb-4` (`create`)
   - Payload sets `comment` to a 5,000-character string.
   - Expected: `PERMISSION_DENIED`
8. **Payload 8 — Forged Client Timestamp on Feedback Create**:
   - Target: `/feedbacks/fb-5` (`create`)
   - Payload sets `createdAt` to a past timestamp (`2020-01-01T00:00:00Z`) instead of `request.time`.
   - Expected: `PERMISSION_DENIED`
9. **Payload 9 — Immutable Field Tampering (`createdAt` modified on MenuItem Update)**:
   - Target: `/menuItems/vanilla-cup` (`update`)
   - Payload alters `createdAt` during a price update.
   - Expected: `PERMISSION_DENIED`
10. **Payload 10 — Orphaned StockLog referencing non-existent MenuItem**:
    - Target: `/stockLogs/log-999` (`create`)
    - Payload sets `itemId: "ghost-item-id"` which does not exist in `/menuItems`.
    - Expected: `PERMISSION_DENIED`
11. **Payload 11 — Self-Assigned Admin Privilege Escalation**:
    - Target: `/admins/attackerUid` (`create`)
    - Auth: `{ uid: "attackerUid", token: { email: "attacker@example.com", email_verified: true } }`
    - Payload: `{ role: "admin", createdAt: SERVER_TIMESTAMP }`
    - Expected: `PERMISSION_DENIED`
12. **Payload 12 — Path ID Poisoning with Illegal Characters**:
    - Target: `/menuItems/invalid$id!@#` (`get`)
    - Expected: `PERMISSION_DENIED` (blocked by `isValidId`).

---

## 3. Red Team Audit & Conflict Report

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning | Value Poisoning | Audit Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/menuItems/{itemId}` | Blocked (`updatedByUid == request.auth.uid` & `isAdmin()`) | Blocked (Action-based `affectedKeys().hasOnly(...)` + immutable `createdAt`) | Blocked (`isValidId(itemId)` + strict string `.size()` bounds) | Blocked (`isValidMenuItem(incoming())` wraps all updates) | **PASS** |
| `/feedbacks/{feedbackId}` | Blocked (`authorUid == request.auth.uid` & `isVerifiedUser()`) | Blocked (Immutable `authorUid`, `createdAt`; restricted update keys) | Blocked (`isValidId(feedbackId)` + `comment.size() <= 600`) | Blocked (`isValidFeedback(incoming())` wraps all updates) | **PASS** |
| `/stockLogs/{logId}` | Blocked (`adminUid == request.auth.uid` & `isAdmin()`) | Blocked (`allow update, delete: if false;` — immutable audit log) | Blocked (`isValidId(logId)` + `note.size() <= 200`) | Blocked (`isValidStockLog(incoming())` + `existsAfter` check) | **PASS** |
| `/admins/{adminUid}` | Blocked (`isAdmin()` required to grant admin) | Blocked (`allow update: if false;`) | Blocked (`isValidId(adminUid)`) | Blocked (`isValidAdminRole(incoming())`) | **PASS** |
