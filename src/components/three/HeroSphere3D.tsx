import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { AgentId, SimulationScenario, SimulationStep } from '../../types/sentinel';
import {
  createBrushedMetalTexture,
  createContactShadowTexture,
  detectSoftwareWebGL,
  scheduleSoftwareFrame,
} from '../../three/webglUtils';

interface HeroSphere3DProps {
  selectedAgentId: AgentId;
  scenario: SimulationScenario;
  step: SimulationStep;
  onSelectAgent?: (id: AgentId) => void;
  resetTrigger?: number;
  onUserTransformChange?: (transformed: boolean) => void;
}

const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);
const _qYaw = new THREE.Quaternion();
const _qPitch = new THREE.Quaternion();
const _identityQuat = new THREE.Quaternion();
const _mouse = new THREE.Vector2();

const HOME_CAMERA_Y = 0.41;
const HOME_CAMERA_Z = 10.6;
const MIN_CAMERA_Z = 6.2;
const MAX_CAMERA_Z = 15.8;

const NODE_TARGET_YAW: Record<AgentId, number> = {
  A: 0.45,
  B: -0.9,
  C: -2.2,
  D: 1.85,
};

export const HeroSphere3D: React.FC<HeroSphere3DProps> = ({
  selectedAgentId,
  scenario,
  step,
  onSelectAgent,
  resetTrigger = 0,
  onUserTransformChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const stateRef = useRef({
    selectedAgentId,
    scenario,
    step,
    onSelectAgent,
    onUserTransformChange,
  });
  stateRef.current = {
    selectedAgentId,
    scenario,
    step,
    onSelectAgent,
    onUserTransformChange,
  };

  const resetFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (resetTrigger > 0) {
      resetFnRef.current?.();
    }
  }, [resetTrigger]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 490;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.outline = 'none';
    renderer.domElement.tabIndex = 0;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a07, 0.033);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, HOME_CAMERA_Y, HOME_CAMERA_Z);
    camera.lookAt(0, 0, 0);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTex;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Three-point + Studio Softbox Lighting
    const hemiLight = new THREE.HemisphereLight(0xa7f3d0, 0x050a07, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf6fff2, 2.4);
    keyLight.position.set(4.5, 5.5, 4.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.camera.left = -3.5;
      keyLight.shadow.camera.right = 3.5;
      keyLight.shadow.camera.top = 3.5;
      keyLight.shadow.camera.bottom = -3.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb8ff2e, 1.9);
    rimLight.position.set(-5.0, 2.2, -3.5);
    scene.add(rimLight);

    const emeraldFill = new THREE.PointLight(0x10b981, 3.2, 14, 1.8);
    emeraldFill.position.set(2.4, -2.5, 2.8);
    scene.add(emeraldFill);

    const rectLights: THREE.RectAreaLight[] = [];
    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softboxTop = new THREE.RectAreaLight(0xd9f99d, 4.2, 4.5, 1.6);
      softboxTop.position.set(0, 4.5, 2.5);
      softboxTop.lookAt(0, 0, 0);
      scene.add(softboxTop);
      rectLights.push(softboxTop);
    }

    // Procedural Textures
    const metalTex = createBrushedMetalTexture(renderer.capabilities.getMaxAnisotropy());
    const shadowTex = createContactShadowTexture();

    // User-Controlled Outer Transform Group (allows free 360° orientation + X/Y movement)
    const userTransformGroup = new THREE.Group();
    scene.add(userTransformGroup);

    // Composite Hero Group (preserves all original globe animations inside userTransformGroup)
    const heroGroup = new THREE.Group();
    userTransformGroup.add(heroGroup);

    // 1. Inner Brushed Obsidian-Titanium Core
    const coreGeo = new THREE.IcosahedronGeometry(1.16, 2);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f1c15,
      map: metalTex,
      metalness: 0.92,
      roughness: 0.24,
      anisotropy: 0.8,
      clearcoat: 0.45,
      clearcoatRoughness: 0.22,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.castShadow = !isSoftwareGl;
    coreMesh.receiveShadow = !isSoftwareGl;
    heroGroup.add(coreMesh);

    // 2. Inner Glowing Core Nucleus (pulsing emerald energy heart)
    const nucleusGeo = new THREE.OctahedronGeometry(0.62, 1);
    const nucleusMat = new THREE.MeshStandardMaterial({
      color: 0xb8ff2e,
      emissive: 0x65a30d,
      emissiveIntensity: 1.4,
      roughness: 0.15,
      metalness: 0.3,
    });
    const nucleusMesh = new THREE.Mesh(nucleusGeo, nucleusMat);
    heroGroup.add(nucleusMesh);

    // 3. Geodesic Luminous Lattice Cage
    const cageSource = new THREE.IcosahedronGeometry(1.32, 2);
    const cageEdges = new THREE.EdgesGeometry(cageSource);
    cageSource.dispose();
    const cageMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.55,
    });
    const cageLines = new THREE.LineSegments(cageEdges, cageMat);
    heroGroup.add(cageLines);

    // 4. Outer Optical Emerald Glass Containment Shell
    const shellGeo = new THREE.SphereGeometry(1.62, 48, 36);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      metalness: 0.05,
      roughness: 0.08,
      transmission: isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: isSoftwareGl ? 0.22 : 0.95,
      ior: 1.52,
      thickness: 1.2,
      attenuationColor: new THREE.Color(0x064e3b),
      attenuationDistance: 2.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      depthWrite: false,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    shellMesh.renderOrder = 2;
    heroGroup.add(shellMesh);

    // 5. Three Precision Orbital Gimbal Rings
    const gimbalGroup = new THREE.Group();
    heroGroup.add(gimbalGroup);

    const ringConfigs = [
      { radius: 1.98, tube: 0.032, tiltX: 0.55, tiltY: 0.25, color: 0x94a3b8, rough: 0.2 },
      { radius: 2.22, tube: 0.022, tiltX: -0.78, tiltY: 0.65, color: 0xb8ff2e, rough: 0.35 },
      { radius: 2.44, tube: 0.018, tiltX: 1.15, tiltY: -0.45, color: 0x34d399, rough: 0.4 },
    ];

    const rings: THREE.Mesh[] = [];
    ringConfigs.forEach((cfg, idx) => {
      const rGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 20, 120);
      const rMat = new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        metalness: idx === 0 ? 0.96 : 0.72,
        roughness: cfg.rough,
        emissive: idx === 1 ? 0x4d7c0f : 0x064e3b,
        emissiveIntensity: idx === 1 ? 0.45 : 0.2,
        clearcoat: 0.6,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.rotation.set(cfg.tiltX, cfg.tiltY, 0);
      gimbalGroup.add(rMesh);
      rings.push(rMesh);
    });

    // 6. Four Satellite Agent Node Assemblies (A, B, C, D) + Layer 1 Click Proxies
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const clickProxies: THREE.Mesh[] = [];

    const nodePositions: Record<AgentId, [number, number, number]> = {
      A: [-2.05, 1.05, 1.1],
      B: [2.15, 0.85, 0.75],
      C: [1.55, -1.25, 1.4],
      D: [-1.75, -1.05, -1.35],
    };

    const nodeEntries: {
      id: AgentId;
      group: THREE.Group;
      coreMat: THREE.MeshStandardMaterial;
      haloMat: THREE.MeshBasicMaterial;
      linkLine: THREE.Line;
      linkMat: THREE.LineBasicMaterial;
    }[] = [];

    const satHousingGeo = new THREE.OctahedronGeometry(0.22, 0);
    const satRingGeo = new THREE.TorusGeometry(0.32, 0.016, 12, 48);
    const satProxyGeo = new THREE.SphereGeometry(0.45, 10, 10);
    const satProxyMat = new THREE.MeshBasicMaterial({ visible: false });
    const satHousingMat = new THREE.MeshStandardMaterial({
      color: 0x1e2923,
      metalness: 0.9,
      roughness: 0.25,
    });

    (['A', 'B', 'C', 'D'] as AgentId[]).forEach((id) => {
      const pos = nodePositions[id];
      const nGroup = new THREE.Group();
      nGroup.position.set(pos[0], pos[1], pos[2]);

      const housing = new THREE.Mesh(satHousingGeo, satHousingMat);
      const satCoreMat = new THREE.MeshStandardMaterial({
        color: 0xb8ff2e,
        emissive: 0x84cc16,
        emissiveIntensity: 1.2,
        roughness: 0.2,
      });
      const satCore = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), satCoreMat);

      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xb8ff2e,
        transparent: true,
        opacity: 0.55,
      });
      const satHalo = new THREE.Mesh(satRingGeo, haloMat);
      satHalo.rotation.x = Math.PI / 2.4;

      const proxy = new THREE.Mesh(satProxyGeo, satProxyMat);
      proxy.layers.set(1);
      proxy.userData.agentId = id;
      clickProxies.push(proxy);

      nGroup.add(housing, satCore, satHalo, proxy);
      heroGroup.add(nGroup);

      // Luminous Link to Core
      const linkPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(pos[0], pos[1], pos[2])];
      const linkGeo = new THREE.BufferGeometry().setFromPoints(linkPts);
      const linkMat = new THREE.LineBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.45,
      });
      const linkLine = new THREE.Line(linkGeo, linkMat);
      heroGroup.add(linkLine);

      nodeEntries.push({ id, group: nGroup, coreMat: satCoreMat, haloMat, linkLine, linkMat });
    });

    // 7. Floating Metallic Obsidian Shards & Luminous Emerald Particles (InstancedMesh)
    const shardCount = 34;
    const shardGeo = new THREE.TetrahedronGeometry(0.09, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x1f3528,
      metalness: 0.88,
      roughness: 0.28,
      emissive: 0x065f46,
      emissiveIntensity: 0.35,
    });
    const shards = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    shards.frustumCulled = false;

    const shardData = Array.from({ length: shardCount }, (_, i) => {
      const angle = (i / shardCount) * Math.PI * 2;
      const radius = 2.6 + (i % 5) * 0.38;
      const yOffset = ((i % 7) - 3) * 0.48;
      const scaleVal = 0.65 + (i % 4) * 0.35;
      return { angle, radius, yOffset, scaleVal, speed: 0.12 + (i % 3) * 0.05 };
    });

    shardData.forEach((d, i) => {
      _vec3.set(Math.cos(d.angle) * d.radius, d.yOffset, Math.sin(d.angle) * d.radius);
      _euler.set(i * 0.5, i * 0.7, i * 0.3);
      _quat.setFromEuler(_euler);
      _scale.setScalar(d.scaleVal);
      _mat4.compose(_vec3, _quat, _scale);
      shards.setMatrixAt(i, _mat4);
    });
    shards.instanceMatrix.needsUpdate = true;
    shards.computeBoundingSphere();
    heroGroup.add(shards);

    // 8. Grounded Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(5.8, 5.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.45;
    scene.add(shadowPlane);

    // Free-Movement User Control State (360° rotation + inertia + X/Y pan + zoom)
    const targetQuat = new THREE.Quaternion();
    const targetPos = new THREE.Vector2(0, 0);
    let targetZoom = HOME_CAMERA_Z;
    let angVelX = 0;
    let angVelY = 0;
    let lastMoveTime = 0;
    let wasTransformed = false;

    const notifyTransformState = () => {
      const moved =
        Math.abs(targetPos.x) > 0.03 ||
        Math.abs(targetPos.y) > 0.03 ||
        Math.abs(targetZoom - HOME_CAMERA_Z) > 0.08 ||
        targetQuat.angleTo(_identityQuat) > 0.04;
      if (moved !== wasTransformed) {
        wasTransformed = moved;
        stateRef.current.onUserTransformChange?.(moved);
      }
    };

    const resetUserTransform = () => {
      targetQuat.identity();
      targetPos.set(0, 0);
      targetZoom = HOME_CAMERA_Z;
      angVelX = 0;
      angVelY = 0;
      notifyTransformState();
    };
    resetFnRef.current = resetUserTransform;

    // Pointer / Multi-touch Tracking
    const activePointers = new Map<number, { x: number; y: number }>();
    let downX = 0;
    let downY = 0;
    let dragDistance = 0;
    let prevPinchDist = 0;
    let prevMidX = 0;
    let prevMidY = 0;

    const getPointerMetrics = () => {
      const pts = Array.from(activePointers.values());
      if (pts.length < 2) return null;
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      return {
        midX: (pts[0].x + pts[1].x) * 0.5,
        midY: (pts[0].y + pts[1].y) * 0.5,
        dist: Math.hypot(dx, dy),
      };
    };

    const panByPixels = (dx: number, dy: number) => {
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const visibleHeight = 2 * Math.tan(vFov * 0.5) * camera.position.z;
      const unitsPerPx = visibleHeight / (container.clientHeight || 490);
      targetPos.x = THREE.MathUtils.clamp(targetPos.x + dx * unitsPerPx, -4.6, 4.6);
      targetPos.y = THREE.MathUtils.clamp(targetPos.y - dy * unitsPerPx, -1.9, 1.9);
      notifyTransformState();
    };

    const domEl = renderer.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      domEl.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        downX = e.clientX;
        downY = e.clientY;
        dragDistance = 0;
        angVelX = 0;
        angVelY = 0;
        domEl.style.cursor = e.button === 2 || e.shiftKey ? 'move' : 'grabbing';
      } else if (activePointers.size === 2) {
        const m = getPointerMetrics();
        if (m) {
          prevMidX = m.midX;
          prevMidY = m.midY;
          prevPinchDist = m.dist;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) {
        // Subtle hover cursor when hovering over satellite node proxies
        const rect = domEl.getBoundingClientRect();
        _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(_mouse, camera);
        const hits = raycaster.intersectObjects(clickProxies, false);
        domEl.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
        return;
      }

      const prev = activePointers.get(e.pointerId)!;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        dragDistance += Math.hypot(dx, dy);
        const isPanMode =
          (e.buttons & 2) !== 0 || (e.buttons & 4) !== 0 || e.shiftKey;

        if (isPanMode) {
          panByPixels(dx, dy);
        } else {
          const rotSpeed = 0.0068;
          const rotY = dx * rotSpeed;
          const rotX = dy * rotSpeed;
          _qYaw.setFromAxisAngle(_axisY, rotY);
          _qPitch.setFromAxisAngle(_axisX, rotX);
          targetQuat.premultiply(_qYaw).premultiply(_qPitch).normalize();

          const now = performance.now();
          const dtSec = Math.max((now - lastMoveTime) / 1000, 0.008);
          lastMoveTime = now;
          angVelY = THREE.MathUtils.clamp(rotY / dtSec, -10, 10);
          angVelX = THREE.MathUtils.clamp(rotX / dtSec, -10, 10);
          notifyTransformState();
        }
      } else if (activePointers.size === 2) {
        const m = getPointerMetrics();
        if (m) {
          panByPixels(m.midX - prevMidX, m.midY - prevMidY);
          if (prevPinchDist > 0) {
            const distDelta = prevPinchDist - m.dist;
            targetZoom = THREE.MathUtils.clamp(
              targetZoom + distDelta * 0.025,
              MIN_CAMERA_Z,
              MAX_CAMERA_Z
            );
            notifyTransformState();
          }
          prevMidX = m.midX;
          prevMidY = m.midY;
          prevPinchDist = m.dist;
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const wasSingle = activePointers.size === 1;
      activePointers.delete(e.pointerId);
      if (domEl.hasPointerCapture(e.pointerId)) {
        domEl.releasePointerCapture(e.pointerId);
      }

      if (activePointers.size === 0) {
        domEl.style.cursor = 'grab';
        // Discard stale velocity if pointer paused before lifting
        if (performance.now() - lastMoveTime > 90) {
          angVelX = 0;
          angVelY = 0;
        }
        // Check crisp node click
        if (wasSingle && e.button === 0 && dragDistance < 6) {
          const rect = domEl.getBoundingClientRect();
          _mouse.x = ((downX - rect.left) / rect.width) * 2 - 1;
          _mouse.y = -((downY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(_mouse, camera);
          const hits = raycaster.intersectObjects(clickProxies, false);
          if (hits.length > 0) {
            const hitId = hits[0].object.userData.agentId as AgentId;
            stateRef.current.onSelectAgent?.(hitId);
          }
        }
      } else if (activePointers.size === 1) {
        angVelX = 0;
        angVelY = 0;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleDoubleClick = () => {
      resetUserTransform();
    };

    // Only intercept wheel when user pinches (ctrlKey) or holds Meta/Alt/Shift so normal page scroll is unobstructed
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) return;
      e.preventDefault();
      targetZoom = THREE.MathUtils.clamp(
        targetZoom + e.deltaY * 0.012,
        MIN_CAMERA_Z,
        MAX_CAMERA_Z
      );
      notifyTransformState();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R' || e.key === '0') {
        resetUserTransform();
        return;
      }
      const stepRot = 0.12;
      const stepPan = 0.28;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) targetPos.x = THREE.MathUtils.clamp(targetPos.x - stepPan, -4.6, 4.6);
        else {
          _qYaw.setFromAxisAngle(_axisY, -stepRot);
          targetQuat.premultiply(_qYaw).normalize();
        }
        notifyTransformState();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) targetPos.x = THREE.MathUtils.clamp(targetPos.x + stepPan, -4.6, 4.6);
        else {
          _qYaw.setFromAxisAngle(_axisY, stepRot);
          targetQuat.premultiply(_qYaw).normalize();
        }
        notifyTransformState();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.shiftKey) targetPos.y = THREE.MathUtils.clamp(targetPos.y + stepPan, -1.9, 1.9);
        else {
          _qPitch.setFromAxisAngle(_axisX, -stepRot);
          targetQuat.premultiply(_qPitch).normalize();
        }
        notifyTransformState();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.shiftKey) targetPos.y = THREE.MathUtils.clamp(targetPos.y - stepPan, -1.9, 1.9);
        else {
          _qPitch.setFromAxisAngle(_axisX, stepRot);
          targetQuat.premultiply(_qPitch).normalize();
        }
        notifyTransformState();
      }
    };

    domEl.addEventListener('pointerdown', handlePointerDown);
    domEl.addEventListener('pointermove', handlePointerMove);
    domEl.addEventListener('pointerup', handlePointerUp);
    domEl.addEventListener('pointercancel', handlePointerUp);
    domEl.addEventListener('contextmenu', handleContextMenu);
    domEl.addEventListener('dblclick', handleDoubleClick);
    domEl.addEventListener('wheel', handleWheel, { passive: false });
    domEl.addEventListener('keydown', handleKeyDown);

    // Context loss listeners
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    domEl.addEventListener('webglcontextlost', handleContextLost);
    domEl.addEventListener('webglcontextrestored', handleContextRestored);

    // ResizeObserver for crisp responsive sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    const timerIds: number[] = [];
    let disposed = false;
    let currentYaw = 0;

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      const { selectedAgentId: selId, scenario: scen, step: simStep } = stateRef.current;
      const motionMult = prefersReducedMotion ? 0.08 : 1;

      // Apply smooth rotational inertia after user flicks the globe
      if (activePointers.size === 0 && (Math.abs(angVelX) > 0.005 || Math.abs(angVelY) > 0.005)) {
        _qYaw.setFromAxisAngle(_axisY, angVelY * delta);
        _qPitch.setFromAxisAngle(_axisX, angVelX * delta);
        targetQuat.premultiply(_qYaw).premultiply(_qPitch).normalize();
        const friction = Math.exp(-4.8 * delta);
        angVelX *= friction;
        angVelY *= friction;
        notifyTransformState();
      }

      // Smoothly glide user orientation, position, and zoom
      const quatAlpha = isSoftwareGl ? 1 : 1 - Math.exp(-15 * delta);
      userTransformGroup.quaternion.slerp(targetQuat, quatAlpha);
      userTransformGroup.position.x = THREE.MathUtils.damp(
        userTransformGroup.position.x,
        targetPos.x,
        14,
        delta
      );
      userTransformGroup.position.y = THREE.MathUtils.damp(
        userTransformGroup.position.y,
        targetPos.y,
        14,
        delta
      );
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZoom, 12, delta);

      // Keep grounded shadow plane subtly tracking X position
      shadowPlane.position.x = userTransformGroup.position.x * 0.85;
      shadowMat.opacity = THREE.MathUtils.clamp(
        0.75 - Math.max(0, userTransformGroup.position.y) * 0.22,
        0.2,
        0.8
      );

      // Original globe animation: smoothly rotate hero group toward selected node yaw + gentle idle spin
      const targetYaw = NODE_TARGET_YAW[selId] + elapsed * 0.14 * motionMult;
      currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 3.2, delta);
      heroGroup.rotation.y = currentYaw;
      heroGroup.position.y = Math.sin(elapsed * 0.9 * motionMult) * 0.08;

      // Rotate inner core & gimbals
      coreMesh.rotation.y -= delta * 0.18 * motionMult;
      nucleusMesh.rotation.x += delta * 0.45 * motionMult;
      nucleusMesh.rotation.y += delta * 0.55 * motionMult;

      rings[0].rotation.z += delta * 0.14 * motionMult;
      rings[1].rotation.x += delta * 0.18 * motionMult;
      rings[2].rotation.y -= delta * 0.12 * motionMult;

      // Update active simulation & node highlighting
      const isAlerting = scen === 'threat' && (simStep === 'detecting' || simStep === 'sharing');
      const isUnreliable = scen === 'unreliable' && simStep !== 'idle';

      nodeEntries.forEach((node) => {
        const isSelected = node.id === selId;
        const targetScale = isSelected ? 1.28 : 0.94;
        const nextScale = THREE.MathUtils.damp(node.group.scale.x, targetScale, 6, delta);
        node.group.scale.setScalar(nextScale);

        if (isAlerting && node.id === 'A') {
          node.coreMat.color.setHex(0xf59e0b);
          node.coreMat.emissive.setHex(0xd97706);
          node.coreMat.emissiveIntensity = 2.2;
          node.haloMat.color.setHex(0xf59e0b);
          node.linkMat.color.setHex(0xf59e0b);
          node.linkMat.opacity = 0.9;
        } else if (isUnreliable && node.id === 'D') {
          node.coreMat.color.setHex(0xef4444);
          node.coreMat.emissive.setHex(0xdc2626);
          node.coreMat.emissiveIntensity = 2.0;
          node.haloMat.color.setHex(0xef4444);
          node.linkMat.color.setHex(0xef4444);
          node.linkMat.opacity = 0.85;
        } else if (isSelected) {
          node.coreMat.color.setHex(0xb8ff2e);
          node.coreMat.emissive.setHex(0x84cc16);
          node.coreMat.emissiveIntensity = 2.0;
          node.haloMat.color.setHex(0xb8ff2e);
          node.linkMat.color.setHex(0xb8ff2e);
          node.linkMat.opacity = 0.85;
        } else {
          node.coreMat.color.setHex(0x10b981);
          node.coreMat.emissive.setHex(0x059669);
          node.coreMat.emissiveIntensity = 0.9;
          node.haloMat.color.setHex(0x34d399);
          node.linkMat.color.setHex(0x10b981);
          node.linkMat.opacity = 0.35;
        }
      });

      // Animate floating shards
      if (!prefersReducedMotion) {
        for (let i = 0; i < shardCount; i++) {
          const d = shardData[i];
          const a = d.angle + elapsed * d.speed;
          _vec3.set(
            Math.cos(a) * d.radius,
            d.yOffset + Math.sin(elapsed * 0.8 + i) * 0.14,
            Math.sin(a) * d.radius
          );
          _euler.set(elapsed * 0.4 + i, elapsed * 0.5 + i, i);
          _quat.setFromEuler(_euler);
          _scale.setScalar(d.scaleVal);
          _mat4.compose(_vec3, _quat, _scale);
          shards.setMatrixAt(i, _mat4);
        }
        shards.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        scheduleSoftwareFrame(renderer, tick, (id) => timerIds.push(id));
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      resetFnRef.current = null;
      window.cancelAnimationFrame(frameId);
      timerIds.forEach((id) => window.clearTimeout(id));
      resizeObserver.disconnect();
      domEl.removeEventListener('pointerdown', handlePointerDown);
      domEl.removeEventListener('pointermove', handlePointerMove);
      domEl.removeEventListener('pointerup', handlePointerUp);
      domEl.removeEventListener('pointercancel', handlePointerUp);
      domEl.removeEventListener('contextmenu', handleContextMenu);
      domEl.removeEventListener('dblclick', handleDoubleClick);
      domEl.removeEventListener('wheel', handleWheel);
      domEl.removeEventListener('keydown', handleKeyDown);
      domEl.removeEventListener('webglcontextlost', handleContextLost);
      domEl.removeEventListener('webglcontextrestored', handleContextRestored);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else if (mat) {
          mat.dispose();
        }
      });

      metalTex.dispose();
      shadowTex.dispose();
      envTex.dispose();
      rectLights.forEach((l) => l.dispose());
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  if (contextLost) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-72 h-72 rounded-full border border-[#B8FF2E]/30 bg-gradient-to-br from-[#0F2A1C] to-[#050A07] flex items-center justify-center text-center p-6">
          <div>
            <div className="font-display text-xl font-bold text-[#F4F7F4]">
              Aegis Core
            </div>
            <p className="text-xs text-[#9FB2A5] mt-2">
              4-node collaborative consensus mesh active
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Aegis Sphere — drag to rotate freely, right-drag or Shift+drag to move, pinch or Ctrl+scroll to zoom, double-click to reset"
    />
  );
};
