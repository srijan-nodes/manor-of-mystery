/* ================================================================
   3D SCENE BUILDER
================================================================ */
function buildScene(THREE, crimeScene, canvasEl, stateRef, setInteractionText, setRoomName, minimapRef) {
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a10);
    scene.fog = new THREE.FogExp2(0x0a0a10, 0.025);

    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 120);
    camera.position.set(0, 1.75, 20);
    stateRef.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding = THREE.sRGBEncoding;
    canvasEl.appendChild(renderer.domElement);

    /* -- Textures -- */
    const woodTex  = makeWoodTexture();
    const stoneTex = makeStoneTexture();
    const wallTex  = makeWallTexture();

    /* -- Materials -- */
    const matWall   = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, metalness: 0.02 });
    const matFloor  = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7, metalness: 0.05 });
    const matCeil   = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, color: 0x151518 });
    const matDoorDefault = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.7, metalness: 0.05 });
    const matDoorBlue    = new THREE.MeshStandardMaterial({ color: 0x0e1830, roughness: 0.6, metalness: 0.1 });

    /* ── Primitive helpers ── */
    const box = (w, h, d, x, y, z, mat) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.castShadow = true; m.receiveShadow = true;
        scene.add(m); return m;
    };

    const plane = (w, d, x, y, z, rotX, mat) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
        m.rotation.x = rotX; m.position.set(x, y, z);
        m.receiveShadow = true;
        scene.add(m); return m;
    };

    /* ── Lighting ── */
    // Brighter, warmer ambient for visibility
    scene.add(new THREE.AmbientLight(0x483828, 1.2));
    // Hemisphere: warm sky, cool ground bounce
    scene.add(new THREE.HemisphereLight(0x806040, 0x202030, 0.8));

    // Directional fill light (soft moonlight through windows)
    const dirLight = new THREE.DirectionalLight(0x8090b0, 0.6);
    dirLight.position.set(10, 12, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);

    const ptLight = (x, y, z, color, intensity, dist) => {
        const l = new THREE.PointLight(color, intensity, dist);
        l.position.set(x, y, z);
        l.castShadow = true;
        l.shadow.mapSize.set(512, 512);
        scene.add(l); return l;
    };

    // Lobby chandelier — warm, bright
    ptLight(0, 4.5, 10,  0xffd580, 5.0, 30);
    ptLight(0, 4.5, 18,  0xffe0a0, 3.0, 18); // extra lobby fill
    // Interrogation wing — red, moody but visible
    ptLight(-13, 4, 0,   0xff6644, 3.5, 32);
    ptLight(-13, 4, -14, 0xee4433, 2.8, 22);
    ptLight(-13, 4,  14, 0xee4433, 2.8, 22);
    ptLight(-8,  4,  0,  0xff8855, 1.5, 15); // corridor spill
    // Office wing — blue-white, clinical
    ptLight(13, 4, -8,   0x6688ff, 3.0, 24);
    ptLight(13, 4,  8,   0x6688ff, 2.5, 20);
    // Corridor — dim warm sconces
    ptLight(0, 3.5, 0,   0xffcc80, 2.0, 16);
    ptLight(0, 3.5, -10, 0xffcc80, 1.5, 14);

    /* ================================================================
       MANOR LAYOUT
       Origin: entrance archway.  +Z = towards entrance, -Z = deeper.
       Left wing  (X < 0): interrogation cells
       Right wing (X > 0): forensic office + commissioner
       Centre:              entrance hall + corridor
    ================================================================ */
    const H = 5;   // ceiling height
    const CEIL_Y = H;

    /*  ── ENTRANCE HALL (10 × 14 at z=10..24) ──  */
    plane(10, 14, 0, 0,    10, -Math.PI/2, matFloor);  // floor
    plane(10, 14, 0, CEIL_Y, 10, Math.PI/2, matCeil);  // ceiling
    box(10, H, 0.5,  0, H/2, 24,  matWall);             // back wall
    box(0.5, H, 14, -5, H/2, 10,  matWall);             // left wall
    box(0.5, H, 14,  5, H/2, 10,  matWall);             // right wall

    /* Chandelier fixture */
    const chanBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b4c1e })
    );
    chanBase.position.set(0, CEIL_Y - 0.4, 10);
    scene.add(chanBase);
    const chanRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.04, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xc8a44a, metalness: 0.8, roughness: 0.3 })
    );
    chanRing.position.set(0, CEIL_Y - 0.8, 10);
    chanRing.rotation.x = Math.PI / 2;
    scene.add(chanRing);

    /* Entry desk */
    box(2, 0.1, 1,  0, 0.8, 18, new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.7 }));
    box(2, 0.8, 0.1, 0, 0.4, 18.55, new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.7 }));

    /*  ── MAIN CORRIDOR (4 × 30 at x=-2..2, z=-15..15) ──  */
    plane(4, 30,   0, 0,    0, -Math.PI/2, matFloor);
    plane(4, 30,   0, CEIL_Y, 0,  Math.PI/2, matCeil);
    box(0.5, H, 30, -2, H/2, 0, matWall);
    box(0.5, H, 30,  2, H/2, 0, matWall);
    // Far wall
    box(4, H, 0.5,  0, H/2, -15, matWall);

    /*  ── LEFT WING — Interrogation (18 × 30, x=-2..-20) ──  */
    const LW_X = -11; // center
    plane(18, 30, LW_X, 0,    0, -Math.PI/2, matFloor);
    plane(18, 30, LW_X, CEIL_Y, 0,  Math.PI/2, matCeil);
    box(0.5, H, 30, -20, H/2, 0, matWall);  // outer wall
    box(18, H, 0.5, LW_X, H/2, -15, matWall); // back
    box(18, H, 0.5, LW_X, H/2,  15, matWall); // front

    /* Cell dividers (5 cells, 6 apart) */
    for (let i = 0; i < 4; i++) {
        const z = -12 + i * 6;
        // partial wall leaving door gap
        box(8, H, 0.2, LW_X - 1, H/2, z, matWall);
    }

    /* Bookshelves along outer left wall */
    for (let i = 0; i < 4; i++) {
        const z = -10 + i * 7;
        box(0.3, 3.5, 2, -19.6, 1.75, z, new THREE.MeshStandardMaterial({ color: 0x1e1008, roughness: 0.9 }));
        // shelf panels
        for (let s = 0; s < 4; s++) {
            box(0.25, 0.06, 2, -19.45, 0.5 + s * 0.8, z, new THREE.MeshStandardMaterial({ color: 0x140c04 }));
        }
        // mock books
        for (let b = 0; b < 6; b++) {
            const bColor = [0x882222, 0x224488, 0x225522, 0x887722, 0x442244, 0x334433][b];
            box(0.08, 0.6 + Math.random()*0.2, 0.25, -19.3, 0.5 + Math.floor(b/3)*0.8 + 0.3, z - 0.7 + b*0.28,
                new THREE.MeshStandardMaterial({ color: bColor }));
        }
    }

    /*  ── RIGHT WING — Offices (18 × 20, x=2..20) ──  */
    const RW_X = 11;
    plane(18, 20, RW_X, 0,    -2.5, -Math.PI/2, matFloor);
    plane(18, 20, RW_X, CEIL_Y, -2.5,  Math.PI/2, matCeil);
    box(0.5, H, 20, 20, H/2, -2.5, matWall);  // outer wall
    box(18, H, 0.5, RW_X, H/2, -12.5, matWall); // back
    box(18, H, 0.5, RW_X, H/2,  7.5, matWall);  // front
    // divider between office rooms
    box(7, H, 0.2, RW_X - 2, H/2, 0, matWall);

    /* Forensic desk */
    box(3, 0.1, 1.5, 14, 0.8, -8, new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.5 }));
    // terminal monitor
    box(1.2, 0.8, 0.1, 14, 1.3, -8.8, new THREE.MeshStandardMaterial({ color: 0x001a33, emissive: 0x003366, emissiveIntensity: 0.8 }));

    /* Commissioner desk */
    box(3, 0.1, 1.5, 13, 0.8, 6, new THREE.MeshStandardMaterial({ color: 0x180e04, roughness: 0.6 }));
    box(3, 0.7, 0.1, 13, 0.45, 6.8, new THREE.MeshStandardMaterial({ color: 0x180e04 }));
    // Framed portrait on wall
    box(0.08, 1.2, 0.9, 19.5, 3, 6, new THREE.MeshStandardMaterial({ color: 0x6b4c1e }));
    box(0.05, 1.0, 0.7, 19.4, 3, 6, new THREE.MeshStandardMaterial({ color: 0x2a1a0a }));

    /* ================================================================
       INTERACTABLE SYSTEM
    ================================================================ */
    const interactables = [];

    const addInteractable = (mesh, name, type, data = null) => {
        mesh.userData = { name, type, data };
        interactables.push(mesh);
        stateRef.current.interactables = interactables;
        return mesh;
    };

    /* ── Door factory ── */
    const makeDoor = (name, x, z, rotY, mat = matDoorDefault) => {
        const pivot = new THREE.Group();
        pivot.position.set(x, H/2 - 0.1, z);
        pivot.rotation.y = rotY;
        scene.add(pivot);
        const leaf = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 3.8, 0.12),
            mat
        );
        leaf.position.set(1.1, 0, 0);
        pivot.add(leaf);
        // door frame
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.8 });
        const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.2, 0.2), frameMat);
        frameL.position.set(0, 0.2, 0); pivot.add(frameL);
        const frameT = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.2), frameMat);
        frameT.position.set(1.1, 2.1, 0); pivot.add(frameT);

        const data = { open: false };
        leaf.userData = { name, type: 'door', data, pivot, startRot: rotY };
        interactables.push(leaf);
        return leaf;
    };

    /* ── Humanoid character factory ── */
    const makeHumanoid = (x, z, bodyColor, headColor = 0xd4a97a) => {
        const g = new THREE.Group();
        // legs
        const legMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
        [-0.18, 0.18].forEach(ox => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.9, 8), legMat);
            leg.position.set(ox, 0.45, 0); g.add(leg);
        });
        // torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.22), legMat);
        torso.position.set(0, 1.1, 0); g.add(torso);
        // arms
        [-0.32, 0.32].forEach(ox => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.65, 8), legMat);
            arm.position.set(ox, 1.0, 0);
            arm.rotation.z = ox < 0 ? 0.25 : -0.25;
            g.add(arm);
        });
        // neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8),
            new THREE.MeshStandardMaterial({ color: headColor }));
        neck.position.set(0, 1.53, 0); g.add(neck);
        // head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10),
            new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.8 }));
        head.position.set(0, 1.78, 0); g.add(head);
        // eyes
        [[-0.07, 1.82, 0.2], [0.07, 1.82, 0.2]].forEach(([ex, ey, ez]) => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6),
                new THREE.MeshStandardMaterial({ color: 0x111111 }));
            eye.position.set(ex, ey, ez); g.add(eye);
        });
        g.position.set(x, 0, z);
        scene.add(g);
        return g;
    };

    /* ── Briefing NPC (lobby) ── */
    makeHumanoid(0, 18, 0x2d5a1b, 0xc8a46a); // green coat detective aide
    // invisible trigger volume
    const briefTrigger = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 3.5, 2.5),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    briefTrigger.position.set(0, 1.75, 18);
    scene.add(briefTrigger);
    addInteractable(briefTrigger, "Case Briefing", "briefing");

    /* ── Suspect NPCs (cells) ── */
    const suspectColors = [0x3a2a5a, 0x5a2a2a, 0x2a3a5a, 0x3a5a2a, 0x5a4a2a];
    crimeScene.suspects.forEach((s, i) => {
        const z = -12 + i * 6;
        makeDoor(`Cell ${i + 1}`, -3.5, z, Math.PI / 2);
        makeHumanoid(-13, z, suspectColors[i % suspectColors.length]);
        const trigger = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 3.5, 2.5),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        trigger.position.set(-13, 1.75, z);
        scene.add(trigger);
        addInteractable(trigger, `Interrogate: ${fmt(s.name)}`, "chat", s);
    });

    /* ── Forensic terminal ── */
    const terminalTrigger = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2.5, 2),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    terminalTrigger.position.set(14, 1.25, -8);
    scene.add(terminalTrigger);
    addInteractable(terminalTrigger, "Forensic Terminal", "actions");

    // right-wing door from corridor
    makeDoor("Door: Forensic Wing", 2.3, -4, 0, matDoorBlue);

    /* ── Commissioner ── */
    makeHumanoid(13, 5, 0x1a1a3a, 0xd0b080); // dark navy + gold skin
    const bossTrigger = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 3.5, 2.5),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    bossTrigger.position.set(13, 1.75, 5);
    scene.add(bossTrigger);
    addInteractable(bossTrigger, "Commissioner's Office", "boss");
    makeDoor("Door: Commissioner", 2.3, 4, 0, matDoorBlue);

    /* ================================================================
       INPUT & MOVEMENT
    ================================================================ */
    const keys = stateRef.current;

    const onMouseMove = (e) => {
        if (document.pointerLockElement === renderer.domElement) {
            keys.yaw   -= e.movementX * 0.0018;
            keys.pitch -= e.movementY * 0.0018;
            keys.pitch  = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, keys.pitch));
        }
    };

    const onKey = (e, v) => {
        if (e.code === 'KeyW' || e.code === 'ArrowUp')    keys.moveForward  = v;
        if (e.code === 'KeyS' || e.code === 'ArrowDown')  keys.moveBackward = v;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft')  keys.moveLeft     = v;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.moveRight    = v;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup',   (e) => onKey(e, false));

    /* ================================================================
       RAYCASTER & ANIMATION LOOP
    ================================================================ */
    const raycaster = new THREE.Raycaster();
    const vel       = new THREE.Vector3();
    const dir       = new THREE.Vector3();
    const center2d  = new THREE.Vector2(0, 0);

    const ROOMS = [
        { name: "Entrance Hall",         xMin: -5,  xMax:  5,  zMin:  3,  zMax: 24 },
        { name: "Main Corridor",          xMin: -2,  xMax:  2,  zMin: -15, zMax:  3 },
        { name: "Interrogation Wing",     xMin: -20, xMax: -2,  zMin: -15, zMax: 15 },
        { name: "Forensic Laboratory",    xMin:  2,  xMax: 20,  zMin: -12.5,zMax: 0 },
        { name: "Commissioner's Office",  xMin:  2,  xMax: 20,  zMin:  0,  zMax:  7.5 },
    ];

    const getRoomName = (pos) => {
        for (const r of ROOMS)
            if (pos.x >= r.xMin && pos.x <= r.xMax && pos.z >= r.zMin && pos.z <= r.zMax)
                return r.name;
        return "Manor of Whispers";
    };

    let lastRoom = "";
    let frameCount = 0;

    const animate = () => {
        requestAnimationFrame(animate);
        const ui = stateRef.current.activeUI;

        if (document.pointerLockElement === renderer.domElement && !ui) {
            camera.rotation.set(keys.pitch, keys.yaw, 0, 'YXZ');

            vel.x -= vel.x * 10 * 0.016;
            vel.z -= vel.z * 10 * 0.016;
            dir.z = Number(keys.moveForward)  - Number(keys.moveBackward);
            dir.x = Number(keys.moveRight)    - Number(keys.moveLeft);
            dir.normalize();
            const speed = 60;
            if (keys.moveForward  || keys.moveBackward) vel.z -= dir.z * speed * 0.016;
            if (keys.moveLeft     || keys.moveRight)    vel.x -= dir.x * speed * 0.016;

            camera.translateX(-vel.x * 0.016);
            camera.translateZ( vel.z * 0.016);
            camera.position.y  = 1.75;
            camera.position.x  = Math.max(-19.5, Math.min(19.5, camera.position.x));
            camera.position.z  = Math.max(-14.5, Math.min(23.5, camera.position.z));

            // interaction raycast
            raycaster.setFromCamera(center2d, camera);
            const hits = raycaster.intersectObjects(interactables);
            if (hits.length > 0 && hits[0].distance < 5)
                setInteractionText(`[E / Click]  ${hits[0].object.userData.name}`);
            else
                setInteractionText("");

            // room label (update every 30 frames)
            frameCount++;
            if (frameCount % 30 === 0) {
                const rn = getRoomName(camera.position);
                if (rn !== lastRoom) { lastRoom = rn; setRoomName(rn); }
            }
        }

        // animate doors
        interactables.filter(i => i.userData.type === 'door').forEach(d => {
            const target = d.userData.data.open
                ? d.userData.startRot + Math.PI / 2
                : d.userData.startRot;
            d.userData.pivot.rotation.y = THREE.MathUtils.lerp(d.userData.pivot.rotation.y, target, 0.12);
        });

        renderer.render(scene, camera);

        // minimap
        drawMinimap(minimapRef, camera, interactables);
    };
    animate();

    /* ── Click to interact / pointer lock ── */
    const onClick = () => {
        if (document.pointerLockElement !== renderer.domElement) return;
        raycaster.setFromCamera(center2d, camera);
        const hits = raycaster.intersectObjects(interactables);
        if (hits.length > 0 && hits[0].distance < 5) {
            const d = hits[0].object.userData;
            if (d.type === 'door') {
                d.data.open = !d.data.open;
            } else {
                stateRef.current.openUI(d.type, d.data);
                document.exitPointerLock();
            }
        }
    };
    renderer.domElement.addEventListener('click', onClick);

    /* ── Resize ── */
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
