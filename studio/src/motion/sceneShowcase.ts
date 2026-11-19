import type { StudioDestination, StudioScene } from './creativeStudios';
import { motionSkills } from './skillCatalog';
import lunar from './scene-art/apollo-11.jpg';
import product from './skill-covers/light-shadow-product.webp';
import relight from './skill-covers/relight-reveal.webp';
import splash from './skill-covers/splash-float-product.webp';
import soundtrackCover from './scene-art/ambient-piano.webp';
import narration from './skill-covers/talking-head-recreation.webp';
import camera from './skill-covers/babylon-js.webp';
import welcomeMusic from '../../../template-library/openmotion-welcome/assets/soundtrack.m4a?url';

export interface SceneExample { title: string; prompt: string; poster: string; posterPosition?: string; credit?: string; clip?: string; audio?: string; waveform?: readonly number[] }

// Normalized RMS amplitudes sampled across the bundled welcome soundtrack.
const welcomeWaveform = [
  2, 29, 39, 37, 45, 37, 40, 47, 39, 50, 51, 24, 84, 88, 58, 82, 81, 87, 47, 80, 90, 85, 53, 91,
  82, 88, 51, 84, 88, 83, 53, 94, 81, 72, 58, 82, 92, 77, 59, 83, 86, 89, 68, 84, 92, 73, 63, 94,
  85, 40, 13, 14, 9, 10, 15, 84, 85, 67, 73, 83, 87, 61, 77, 88, 86, 63, 81, 80, 89, 57, 80, 87,
  84, 59, 86, 83, 85, 56, 86, 92, 85, 23, 93, 82, 88, 55, 87, 87, 77, 66, 92, 83, 52, 36, 2, 2,
];

const splashClip = motionSkills.find(skill => skill.id === 'openmotion-splash-float-product')?.cover?.video;
const productClip = motionSkills.find(skill => skill.id === 'openmotion-light-shadow-product')?.cover?.video;

const portrait = { title: 'Product portrait', prompt: 'Photograph an amber glass bottle in warm sidelight, with soft leaf shadows on stone.', poster: product, clip: productClip };
const cameraStudy = { title: 'Vintage camera study', prompt: 'Frame a vintage camera in soft sidelight. Let the background fall into shadow.', poster: camera };
const moon = { title: 'Lunar portrait', prompt: 'Frame a lone astronaut on a silver lunar plain. Use a low horizon, deep shadows and light reflected in the visor.', poster: lunar, posterPosition: 'center top', credit: 'NASA · AS11-40-5903' };
const orange = { title: 'Slow motion detail', prompt: 'Film a slow-motion close-up of an orange soda bottle with citrus slices, mint and splashing water.', poster: splash, clip: splashClip };

export const sceneExamples: Record<StudioScene['id'], readonly [SceneExample, ...SceneExample[]]> = {
  'text-to-image': [portrait, moon, cameraStudy],
  'image-edit': [{ title: 'Product relighting', prompt: 'Keep the product and its lettering. Light it from the side against a warm amber background.', poster: relight }],
  'shot-image': [moon, cameraStudy, portrait],
  'text-to-video': [orange],
  'image-to-video': [{ title: 'A cinematic opening', prompt: 'Start on the supplied frame. Push in slowly as a band of sunlight moves across the product.', poster: product, clip: productClip }],
  music: [{ title: 'Ambient soundtrack', prompt: 'Compose a quiet instrumental with soft piano and airy synths for a sunrise scene.', poster: soundtrackCover, audio: welcomeMusic, waveform: welcomeWaveform }],
  speech: [{ title: 'Warm narration', prompt: 'Every idea deserves to be seen. This is where our story begins.', poster: narration }],
};

export function studioExamples({ studio, scene }: StudioDestination): readonly SceneExample[] {
  if (studio.surface === 'techniques' && scene.id === 'text-to-video') {
    const skill = motionSkills.find(item => item.id === studio.techniques[0]);
    if (skill?.cover?.poster) return [{
      title: skill.title, poster: skill.cover.poster, clip: skill.cover.video, credit: skill.repository ? skill.name : undefined,
      prompt: studio.id === 'shorts' ? 'Frame a podcast host vertically as she leans into the microphone to deliver her opening line.' : skill.example,
    }];
  }
  return sceneExamples[scene.id];
}

export function sceneLayout(scene: StudioScene) {
  return scene.modality === 'image' && !('requiresImage' in scene) ? 'canvas' : 'workbench';
}
