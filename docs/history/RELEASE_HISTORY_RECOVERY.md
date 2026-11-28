# Release history recovery

The first recorded Cloudflare deployment succeeded on October 16, 2026, Pacific time. The Version page uses the original infrastructure operation numbers for updates 1–101 and the application’s release records starting with update102. The early history includes unsuccessful deployment attempts and infrastructure imports because those operations also used sequence numbers. Later provider operation numbers can differ from application update numbers.

[The earliest published Git commit](https://github.com/yinyangeqlab/yinyang-eq-lab/commit/239ce0d146dbfc4316a1c454341c3d6dcf2796d4) is dated October 17, 2026. The original source revision of update1 is unknown. The October 17 GitHub demo and mobile releases are separate publications.

The Version page links to published source where the release evidence supports a link. Some historical links point to the reviewed public copy of the source. The deployment and recovery records preserve the original revisions and their evidence. A release can have public source, compiled Worker modules, a source-only encrypted recovery point, or an encrypted data snapshot. Each covers different inputs.

The recovered update1 checkpoint contained the Worker entry point and 67 compiled modules. Their checksums were recorded in a private recovery inventory. The historical static-asset directory, original source tree and matching database backup for update1 still lack verified copies. The recovered modules are a partial build, and the first update’s checkpoint cannot supply those missing inputs.

Historical backup receipts describe what was verified at the time. Use the [current encrypted recovery procedures](../ENCRYPTED_BACKUP.md) to establish what is still available before using an older recovery point. Follow the [data recovery and deletion review](../RECOVERY.md) before any import.
