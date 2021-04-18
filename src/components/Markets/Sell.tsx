/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
   Cargo, LocationType, Marketplace, OwnedShip,
} from '../../Api/types';
import { RootState, setCredits, updateShip } from '../../store';
import { WorkerContext } from '../../WorkerContext';
import { ModalPlaceholder } from '../SkeletonLoaders';

interface Props {
   handleClose: () => void,
   show: boolean,
   ship: OwnedShip
}

const Sell = ({ handleClose, show, ship }:Props) => {
   const [apiWorker] = useContext(WorkerContext);
   const { systems } = useSelector((state:RootState) => state);
   const dispatch = useDispatch();
   const [marketData, setMarketData] = useState<Marketplace[]>();
   const [selectedMarket, setSelectedMarket] = useState<Cargo>();
   const [sellQuantity, setSellQuantity] = useState<number>(0);
   const [working, setWorking] = useState<boolean>(false);
   const [error, setError] = useState<string>('');
   const showHideModal = show ? 'fixed w-full h-full top-0 left-0 flex items-center justify-center text-gray-900 z-10' : 'hidden';

   useEffect(() => {
      const getMarket = async () => {
         if (!ship.location) { return; }
         try {
            const data = (await apiWorker.getMarket(ship.location)).location.marketplace;
            setMarketData(data);
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
      };
      getMarket();
   }, []);

   const maxQuantity = (): number => {
      if (!selectedMarket) { return 0; }

      if (selectedMarket.quantity <= 300) {
         return selectedMarket.quantity;
      }

      return 300;
   };

   const sellMarket = async () => {
      try {
         if (!selectedMarket) { return; }
         setWorking(true);
         const result = await apiWorker.sellOrder(ship.id, selectedMarket.good, sellQuantity);
         dispatch(setCredits(result.credits));
         dispatch(updateShip(result.ship));
         setSelectedMarket(undefined);
         handleClose();
      } catch (err) {
         setError((err as Error).message);
         setWorking(false);
      }
   };

   const deleteMarket = async () => {
      try {
         if (!selectedMarket) { return; }
         setWorking(true);
         const result = await apiWorker.deleteOrder(ship.id, selectedMarket.good, sellQuantity);
         const shipInfo = await apiWorker.shipInfo(ship.id);
         dispatch(updateShip(shipInfo.ship));
         setSelectedMarket(undefined);
         handleClose();
      } catch (err: unknown) {
         setError((err as Error).message);
         setWorking(false);
      }
   };

   const depositGoods = async () => {
      try {
         if (!selectedMarket || !ship.location) { return; }
         setWorking(true);
         const result = await apiWorker.depositGoods(ship.location, ship.id, selectedMarket.good, sellQuantity);
         const shipInfo = await apiWorker.shipInfo(ship.id);
         dispatch(updateShip(shipInfo.ship));
         setSelectedMarket(undefined);
         handleClose();
      } catch (err: unknown) {
         setError((err as Error).message);
         setWorking(false);
      }
   };

   const sellPrice = () => {
      if (selectedMarket && (marketData?.find((x) => x.symbol === selectedMarket.good))) {
         const good = marketData?.find((x) => x.symbol === selectedMarket.good) as Marketplace;
         return (sellQuantity * good.sellPricePerUnit).toLocaleString();
      }
      return null;
   };

   // Symbols come from the API as all caps with underscore seperate. Format it to be more readable.
   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   return (
      <div className={showHideModal}>
         <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={() => { setSelectedMarket(undefined); handleClose(); }} />
         <div className={`modal-container bg-gray-100 w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto ${selectedMarket ? 'min-h-1/3' : ''}`}>
            <div className="modal-content py-4 text-left px-6">
               <h3 className="text-xl font-semibold mb-6">Your Cargo</h3>
               { error
                  && <p className="py-4 px-2 bg-red-500 text-sm text-gray-100 text-center">{ error }</p>}
               <div className="relative">
                  {!marketData
                     ? (
                        <React.Fragment>
                           <ModalPlaceholder />
                           <ModalPlaceholder />
                           <ModalPlaceholder />
                        </React.Fragment>
                     )
                     : (
                        <div className="divide-y">
                           {ship.cargo?.map((cargo) => (
                              <div className={`py-3 flex justify-between items-center bg-gray-100 w-full ${selectedMarket ? 'absolute' : ''} ${selectedMarket?.good === cargo.good ? 'z-10' : ''}`} key={cargo.good + cargo.quantity + cargo.totalVolume}>
                                 <div>
                                    <p className="font-semibold">{ formatString(cargo.good) } <span className="ml-3 text-sm text-gray-500 font-normal">{ cargo.quantity.toLocaleString() } units available</span></p>
                                    { marketData?.some((x) => x.symbol === cargo.good)
                                       && <p className="text-sm">{ sellPrice() } credits per unit</p>}
                                 </div>
                                 { !selectedMarket
                                    && (
                                       <div>
                                          <button
                                             type="button"
                                             className="text-sm bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-500"
                                             // disabled={!marketData?.some((x) => x.symbol === cargo.good)}
                                             onClick={() => setSelectedMarket(cargo)}
                                          >Manage
                                          </button>
                                       </div>
                                    )}
                              </div>
                           ))}
                        </div>
                     )}
                  { selectedMarket
                        && (
                           <div className="absolute top-20 w-full text-center">
                              <input type="number" min={0} max={selectedMarket.quantity} value={sellQuantity} placeholder="Quantity" className="w-full flex-grow px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none" onChange={(e) => setSellQuantity(parseInt(e.target.value, 10))} />
                              <button type="button" className="text-sm block text-blue-500 hover:text-blue-600" onClick={() => setSellQuantity(maxQuantity)}>Set Max Available</button>
                              <div>
                                 { !working
                                    ? (
                                       <React.Fragment>
                                          <button
                                             type="button"
                                             className="text-sm mt-2 mr-3 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:bg-red-500 disabled:cursor-default"
                                             disabled={(sellQuantity <= 0) || working}
                                             onClick={deleteMarket}
                                          >
                                             Delete { sellQuantity } units
                                          </button>
                                          { systems.find((system) => system.symbol === ship.location?.split('-')[0])?.locations.some((location) => ship.location === location.symbol && location.type === LocationType.Wormhole)
                                             ? (
                                                <button
                                                   type="button"
                                                   className="text-sm mt-2 mr-3 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:bg-purple-500 disabled:cursor-default"
                                                   disabled={(sellQuantity <= 0) || working}
                                                   onClick={depositGoods}
                                                >
                                                   Donate { sellQuantity } units
                                                </button>
                                             ) : null}
                                          <button
                                             type="button"
                                             className="text-sm mt-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:bg-green-500 disabled:cursor-default"
                                             disabled={(sellQuantity <= 0) || working || (!sellPrice())}
                                             onClick={sellMarket}
                                          >
                                             { sellPrice() !== null
                                                ? <span className={working ? 'hidden' : 'inline'}>Sell for { sellPrice() } credits</span>
                                                : <span>Unable to sell</span>}
                                          </button>
                                       </React.Fragment>
                                    )
                                    : (
                                       <p>Please wait...</p>
                                    )}
                              </div>
                              <button type="button" className="flex items-center text-sm text-red-400 mt-3 hover:text-red-500" onClick={() => { setSelectedMarket(undefined); setError(''); setSellQuantity(0); }}>
                                 <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                 </svg>
                                 Back
                              </button>
                           </div>
                        )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default Sell;
