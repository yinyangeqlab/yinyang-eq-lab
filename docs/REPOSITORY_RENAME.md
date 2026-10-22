Source-link deployment verified with update110 on October 22, 2026: the canonical repository and bug-report links are live. The rename itself remains the original in-place maintenance commit described below; no history, video repository, protected media or data backup was replaced. See docs/releases/update110-verification.json.

# Repository branding — October 21, 2026

Canonical source: [yinyangeqlab/yinyang-eq-lab](https://github.com/yinyangeqlab/yinyang-eq-lab).
The product is **YinYang EQ**, by **Yin Yang EQ Lab**. The former source repository
name was `yinyang-eq-league`; this is an in-place rename of the same repository,
not a second application or a new history. Existing issues, release tags and
download filenames are retained. Do not recreate the old repository name:
GitHub's redirects keep old source, issue and release links working.

The separate [video repository](https://github.com/yinyangeqlab/yinyangeqlab.github.io)
contains public promotional videos and soundtrack credits. Its name and
`https://yinyangeqlab.github.io/` URLs stay unchanged. Its clearer description
identifies the canonical application source. No video content or Pages build
is changed by this maintenance; existing application links there use GitHub's
repository redirect.

Current documentation, source/bug-report links and clone instructions use the new
repository URL. Package metadata uses `yinyang-eq-lab`, with the existing version,
dependency lock and Apache-2.0 licensing retained. Historical handoffs, recorded
release manifests, compiled output and release asset filenames retain their
original provenance. Immutable snapshots, backups, participant data and protected
media are unchanged. Lab identity hooks remain in place.

The live site remains **0.2.0-beta.1 / update109**, implementation
`69289ddfc819b443c9b6e2a882c74699d4ef65ea`. No application build, deployment,
database export, new data snapshot or backup-baseline handover is performed.
Source-only URL updates take effect in the UI at a future authorized deployment;
the current deployed links continue through GitHub's redirects.

Active development remotes use the renamed repository. Historical/immutable
checkout remotes are retained as provenance and still resolve through redirects.
Use the scrubbed main history for future publication. The canonical dirty
checkout is not pulled or reset; unrelated work and its index are preserved.

GitHub documents repository redirects and exceptions in its
[rename guidance](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).
