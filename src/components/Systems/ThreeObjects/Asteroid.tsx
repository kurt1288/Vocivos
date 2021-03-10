import React, { useRef, useState } from 'react';
import { MeshProps, useLoader } from 'react-three-fiber';
import { Mesh, TextureLoader } from 'three';

const Sphere: React.FC<MeshProps> = (props) => {
   const mesh = useRef<Mesh>();
   const imageTexture = useLoader(TextureLoader, `${process.env.PUBLIC_URL}/images/asteroid.jpg`);

   const [hovered, setHover] = useState(false);
   const [active, setActive] = useState(false);

   return (
      <mesh
         {...props}
         ref={mesh}
         scale={[1, 1, 1]}
         onClick={(event) => setActive(!active)}
         onPointerOver={(event) => setHover(true)}
         onPointerOut={(event) => setHover(false)}
      >
         <dodecahedronGeometry args={[0.1, 0]} attach="geometry" />
         <meshStandardMaterial attach="material" map={imageTexture} />
      </mesh>
   );
};

export default Sphere;
