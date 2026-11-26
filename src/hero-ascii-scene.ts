import * as THREE from 'three';
import { FontLoader, type Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { asciiProfileSceneSettings as SCENE } from './hero-ascii-profile';

type PackedProfile = {
  chars: string[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  orig: number[];
  mono: number[];
};
type GlyphScene = { scene: THREE.Scene; geometries: THREE.BufferGeometry[]; materials: THREE.Material[] };

const LENS_RADIUS: number = SCENE.lensRadius;

function makeGlyphScene(
  profile: PackedProfile,
  font: Font,
  uniforms: { uPointer: { value: THREE.Vector2 }; uRadius: { value: number }; uHover: { value: number } },
): GlyphScene {
  const data = profile.mono;
  const stride = 4;
  const byGlyph = new Map<number, number[][]>();
  for (let offset = 0; offset < data.length; offset += stride) {
    const glyph = data[offset];
    const instances = byGlyph.get(glyph) ?? [];
    instances.push(data.slice(offset, offset + stride));
    byGlyph.set(glyph, instances);
  }

  const scene = new THREE.Scene();
  const geometries: THREE.BufferGeometry[] = [];
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.uniforms.uPointer = uniforms.uPointer;
    shader.uniforms.uRadius = uniforms.uRadius;
    shader.uniforms.uHover = uniforms.uHover;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec2 uPointer;
        uniform float uRadius;
        uniform float uHover;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
if (uHover > 0.5) {
  float dist = distance(gl_FragCoord.xy, uPointer);
  float bloodMask = 1.0 - smoothstep(uRadius * 0.55, uRadius, dist);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.36, 0.005, 0.008), bloodMask * 0.92);
}`,
      );
  };
  const temp = new THREE.Object3D();
  for (const [glyph, instances] of byGlyph) {
    const geometry = new TextGeometry(profile.chars[glyph], {
      font,
      size: SCENE.glyphSize,
      depth: SCENE.glyphDepth,
      curveSegments: 2,
    });
    geometry.center();
    geometry.scale(SCENE.glyphAspect, 1, 1);
    const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
    mesh.frustumCulled = false;
    instances.forEach((instance, index) => {
      temp.position.set(instance[1], instance[2], instance[3] * SCENE.depthScale);
      temp.updateMatrix();
      mesh.setMatrixAt(index, temp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    geometries.push(geometry);
  }
  return { scene, geometries, materials: [material] };
}

function initAsciiProfile(): void {
  const panel = document.querySelector<HTMLElement>('.motion-panel');
  if (!panel) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const uniforms = {
    uPointer: { value: new THREE.Vector2(-10000, -10000) },
    uRadius: { value: LENS_RADIUS as number },
    uHover: { value: 0 },
  };
  let renderer: THREE.WebGLRenderer | undefined;
  let mono: GlyphScene | undefined;
  let camera: THREE.PerspectiveCamera | undefined;
  let observer: IntersectionObserver | undefined;
  let frame = 0;
  let disposed = false;
  let visible = false;
  let lens: HTMLDivElement | undefined;

  const render = () => {
    frame = 0;
    if (!visible || document.hidden || document.body.classList.contains('title-paused')) return;
    if (renderer && mono && camera) renderer.render(mono.scene, camera);
  };
  const scheduleRender = () => { if (!frame) frame = requestAnimationFrame(render); };
  const resize = () => {
    const { width, height } = panel.getBoundingClientRect();
    if (width < 1 || height < 1 || !camera || !renderer) return;
    renderer.setSize(width, height, false);
    uniforms.uRadius.value = LENS_RADIUS * renderer.getPixelRatio();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    scheduleRender();
  };
  const isPaused = () => !visible || document.hidden || reduced.matches || document.body.classList.contains('title-paused');
  const updatePointer = (event: PointerEvent) => {
    if (isPaused() || event.pointerType === 'touch' || !lens || !renderer) return;
    const rect = panel.getBoundingClientRect();
    const ratio = renderer.getPixelRatio();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    uniforms.uPointer.value.set(x * ratio, (rect.height - y) * ratio);
    uniforms.uHover.value = 1;
    lens.style.setProperty('--lens-x', `${x}px`);
    lens.style.setProperty('--lens-y', `${y}px`);
    lens.classList.add('is-visible');
    scheduleRender();
  };
  const clearPointer = () => {
    uniforms.uHover.value = 0;
    uniforms.uPointer.value.set(-10000, -10000);
    lens?.classList.remove('is-visible');
    scheduleRender();
  };
  const sync = () => {
    const paused = isPaused();
    panel.classList.toggle('is-paused', paused);
    if (paused) clearPointer();
    else scheduleRender();
  };
  const resizeObserver = new ResizeObserver(resize);
  const mutation = new MutationObserver(sync);
  const onLeave = () => clearPointer();
  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    resizeObserver.disconnect();
    mutation.disconnect();
    panel.removeEventListener('pointermove', updatePointer);
    panel.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', sync);
    mono?.geometries.forEach(geometry => geometry.dispose());
    mono?.materials.forEach(material => material.dispose());
    renderer?.dispose();
    renderer?.domElement.remove();
    lens?.remove();
  };
  window.addEventListener('pagehide', dispose, { once: true });

  fetch(SCENE.dataUrl)
    .then(response => { if (!response.ok) throw new Error(`Profile data request failed: ${response.status}`); return response.json() as Promise<PackedProfile>; })
    .then(async profile => {
      if (disposed) return;
      const font = await new FontLoader().loadAsync(SCENE.fontUrl);
      if (disposed) return;
      camera = new THREE.PerspectiveCamera(SCENE.fov, 1, 0.1, 2000);
      camera.position.set(SCENE.lookAtX, SCENE.lookAtY, SCENE.displayCameraZ);
      camera.lookAt(SCENE.lookAtX, SCENE.lookAtY, 0);
      mono = makeGlyphScene(profile, font, uniforms);
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.className = 'ascii-profile-canvas ascii-profile-mono';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      panel.append(renderer.domElement);
      lens = document.createElement('div');
      lens.className = 'ascii-profile-lens';
      lens.style.width = lens.style.height = `${LENS_RADIUS * 2}px`;
      panel.style.setProperty('--lens-radius', `${LENS_RADIUS}px`);
      lens.setAttribute('aria-hidden', 'true');
      panel.append(lens);
      resizeObserver.observe(panel);
      resize();
      panel.addEventListener('pointermove', updatePointer, { passive: true });
      panel.addEventListener('pointerleave', onLeave, { passive: true });
      document.addEventListener('visibilitychange', sync);
      reduced.addEventListener('change', sync);
      mutation.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
      observer.observe(panel);
      sync();
    })
    .catch(error => console.warn('ASCII profile could not be initialized.', error));
}

initAsciiProfile();
