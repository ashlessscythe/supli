# Vendored `braces@3.0.4`

Temporary security backport of [micromatch/braces#82](https://github.com/micromatch/braces/pull/82)
(`1f11eb558be9ea0cda87861408bb766e2e714086`) while upstream has no published
release past `3.0.3` for [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

- Source lives in this directory (runtime files only).
- Install resolves `vendor/braces-3.0.4.tgz` via a direct dependency and npm
  override (`"braces": "file:vendor/braces-3.0.4.tgz"`). The tarball form avoids
  broken relative `file:` directory symlinks under nested consumers.

Rebuild the tarball after editing sources:

```bash
npm pack --pack-destination ..
```

Remove the vendor folder, tarball, dependency, and override once npm publishes a
patched `braces` release (expected `>=3.0.4`).
