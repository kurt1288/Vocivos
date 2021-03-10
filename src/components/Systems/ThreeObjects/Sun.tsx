import React, { useRef, useState } from 'react';
import { MeshProps, useFrame, useLoader } from 'react-three-fiber';
import { Color, Mesh, TextureLoader } from 'three';
import { Location } from '../../../Api/types';

interface Props {
   meshProps: MeshProps,
   system: Location
}

const Sphere: React.FC<MeshProps> = (props) => {
   const mesh = useRef<Mesh>();
   const imageTexture = useLoader(TextureLoader, `${process.env.PUBLIC_URL}/images/sun.jpg`);

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
         <pointLight intensity={2} position={[0, 0, 0]} />
         <sphereBufferGeometry args={[1, 25, 25]} attach="geometry" />
         <meshStandardMaterial attach="material" map={imageTexture} emissiveMap={imageTexture} emissive={new Color(0x30301b)} emissiveIntensity={2.6} />
      </mesh>
   );
};

export default Sphere;
