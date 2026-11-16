/**
 * Skills shown on the Skills page, grouped by the video the user wants to make.
 * Scenario skills (promos, explainers, covers…) come first; open-source motion
 * libraries are kept as techniques. Open-source entries link to their upstream
 * repository. OpenMotion only borrows the workflow or technique: the Agent builds
 * an editable native project through MCP.
 */
export type SkillMotif = 'agent' | 'scene' | 'layout' | 'curve' | 'stagger' | 'math' | 'vector' | 'playback' | 'depth' | 'frames' | 'canvas' | 'particles'
  | 'icon' | 'sequence' | 'character' | 'globe' | 'levelup' | 'orbit' | 'promo'
  | 'photo' | 'listing' | 'narration' | 'brand' | 'thumbnail' | 'generate' | 'identity';
export type SkillCategory = 'Product promos' | 'Explainers' | 'Brand & covers' | 'People & AI media' | 'Motion techniques';

export type MotionSkill = {
  id: string;
  name: string;
  /** Short English tagline; translated through the UI dictionary. */
  tagline: string;
  category: SkillCategory;
  motif: SkillMotif;
  /** Upstream repository; absent for skills authored by OpenMotion. */
  repository?: string;
  license: string;
  /** Real upstream demo media (hotlinked from the source); the card falls back to an illustration. */
  cover?: { video?: string; gif?: string; poster?: string; aspect?: number; source: string };
  /** The workflow needs generated images, video or audio from configured providers. */
  media?: boolean;
  /** What the Agent should borrow from the upstream project. */
  technique: string;
  /** Example brief shown as the subject placeholder. */
  example: string;
};

export const skillCategories: SkillCategory[] = ['Product promos', 'Explainers', 'Brand & covers', 'People & AI media', 'Motion techniques'];

export const motionSkills: MotionSkill[] = [
  { id: 'higgsfield-product-photoshoot', name: 'Product Photoshoot', tagline: 'Studio and lifestyle product shots.', category: 'Product promos', motif: 'photo', repository: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-product-photoshoot', license: 'MIT', media: true,
    technique: 'Follow its product-photoshoot modes (studio, lifestyle, hero banner, floating/splash, seasonal variation) to generate product stills, then animate them into a short product reel with camera moves and captions.', example: 'A 10-second reel of my headphones: studio shot, lifestyle shot, hero banner' },
  { id: 'higgsfield-marketplace-cards', name: 'Marketplace Cards', tagline: 'Listing images and A+ modules.', category: 'Product promos', motif: 'listing', repository: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-marketplace-cards', license: 'MIT', media: true,
    technique: 'Follow its marketplace listing structure: a clean main image, secondary feature images and A+ style modules (benefits, specs, comparison). Turn them into a listing video that walks through each card.', example: 'An Amazon-style listing video for a stainless steel water bottle' },
  { id: 'higgsfield-faceless-video', name: 'Faceless Video', tagline: 'Narrated explainers and stories.', category: 'Explainers', motif: 'narration', repository: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-faceless-video', license: 'MIT', media: true,
    technique: 'Follow its faceless-video workflow: write the narration first, keep one consistent visual style, use deliberate diagram-led scenes for explainers (not rapid cuts), and sync scenes to the voiceover.', example: 'A narrated explainer: why the sky is blue' },
  { id: 'higgsfield-brandkit', name: 'Brand Kit', tagline: 'Logo, palette and brand motion.', category: 'Brand & covers', motif: 'brand', repository: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-brandkit', license: 'MIT', media: true,
    technique: 'Follow its brand-system approach: treat supplied logos and colors as fixed, define palette, typography and logo mark, then apply them consistently. Deliver a brand intro with logo animation and reusable branded title cards.', example: 'A brand intro for a coffee shop called North Bean' },
  { id: 'higgsfield-youtube-thumbnail', name: 'YouTube Thumbnail', tagline: 'High-click covers for videos.', category: 'Brand & covers', motif: 'thumbnail', repository: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-youtube-thumbnail', license: 'MIT', media: true,
    technique: 'Follow its thumbnail method: a truthful information-gap concept, one dominant subject, at most three words of large text and strong contrast. Make the cover and a 3-second animated version for the video intro.', example: 'Cover for my video “I rebuilt my app in 7 days”' },
  { id: 'higgsfield-generate', name: 'AI Media Generation', tagline: 'Images, video and audio for your scenes.', category: 'People & AI media', motif: 'generate', repository: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-generate', license: 'MIT', media: true,
    technique: 'Follow its routing: pick the right model per asset (image, image-to-video, sound effect, music), generate only the assets the storyboard needs, then place them on the timeline with motion and captions.', example: 'A 15-second ad with generated product shots and a sound effect on each cut' },
  { id: 'higgsfield-soul-id', name: 'Consistent Character', tagline: 'Keep the same person across shots.', category: 'People & AI media', motif: 'identity', repository: 'https://github.com/higgsfield-ai/skills/tree/main/higgsfield-soul-id', license: 'MIT', media: true,
    technique: 'Borrow its identity-consistency approach: use the photos I provide as references for every generated shot so the same person appears throughout. Only use faces I have the right to use.', example: 'A short story video starring me, using my three photos' },
  { id: 'video-shotcraft', name: 'video-shotcraft', tagline: 'Product promos from shot recipes.', category: 'Product promos', motif: 'promo', repository: 'https://github.com/Vincentwei1021/video-shotcraft', license: 'Apache-2.0', cover: { gif: 'https://raw.githubusercontent.com/Vincentwei1021/video-shotcraft/main/assets/readme/workflow.gif', poster: 'https://raw.githubusercontent.com/Vincentwei1021/video-shotcraft/main/assets/readme/cover.webp', aspect: 1.78, source: 'https://github.com/Vincentwei1021/video-shotcraft#readme' },
    technique: 'Follow its product-promo workflow: capture real product pages, pick shot recipe cards, storyboard, cut to the beat with sound design and check every frame. Build it as native OpenMotion HTML instead of Remotion.', example: 'A promo for my product built from real page screenshots' },
  { id: 'motion-canvas', name: 'Motion Canvas', tagline: 'Animated explainers.', category: 'Explainers', motif: 'scene', repository: 'https://github.com/motion-canvas/motion-canvas', license: 'MIT',
    technique: 'Use its explainer style: sequential scenes, code-driven tweens, highlighted diagrams and synchronized captions.', example: 'Explain how an API request travels through a system' },
  { id: 'remotion-skills', name: 'Remotion Skills', tagline: 'Agent guidance for video.', category: 'Motion techniques', motif: 'agent', repository: 'https://github.com/remotion-dev/skills', license: 'See repository',
    technique: 'Follow its Agent guidance for structuring a video as scenes, timing with frames, and reusing typed components.', example: 'A 3-scene product launch with a logo reveal' },
  { id: 'motion', name: 'Motion', tagline: 'Layout transitions.', category: 'Motion techniques', motif: 'layout', repository: 'https://github.com/motiondivision/motion', license: 'MIT', cover: { video: 'https://images.motion.dev/examples/stage/react/app-store/v-85ef4ca3e814/thumb.mp4', aspect: 1.35, source: 'https://motion.dev/examples' },
    technique: 'Use shared-layout transitions: cards that morph position and size, spring physics and smooth enter/exit.', example: 'A dashboard where cards rearrange to reveal a new feature' },
  { id: 'ola', name: 'Ola', tagline: 'Smooth value interpolation.', category: 'Motion techniques', motif: 'curve', repository: 'https://github.com/franciscop/ola', license: 'MIT', cover: { gif: 'https://raw.githubusercontent.com/franciscop/ola/master/docs/dots.gif', aspect: 1.78, source: 'https://github.com/franciscop/ola#readme' },
    technique: 'Interpolate numbers smoothly: counters, progress bars and chart values that glide to new targets.', example: 'Revenue counter climbing from 0 to 1M with a progress ring' },
  { id: 'anime-js', name: 'Anime.js', tagline: 'Timelines and stagger.', category: 'Motion techniques', motif: 'stagger', repository: 'https://github.com/juliangarnier/anime', license: 'MIT', cover: { gif: 'https://raw.githubusercontent.com/juliangarnier/anime/master/assets/images/usage-example-result.gif', aspect: 1.78, source: 'https://github.com/juliangarnier/anime#readme' },
    technique: 'Build one master timeline with staggered elements, offsets and expressive easing.', example: 'A grid of icons that ripple in from the center' },
  { id: 'manim', name: 'Manim', tagline: 'Math in motion.', category: 'Explainers', motif: 'math', repository: 'https://github.com/ManimCommunity/manim', license: 'MIT', cover: { video: 'https://docs.manim.community/en/stable/OpeningManim-1.mp4#t=3', aspect: 1.78, source: 'https://docs.manim.community/en/stable/examples.html' },
    technique: 'Recreate its mathematical style in HTML/SVG: plotted functions, transforming equations and step-by-step proofs. Do not install Python or Manim.', example: 'Visualize how a sine wave builds from a rotating circle' },
  { id: 'shifty', name: 'Shifty', tagline: 'Tween playback and easing.', category: 'Motion techniques', motif: 'playback', repository: 'https://github.com/jeremyckahn/shifty', license: 'MIT',
    technique: 'Treat each property change as a tween with explicit easing, pause/seek points and chained steps.', example: 'A loading sequence with three chained easing styles' },
  { id: 'two-js', name: 'Two.js', tagline: 'Animated 2D vector scenes.', category: 'Motion techniques', motif: 'vector', repository: 'https://github.com/jonobr1/two.js', license: 'MIT',
    technique: 'Draw a 2D vector scene of simple shapes and paths, and animate their geometry, stroke and grouping.', example: 'Flat geometric shapes assembling into a logo' },
  { id: 'lottie-web', name: 'Lottie Web', tagline: 'Vector animation playback.', category: 'Motion techniques', motif: 'icon', repository: 'https://github.com/airbnb/lottie-web', license: 'MIT', cover: { gif: 'https://raw.githubusercontent.com/airbnb/lottie-web/master/gifs/Example1.gif', aspect: 1.78, source: 'https://github.com/airbnb/lottie-web#readme' },
    technique: 'Use designer-made Lottie animations as layers, or match their crisp vector icon-animation style.', example: 'Animated checkmark and icons for an onboarding video' },
  { id: 'tween-js', name: 'TweenJS', tagline: 'Sequenced property animation.', category: 'Motion techniques', motif: 'sequence', repository: 'https://github.com/CreateJS/TweenJS', license: 'MIT',
    technique: 'Sequence property animations in order with waits and callbacks so each beat lands on time.', example: 'A step-by-step feature walkthrough with timed callouts' },
  { id: 'lume', name: 'LUME', tagline: '3D scenes with HTML.', category: 'Motion techniques', motif: 'depth', repository: 'https://github.com/lume/lume', license: 'MIT',
    technique: 'Compose 3D objects as HTML elements with lighting and camera movement.', example: 'Floating 3D product cards with soft lighting' },
  { id: 'gifenc', name: 'gifenc', tagline: 'Animated GIF encoding.', category: 'Motion techniques', motif: 'frames', repository: 'https://github.com/mattdesl/gifenc', license: 'MIT',
    technique: 'Design a short seamless loop with a limited palette that also works as an animated GIF.', example: 'A 3-second looping sticker for social media' },
  { id: 'konva', name: 'Konva', tagline: 'Interactive canvas animation.', category: 'Motion techniques', motif: 'canvas', repository: 'https://github.com/konvajs/konva', license: 'MIT',
    technique: 'Use a canvas scene graph: layered shapes that drag, snap and transform like a design-tool demo.', example: 'A whiteboard demo where sticky notes snap into a flow' },
  { id: 'blender', name: 'Blender', tagline: 'Rigging and character animation.', category: 'Motion techniques', motif: 'character', repository: 'https://github.com/blender/blender', license: 'GPL-2.0-or-later',
    technique: 'Borrow character-animation principles: anticipation, follow-through and posed keyframes. Use rendered Blender clips as assets when provided; do not install Blender.', example: 'A mascot that waves and points to a headline' },
  { id: 'three-js', name: 'Three.js', tagline: 'Animated 3D scenes.', category: 'Motion techniques', motif: 'globe', repository: 'https://github.com/mrdoob/three.js', license: 'MIT',
    technique: 'Render a WebGL 3D scene with camera moves, materials and lighting, driven by the composition timeline.', example: 'A rotating 3D globe with connection arcs' },
  { id: 'godot', name: 'Godot', tagline: 'Game animation systems.', category: 'Motion techniques', motif: 'levelup', repository: 'https://github.com/godotengine/godot', license: 'MIT',
    technique: 'Borrow game-animation patterns: state transitions, tweens and camera shake. Recreate them in HTML; do not install Godot.', example: 'A game-style level-up screen with rewards' },
  { id: 'babylon-js', name: 'Babylon.js', tagline: '3D animation and rendering.', category: 'Motion techniques', motif: 'orbit', repository: 'https://github.com/BabylonJS/Babylon.js', license: 'Apache-2.0',
    technique: 'Render a physically lit 3D scene with animation groups and smooth camera paths.', example: 'A 3D product turntable with reflections' },
  { id: 'proton', name: 'Proton', tagline: 'Particle emitters and behaviors.', category: 'Motion techniques', motif: 'particles', repository: 'https://github.com/drawcall/Proton', license: 'MIT',
    technique: 'Add particle emitters with gravity, attraction and fading for celebrations or ambient backgrounds.', example: 'Confetti burst when a goal is reached' },
];

export const aspectRatios = ['16:9', '9:16', '1:1'] as const;
export const durations = [5, 10, 15, 30] as const;
export type SkillParameters = { subject: string; duration: typeof durations[number]; aspect: typeof aspectRatios[number]; style: string };

/** The Agent instruction is the product: copy it into Codex, Claude Code or any MCP client. */
/** installUrl comes from the running installation (setupGuideUrl), matching template instructions. */
export function skillPrompt(skill: MotionSkill, parameters: SkillParameters, locale: string, installUrl: string) {
  const subject = parameters.subject.trim() || skill.example;
  const style = parameters.style.trim();
  if (locale === 'zh-CN') return `使用说明：请使用 OpenMotion 插件。如未安装，请按 ${installUrl} 安装并接入后继续。
${skill.repository ? `用 OpenMotion 做一个动效视频，借鉴开源项目 ${skill.name} 的做法。` : `用 OpenMotion 的「${skill.name}」Skill 做一个视频。`}
${skill.repository ? `参考来源：${skill.repository}（许可证：${skill.license}）` : '来源：OpenMotion 自有 Skill'}

要求：
- 内容：${subject}
- 时长：${parameters.duration} 秒；画幅：${parameters.aspect}${style ? `\n- 风格：${style}` : ''}
- 借鉴的技巧：${skill.technique}

步骤：
1. 在当前 Agent 中发现 OpenMotion MCP 工具（只用 tools/list 返回的工具），按已安装的 OpenMotion 制作 Skill 操作；安装接入后仍连不上就停下告诉我，不要猜。
2. 用 openmotion_create_project 新建项目（projectType=natural_language，带稳定的 requestId、标题和上面的需求）；再用 openmotion_get_project 读取 projectId、revision 和 currentVersionId。
${skill.media ? '需要生成图片、视频或音频时，用 openmotion_media_use（先 inspect 查看已配置的供应商），不安装其他平台的 CLI，不把密钥写进对话。\n' : ''}3. 编写原生 HTML/CSS/JS 合成，把上面的技巧翻译成时间线动画；用 openmotion_edit_project 保存，传 expectedRevision 和 expectedVersionId，冲突时重新读取，不覆盖界面里的修改。
4. 只借鉴做法，不整段复制上游源码；确实需要引入依赖时，说明来源和许可证。
5. 完成后用 openmotion_open_preview 打开预览，把预览地址给我，项目保留在 OpenMotion 里方便继续改。`;
  return `Instructions: Use the OpenMotion plugin. If it is not installed, follow ${installUrl} to install and connect it, then continue.
${skill.repository ? `Make a motion video with OpenMotion, borrowing the technique of the open-source project ${skill.name}.` : `Make a video with the OpenMotion "${skill.name}" skill.`}
${skill.repository ? `Reference: ${skill.repository} (license: ${skill.license})` : 'Source: OpenMotion skill'}

Brief:
- Content: ${subject}
- Duration: ${parameters.duration}s; aspect ratio: ${parameters.aspect}${style ? `\n- Style: ${style}` : ''}
- Technique to borrow: ${skill.technique}

Steps:
1. Discover the OpenMotion MCP tools in this Agent (use only tools returned by tools/list) and follow the installed OpenMotion production skill. If it still cannot connect after installation, stop and tell me; do not guess.
2. Create the project with openmotion_create_project (projectType=natural_language, a stable requestId, a title and the brief above), then read projectId, revision and currentVersionId with openmotion_get_project.
${skill.media ? 'When images, video or audio must be generated, use openmotion_media_use (inspect configured providers first); do not install other platforms\' CLIs or put keys in the chat.\n' : ''}3. Author a native HTML/CSS/JS composition that translates the technique into timeline animation. Save it with openmotion_edit_project, passing expectedRevision and expectedVersionId; on conflict, re-read instead of overwriting GUI edits.
4. Borrow the technique only; do not copy upstream source wholesale. If a dependency is truly needed, state its source and license.
5. When done, open it with openmotion_open_preview, give me the preview URL and keep the project editable in OpenMotion.`;
}
