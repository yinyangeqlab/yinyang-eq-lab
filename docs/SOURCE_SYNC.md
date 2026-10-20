# Source and live release alignment

Application source is committed for verified live update73 (October18,2026), including top-right Welcome Settings, the /sync handshake and destination replacement, separate optional activity monitoring, and update72 service-notice controls. Both current-source references and checks are in docs/HANDOFF.md. Implementation commit: 8cf8a82a9d49229ec466f04aca8ea00fcefa0ea8.

This checkout contains the public-safe application source. Private deployment configuration, production data, recordings, numerical curve seeds and unpublished root drafts are excluded. The generic Worker handshake implementation is in lib/browser-pairing.mjs and lib/browser-sync.mjs; private infrastructure supplies authentication/context and mounts /sync. Existing source licensing and brand-scope documents remain authoritative. No additional curve/media grants or public data publication are implied.

Additive migrations0028–0030 support monitoring and browser sync. The service-notice configuration table is described by db/service-status.sql. Existing comparisons and rankings remain exploratory. GitHub publication/push is separate from the verified live deployment.
