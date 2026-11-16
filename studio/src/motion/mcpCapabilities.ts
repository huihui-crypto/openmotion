/** Maintained product descriptions; coverage is checked against the public MCP contract. */
export const mcpCapabilities = [
  { id: 'create', icon: 'clapperboard-line', title: 'From an idea to an editable film', description: 'Turn an idea or reference into motion graphics, product films and ads. Keep an editable project you can return to.', tools: ['openmotion_create_project', 'openmotion_edit_project'], prompt: 'Create a 15-second product film with three scenes, animated typography and an editable project. Ask me for the product and brand first.' },
  { id: 'templates', icon: 'layout-grid-line', title: 'Start with a template', description: 'Browse editable templates, brand references and creative guides. Ask your Agent to adapt a template or rebuild a reference for your brand.', tools: ['openmotion_list_templates', 'openmotion_get_template'], prompt: 'Show me OpenMotion templates for a product launch. Explain which are editable projects and which are references before creating anything.' },
  { id: 'media', icon: 'sparkling-line', title: 'Generate images, video, music and voice', description: 'Generate media with your configured models, then bring the results into your project for editing and reuse.', tools: ['openmotion_media_use'], prompt: 'Inspect my OpenMotion media providers and their guides. Find an image, video, music or speech model for my request. Explain the model and cost before generating, then track the original job.' },
  { id: 'library', icon: 'folder-open-line', title: 'Create and reuse assets', description: 'Upload or generate images, video and audio in Assets. Use direct models, in-app Codex conversations or external MCP Agents. Reference exact versions and import them into your films.', tools: ['openmotion_assets'], prompt: 'List my OpenMotion asset library. Help me generate a new asset or edit an existing version, keep the original, then import the chosen version into my project.' },
  { id: 'assets', icon: 'folder-open-line', title: 'Bring your own material', description: 'Import local images, video and audio. Keep original material and generated assets together in the project.', tools: ['openmotion_import_assets'], prompt: 'Help me import my local photos, footage and audio into the current OpenMotion project. Check each import, then ask how I want to use them.' },
  { id: 'preview', icon: 'play-fill', title: 'Edit together in the same Studio', description: 'Preview and refine your Agent’s work in Studio, or ask the Agent to keep editing the same project.', tools: ['openmotion_get_project', 'openmotion_open_preview'], prompt: 'Read my current OpenMotion project and open its latest editable preview. Keep the project identity and verify the visible result before continuing.' },
  { id: 'history', icon: 'history-line', title: 'Keep every creative direction', description: 'Browse saved versions and restore an earlier direction as a new version. Keep the history while you refine the result.', tools: ['openmotion_list_versions', 'openmotion_restore_version'], prompt: 'List versions of my OpenMotion project and explain the differences. Wait for me to choose before restoring a version.' },
  { id: 'export', icon: 'download-2-line', title: 'Deliver a finished video', description: 'Export the chosen project version to MP4 and follow its progress. Keep both the finished video and the editable project.', tools: ['openmotion_export_request', 'openmotion_export_cancel'], prompt: 'Export the agreed OpenMotion project version to MP4 with its audio. Track the same export job, review playback and give me the finished video and editable project.' },
] as const;

export const mcpBenefits = [
  { icon: 'movie-line', title: 'The workspace behind your Agent', description: 'Your Agent creates and edits through MCP. OpenMotion keeps the project, source files and assets together so each result can become the next starting point.' },
  { icon: 'history-line', title: 'Versions you can return to', description: 'Keep saved versions, revisit an earlier cut and continue from it without losing the later history.' },
  { icon: 'folder-open-line', title: 'Assets that stay with the project', description: 'Keep imported footage and generated images, clips, music and voice in the project, ready for the next edit.' },
  { icon: 'refresh-line', title: 'Continue with another Agent', description: 'Connect another compatible Agent to the same workspace. Ask it to read the saved project before continuing.' },
  { icon: 'layout-grid-line', title: 'Templates you can build on', description: 'Studio and MCP share the template catalogue. Adapt an editable project or turn a reference into your own version.' },
] as const;

export const mcpFaq = [
  ['Can I continue with another Agent?', 'Yes. Connect a compatible Agent to the same workspace and ask it to read the saved project before editing. Projects and assets can be reused; provide any conversation context it needs separately.'],
  ['Which Agents are supported?', 'Use Codex, Claude Code, Cursor, DeepSeek Harness or a desktop client that supports local stdio MCP. Choose your client above for the configuration for this installation. A configured server still needs to be verified inside the Agent.'],
  ['How do I start from a template?', 'Choose a category, preview a film, then copy its template prompt into your connected Agent. Ready-to-edit entries contain editable projects; references are rebuilt by the Agent. Opening the complete library shows the source, creative guide and available project files.'],
  ['Can I generate images, video, music and voice in one project?', 'Yes, when your configured providers support those media types. Ask the Agent to inspect the available models, generate the assets and arrange them in your project. Each model has its own inputs, limits and pricing.'],
  ['How long does a video take?', 'It depends on the film, the Agent, the selected models and your computer. Generation queues and rendering have separate progress. Keep following the existing job instead of submitting the same request again.'],
  ['Can a team work on the same project?', 'You can share editable project files and exported videos with a team. This local installation does not provide a hosted collaborative workspace. Coordinate edits to the same source files; provider credentials are not part of the project.'],
  ['Who makes OpenMotion?', 'OpenMotion is an independent open-source project. The supported Agent and model names identify integrations, not ownership or endorsement. Visit the repository for the source, licenses and contribution guide.'],

  ['Do I need an OpenMotion API key?', 'Local MCP setup does not require an OpenMotion API key. Cloud generation uses your configured provider credentials or OpenDesign account. Keep keys in Model providers, not in chat.'],
  ['Which models can I use?', 'Available models come from your configured providers and account. Image, video, music and speech support depends on the selected model. Studio and MCP share model-specific parameters; available controls follow the selected model. A connected provider does not guarantee quota or generation success.'],
  ['Why can Codex chat work while image generation fails?', 'Codex login and image-service access are separate checks. For authorization errors, check the active Codex provider, endpoint and credentials. A proxy reporting a missing personal engine key needs its configured provider authentication; signing in again alone does not fix that configuration. Failed tasks preserve the original assets and are never retried automatically.'],
  ['How do I restore an asset version?', 'Open the asset, select a version in the right inspector and choose Make current version. Later versions remain available. Studio and MCP use the same asset update operation; references and downloads keep their exact version identity.'],
  ['Can ChatGPT cloud connect to this workspace?', 'This installation exposes local stdio, not a public HTTPS MCP endpoint. Use a local Agent or compatible desktop MCP client. The editor URL is not an MCP server URL.'],
  ['Can I recreate a reference video?', 'Yes. Give your Agent the reference and your brand. The recreation Skill analyses and rebuilds the film as editable source, with comparisons of timing, object motion and changes within each scene. Access to the reference, media understanding and fidelity depend on the host and supplied material.'],
  ['Where do I find my finished work?', 'Projects, source files, assets and versions stay in your local OpenMotion workspace. Open the project in Studio or ask a connected Agent to read it and continue. Completed exports provide the MP4.'],
  ['Can I see templates and videos inside my Agent?', 'Clients that negotiate MCP Apps can discover optional template cards and the final-video player. Codex installation callbacks can also show the welcome and three video cards through a supported inline renderer while opening the template library. This does not verify native MCP discovery. Other clients use the local library, editor and video links; host support varies.'],
  ['How do I disconnect an Agent?', 'Remove the OpenMotion MCP entry or plugin in that Agent. This does not delete projects. Remove provider credentials separately in Model providers if you no longer want generation access.'],
  ['Does connecting start generation or spend credits?', 'No. Copying setup instructions, browsing templates and checking a connection do not start media generation. Provider requests may incur charges; ask your Agent to confirm the model, scope and cost first.'],
] as const;

/** Compare concrete workflows, without claiming features of unspecified competitors. */
export const mcpWorkflowComparison = [
  ['Brief, storyboard and creative direction', 'Guided production Skills', 'Build your own orchestration', 'Plan and author yourself'],
  ['Discover templates and brand references', 'Shared catalogue and exact template prompts', 'Bring your own catalogue', 'Browse the template library'],
  ['Recreate a reference or adapt a template', 'Agent-led, editable source', 'Generate media from a prompt', 'Edit the source yourself'],
  ['Generate images, video, music and voice', 'With configured providers', 'Per-model API and credentials', 'Use Model providers'],
  ['Edit timing, typography, scenes and audio', 'Agent edits and Studio controls', 'Requires an editing workflow', 'Studio editing controls'],
  ['Reuse local and generated assets', 'Project assets across iterations', 'Manage files and storage yourself', 'Import into the project'],
  ['Version history and safe restoration', 'Version-checked edits and restore tools', 'Implement project history yourself', 'Studio version history'],
  ['Preview, render and deliver MP4', 'Studio preview and tracked exports', 'Requires a rendering workflow', 'Preview and export in Studio'],
] as const;

export const mcpClientComparison = [
  ['Connection', 'Local stdio', 'Local stdio, when supported', 'Not available'],
  ['Creative workflow guides', 'Installed Skills and MCP resources', 'Requires resource support', 'Not available'],
  ['Templates and brand references', 'Shared catalogue and exact template prompts', 'Requires tools and resource support', 'Not available'],
  ['Editable projects and animation', 'Supported', 'Requires tools and resource support', 'Not available'],
  ['Images, video, music and voice', 'With configured providers', 'With configured providers', 'Not available'],
  ['Local material', 'Explicit local file paths', 'Host file access required', 'Not available'],
  ['Version history and restoration', 'Supported', 'Requires tools and resource support', 'Not available'],
  ['Preview and MP4 export', 'Local Studio and export links', 'Local Studio and export links', 'Not available'],
  ['Inline template cards and final video', 'Codex inline onboarding or MCP Apps; final video requires MCP Apps', 'Requires MCP Apps negotiation', 'Not available'],
] as const;
