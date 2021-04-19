import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Location, LocationType } from '../../Api/types';
import { RootState, setSystems } from '../../store';
import { WorkerContext } from '../../WorkerContext';

interface SortedSystem {
   symbol: string,
   name: string,
   locations: SortedLocation[],
}

interface SortedLocation {
   parent: Location,
   satellites: Location[],
}

const Locations = () => {
   const [apiWorker] = useContext(WorkerContext);
   const systems = useSelector((state:RootState) => state.systems);
   const dispatch = useDispatch();
   const [sortedLocations, setSortedLocations] = useState<SortedSystem[]>([]);

   useEffect(() => {
      const GetSystems = async () => {
         if (systems.length === 0) {
            try {
               const temp = (await apiWorker.systemsInfo()).systems;
               dispatch((setSystems(temp)));
            } catch (err: unknown) {
               toast.error((err as Error).message, {
                  position: 'bottom-right',
                  autoClose: false,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true,
                  progress: 0,
               });
            }
         }
      };
      GetSystems();
   }, []);

   useEffect(() => {
      const sorted:SortedSystem[] = [];
      systems.forEach((system) => {
         const sortedSystem:SortedSystem = { symbol: system.symbol, name: system.name, locations: [] };
         sorted.push(sortedSystem);
         system.locations.forEach((location) => {
            if (location.type !== LocationType.Moon) {
               sortedSystem.locations.push({ parent: location, satellites: [] });
            } else {
               sortedSystem.locations.find((x) => x.parent.symbol === (`${location.symbol.split('-')[0]}-${location.symbol.split('-')[1]}`))?.satellites.push(location);
            }
         });
      });
      setSortedLocations(sorted);
   }, [systems]);
   return (
      sortedLocations
      && (
         <React.Fragment>
            <div className="grid gap-3 grid-cols-4 mt-4">
               { sortedLocations.map((system) => (
                  <div key={system.symbol}>
                     <h2 className="text-3xl">{ system.name }</h2>
                     <ul className="mt-3 pl-5">
                        {system.locations.map((location) => (
                           <React.Fragment key={location.parent.symbol}>
                              <li className="py-1 w-max">
                                 <Link className="underline hover:text-yellow-600" to={`systems/${location.parent.symbol}`}>{ location.parent.name }</Link>
                                 { location.parent.structures && location.parent.structures.length > 0
                                    ? <span className="text-sm"> ({location.parent.structures.length} structure{location.parent.structures.length > 1 ? 's' : ''})</span>
                                    : ''}
                              </li>
                              { location.satellites.length > 0
                              && (
                                 <ul className="pl-5">
                                    {
                                       location.satellites.map((satellite) => (
                                          <li key={satellite.symbol} className="py-1 w-max">
                                             <Link className="underline hover:text-yellow-600" to={`systems/${satellite.symbol}`}>{ satellite.name }</Link>
                                             { satellite.structures && satellite.structures.length > 0
                                                ? <span className="text-sm"> ({satellite.structures.length} structure{satellite.structures.length > 1 ? 's' : ''})</span>
                                                : ''}
                                          </li>
                                       ))
                                    }
                                 </ul>
                              )}
                           </React.Fragment>
                        ))}
                     </ul>
                  </div>
               ))}
            </div>
         </React.Fragment>
      )
   );
};

export default Locations;
