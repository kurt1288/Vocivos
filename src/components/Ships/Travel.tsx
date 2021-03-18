/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Api from '../../Api';
import { OwnedShip, Location } from '../../Api/types';
import { addFlightPlan, RootState, updateShip } from '../../store';
import { ModalPlaceholder } from '../SkeletonLoaders';

interface Props {
   handleClose: () => void,
   show: boolean,
   ship: OwnedShip
}

const Travel = ({ handleClose, show, ship }: Props) => {
   const { token, username } = useSelector((state:RootState) => state.account);
   const dispatch = useDispatch();
   const [locations, setLocations] = useState<Location[]>();
   const [error, setError] = useState<string>('');
   const showHideModal = show ? 'fixed w-full h-full top-0 left-0 flex items-center justify-center text-gray-900 z-10' : 'hidden';

   useEffect(() => {
      const getLocations = async () => {
         if (!ship.location) { return; }
         const loc = (await Api.getLocations(token, ship.location.split('-')[0])).locations;
         setLocations(loc);
      };
      getLocations();
   }, []);

   const createFlightPlan = async (location: string) => {
      try {
         const result = (await Api.createFlightPlan(token, username, ship.id, location)).flightPlan;
         dispatch(addFlightPlan(result));
         handleClose();
         // ship fuel and cargo space change after flight plan, so update the ship
         const updatedShip = await Api.shipInfo(token, username, ship.id);
         dispatch(updateShip(updatedShip.ship));
      } catch (err: unknown) {
         setError((err as Error).message);
      }
   };

   return (
      <div className={showHideModal}>
         <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={handleClose} />
         <div className="modal-container bg-gray-100 w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto min-h-1/3">
            <div className="modal-content py-4 text-left px-6">
               <h3 className="text-xl font-semibold mb-6">Set Destination</h3>
               { error
               && <p className="py-4 px-2 bg-red-500 text-gray-100 text-center">{ error }</p>}
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
                                    { ship.location === location.symbol
                                       ? <p className="text-sm text-gray-600 cursor-default">Current location</p>
                                       : (
                                          <button
                                             type="button"
                                             className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-500"
                                             onClick={() => createFlightPlan(location.symbol)}
                                          >Travel
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
