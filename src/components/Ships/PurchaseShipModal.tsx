/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { PurchaseLocation, Ship } from '../../Api/types';
import { RootState, setUser } from '../../store';
import { WorkerContext } from '../../WorkerContext';

interface Props {
   handleClose: () => void,
   show: boolean,
   ship: Ship | undefined
}

const PurchaseShipModal = ({ handleClose, show, ship }:Props) => {
   const [apiWorker] = useContext(WorkerContext);
   const { credits } = useSelector((state:RootState) => state.user);
   const dispatch = useDispatch();
   const history = useHistory();
   const [loading, setLoading] = useState(false);

   const showHideModal = show ? 'fixed w-full h-full top-0 left-0 flex items-center justify-center text-gray-900' : 'hidden';

   const purchaseShip = async (location:string) => {
      if (!ship) { return; }

      setLoading(true);
      const result = await apiWorker.buyShip(location, ship?.type);
      dispatch(setUser(result));
      handleClose;
      history.push('/ships');
   };

   const renderButtons = (location: PurchaseLocation) => {
      if (loading) {
         return <div />;
      }

      if (credits > location.price) {
         return <button type="button" className="px-5 py-1 bg-green-500 rounded text-white hover:bg-green-400" onClick={() => purchaseShip(location.location)}>Buy</button>;
      }

      return <span className="text-xs text-yellow-500">Insufficient credits</span>;
   };

   return (
      <div className={showHideModal}>
         <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={handleClose} />
         <div className="modal-container bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">
            <div className="modal-content py-4 text-left px-6">
               <h3 className="text-xl font-semibold mb-6">Purchase { ship?.type }</h3>
               <p className="text-sm mb-5">This ship is available in { ship?.purchaseLocations.length } { ship?.purchaseLocations && ship.purchaseLocations.length > 1 ? 'locations' : 'location' }:</p>
               <ul>
                  {ship?.purchaseLocations.map((location) => (
                     <li className="flex justify-between items-center my-3" key={location.location + location.price}>
                        <span>{ location.location } for { location.price.toLocaleString() } credits </span>
                        { renderButtons(location) }
                     </li>
                  ))}
               </ul>
               <div className="flex justify-end pt-2">
                  { !loading
                     ? (<button type="button" className="px-4 py-1 text-red-500 text-sm border border-red-500 rounded hover:text-red-400 hover:border-red-400" onClick={handleClose}>Close</button>
                     ) : <p className="text-sm text-yellow-500 italic">Please Wait...</p>}
               </div>
            </div>
         </div>
      </div>
   );
};

export default PurchaseShipModal;
