# Proposed update197 Time Travel rollout policy

This proposal is for owner review. It covers one rollout from the verified update197 deployment to the update198 Version page link fix. The fix restores the published update196 GitHub release and tagged source links. Migration 0046 remains the live schema, and the guide PDFs retain their current links, revisions, filenames, and bytes.

## Recovery coverage

The existing encrypted off-device recovery point covers update196's schema. Update197 added the companion grants table and its index. The offline DDL rehearsal reproduced the current schema, and a read-only Cloudflare request confirmed that the production database provides a Time Travel bookmark.

An approved Time Travel bookmark provides provider-native point-in-time recovery for the production D1 database. Cloudflare's lookup returns the closest available bookmark at or before a timestamp. The guard verifies the pinned bookmark against that lookup and checks that the Worker still uses the expected database. A production restore would revert database contents and requires a separate owner decision. [Cloudflare Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) · [Bookmark API](https://developers.cloudflare.com/api/resources/d1/subresources/database/subresources/time_travel/methods/get_bookmark/)

The provider's retention is seven days on Workers Free and 30 days on Workers Paid. This proposal sets a 24-hour maximum approval window from the bookmark timestamp. The shorter window limits how long this single rollout can rely on the provider copy and fits either published retention period. [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

## Evidence for the reviewed rollout

- Keep the update196 encrypted recovery point and its existing hosted validation record. The guard verifies those receipts against the existing recovery pin.
- Use the normal reviewed candidate package and a saved Pulumi plan. The guard binds the approval to the candidate commit, the plan hash, the production account, database and Worker, the active deployment ID, and the exact migration receipt. It accepts one update to the existing application Worker with changes to its code and assets. It verifies the asset routing rule and hashes the packaged guide assets, including the existing PDFs.
- Choose an available bookmark using Cloudflare's timestamp lookup at or after update197's deployment verification. The guard looks up the bookmark again at the approved timestamp. It also checks the ordering across the update196 and update197 deployment timestamps, re-reads the live D1 schema, and compares the active Worker with the private deployment receipt.
- Record the owner's explicit approval for this exact rollout in the private recovery directory. The approval file and saved plan use owner-only permissions. Keep the bookmark, target identifiers and live evidence outside Git. This proposal creates no approval file.

The private approval filename is `update197-time-travel-approval.json` under the existing owner backup-v2 directory. The guard expects these fields.

| Field | Reviewed value |
| --- | --- |
| `kind` | `update197-d1-time-travel-v1` |
| `sourceCommit`, `candidateCommit` | The verified update197 source and the clean, reviewed update198 candidate commit |
| `planSha256`, `schemaReceiptSha256` | SHA-256 of the exact plan and the original private migration receipt |
| `accountId`, `databaseId`, `scriptName`, `deploymentId` | The verified production target and update197 deployment |
| `bookmark`, `bookmarkAt` | Exact result and requested UTC timestamp from the approved Cloudflare lookup |
| `approvedAt`, `expiresAt` | UTC approval and expiry timestamps. Expiry must fall within 24 hours of `bookmarkAt` |

## Rollout and records after approval

Integrate the guard with the update198 link fix for the final review. After preparing the exact candidate and saved plan, use the candidate's existing launcher from the production stack directory for a read-only check under the recovery lock.

```sh
DEPLOY_BUILD_ROOT="$release" bash "$release/scripts/deploy-reviewed.sh" --check "$workspace" "$plan"
```

A later, separately authorized apply uses the same launcher and exact plan. The guard checks the evidence again inside the Pulumi invocation. Before recording the rollout, verify the active Worker, both update196 links, and the three guide PDF URLs, filenames, and hashes against their current receipts.

The rollout receipt records `deploymentVerification.timeTravelRecoveryUsed: true` and an empty migrations array. Carry forward the off-device gap in the new release record with `schemaRecoveryDeferred: true`, `previousSchemaUpdate: 196`, and `timeTravelRolloutFrom: 197`. Preserve update197's original deployment receipt. The scheduled runner remains subject to its existing schema checks, and another rollout still requires a verified recovery handoff. Keep the operational bookmark out of the public records.
