import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';

const ManejoFisicas = () => {
    const mountRef = useRef(null);
    const [barriersEnabled, setBarriersEnabled] = useState(true);
    const [roofEnabled, setRoofEnabled] = useState(true);
    const [moveSpeed, setMoveSpeed] = useState(10);
    const [friction, setFriction] = useState(0.45);
    const [soundsEnabled, setSoundsEnabled] = useState(true); // Nuevo estado para sonidos
    const barriers = useRef([]);
    const roof = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        /**
         * Debug UI
         */
        const gui = new GUI();
        const debugObject = {};

        /**
         * Cargar sonido
         */
        const collisionSound = new Audio('/assets/colision1.mp3');

        /**
         * Base
         */
        const scene = new THREE.Scene();

        /**
         * Textures
         */
        const textureLoader = new THREE.TextureLoader();
        const cubeTextureLoader = new THREE.CubeTextureLoader();

        const environmentMapTexture = cubeTextureLoader.load(
            [
                '/static/textures/environmentMaps/0/px.png',
                '/static/textures/environmentMaps/0/nx.png',
                '/static/textures/environmentMaps/0/py.png',
                '/static/textures/environmentMaps/0/ny.png',
                '/static/textures/environmentMaps/0/pz.png',
                '/static/textures/environmentMaps/0/nz.png'
            ]
        );

        /**
         * Físicas
         */
        const world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);

        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            { friction: 0.1, restitution: 0.6 }
        );
        world.addContactMaterial(defaultContactMaterial);
        world.defaultContactMaterial = defaultContactMaterial;

        // Piso
        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0 });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
        world.addBody(floorBody);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshStandardMaterial({
                color: '#777777',
                metalness: 0.3,
                roughness: 0.4,
                envMap: environmentMapTexture,
                envMapIntensity: 0.5
            })
        );
        floor.receiveShadow = true;
        floor.rotation.x = -Math.PI * 0.5;
        scene.add(floor);

        /**
         * Luces
         */
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
        scene.add(ambientLight);
        gui.add(ambientLight, 'intensity').min(0).max(3).step(0.1).name('Amb. Light');

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(1024, 1024);
        directionalLight.shadow.camera.far = 15;
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        /**
         * Tamaños
         */
        const sizes = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        /**
         * Cámara
         */
        const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
        camera.position.set(-3, 3, 3);
        scene.add(camera);

        /**
         * Renderizador
         */
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        /**
         * Controles
         */
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        /**Control de teclado */
        const keyStates = {};

        window.addEventListener('keydown', (event) => {
            keyStates[event.code] = true;
        });

        window.addEventListener('keyup', (event) => {
            keyStates[event.code] = false;
        });

        /**
         * Manejo de Resize
         */
        const handleResize = () => {
            sizes.width = window.innerWidth;
            sizes.height = window.innerHeight;
            camera.aspect = sizes.width / sizes.height;
            camera.updateProjectionMatrix();
            renderer.setSize(sizes.width, sizes.height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        };
        window.addEventListener('resize', handleResize);

        /**
         * Crear Esferas
         */
        const playerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const playerMaterial = new THREE.MeshStandardMaterial({ color: 'red' });

        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        playerMesh.castShadow = true;
        playerMesh.position.set(0, 1, 0);
        scene.add(playerMesh);

        const playerShape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
        const playerBody = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(0, 1, 0),
            shape: playerShape,
            material: defaultMaterial
        });
        world.addBody(playerBody);

        const objectsToUpdate = [];
        const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
        const sphereMaterial = new THREE.MeshStandardMaterial({
            metalness: 0.3,
            roughness: 0.4,
            envMap: environmentMapTexture
        });

        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const boxMaterial = new THREE.MeshStandardMaterial({
            metalness: 0.3,
            roughness: 0.4,
            envMap: environmentMapTexture
        });

        const createSphere = (radius, position) => {
            const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
            mesh.scale.set(radius, radius, radius);
            mesh.castShadow = true;
            mesh.position.copy(position);
            scene.add(mesh);

            const shape = new CANNON.Sphere(radius);
            const body = new CANNON.Body({
                mass: 1,
                position: new CANNON.Vec3(position.x, position.y, position.z),
                shape,
                material: defaultMaterial
            });

            // Detectar colisiones y reproducir sonido
            body.addEventListener('collide', () => {
                if (soundsEnabled) {
                    collisionSound.currentTime = 0; // Reinicia el sonido
                    collisionSound.play();
                }
            });


            world.addBody(body);

            objectsToUpdate.push({ mesh, body });
        };

        createSphere(0.5, { x: 0, y: 3, z: 0 });

        const createbox = (width, height, depth, position) => {
            const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
            mesh.scale.set(width, height, depth);
            mesh.castShadow = true;
            mesh.position.copy(position);
            scene.add(mesh);

            const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
            const body = new CANNON.Body({
                mass: 1,
                position: new CANNON.Vec3(position.x, position.y, position.z),
                shape,
                material: defaultMaterial
            });
            world.addBody(body);

            objectsToUpdate.push({ mesh, body });
        };

        debugObject.createSphere = () => {
            createSphere(Math.random() * 0.5, {
                x: (Math.random() - 0.5) * 3,
                y: 3,
                z: (Math.random() - 0.5) * 3
            });
        };
        gui.add(debugObject, 'createSphere');

        debugObject.createbox = () => {
            createbox(
                Math.random(),  // Ancho aleatorio
                Math.random(),  // Alto aleatorio
                Math.random(),  // Profundidad aleatoria
                {
                    x: (Math.random() - 0.5) * 3,
                    y: 3,
                    z: (Math.random() - 0.5) * 3
                }
            );
        };

        gui.add(debugObject, 'createbox');

        /**
         * Crear Barreras
         */
        const createBarrier = (position, size) => {
            const barrierShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
            const barrierBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(position.x, position.y, position.z),
                shape: barrierShape
            });
            world.addBody(barrierBody);
            barriers.current.push(barrierBody);
        };

        const addBarriers = () => {
            createBarrier({ x: 0, y: 1, z: -5 }, { x: 10, y: 2, z: 0.1 }); // Frente
            createBarrier({ x: 0, y: 1, z: 5 }, { x: 10, y: 2, z: 0.1 }); // Atrás
            createBarrier({ x: -5, y: 1, z: 0 }, { x: 0.1, y: 2, z: 10 }); // Izquierda
            createBarrier({ x: 5, y: 1, z: 0 }, { x: 0.1, y: 2, z: 10 }); // Derecha
        };

        const removeBarriers = () => {
            barriers.current.forEach(barrier => {
                world.removeBody(barrier);
            });
            barriers.current = [];
        };

        if (barriersEnabled) {
            addBarriers();
        } else {
            removeBarriers();
        }

        /**
         * Crear Techo
         */
        const createRoof = () => {
            const roofGeometry = new THREE.PlaneGeometry(10, 10);
            const roofMaterial = new THREE.MeshStandardMaterial({
                color: '#777777',
                transparent: true,
                opacity: 0.5,
                metalness: 0.3,
                roughness: 0.4,
                envMap: environmentMapTexture,
                envMapIntensity: 0.5
            });

            const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
            roofMesh.receiveShadow = true;
            roofMesh.rotation.x = Math.PI * 0.5;
            roofMesh.position.y = 3;
            scene.add(roofMesh);
            roof.current = roofMesh;

            const roofShape = new CANNON.Plane();
            const roofBody = new CANNON.Body({ mass: 0 });
            roofBody.addShape(roofShape);
            roofBody.position.set(0, 3, 0);
            roofBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI * 0.5);
            world.addBody(roofBody);
            roof.current.body = roofBody;
        };

        const removeRoof = () => {
            if (roof.current) {
                scene.remove(roof.current);
                world.removeBody(roof.current.body);
                roof.current = null;
            }
        };

        if (roofEnabled) {
            createRoof();
        } else {
            removeRoof();
        }

        /**
         * Animación
         */
        const clock = new THREE.Clock();
        let oldElapsedTime = 0;
        let animationId;

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            const elapsedTime = clock.getElapsedTime();
            const deltaTime = elapsedTime - oldElapsedTime;
            oldElapsedTime = elapsedTime;

            // Movimiento del jugador - Caja Roja:
            const forwardVector = new CANNON.Vec3(0, 0, -1);
            const backwardVector = new CANNON.Vec3(0, 0, 1);
            const leftVector = new CANNON.Vec3(-1, 0, 0);
            const rightVector = new CANNON.Vec3(1, 0, 0);

            if (keyStates['KeyW'] || keyStates['ArrowUp']) {
                playerBody.applyForce(forwardVector.scale(moveSpeed), playerBody.position);
            }
            if (keyStates['KeyS'] || keyStates['ArrowDown']) {
                playerBody.applyForce(backwardVector.scale(moveSpeed), playerBody.position);
            }
            if (keyStates['KeyA'] || keyStates['ArrowLeft']) {
                playerBody.applyForce(leftVector.scale(moveSpeed), playerBody.position);
            }
            if (keyStates['KeyD'] || keyStates['ArrowRight']) {
                playerBody.applyForce(rightVector.scale(moveSpeed), playerBody.position);
            }

            world.step(1 / 60, deltaTime, 3);

            objectsToUpdate.forEach(object => {
                object.mesh.position.copy(object.body.position);
                object.mesh.quaternion.copy(object.body.quaternion);
            });

            playerBody.velocity.x *= friction;
            playerBody.velocity.z *= friction;
            playerMesh.position.copy(playerBody.position);
            playerMesh.quaternion.copy(playerBody.quaternion);

            controls.update();
            renderer.render(scene, camera);
        };
        animationId = requestAnimationFrame(tick);

        /**
         * Cleanup
         */
        return () => {
            gui.destroy();
            window.removeEventListener('resize', handleResize);
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
            cancelAnimationFrame(animationId);
            removeBarriers();
            removeRoof();
        };
    }, [barriersEnabled, roofEnabled, moveSpeed, friction, soundsEnabled]);

    useEffect(() => {
        const gui = new GUI();
        gui.add({ toggleBarriers: () => setBarriersEnabled(!barriersEnabled) }, 'toggleBarriers').name(barriersEnabled ? 'Desactivar Barreras' : 'Activar Barreras');
        gui.add({ toggleRoof: () => setRoofEnabled(!roofEnabled) }, 'toggleRoof').name(roofEnabled ? 'Desactivar Techo' : 'Activar Techo');
        gui.add({ moveSpeed }, 'moveSpeed').min(1).max(20).step(0.1).name('Velocidad');
        gui.add({ friction }, 'friction').min(0.1).max(1).step(0.01).name('Fricción');
        gui.add({ toggleSounds: () => setSoundsEnabled(!soundsEnabled) }, 'toggleSounds').name(soundsEnabled ? 'Desactivar Sonidos' : 'Activar Sonidos');
        return () => gui.destroy();
    }, [barriersEnabled, roofEnabled, moveSpeed, friction, soundsEnabled]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default ManejoFisicas;