import React, { useEffect, useRef, useState } from 'react';
import { MeshProps, useFrame, useLoader } from 'react-three-fiber';
import { Mesh, TextureLoader } from 'three';

const Sphere: React.FC<MeshProps> = (props) => {
   const mesh = useRef<Mesh>();
   const imageTexture = useLoader(TextureLoader, '/images/planet.jpg');
   const [rotateSpeed, setrotateSpeed] = useState(0);

   const [hovered, setHover] = useState(false);
   const [active, setActive] = useState(false);

   function randomRotation() {
      return Math.floor(Math.random() * (360 - 0 + 1)) + 0;
   }

   useEffect(() => {
      const direction = Math.random() < 0.5 ? -1 : 1;
      setrotateSpeed((Math.random() * (0.01 - 0.001) + 0.001) * direction);
   }, []);

   // Rotate mesh every frame, this is outside of React without overhead
   useFrame(() => {
      if (mesh.current) mesh.current.rotation.y += rotateSpeed;
   });

   return (
      <mesh
         {...props}
         ref={mesh}
         scale={[1, 1, 1]}
         rotation={[0, randomRotation(), 0]}
         onClick={(event) => setActive(!active)}
         onPointerOver={(event) => setHover(true)}
         onPointerOut={(event) => setHover(false)}
      >
         <sphereBufferGeometry args={[0.3, 15, 15]} attach="geometry" />
         <meshStandardMaterial attach="material" map={imageTexture} />
      </mesh>
   );
};

export default Sphere;
