# Install OpenMotion from source

For an Agent asked to install OpenMotion from this repository, use the source installation below. This is the default repository installation route. Only use npm installation when the user explicitly selects it; follow the [published application guide](docs/install.md) instead of mixing source and package setup. npm remains required to install this checkout's locked dependencies and build Studio.

## Codex: automatic source installation

Collect OS/CPU, Git, Node.js/npm and the current host once. Source validation uses Node.js 26.11.1. Codex must support `codex plugin add`. Preserve projects, credentials, unrelated plugins and MCP configuration. Configure only the current host.

Before running the installer, including setup from an existing checkout, export `OPENMOTION_ONBOARDING_LANGUAGE` in the same shell. Derive it from the latest user request's language, not the OS or host UI language. Supported codes are `zh`, `en`, `ja`, `ko`, `fr`, `es` and `pt`; normalize locale tags to their lowercase primary code and use `en` for unsupported languages. For a Chinese request, run `export OPENMOTION_ONBOARDING_LANGUAGE=zh` before the commands below so the welcome/cards are prepared in Chinese.

```sh
curl -fsSL https://raw.githubusercontent.com/nexu-io/openmotion/main/install.sh -o /tmp/openmotion-source-install.sh
bash /tmp/openmotion-source-install.sh
```

`OPENMOTION_INSTALL_DIR` selects a persistent empty absolute destination. The script downloads one shallow snapshot, installs locked dependencies, builds Studio once, registers the local plugin, probes MCP and prepares the template library. Do not separately run npm start, install dependencies again or inspect unrelated repositories.

If the intended checkout already exists, inspect its remote, version and local changes first, then run `bash scripts/install-motion.command` from that checkout. Preserve an active or foreign source; never overwrite it or silently switch installations. Preserve an existing `MOTION_DATA_DIR` and use the same workspace for Studio and MCP. Keep projects and credentials outside the checkout. Read the checkout's AGENTS.md before repository changes.

Command-local Git LFS overrides keep optional media as pointers even when global LFS configuration is stale. No global Git configuration is changed. A read-only source check runs before dependency work; unknown inventory or installed-source conflicts stop with a concrete recovery instruction. See [clone size and optional media](docs/repository-storage.md).

The installer saves phase timings and an immutable onboarding receipt under `.artifacts/install/`. Complete onboarding in the same turn: open the real library once, publish the prepared HTML into the current chat's permitted visualization directory, then deliver `inlinePresentation.welcomeMarkdown` followed by its returned content reference. Only the three frozen selections are embedded, with complete silent project previews and posters. Library opening needs no inventory or playback audit. A queued host refresh uses the saved recovery command without reinstalling or resampling. Presentation and automatic current-chat MCP activation are independent: missing host control does not block the HTML cards, and visible cards do not prove automatic activation. Never enqueue internal instructions as another user message. Download time depends on the network.

## Other local hosts: source and MCP

Use Git, npm and Node.js 26.11.1:

```sh
git -c filter.lfs.process= -c filter.lfs.smudge= -c filter.lfs.required=false clone --depth 1 --single-branch --branch main https://github.com/nexu-io/openmotion.git
cd openmotion
npm ci
npm run build:studio
npm start
```

Open the actual studioUrl or previewUrl printed at startup. Follow [manual MCP configuration](README.md#manual-mcp) and the [host adapter guide](docs/agent-adapters.md) to connect this checkout's mcp.ts and the same data directory. Source preview/export also need working Chrome/Chromium and FFmpeg/ffprobe; see [runtime setup](docs/usage.md). Merely starting Studio does not register an Agent connection.

## Verify installation and deliver onboarding

For the default five-entry pool, `inlinePresentation.status=prepared` supplies an integrity-locked self-contained document containing only the selected three projects' prebuilt WebM (VP9)/JPEG bytes and card metadata. Installation does no rendering or preview download. These silent project renders are distinct from the original reference films. The native App remains an alternative for original-reference playback; explicit original-reference document requests return `native_required`. Preserve the frozen IDs and order for either adapter.

Discover the installed tools and call openmotion_get_project to verify the expected workspace. Registration or an independent probe alone does not prove this chat loaded the tools. Record automatic activation separately from visible welcome/card delivery. Keep installed files, MCP access and host presentation results distinct.

Follow the [shared onboarding contract](docs/install-onboarding.md#installation-success-reply): open the library without creating a project, publish the prepared document and stream its welcome followed by the returned card content reference in the final reply. Record visible presentation separately from automatic activation, which needs discovery and a same-chat workspace read. If neither inline nor native cards can be delivered, use only the maintained three-paragraph welcome fallback and retain the actual blocker in diagnostics. Do not create a video, export or call paid models as part of installation.
