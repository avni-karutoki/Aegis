import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AgentId,
  AgentNodeData,
  SimulationScenario,
  SimulationStep,
} from '../../types/sentinel';
import {
  createBrushedMetalTexture,
  createContactShadowTexture,
  detectSoftwareWebGL,
  scheduleSoftwareFrame,
} from '../../three/webglUtils';

interface NetworkGraph3DProps {
  agents: AgentNodeData[];
  selectedAgentId: AgentId;
  hoveredAgentId: AgentId | null;
  activePacketPaths: [AgentId, AgentId][];
  scenario: SimulationScenario;
  step: SimulationStep;
  onSelectAgent: (id: AgentId) => void;
  onHoverAgent: (id: AgentId | null) => void;
}

const _mouse = new THREE.Vector2();
const _tempVec = new THREE.Vector3();

const MESH_PAIRS: [AgentId, AgentId][] = [
  ['A', 'B'],
  ['A', 'C'],
  ['A', 'D'],
  ['B', 'C'],
  ['B', 'D'],
  ['C', 'D'],
];

export const NetworkGraph3D: React.FC<NetworkGraph3DProps> = ({
  agents,
  selectedAgentId,
  hoveredAgentId,
  activePacketPaths,
  scenario,
  step,
  onSelectAgent,
  onHoverAgent,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const liveRef = useRef({
    agents,
    selectedAgentId,
    hoveredAgentId,
    activePacketPaths,
    scenario,
    step,
    onSelectAgent,
    onHoverAgent,
  });
  liveRef.current = {
    agents,
    selectedAgentId,
    hoveredAgentId,
    activePacketPaths,
    scenario,
    step,
    onSelectAgent,
    onHoverAgent,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || 840;
    const height = container.clientHeight || 520;

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
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a07, 0.042);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 2.35, 7.2);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTex;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xa7f3d0, 0x050a07, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb8ff2e, 1.4);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const metalTex = createBrushedMetalTexture(renderer.capabilities.getMaxAnisotropy());
    const shadowTex = createContactShadowTexture();

    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // Subtle spatial floor grid ring
    const floorGridRingGeo = new THREE.RingGeometry(3.2, 3.24, 96);
    const floorGridRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const floorRing = new THREE.Mesh(floorGridRingGeo, floorGridRingMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = -2.1;
    networkGroup.add(floorRing);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 7.5),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.6,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.12;
    networkGroup.add(shadowPlane);

    // Central Consensus Hub
    const hubGroup = new THREE.Group();
    const hubBody = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 1),
      new THREE.MeshPhysicalMaterial({
        color: 0x11241a,
        map: metalTex,
        metalness: 0.9,
        roughness: 0.25,
        clearcoat: 0.7,
      })
    );
    const hubRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.018, 12, 64),
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x059669,
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    hubRing.rotation.x = Math.PI / 2.2;
    hubGroup.add(hubBody, hubRing);
    networkGroup.add(hubGroup);

    // Agent 3D Nodes & Raycast Proxies
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);

    const clickProxies: THREE.Mesh[] = [];
    const nodeVisuals = new Map<
      AgentId,
      {
        group: THREE.Group;
        coreMat: THREE.MeshStandardMaterial;
        ringMat: THREE.MeshStandardMaterial;
        haloMesh: THREE.Mesh;
        pos: THREE.Vector3;
      }
    >();

    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: 0x13221a,
      map: metalTex,
      metalness: 0.92,
      roughness: 0.24,
      clearcoat: 0.65,
    });

    agents.forEach((agent) => {
      const pos = new THREE.Vector3(...agent.position3D);
      const nGroup = new THREE.Group();
      nGroup.position.copy(pos);

      // Part 1: Architectural Octagonal Chassis
      const chassis = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.52, 0.34, 8), chassisMat);
      // Part 2: Glowing Status Core Prism
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xb8ff2e,
        emissive: 0x84cc16,
        emissiveIntensity: 1.2,
        roughness: 0.15,
        metalness: 0.35,
      });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), coreMat);
      core.position.y = 0.28;

      // Part 3: Machined Collar Ring
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x065f46,
        emissiveIntensity: 0.6,
        metalness: 0.85,
        roughness: 0.2,
      });
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.024, 14, 56), ringMat);
      collar.rotation.x = Math.PI / 2;

      // Part 4: Selection Halo Ring
      const haloMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.68, 0.75, 48),
        new THREE.MeshBasicMaterial({
          color: 0xb8ff2e,
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide,
        })
      );
      haloMesh.rotation.x = -Math.PI / 2;
      haloMesh.position.y = -0.15;

      // Proxy Hit Sphere on Layer 1 for crisp raycasting
      const proxy = new THREE.Mesh(
        new THREE.SphereGeometry(0.82, 12, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.layers.set(1);
      proxy.userData.agentId = agent.id;
      clickProxies.push(proxy);

      nGroup.add(chassis, core, collar, haloMesh, proxy);
      networkGroup.add(nGroup);

      nodeVisuals.set(agent.id, {
        group: nGroup,
        coreMat,
        ringMat,
        haloMesh,
        pos: pos.clone(),
      });
    });

    // Curved Conduits Between All Agent Pairs + Hub Links
    const curveMap = new Map<string, THREE.CatmullRomCurve3>();
    const conduitMeshes: { key: string; a: AgentId; b: AgentId; mat: THREE.MeshStandardMaterial }[] = [];

    MESH_PAIRS.forEach(([a, b]) => {
      const pA = nodeVisuals.get(a)!.pos;
      const pB = nodeVisuals.get(b)!.pos;
      const mid = pA.clone().add(pB).multiplyScalar(0.5);
      mid.y += 0.42;
      const curve = new THREE.CatmullRomCurve3([pA, mid, pB]);
      curveMap.set(`${a}-${b}`, curve);
      curveMap.set(`${b}-${a}`, new THREE.CatmullRomCurve3([pB, mid, pA]));

      const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.022, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x064e3b,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.52,
        roughness: 0.3,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      networkGroup.add(tubeMesh);
      conduitMeshes.push({ key: `${a}-${b}`, a, b, mat: tubeMat });
    });

    // Animated Data Packets Pool (up to 6 simultaneous streams)
    const packetGeo = new THREE.SphereGeometry(0.085, 14, 14);
    const packetPool = Array.from({ length: 6 }, () => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xb8ff2e });
      const mesh = new THREE.Mesh(packetGeo, mat);
      mesh.visible = false;
      networkGroup.add(mesh);
      return { mesh, mat };
    });

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.64;

    // Pointer Interaction (throttled move + click)
    let lastMove = 0;
    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMove < 45) return;
      lastMove = now;
      updatePointer(e);
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(clickProxies, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.agentId as AgentId;
        renderer.domElement.style.cursor = 'pointer';
        if (liveRef.current.hoveredAgentId !== hitId) {
          liveRef.current.onHoverAgent(hitId);
        }
      } else {
        renderer.domElement.style.cursor = 'grab';
        if (liveRef.current.hoveredAgentId !== null) {
          liveRef.current.onHoverAgent(null);
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(clickProxies, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.agentId as AgentId;
        liveRef.current.onSelectAgent(hitId);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

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

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      const {
        agents: currentAgents,
        selectedAgentId: selId,
        hoveredAgentId: hovId,
        activePacketPaths: packets,
        scenario: scen,
      } = liveRef.current;

      const motionMult = prefersReducedMotion ? 0.08 : 1;
      networkGroup.rotation.y = Math.sin(elapsed * 0.16 * motionMult) * 0.18;
      hubBody.rotation.y += delta * 0.45 * motionMult;
      hubRing.rotation.z -= delta * 0.35 * motionMult;

      // Update Agent Nodes
      currentAgents.forEach((a, idx) => {
        const vis = nodeVisuals.get(a.id);
        if (!vis) return;
        const isFocus = a.id === selId || a.id === hovId;
        const targetScale = isFocus ? 1.22 : 1.0;
        const s = THREE.MathUtils.damp(vis.group.scale.x, targetScale, 8, delta);
        vis.group.scale.setScalar(s);
        vis.group.position.y = vis.pos.y + Math.sin(elapsed * 1.4 + idx * 1.5) * 0.06 * motionMult;

        const haloMat = vis.haloMesh.material as THREE.MeshBasicMaterial;
        haloMat.opacity = THREE.MathUtils.damp(haloMat.opacity, isFocus ? 0.85 : 0.0, 8, delta);

        if (a.status === 'Alert') {
          vis.coreMat.color.setHex(0xf59e0b);
          vis.coreMat.emissive.setHex(0xd97706);
          vis.coreMat.emissiveIntensity = 2.4;
          vis.ringMat.color.setHex(0xf59e0b);
        } else if (a.status === 'Caution') {
          vis.coreMat.color.setHex(0xef4444);
          vis.coreMat.emissive.setHex(0xdc2626);
          vis.coreMat.emissiveIntensity = 2.2;
          vis.ringMat.color.setHex(0xef4444);
        } else if (a.status === 'Verifying') {
          vis.coreMat.color.setHex(0xb8ff2e);
          vis.coreMat.emissive.setHex(0x84cc16);
          vis.coreMat.emissiveIntensity = 2.0;
          vis.ringMat.color.setHex(0xb8ff2e);
        } else if (isFocus) {
          vis.coreMat.color.setHex(0xb8ff2e);
          vis.coreMat.emissive.setHex(0x84cc16);
          vis.coreMat.emissiveIntensity = 1.7;
          vis.ringMat.color.setHex(0xb8ff2e);
        } else {
          vis.coreMat.color.setHex(0x10b981);
          vis.coreMat.emissive.setHex(0x059669);
          vis.coreMat.emissiveIntensity = 1.0;
          vis.ringMat.color.setHex(0x34d399);
        }
      });

      // Highlight Active Conduits & Animate Packets
      conduitMeshes.forEach((cm) => {
        const isActive = packets.some(
          ([from, to]) => (from === cm.a && to === cm.b) || (from === cm.b && to === cm.a)
        );
        if (isActive) {
          cm.mat.color.setHex(scen === 'unreliable' ? 0xef4444 : 0xb8ff2e);
          cm.mat.emissive.setHex(scen === 'unreliable' ? 0xb91c1c : 0x65a30d);
          cm.mat.opacity = 0.95;
        } else {
          cm.mat.color.setHex(0x10b981);
          cm.mat.emissive.setHex(0x064e3b);
          cm.mat.opacity = 0.35;
        }
      });

      packetPool.forEach((pkt, idx) => {
        const pair = packets[idx];
        if (!pair) {
          pkt.mesh.visible = false;
          return;
        }
        const curve = curveMap.get(`${pair[0]}-${pair[1]}`);
        if (!curve) {
          pkt.mesh.visible = false;
          return;
        }
        pkt.mesh.visible = true;
        pkt.mat.color.setHex(scen === 'unreliable' ? 0xf87171 : 0xb8ff2e);
        const t = ((elapsed * 1.15 + idx * 0.18) % 1);
        curve.getPointAt(t, _tempVec);
        pkt.mesh.position.copy(_tempVec);
      });

      controls.update();
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
      window.cancelAnimationFrame(frameId);
      timerIds.forEach((id) => window.clearTimeout(id));
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });

      metalTex.dispose();
      shadowTex.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (contextLost) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#07110B] rounded-xl border border-white/10">
        <p className="text-sm text-[#9FB2A5]">
          3D network viewport paused — use the agent selectors to inspect nodes.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      aria-label="Interactive 4-Agent Aegis Network"
    />
  );
};
