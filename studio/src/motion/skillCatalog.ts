/**
 * Curated open-source motion techniques shown on the Skills page.
 * Each entry links to its upstream repository. OpenMotion only borrows the
 * technique: the Agent builds an editable HTML composition through MCP.
 */
export type SkillMotif = 'agent' | 'scene' | 'layout' | 'curve' | 'stagger' | 'math' | 'vector' | 'playback' | 'depth' | 'frames' | 'canvas' | 'particles'
  | 'icon' | 'sequence' | 'character' | 'globe' | 'levelup' | 'orbit';
export type SkillCategory = 'Agent guidance' | '2D animation' | '3D scenes' | 'Easing & timing' | 'Playback & export';

export type MotionSkill = {
  id: string;
  name: string;
  /** Short English tagline; translated through the UI dictionary. */
  tagline: string;
  category: SkillCategory;
  motif: SkillMotif;
  repository: string;
  license: string;
  /** What the Agent should borrow from the upstream project. */
  technique: string;
  /** Example brief shown as the subject placeholder. */
  example: string;
};

export const skillCategories: SkillCategory[] = ['Agent guidance', '2D animation', '3D scenes', 'Easing & timing', 'Playback & export'];

export const motionSkills: MotionSkill[] = [
  { id: 'remotion-skills', name: 'Remotion Skills', tagline: 'Agent guidance for video.', category: 'Agent guidance', motif: 'agent', repository: 'https://github.com/remotion-dev/skills', license: 'See repository',
    technique: 'Follow its Agent guidance for structuring a video as scenes, timing with frames, and reusing typed components.', example: 'A 3-scene product launch with a logo reveal' },
  { id: 'motion-canvas', name: 'Motion Canvas', tagline: 'Animated explainers.', category: '2D animation', motif: 'scene', repository: 'https://github.com/motion-canvas/motion-canvas', license: 'MIT',
    technique: 'Use its explainer style: sequential scenes, code-driven tweens, highlighted diagrams and synchronized captions.', example: 'Explain how an API request travels through a system' },
  { id: 'motion', name: 'Motion', tagline: 'Layout transitions.', category: '2D animation', motif: 'layout', repository: 'https://github.com/motiondivision/motion', license: 'MIT',
    technique: 'Use shared-layout transitions: cards that morph position and size, spring physics and smooth enter/exit.', example: 'A dashboard where cards rearrange to reveal a new feature' },
  { id: 'ola', name: 'Ola', tagline: 'Smooth value interpolation.', category: 'Easing & timing', motif: 'curve', repository: 'https://github.com/franciscop/ola', license: 'MIT',
    technique: 'Interpolate numbers smoothly: counters, progress bars and chart values that glide to new targets.', example: 'Revenue counter climbing from 0 to 1M with a progress ring' },
  { id: 'anime-js', name: 'Anime.js', tagline: 'Timelines and stagger.', category: 'Easing & timing', motif: 'stagger', repository: 'https://github.com/juliangarnier/anime', license: 'MIT',
    technique: 'Build one master timeline with staggered elements, offsets and expressive easing.', example: 'A grid of icons that ripple in from the center' },
  { id: 'manim', name: 'Manim', tagline: 'Math in motion.', category: '2D animation', motif: 'math', repository: 'https://github.com/ManimCommunity/manim', license: 'MIT',
    technique: 'Recreate its mathematical style in HTML/SVG: plotted functions, transforming equations and step-by-step proofs. Do not install Python or Manim.', example: 'Visualize how a sine wave builds from a rotating circle' },
  { id: 'shifty', name: 'Shifty', tagline: 'Tween playback and easing.', category: 'Easing & timing', motif: 'playback', repository: 'https://github.com/jeremyckahn/shifty', license: 'MIT',
    technique: 'Treat each property change as a tween with explicit easing, pause/seek points and chained steps.', example: 'A loading sequence with three chained easing styles' },
  { id: 'two-js', name: 'Two.js', tagline: 'Animated 2D vector scenes.', category: '2D animation', motif: 'vector', repository: 'https://github.com/jonobr1/two.js', license: 'MIT',
    technique: 'Draw a 2D vector scene of simple shapes and paths, and animate their geometry, stroke and grouping.', example: 'Flat geometric shapes assembling into a logo' },
  { id: 'lottie-web', name: 'Lottie Web', tagline: 'Vector animation playback.', category: 'Playback & export', motif: 'icon', repository: 'https://github.com/airbnb/lottie-web', license: 'MIT',
    technique: 'Use designer-made Lottie animations as layers, or match their crisp vector icon-animation style.', example: 'Animated checkmark and icons for an onboarding video' },
  { id: 'tween-js', name: 'TweenJS', tagline: 'Sequenced property animation.', category: 'Easing & timing', motif: 'sequence', repository: 'https://github.com/CreateJS/TweenJS', license: 'MIT',
    technique: 'Sequence property animations in order with waits and callbacks so each beat lands on time.', example: 'A step-by-step feature walkthrough with timed callouts' },
  { id: 'lume', name: 'LUME', tagline: '3D scenes with HTML.', category: '3D scenes', motif: 'depth', repository: 'https://github.com/lume/lume', license: 'MIT',
    technique: 'Compose 3D objects as HTML elements with lighting and camera movement.', example: 'Floating 3D product cards with soft lighting' },
  { id: 'gifenc', name: 'gifenc', tagline: 'Animated GIF encoding.', category: 'Playback & export', motif: 'frames', repository: 'https://github.com/mattdesl/gifenc', license: 'MIT',
    technique: 'Design a short seamless loop with a limited palette that also works as an animated GIF.', example: 'A 3-second looping sticker for social media' },
  { id: 'konva', name: 'Konva', tagline: 'Interactive canvas animation.', category: '2D animation', motif: 'canvas', repository: 'https://github.com/konvajs/konva', license: 'MIT',
    technique: 'Use a canvas scene graph: layered shapes that drag, snap and transform like a design-tool demo.', example: 'A whiteboard demo where sticky notes snap into a flow' },
  { id: 'blender', name: 'Blender', tagline: 'Rigging and character animation.', category: '3D scenes', motif: 'character', repository: 'https://github.com/blender/blender', license: 'GPL-2.0-or-later',
    technique: 'Borrow character-animation principles: anticipation, follow-through and posed keyframes. Use rendered Blender clips as assets when provided; do not install Blender.', example: 'A mascot that waves and points to a headline' },
  { id: 'three-js', name: 'Three.js', tagline: 'Animated 3D scenes.', category: '3D scenes', motif: 'globe', repository: 'https://github.com/mrdoob/three.js', license: 'MIT',
    technique: 'Render a WebGL 3D scene with camera moves, materials and lighting, driven by the composition timeline.', example: 'A rotating 3D globe with connection arcs' },
  { id: 'godot', name: 'Godot', tagline: 'Game animation systems.', category: '3D scenes', motif: 'levelup', repository: 'https://github.com/godotengine/godot', license: 'MIT',
    technique: 'Borrow game-animation patterns: state transitions, tweens and camera shake. Recreate them in HTML; do not install Godot.', example: 'A game-style level-up screen with rewards' },
  { id: 'babylon-js', name: 'Babylon.js', tagline: '3D animation and rendering.', category: '3D scenes', motif: 'orbit', repository: 'https://github.com/BabylonJS/Babylon.js', license: 'Apache-2.0',
    technique: 'Render a physically lit 3D scene with animation groups and smooth camera paths.', example: 'A 3D product turntable with reflections' },
  { id: 'proton', name: 'Proton', tagline: 'Particle emitters and behaviors.', category: '2D animation', motif: 'particles', repository: 'https://github.com/drawcall/Proton', license: 'MIT',
    technique: 'Add particle emitters with gravity, attraction and fading for celebrations or ambient backgrounds.', example: 'Confetti burst when a goal is reached' },
];

export const aspectRatios = ['16:9', '9:16', '1:1'] as const;
export const durations = [5, 10, 15, 30] as const;
export type SkillParameters = { subject: string; duration: typeof durations[number]; aspect: typeof aspectRatios[number]; style: string };

/** The Agent instruction is the product: copy it into Codex, Claude Code or any MCP client. */
export function skillPrompt(skill: MotionSkill, parameters: SkillParameters, locale: string) {
  const subject = parameters.subject.trim() || skill.example;
  const style = parameters.style.trim();
  if (locale === 'zh-CN') return `用 OpenMotion 做一个动效视频，借鉴开源项目 ${skill.name} 的做法。
参考来源：${skill.repository}（许可证：${skill.license}）

要求：
- 内容：${subject}
- 时长：${parameters.duration} 秒；画幅：${parameters.aspect}${style ? `\n- 风格：${style}` : ''}
- 借鉴的技巧：${skill.technique}

步骤：
1. 在当前 Agent 中发现 OpenMotion MCP 工具，先调用 openmotion_get_project 确认工作区；没连上就停下告诉我，不要猜。
2. 用 openmotion_create_session 新建会话和工程，读 openmotion_get_project 拿到 revision，再用 openmotion_write_files 写出可编辑的 Hyperframes HTML 合成（用暂停的 GSAP 时间线驱动，把上面的技巧翻译成时间线动画）。
3. 只借鉴做法，不整段复制上游源码；确实需要引入依赖时，说明来源和许可证。
4. 完成后调用 openmotion_open_preview，把预览地址给我，工程保留在 OpenMotion 里方便继续改。`;
  return `Make a motion video with OpenMotion, borrowing the technique of the open-source project ${skill.name}.
Reference: ${skill.repository} (license: ${skill.license})

Brief:
- Content: ${subject}
- Duration: ${parameters.duration}s; aspect ratio: ${parameters.aspect}${style ? `\n- Style: ${style}` : ''}
- Technique to borrow: ${skill.technique}

Steps:
1. Discover the OpenMotion MCP tools in this Agent and call openmotion_get_project to verify the workspace. If it is not connected, stop and tell me; do not guess.
2. Create a session and project with openmotion_create_session, read openmotion_get_project for the revision, then write an editable Hyperframes HTML composition with openmotion_write_files (drive it with a paused GSAP timeline that translates the technique above).
3. Borrow the technique only; do not copy upstream source wholesale. If a dependency is truly needed, state its source and license.
4. When done, call openmotion_open_preview, give me the preview URL and keep the project editable in OpenMotion.`;
}
