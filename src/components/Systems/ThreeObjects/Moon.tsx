import React, { useRef, useState } from 'react';
import { MeshProps, useFrame, useLoader } from 'react-three-fiber';
import { Mesh, TextureLoader } from 'three';

const Sphere: React.FC<MeshProps> = (props) => {
   const mesh = useRef<Mesh>();
   const imageTexture = useLoader(TextureLoader, `${process.env.PUBLIC_URL}/images/moon.jpg`);

   const [hovered, setHover] = useState(false);
   const [active, setActive] = useState(false);

   // Rotate mesh every frame, this is outside of React without overhead
   useFrame(() => {
      if (mesh.current) mesh.current.rotation.y += 0.0005;
   });

   return (
      <mesh
         {...props}
         ref={mesh}
         scale={[1, 1, 1]}
         onClick={(event) => setActive(!active)}
         onPointerOver={(event) => setHover(true)}
         onPointerOut={(event) => setHover(false)}
      >
         <sphereBufferGeometry args={[0.10, 15, 15]} attach="geometry" />
         <meshStandardMaterial attach="material" map={imageTexture} />
      </mesh>
   );
};

export default Sphere;
