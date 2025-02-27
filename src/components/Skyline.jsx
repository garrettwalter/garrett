import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

const Skyline = () => {
  const mountRef = useRef(null);
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const velocity = useRef(new THREE.Vector2(0, 0));
  const pivotRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // ✅ Transparent so the body's background shows

    if (mountRef.current) {
      mountRef.current.innerHTML = ""; // Clear previous instances
      mountRef.current.appendChild(renderer.domElement);
    }

    const loader = new STLLoader();
    loader.load(
      "/skyline.stl",
      (geometry) => {
        geometry.computeBoundingBox();
        geometry.normalizeNormals();

        // 🟢 Solid Base Material (Dark Army Green with Subtle Glow)
        const baseMaterial = new THREE.MeshStandardMaterial({
          color: "#0F1A0F", // Deep army green
          emissive: "#093F09", // Dark green hacker glow
          emissiveIntensity: 0.4,
          metalness: 0.6,
          roughness: 0.5,
        });

        // 🔷 Wireframe Building Material (Bright Neon Green)
        const wireframeMaterial = new THREE.MeshBasicMaterial({
          color: "#00FF00", // Pure neon green
          emissive: "#0F1A0F", // Dark hacker glow
          emissiveIntensity: .6,
          wireframe: true,
          side: THREE.DoubleSide,
        });

        // 🏙️ Split Buildings and Base
        const mesh = new THREE.Mesh(geometry, baseMaterial);
        const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);

        mesh.position.set(0, -0.5, 0); // Slightly adjust the base
        wireframeMesh.position.set(0, 0, 0); // Keep buildings aligned

        wireframeMesh.position.y += -0.5; // Move wireframe slightly forward

        // ✅ Enable Shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // ✨ Ground Plane to Catch Shadows
        const groundGeometry = new THREE.PlaneGeometry(500, 500);
        const groundMaterial = new THREE.ShadowMaterial({
          opacity: 0.1, // Adjust for darker/lighter shadows
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2; // Make it flat
        ground.position.y = -5; // Adjust below the model
        ground.receiveShadow = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true; // ✅ Allow light to cast shadows
        scene.add(directionalLight);

        // Create a pivot object
        const pivot = new THREE.Object3D();
        pivotRef.current = pivot; // Store in ref
        scene.add(pivot);
        pivot.add(mesh);
        pivot.add(wireframeMesh);
        scene.add(ground); // Add ground plane for shadow

        // Center the model
        // Center the model (apply the same transformation to both)
        const boundingBox = new THREE.Box3().setFromObject(mesh);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);

        mesh.position.sub(center);
        wireframeMesh.position.sub(center); // Apply same centering to wireframe

        // Set initial rotation
        pivot.rotation.x = -Math.PI / 2;
      },
      undefined,
      (error) => console.error("Error loading STL:", error)
    );

    camera.position.set(0, 5, 100);
    camera.lookAt(0, 0, 0);

    const animate = () => {
      requestAnimationFrame(animate);

      if (pivotRef.current) {
        if (!isDragging.current) {
          velocity.current.multiplyScalar(0.95); // Apply friction
          applyRotation(
            pivotRef.current,
            velocity.current.x,
            velocity.current.y
          );
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const applyRotation = (object, deltaX, deltaY) => {
      if (!object) return;

      // Create quaternion rotations
      const quaternionX = new THREE.Quaternion();
      const quaternionY = new THREE.Quaternion();

      // Rotate around world's up axis (Y-axis)
      quaternionY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaX);

      // Rotate around pivot's local X-axis
      const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(
        object.quaternion
      );
      quaternionX.setFromAxisAngle(xAxis, deltaY);

      // Apply rotations
      object.quaternion.multiplyQuaternions(quaternionY, object.quaternion);
      object.quaternion.multiplyQuaternions(quaternionX, object.quaternion);
    };

    const onMouseDown = (event) => {
      isDragging.current = true;
      previousMousePosition.current = { x: event.clientX, y: event.clientY };
      velocity.current.set(0, 0);
    };

    const onMouseMove = (event) => {
      if (!isDragging.current || !pivotRef.current) return;

      const deltaX = (event.clientX - previousMousePosition.current.x) * 0.005;
      const deltaY = (event.clientY - previousMousePosition.current.y) * 0.005;
      previousMousePosition.current = { x: event.clientX, y: event.clientY };

      velocity.current.set(deltaX, deltaY);
      applyRotation(pivotRef.current, deltaX, deltaY);
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className="container d-flex justify-content-center align-items-center"
      style={{ height: "100vh", cursor: "grab" }}
    >
      <div ref={mountRef} />
    </div>
  );
};

export default Skyline;
