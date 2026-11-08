# Browser review and test account isolation

Browser reviews use a dedicated, non-contributing test identity with no admin permissions. Use a fresh browser context and disposable headphone, EQ and listening fixtures. Keep account provisioning details and browser state outside the repository.

The contribution policy blocks administrator and layout-test identities from writing participant contributions. Official ranking and music vote calculations exclude administrative test activity. A dedicated test account can exercise consent UI without sending data to research, public rankings, community voting or participant Sync.

Production checks should verify the gate and contribution rejection with synthetic fixtures. Local reviews can use the [disposable setup](LOCAL_SETUP.md). Review the recorded [deployment state](../LIVE_STATE.md) before any production testing.
