/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
   OwnedShip, Location, LocationType, CargoType, FlightPlan,
} from '../../Api/types';
import {
   addFlightPlan, RootState, setCredits, updateShip, updateShips,
} from '../../store';
import { WorkerContext } from '../../WorkerContext';
import { ModalPlaceholder } from '../SkeletonLoaders';

interface Props {
   handleClose: () => void,
   shipError: (message:string) => void,
   show: boolean,
   ship: OwnedShip
}

const Travel = ({
   handleClose, shipError, show, ship,
}: Props) => {
   const [apiWorker] = useContext(WorkerContext);
   const { token, username } = useSelector((state:RootState) => state.account);
   const dispatch = useDispatch();
   const [locations, setLocations] = useState<Location[]>();
   const [error, setError] = useState<string>('');
   const [autoBuyFuel, setAutoBuyFuel] = useState(true);
   const showHideModal = show ? 'fixed w-full h-full top-0 left-0 flex items-center justify-center text-gray-900 z-10' : 'hidden';

   useEffect(() => {
      const getLocations = async () => {
         if (!ship.location) { return; }
         const loc = (await apiWorker.getLocations(ship.location.split('-')[0])).locations;
         setLocations(loc);
      };
      getLocations();
   }, []);

   const createFlightPlan = async (type: LocationType, location: string, retry = true) => {
      try {
         let result: FlightPlan;
         if (type === LocationType.Wormhole && ship.location === location) {
            result = (await apiWorker.warpJump(ship.id)).flightPlan;
         } else {
            result = (await apiWorker.createFlightPlan(ship.id, location)).flightPlan;
         }
         dispatch(addFlightPlan(result));
         handleClose();
      } catch (err: unknown) {
         const { message } = err as Error;
         // Try to automatically buy the required fuel if ship has insufficient fuel
         if (retry && autoBuyFuel && message && message.startsWith('Ship has insufficient fuel for flight plan')) {
            const requiredFuelString = message.match(/\d+/);
            if (requiredFuelString) {
               try {
                  const fuel = parseInt(requiredFuelString[0], 10);
                  const result = await apiWorker.purchaseOrder(ship.id, CargoType.Fuel, fuel);
                  dispatch(setCredits(result.credits));
                  dispatch(updateShip(result.ship));
                  createFlightPlan(type, location, false);
               } catch (e: unknown) {
                  setError((e as Error).message);
               }
            }
         } else {
            setError(message);
            // If the ship failed a warp jump, it's destroyed so we should update the ships
            if (type === LocationType.Wormhole) {
               const { ships } = await apiWorker.ownedShips();
               dispatch(updateShips(ships));
               shipError(message);
            }
         }
      }
   };

   return (
      <div className={showHideModal}>
         <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={handleClose} />
         <div className="modal-container bg-gray-100 w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto min-h-1/3">
            <div className="modal-content py-4 text-left px-6">
               <h3 className="text-xl font-semibold mb-3">Set Destination</h3>
               <div className="text-sm mb-4">
                  <label htmlFor="autoBuyFuel" className="flex items-center cursor-pointer">
                     <input type="checkbox" id="autoBuyFuel" name="autoBuyFuel" checked={autoBuyFuel} onChange={(e) => setAutoBuyFuel(e.target.checked)} />
                     <span className="ml-1">Automatically buy required fuel</span>
                  </label>
               </div>
               { error
               && <p className="py-4 px-2 bg-red-500 text-sm text-gray-100 text-center">{ error }</p>}
               <div className="relative">
                  {!locations
                     ? (
                        <React.Fragment>
                           <ModalPlaceholder />
                           <ModalPlaceholder />
                           <ModalPlaceholder />
                        </React.Fragment>
                     )
                     : (
                        <div className="divide-y">
                           {locations.map((location) => (
                              <div className="py-2 flex justify-between items-center" key={location.symbol + location.name}>
                                 <div>
                                    <p>{ location.name }</p>
                                    <p className="text-sm text-gray-500">{ location.symbol }</p>
                                 </div>
                                 <div>
                                    { ship.location === location.symbol && location.type !== LocationType.Wormhole
                                       ? <p className="text-sm text-gray-600 cursor-default">Current location</p>
                                       : (
                                          <button
                                             type="button"
                                             className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-500"
                                             onClick={() => createFlightPlan(location.type, location.symbol)}
                                          >{ location.type === LocationType.Wormhole && ship.location === location.symbol ? 'Warp' : 'Travel' }
                                          </button>
                                       )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default Travel;
