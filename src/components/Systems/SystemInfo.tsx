import React from 'react';
import { Location, System } from '../../Api/types';

interface IMoon {
   parent: number,
   moon: Location
}

interface Props {
   system: System,
   stars: Location[],
   planets: Location[],
   moons: IMoon[],
   asteroids: Location[]
}

const SystemInfo = ({
   system, stars, planets, moons, asteroids,
}: Props) => (
   <React.Fragment>
      <h2 className="text-3xl">{ system.name }</h2>
      <ul className="mt-3">
         {stars.map((star) => (
            <React.Fragment key={star.symbol}>
               <li className="py-2">{ star.name } ({ star.symbol })</li>
               <ul className="pl-7">
                  {planets.map((planet, index) => (
                     <React.Fragment key={planet.symbol}>
                        <li className="py-2">{ planet.name } ({ planet.symbol })</li>
                        <ul className="pl-7">
                           {moons.map((moon) => {
                              if (moon.parent === index) { return (<li className="py-2" key={moon.moon.symbol}>{ moon.moon.name } ({ moon.moon.symbol })</li>); } return <li key={moon.moon.symbol} />;
                           })}
                        </ul>
                     </React.Fragment>
                  ))}
                  { asteroids.map((asteroid) => (
                     <li className="py-2" key={asteroid.symbol}>{ asteroid.name } ({ asteroid.symbol })</li>
                  ))}
               </ul>
            </React.Fragment>
         ))}
      </ul>
   </React.Fragment>
);

export default SystemInfo;
