/* ═══════════════════════════════════════════════════════
   script.js — Portfolio: 3D Scene, Theme Toggle,
   GSAP Animations, Card Tilt & Interactivity
   ═══════════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);

/* ────────────────── GLOBAL CURSOR POSITION ────────────────── */
const cursor = { x: 0, y: 0, nx: 0, ny: 0 };
window.addEventListener('mousemove', e => {
  cursor.x = e.clientX;
  cursor.y = e.clientY;
  cursor.nx = (e.clientX / window.innerWidth) * 2 - 1;   // -1…+1
  cursor.ny = -(e.clientY / window.innerHeight) * 2 + 1;  // -1…+1
});

/* ═══════════════════════════════════════════════════════
   THREE.JS — Rich 3D Scene with cursor-reactive objects
   ═══════════════════════════════════════════════════════ */
(function init3DScene() {
  const canvas = document.getElementById('threeBg');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.z = 28;

  /* ── Lights ── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const pointA = new THREE.PointLight(0x7c3aed, 2, 50);
  pointA.position.set(-8, 6, 12);
  scene.add(pointA);
  const pointB = new THREE.PointLight(0x06b6d4, 1.5, 50);
  pointB.position.set(8, -4, 10);
  scene.add(pointB);

  /* ── Palette ── */
  const PAL = [0x7c3aed, 0x06b6d4, 0xa855f7, 0x6366f1, 0x14b8a6, 0x8b5cf6, 0x0ea5e9, 0xec4899, 0xf59e0b, 0x10b981];

  function mat(color, wire = false, op = 0.3) {
    return new THREE.MeshPhongMaterial({ color, transparent: true, opacity: op, wireframe: wire, shininess: 120 });
  }
  function edgeMat(color) {
    return new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 });
  }

  // Track all animated items for theme opacity
  const allMeshes = [];

  /* ═══════════════════════════════════
     LAYER 1: Primary floating shapes
     ═══════════════════════════════════ */
  const primaryShapes = [
    { geo: new THREE.IcosahedronGeometry(1.8, 0),     wire: true,  motion: 'float' },
    { geo: new THREE.OctahedronGeometry(1.3, 0),      wire: false, motion: 'spiral' },
    { geo: new THREE.TorusGeometry(1.2, 0.4, 16, 48), wire: false, motion: 'figure8' },
    { geo: new THREE.TorusKnotGeometry(0.9, 0.35, 100, 16), wire: true, motion: 'float' },
    { geo: new THREE.DodecahedronGeometry(1.1, 0),    wire: false, motion: 'orbit' },
    { geo: new THREE.ConeGeometry(0.9, 1.8, 5),       wire: true,  motion: 'spiral' },
    { geo: new THREE.TetrahedronGeometry(1.3, 0),     wire: false, motion: 'figure8' },
    { geo: new THREE.IcosahedronGeometry(1, 1),       wire: true,  motion: 'orbit' },
    { geo: new THREE.CylinderGeometry(0, 1.2, 2, 4), wire: false, motion: 'float' },
    { geo: new THREE.SphereGeometry(0.9, 8, 6),       wire: true,  motion: 'spiral' },
    { geo: new THREE.TorusGeometry(0.7, 0.25, 8, 32), wire: false, motion: 'orbit' },
    { geo: new THREE.BoxGeometry(1.2, 1.2, 1.2),      wire: true,  motion: 'figure8' },
  ];

  const floaters = [];
  primaryShapes.forEach((s, i) => {
    const mesh = new THREE.Mesh(s.geo, mat(PAL[i % PAL.length], s.wire));
    const bx = (Math.random() - 0.5) * 36;
    const by = (Math.random() - 0.5) * 22;
    const bz = (Math.random() - 0.5) * 14 - 6;
    mesh.position.set(bx, by, bz);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

    // Add glowing edges for non-wireframe shapes
    if (!s.wire) {
      const edges = new THREE.EdgesGeometry(s.geo);
      const line = new THREE.LineSegments(edges, edgeMat(PAL[i % PAL.length]));
      mesh.add(line);
      allMeshes.push(line);
    }

    mesh.userData = {
      baseX: bx, baseY: by, baseZ: bz,
      speed: 0.15 + Math.random() * 0.4,
      rotSpeed: 0.002 + Math.random() * 0.007,
      phase: Math.random() * Math.PI * 2,
      motion: s.motion,
      orbitRadius: 1.5 + Math.random() * 2,
    };
    scene.add(mesh);
    floaters.push(mesh);
    allMeshes.push(mesh);
  });

  /* ═══════════════════════════════════
     LAYER 2: Orbiting ring systems
     ═══════════════════════════════════ */
  const ringSystems = [];
  const ringConfigs = [
    { x: -12, y: 5,  z: -8,  radius: 3.5, count: 8,  speed: 0.4,  color: 0x7c3aed },
    { x:  14, y: -3, z: -10, radius: 2.8, count: 6,  speed: -0.3, color: 0x06b6d4 },
    { x:  0,  y: 8,  z: -6,  radius: 4,   count: 10, speed: 0.25, color: 0xa855f7 },
  ];

  ringConfigs.forEach(cfg => {
    const pivot = new THREE.Group();
    pivot.position.set(cfg.x, cfg.y, cfg.z);
    pivot.userData = { speed: cfg.speed, baseX: cfg.x, baseY: cfg.y };

    // Ring torus (the track)
    const ringGeo = new THREE.TorusGeometry(cfg.radius, 0.03, 8, 64);
    const ringMesh = new THREE.Mesh(ringGeo, mat(cfg.color, false, 0.15));
    pivot.add(ringMesh);
    allMeshes.push(ringMesh);

    // Orbiting child shapes
    for (let j = 0; j < cfg.count; j++) {
      const angle = (j / cfg.count) * Math.PI * 2;
      const childGeos = [
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.OctahedronGeometry(0.18, 0),
        new THREE.TetrahedronGeometry(0.2, 0),
      ];
      const child = new THREE.Mesh(
        childGeos[j % 3],
        mat(cfg.color, j % 2 === 0, 0.6)
      );
      child.position.set(
        Math.cos(angle) * cfg.radius,
        Math.sin(angle) * cfg.radius,
        0
      );
      child.userData = { angle, radius: cfg.radius, rotSpeed: 0.01 + Math.random() * 0.02 };
      pivot.add(child);
      allMeshes.push(child);
    }

    scene.add(pivot);
    ringSystems.push(pivot);
  });

  /* ═══════════════════════════════════
     LAYER 3: Wireframe sphere cluster
     ═══════════════════════════════════ */
  const sphereGroup = new THREE.Group();
  sphereGroup.position.set(8, 3, -12);
  const sphereSizes = [2.5, 1.8, 1.2];
  const sphereColors = [0x6366f1, 0xa855f7, 0x06b6d4];
  sphereSizes.forEach((r, i) => {
    const wSphere = new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 12),
      mat(sphereColors[i], true, 0.12 + i * 0.06)
    );
    wSphere.userData = { rotX: 0.001 * (i + 1), rotY: 0.002 * (i + 1) };
    sphereGroup.add(wSphere);
    allMeshes.push(wSphere);
  });
  scene.add(sphereGroup);

  /* ═══════════════════════════════════
     LAYER 4: DNA-like double helix
     ═══════════════════════════════════ */
  const helixGroup = new THREE.Group();
  helixGroup.position.set(-10, -5, -8);
  const helixCount = 30;
  for (let i = 0; i < helixCount; i++) {
    const t = (i / helixCount) * Math.PI * 4;
    const y = (i / helixCount) * 12 - 6;

    // strand A
    const sA = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      mat(0x7c3aed, false, 0.5)
    );
    sA.position.set(Math.cos(t) * 1.5, y, Math.sin(t) * 1.5);
    helixGroup.add(sA);
    allMeshes.push(sA);

    // strand B (180° offset)
    const sB = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      mat(0x06b6d4, false, 0.5)
    );
    sB.position.set(Math.cos(t + Math.PI) * 1.5, y, Math.sin(t + Math.PI) * 1.5);
    helixGroup.add(sB);
    allMeshes.push(sB);

    // connecting bar every 3rd node
    if (i % 3 === 0) {
      const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 3, 4);
      const bar = new THREE.Mesh(barGeo, mat(0xa855f7, false, 0.2));
      bar.position.set(0, y, 0);
      bar.rotation.z = Math.PI / 2;
      bar.rotation.y = t;
      helixGroup.add(bar);
      allMeshes.push(bar);
    }
  }
  scene.add(helixGroup);

  /* ═══════════════════════════════════
     LAYER 5: Micro-particle field
     ═══════════════════════════════════ */
  const particleCount = 150;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3]     = (Math.random() - 0.5) * 60;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 10;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xa78bfa,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);
  allMeshes.push(particles);

  /* ═══════════════════════════════════
     ANIMATION LOOP
     ═══════════════════════════════════ */
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    /* ── Primary floaters ── */
    floaters.forEach(obj => {
      const d = obj.userData;
      const sp = d.speed;
      const ph = d.phase;

      switch (d.motion) {
        case 'float':
          obj.position.x = d.baseX + Math.sin(t * sp + ph) * 2;
          obj.position.y = d.baseY + Math.cos(t * sp * 0.7 + ph) * 1.5;
          break;
        case 'spiral':
          obj.position.x = d.baseX + Math.sin(t * sp + ph) * 2.5;
          obj.position.y = d.baseY + Math.cos(t * sp + ph) * 2;
          obj.position.z = d.baseZ + Math.sin(t * sp * 0.5) * 2;
          break;
        case 'figure8':
          obj.position.x = d.baseX + Math.sin(t * sp + ph) * 3;
          obj.position.y = d.baseY + Math.sin(t * sp * 2 + ph) * 1.5;
          break;
        case 'orbit':
          obj.position.x = d.baseX + Math.cos(t * sp + ph) * d.orbitRadius;
          obj.position.z = d.baseZ + Math.sin(t * sp + ph) * d.orbitRadius;
          obj.position.y = d.baseY + Math.sin(t * sp * 0.5) * 0.8;
          break;
      }

      // cursor influence
      obj.position.x += cursor.nx * 1.8;
      obj.position.y += cursor.ny * 1.2;

      obj.rotation.x += d.rotSpeed;
      obj.rotation.y += d.rotSpeed * 0.6;
    });

    /* ── Ring systems ── */
    ringSystems.forEach(pivot => {
      const d = pivot.userData;
      pivot.rotation.z += d.speed * 0.01;
      pivot.rotation.x = Math.sin(t * 0.2) * 0.3;
      pivot.position.x = d.baseX + cursor.nx * 1.2;
      pivot.position.y = d.baseY + cursor.ny * 0.8;

      // rotate children around ring
      pivot.children.forEach(child => {
        if (child.userData.angle !== undefined) {
          child.rotation.x += child.userData.rotSpeed;
          child.rotation.y += child.userData.rotSpeed * 1.5;
        }
      });
    });

    /* ── Wireframe sphere cluster ── */
    sphereGroup.rotation.y += 0.003;
    sphereGroup.rotation.x = Math.sin(t * 0.3) * 0.15;
    sphereGroup.position.x = 8 + cursor.nx * 2;
    sphereGroup.position.y = 3 + cursor.ny * 1.5;
    sphereGroup.children.forEach(s => {
      s.rotation.x += s.userData.rotX;
      s.rotation.y += s.userData.rotY;
    });

    /* ── DNA helix ── */
    helixGroup.rotation.y += 0.005;
    helixGroup.position.x = -10 + cursor.nx * 1;
    helixGroup.position.y = -5 + cursor.ny * 0.8;

    /* ── Particles drift ── */
    particles.rotation.y += 0.0005;
    particles.rotation.x += 0.0002;
    particles.position.x = cursor.nx * 1;
    particles.position.y = cursor.ny * 0.5;

    /* ── Animated lights follow cursor ── */
    pointA.position.x = -8 + cursor.nx * 5;
    pointA.position.y = 6 + cursor.ny * 3;
    pointB.position.x = 8 + cursor.nx * 4;
    pointB.position.y = -4 + cursor.ny * 3;

    /* ── Camera parallax ── */
    camera.position.x += (cursor.nx * 2 - camera.position.x) * 0.025;
    camera.position.y += (cursor.ny * 1.5 - camera.position.y) * 0.025;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }
  animate();

  /* ── Resize ── */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ── Theme-aware opacity ── */
  function updateThreeOpacity() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    allMeshes.forEach(obj => {
      if (obj.material && obj.material.opacity !== undefined) {
        const base = obj.material._baseOpacity || obj.material.opacity;
        obj.material._baseOpacity = base;
        gsap.to(obj.material, { opacity: isDark ? base : base * 0.4, duration: .6 });
      }
    });
  }
  window._updateThreeOpacity = updateThreeOpacity;
})();

/* ═══════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════ */
(function initTheme() {
  const html = document.documentElement;
  const btn  = document.getElementById('themeToggle');
  const stored = localStorage.getItem('portfolio-theme');

  if (stored) html.setAttribute('data-theme', stored);

  btn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('portfolio-theme', next);
    if (window._updateThreeOpacity) window._updateThreeOpacity();
  });
})();

/* ═══════════════════════════════════════════════════════
   CUSTOM CURSOR
   ═══════════════════════════════════════════════════════ */
(function initCursor() {
  const dot   = document.getElementById('cursorDot');
  const ring  = document.getElementById('cursorRing');
  const trails = [0,1,2,3,4].map(i => document.getElementById('trail' + i));

  if (!dot || !ring || window.matchMedia('(hover: none)').matches) return;

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;
  const trailPos = trails.map(() => ({ x: mx, y: my }));

  // Show cursor elements after a slight delay
  setTimeout(() => {
    dot.style.opacity = '1';
    ring.style.opacity = '1';
    trails.forEach((t, i) => { t.style.opacity = String(0.4 - i * 0.07); });
  }, 300);

  window.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  });

  // Hover effects on interactive elements
  const interactiveSelectors = 'a, button, .btn, .nav-link, .social-icon, .project-link, .theme-toggle, .nav-toggle, input, textarea, [data-tilt]';
  document.querySelectorAll(interactiveSelectors).forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  // Click effect
  document.addEventListener('mousedown', () => {
    dot.classList.add('active');
    ring.classList.add('active');
  });
  document.addEventListener('mouseup', () => {
    dot.classList.remove('active');
    ring.classList.remove('active');
  });

  // Animation loop
  function updateCursor() {
    // Dot follows instantly
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';

    // Ring follows with lag
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';

    // Trails follow with cascading lag
    trails.forEach((t, i) => {
      const prev = i === 0 ? { x: mx, y: my } : trailPos[i - 1];
      const speed = 0.12 - i * 0.015;
      trailPos[i].x += (prev.x - trailPos[i].x) * speed;
      trailPos[i].y += (prev.y - trailPos[i].y) * speed;
      t.style.left = trailPos[i].x + 'px';
      t.style.top  = trailPos[i].y + 'px';
      t.style.width  = (5 - i * 0.6) + 'px';
      t.style.height = (5 - i * 0.6) + 'px';
    });

    requestAnimationFrame(updateCursor);
  }
  updateCursor();
})();

/* ═══════════════════════════════════════════════════════
   PRELOADER + INTRO ANIMATION
   ═══════════════════════════════════════════════════════ */
const heroTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
heroTl
  .to('.hero-greeting',         { opacity: 1, y: 0, duration: .7  }, 0.1)
  .from('.hero-greeting',       { y: 30 },                          0.1)
  .to('.hero-name',             { opacity: 1, y: 0, duration: .7  }, 0.3)
  .from('.hero-name',           { y: 40 },                          0.3)
  .to('.hero-subtitle-wrapper', { opacity: 1, y: 0, duration: .6  }, 0.6)
  .from('.hero-subtitle-wrapper', { y: 20 },                        0.6)
  .to('.hero-description',      { opacity: 1, y: 0, duration: .6  }, 0.8)
  .from('.hero-description',    { y: 20 },                          0.8)
  .to('.hero-cta',              { opacity: 1, y: 0, duration: .6  }, 1.0)
  .from('.hero-cta',            { y: 20 },                          1.0)
  .to('.hero-socials',          { opacity: 1, y: 0, duration: .5  }, 1.2)
  .from('.hero-socials',        { y: 20 },                          1.2)
  .to('.scroll-indicator',      { opacity: 1, duration: .6 },       1.6);

(function runPreloader() {
  const preloader = document.getElementById('preloader');
  const fill = document.getElementById('preloaderFill');
  if (!preloader) { heroTl.play(); return; }

  const introTl = gsap.timeline({
    onComplete: () => {
      preloader.classList.add('done');
      // Start hero animation after preloader slides away
      setTimeout(() => {
        heroTl.play();
        // Remove preloader from DOM after transition
        setTimeout(() => preloader.remove(), 900);
      }, 200);
    }
  });

  introTl
    // Logo scales in
    .to('.preloader-logo', {
      opacity: 1, scale: 1, duration: .8, ease: 'back.out(1.7)'
    }, 0.2)
    // Tagline fades up
    .to('.preloader-tagline', {
      opacity: 1, y: 0, duration: .5, ease: 'power2.out'
    }, 0.6)
    // Progress bar appears
    .to('.preloader-bar', {
      opacity: 1, duration: .3
    }, 0.8)
    // Progress bar fills
    .to(fill, {
      width: '100%', duration: 1.2, ease: 'power2.inOut'
    }, 0.9)
    // Everything fades out
    .to('.preloader-content', {
      opacity: 0, scale: 0.95, duration: .4, ease: 'power2.in'
    }, 2.3);
})();

/* ═══════════════════════════════════════════════════════
   TYPEWRITER
   ═══════════════════════════════════════════════════════ */
(function typewriter() {
  const el    = document.getElementById('rotatingText');
  const words = ['AI/ML Enthusiast', 'Web Developer', 'BE Student', 'Problem Solver'];
  let wi = 0, ci = 0, deleting = false;

  function tick() {
    const word = words[wi];
    if (!deleting) {
      el.textContent = word.slice(0, ++ci);
      if (ci === word.length) { deleting = true; setTimeout(tick, 1800); return; }
    } else {
      el.textContent = word.slice(0, --ci);
      if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
    }
    setTimeout(tick, deleting ? 40 : 80);
  }
  setTimeout(tick, 1500);
})();

/* ═══════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');
function setActiveLink() {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 200) current = sec.id;
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
}
window.addEventListener('scroll', setActiveLink);

/* ═══════════════════════════════════════════════════════
   MOBILE MENU
   ═══════════════════════════════════════════════════════ */
const navToggle  = document.getElementById('navToggle');
const navLinksEl  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinksEl.classList.toggle('open');
});
navLinksEl.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinksEl.classList.remove('open');
  });
});

/* ═══════════════════════════════════════════════════════
   SCROLL-TRIGGER ANIMATIONS
   ═══════════════════════════════════════════════════════ */
gsap.utils.toArray('[data-animate="heading"]').forEach(el => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 85%' },
    opacity: 0, y: 40, duration: .7, ease: 'power3.out'
  });
});

gsap.utils.toArray('[data-animate="fade"]').forEach(el => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 88%' },
    opacity: 0, y: 25, duration: .6, ease: 'power2.out'
  });
});

gsap.utils.toArray('[data-animate="left"]').forEach(el => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 82%' },
    opacity: 0, x: -60, duration: .8, ease: 'power3.out'
  });
});

gsap.utils.toArray('[data-animate="right"]').forEach(el => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 82%' },
    opacity: 0, x: 60, duration: .8, ease: 'power3.out'
  });
});

const skillCards = gsap.utils.toArray('[data-animate="skill"]');
if (skillCards.length) {
  gsap.from(skillCards, {
    scrollTrigger: { trigger: skillCards[0], start: 'top 85%' },
    opacity: 0, y: 50, scale: .92, duration: .6, stagger: .12, ease: 'back.out(1.4)'
  });
}

const projectCards = gsap.utils.toArray('[data-animate="project"]');
if (projectCards.length) {
  gsap.from(projectCards, {
    scrollTrigger: { trigger: projectCards[0], start: 'top 85%' },
    opacity: 0, y: 50, duration: .7, stagger: .15, ease: 'power3.out'
  });
}

/* ═══════════════════════════════════════════════════════
   COUNTER ANIMATION
   ═══════════════════════════════════════════════════════ */
gsap.utils.toArray('.stat-number').forEach(el => {
  const target = +el.dataset.count;
  ScrollTrigger.create({
    trigger: el,
    start: 'top 90%',
    once: true,
    onEnter: () => {
      gsap.to(el, {
        textContent: target,
        duration: 1.5,
        ease: 'power2.out',
        snap: { textContent: 1 },
        onUpdate() { el.textContent = Math.round(+el.textContent); }
      });
    }
  });
});

/* ═══════════════════════════════════════════════════════
   CARD TILT — 3D perspective on hover (desktop only)
   ═══════════════════════════════════════════════════════ */
if (window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      gsap.to(card, {
        rotateY: x * 15,
        rotateX: -y * 15,
        transformPerspective: 800,
        ease: 'power2.out',
        duration: .4,
        boxShadow: `${-x * 20}px ${y * 20}px 40px rgba(124, 58, 237, .12)`
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        boxShadow: 'var(--shadow-card)',
        ease: 'elastic.out(1, 0.5)',
        duration: .7
      });
    });
  });
}

/* ═══════════════════════════════════════════════════════
   MAGNETIC BUTTONS (desktop only)
   ═══════════════════════════════════════════════════════ */
if (window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top  - rect.height / 2;
      gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: .3, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1, 0.4)' });
    });
  });

  /* Button ripple */
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--x', ((e.clientX - rect.left) / rect.width * 100) + '%');
      btn.style.setProperty('--y', ((e.clientY - rect.top)  / rect.height * 100) + '%');
    });
  });
}

/* ═══════════════════════════════════════════════════════
   CONTACT FORM
   ═══════════════════════════════════════════════════════ */
const form      = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name    = form.name.value.trim();
  const email   = form.email.value.trim();
  const message = form.message.value.trim();
  if (!name || !email || !message) return;

  submitBtn.disabled  = true;
  submitBtn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin .8s linear infinite"></i> Sending...';

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: JSON.stringify({ name, email, message, _subject: 'New Portfolio Contact Message!' }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await res.json();

    if (data.success) {
      submitBtn.innerHTML = '<i class="ri-check-line"></i> Sent!';
      submitBtn.style.background = 'linear-gradient(135deg, #10b981, #06b6d4)';
      form.reset();
      setTimeout(() => {
        submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Send Message';
        submitBtn.style.background = '';
        submitBtn.disabled = false;
      }, 3000);
    } else {
      throw new Error(data.message || 'Server error');
    }
  } catch {
    submitBtn.innerHTML = '<i class="ri-error-warning-line"></i> Failed — try again';
    submitBtn.style.background = 'linear-gradient(135deg, #ef4444, #f97316)';
    setTimeout(() => {
      submitBtn.innerHTML = '<i class="ri-send-plane-fill"></i> Send Message';
      submitBtn.style.background = '';
      submitBtn.disabled = false;
    }, 3000);
  }
});

// Spin keyframe
const ss = document.createElement('style');
ss.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(ss);

/* ═══════════════════════════════════════════════════════
   SMOOTH SCROLL
   ═══════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
