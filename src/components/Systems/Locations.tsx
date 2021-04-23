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
   const availableShips = useSelector((state:RootState) => state.availableShips);

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

   const hasShipYard = (location: string) => (availableShips.some((x) => x.purchaseLocations.some((y) => y.location === location)));

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
                                 {hasShipYard(location.parent.symbol)
                                    ? (
                                       <span title="Has a shipyard">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mb-0.5 ml-2 inline" fill="currentColor" strokeWidth={1.1} viewBox="0 0 512.001 512.001">
                                             <path d="m226 182.707h60v30h-60z" />
                                             <path d="m482 340.339-95.167-73.476c-25.568-19.74-40.833-50.809-40.833-83.112v-46.044c0-28.454-8.007-56.148-23.156-80.091-14.729-23.279-35.535-42.055-60.168-54.298l-6.676-3.318-6.676 3.318c-24.632 12.243-45.438 31.019-60.168 54.298-15.148 23.943-23.156 51.637-23.156 80.091v46.044c0 32.303-15.265 63.372-40.833 83.112l-95.167 73.476v111.662h106v60h240v-60h106zm-226-306.578c32.849 18.929 54.461 51.693 59.067 88.946h-118.133c4.605-37.254 26.217-70.018 59.066-88.946zm-60 118.946h120v269.294h-120zm90 299.294v30h-60v-30zm-226-96.924 83.5-64.468c8.403-6.488 15.934-13.932 22.5-22.106v153.498h-106zm106 96.924h30v30h-30zm180 30h-30v-30h30zm106-60h-106v-153.498c6.565 8.174 14.096 15.618 22.499 22.106l83.501 64.468z" />
                                          </svg>
                                       </span>
                                    )
                                    : null}
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
                                             {hasShipYard(satellite.symbol)
                                                ? (
                                                   <span title="Has a shipyard">
                                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mb-0.5 ml-2 inline" fill="currentColor" strokeWidth={1.1} viewBox="0 0 512.001 512.001">
                                                         <path d="m226 182.707h60v30h-60z" />
                                                         <path d="m482 340.339-95.167-73.476c-25.568-19.74-40.833-50.809-40.833-83.112v-46.044c0-28.454-8.007-56.148-23.156-80.091-14.729-23.279-35.535-42.055-60.168-54.298l-6.676-3.318-6.676 3.318c-24.632 12.243-45.438 31.019-60.168 54.298-15.148 23.943-23.156 51.637-23.156 80.091v46.044c0 32.303-15.265 63.372-40.833 83.112l-95.167 73.476v111.662h106v60h240v-60h106zm-226-306.578c32.849 18.929 54.461 51.693 59.067 88.946h-118.133c4.605-37.254 26.217-70.018 59.066-88.946zm-60 118.946h120v269.294h-120zm90 299.294v30h-60v-30zm-226-96.924 83.5-64.468c8.403-6.488 15.934-13.932 22.5-22.106v153.498h-106zm106 96.924h30v30h-30zm180 30h-30v-30h30zm106-60h-106v-153.498c6.565 8.174 14.096 15.618 22.499 22.106l83.501 64.468z" />
                                                      </svg>
                                                   </span>
                                                )
                                                : null}
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
