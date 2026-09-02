# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-09-02

### Added

- `freeEncoders()` to release cached tiktoken encoders and their WASM memory.
- `CHANGELOG.md` and a GitHub Actions CI workflow (test and build on Node 20).
- `homepage`, `bugs`, `sideEffects: false` and `engines.node >= 18` in `package.json`.

### Changed

- Encoders are now cached in a module-level map keyed by model or encoding instead of being created and freed on every `fitMessages()` call.
- Requires `@jeremysnr/snug` ^0.2.0.
- Documentation corrected: with no `model` the `cl100k_base` encoding is used (the README previously said the default was `gpt-4o`); `gpt-4o` and newer use `o200k_base`, so pass the model you will call. The four-token per-message overhead is documented as a cookbook heuristic rather than an exact figure.

## [0.1.1] - 2026-04-06

Initial release, published to npm as `@jeremysnr/snug-openai`. The repository history begins at this version.

### Added

- `fitMessages(messages, options)` for OpenAI `ChatCompletionMessageParam[]`: system messages always kept, other messages prioritised by recency, counted with tiktoken.

[Unreleased]: https://github.com/JeremySNR/snug-openai/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/JeremySNR/snug-openai/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/JeremySNR/snug-openai/releases/tag/v0.1.1
