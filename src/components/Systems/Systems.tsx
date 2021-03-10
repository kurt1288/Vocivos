import React, { Suspense, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Canvas, useLoader } from 'react-three-fiber';
import { TextureLoader } from 'three';
import Api from '../../Api';
import { Location, LocationType, System } from '../../Api/types';
import { RootState } from '../../store';
import SystemInfo from './SystemInfo';
import Asteroid from './ThreeObjects/Asteroid';
import Moon from './ThreeObjects/Moon';
import Planet from './ThreeObjects/Planet';
import Sun from './ThreeObjects/Sun';

interface IMoon {
   parent: number,
   moon: Location
}

const SystemMap = () => {
   const bgImageTexture = useLoader(TextureLoader, `${process.env.PUBLIC_URL}/images/stars.jpg`);
   const token = useSelector((state:RootState) => state.account.token);
   const [system, setSystem] = useState<System>();
   const [stars, setStars] = useState<Location[]>();
   const [planets, setPlanets] = useState<Location[]>();
   const [asteroids, setAsteroids] = useState<Location[]>();
   const [moons, setMoons] = useState<IMoon[]>();

   useEffect(() => {
      const GetSystems = async () => {
         const systems = (await Api.systemsInfo(token)).systems[0];
         setSystem(systems);
         setPlanets([...systems.locations].filter((location) => location.type === LocationType.Planet));
         setStars([...systems.locations].filter((location) => location.type === LocationType.GasGiant));
         setAsteroids([...systems.locations].filter((location) => location.type === LocationType.Asteroid));
      };
      GetSystems();
   }, []);

   useEffect(() => {
      if (!system) { return; }

      const tempMoons = [...system.locations].filter((location) => location.type === LocationType.Moon);
      const moonArray:IMoon[] = [];
      tempMoons.map((moon) => {
         const parent = planets?.findIndex((x) => moon.symbol.startsWith(x.symbol)) as number;
         moonArray.push({ parent, moon });
         return true;
      });
      setMoons(moonArray);
   }, [planets]);

   const getMoonPosition = (moon:IMoon) => {
      const temp = [...moons as IMoon[]].filter((x) => x.parent === moon.parent);
      temp.findIndex((x) => x.moon.symbol === moon.moon.symbol);
      return -1 - ((temp.findIndex((x) => x.moon.symbol === moon.moon.symbol)) * 0.5);
   };

   return (
      <React.Fragment>
         <div className="h-1/4">
            <Canvas camera={{ position: [4.5, 0, 10], fov: 20 }} onCreated={(state) => { state.scene.background = bgImageTexture; state.camera.lookAt(4.5, 0, 0); }}>
               <ambientLight intensity={0.4} />
               {stars?.map((star) => (
                  <Suspense key={star.symbol} fallback={<sphereBufferGeometry args={[2, 15, 15]} attach="geometry" />}><Sun position={[0, 0, 0]} /></Suspense>
               ))}
               {planets?.map((planet, index) => (
                  <Suspense key={planet.symbol} fallback={<sphereBufferGeometry args={[2, 15, 15]} attach="geometry" />}><Planet position={[(index + 3) + index, 0, 0]} /></Suspense>
               ))}
               {asteroids?.map((asteroid) => (
                  <Suspense key={asteroid.symbol} fallback={<sphereBufferGeometry args={[2, 15, 15]} attach="geometry" />}><Asteroid position={[planets ? planets.length + 7 : 0, 0, 0]} /></Suspense>
               ))}
               {moons?.map((moon) => (
                  <Suspense key={moon.moon.symbol} fallback={<sphereBufferGeometry args={[2, 15, 15]} attach="geometry" />}><Moon position={[(moon.parent + 3) + moon.parent, getMoonPosition(moon), 0]} /></Suspense>
               ))}
            </Canvas>
            { system && stars && planets && moons && asteroids
               && (
                  <div className="mt-4">
                     <SystemInfo system={system} stars={stars} planets={planets} moons={moons} asteroids={asteroids} />
                  </div>
               )}
         </div>
      </React.Fragment>
   );
};

export default SystemMap;
