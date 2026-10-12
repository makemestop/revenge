/* three-scene.js — 3D-фигура: крутится мышью/пальцем, меняет форму и материал. Грузится, только когда блок рядом */
const view = document.getElementById('threeView');
const canvas = document.getElementById('threeCanvas');

R.whenNear(view, async () => {
  let THREE, RoomEnvironment;
  try {
    THREE = await import('three');
    ({ RoomEnvironment } = await import('../vendor/RoomEnvironment.js'));
  } catch (e) { fail(); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { fail(); return; }
  renderer.setPixelRatio(R.dpr(R.small() ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.PointLight(0xff4d9a, 30, 20); rim.position.set(-3, -1, 2); scene.add(rim);
  const rim2 = new THREE.PointLight(0x3de0ff, 30, 20); rim2.position.set(3, 1, -2); scene.add(rim2);

  // орбиты из светящихся шариков — их видно сквозь стекло
  const orbit = new THREE.Group();
  const cols = [0xff3d77, 0xffb800, 0x3de0ff, 0x7b5cff, 0xd7ff3d];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09 + Math.random() * 0.1, 20, 20), new THREE.MeshBasicMaterial({ color: cols[i % cols.length] }));
    const a = (i / 14) * Math.PI * 2, r = 2.1 + Math.random() * 0.5;
    m.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 1.6, Math.sin(a) * r - 0.6);
    orbit.add(m);
  }
  scene.add(orbit);
  // звёздная пыль
  const pg = new THREE.BufferGeometry();
  const pos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) { pos[i * 3] = (Math.random() - 0.5) * 14; pos[i * 3 + 1] = (Math.random() - 0.5) * 10; pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 3; }
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xcdbfff, size: 0.025, transparent: true, opacity: 0.7 }));
  scene.add(dust);

  // формы
  const shapes = {
    knot: () => new THREE.TorusKnotGeometry(1, 0.34, 220, 36),
    blob: () => new THREE.IcosahedronGeometry(1.35, 24),
    crystal: () => new THREE.IcosahedronGeometry(1.45, 0),
    ring: () => new THREE.TorusGeometry(1.15, 0.42, 48, 120),
  };
  // материалы
  const mats = {
    glass: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 1.4, ior: 1.45, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1, envMapIntensity: 1.4 }),
    chrome: () => new THREE.MeshPhysicalMaterial({ color: 0xe8e6ff, metalness: 1, roughness: 0.14, clearcoat: 1, envMapIntensity: 2.6 }),
    neon: () => new THREE.MeshStandardMaterial({ color: 0x120020, emissive: 0xff2bd6, emissiveIntensity: 1.6, wireframe: true }),
    pastel: () => new THREE.MeshPhysicalMaterial({ color: 0xffb7c5, roughness: 0.55, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.4, sheen: 1, sheenColor: new THREE.Color(0xb6a4ff) }),
  };
  let shapeName = 'knot', matName = 'glass';
  const mesh = new THREE.Mesh(shapes.knot(), mats.glass());
  scene.add(mesh);
  let basePos = null;

  function setShape(n) {
    shapeName = n;
    morph(() => {
      mesh.geometry.dispose();
      mesh.geometry = shapes[n]();
      basePos = n === 'blob' ? mesh.geometry.attributes.position.array.slice() : null;
      mesh.material.flatShading = n === 'crystal';
      mesh.material.needsUpdate = true;
    });
  }
  function setMat(n) {
    matName = n;
    morph(() => {
      mesh.material.dispose();
      mesh.material = mats[n]();
      mesh.material.flatShading = shapeName === 'crystal';
      dust.material.color.set(n === 'neon' ? 0xff7bf0 : 0xcdbfff);
    });
  }
  // смена с «пружинкой»: сжать → поменять → раздуть
  let scaleV = 0, pending = null;
  function morph(fn) { const prev = pending; pending = prev ? () => { prev(); fn(); } : fn; }

  function chips(box, attr, fn) {
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      box.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-on', c === b));
      fn(b.dataset[attr]);
    });
  }
  chips(document.getElementById('shapeChips'), 'shape', setShape);
  chips(document.getElementById('matChips'), 'mat', setMat);

  // вращение
  let rx = 0.3, ry = 0, vx = 0, vy = 0.004, dragging = false, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    vy = (e.clientX - lx) * 0.006; vx = (e.clientY - ly) * 0.006;
    lx = e.clientX; ly = e.clientY;
  });
  const up = () => (dragging = false);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  function resize() {
    const r = view.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.position.z = r.width < 480 ? 8.8 : 8;
    camera.updateProjectionMatrix();
  }
  R.onSize(view, resize);
  resize();

  let lastScroll = scrollY, s = 1;
  R.loop(view, (dt, t) => {
    // скролл тоже крутит фигуру
    const ds = scrollY - lastScroll; lastScroll = scrollY;
    vy += ds * 0.00012;
    if (!dragging) { vx *= 0.94; vy = vy * 0.96 + 0.004 * 0.04; }
    rx += vx; ry += vy;
    mesh.rotation.x = rx; mesh.rotation.y = ry;
    // пружинная смена формы
    if (pending && s < 0.05) { pending(); pending = null; }
    const target = pending ? 0 : 1;
    scaleV += (target - s) * 0.18; scaleV *= 0.72; s += scaleV;
    if (pending) s = Math.max(0, s - dt * 6);
    mesh.scale.setScalar(Math.max(0.0001, s));
    // «живая» капля
    if (basePos) {
      const p = mesh.geometry.attributes.position;
      const a = p.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = basePos[i], y = basePos[i + 1], z = basePos[i + 2];
        const k = 1 + 0.13 * Math.sin(x * 2.2 + t * 1.6) * Math.sin(y * 2.4 + t * 1.3) * Math.sin(z * 2 + t);
        a[i] = x * k; a[i + 1] = y * k; a[i + 2] = z * k;
      }
      p.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
    if (matName === 'neon') mesh.material.emissive.setHSL((t * 0.08) % 1, 1, 0.55);
    orbit.rotation.y = t * 0.25;
    orbit.rotation.x = Math.sin(t * 0.2) * 0.2;
    dust.rotation.y = t * 0.02;
    rim.position.x = Math.sin(t * 0.7) * 3.5;
    renderer.render(scene, camera);
  });

  function fail() {
    document.getElementById('threeFallback').hidden = false;
    canvas.style.display = 'none';
  }
}, '500px');
