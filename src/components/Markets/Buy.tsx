/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Api from '../../Api';
import { Marketplace, OwnedShip } from '../../Api/types';
import { RootState, setCredits, updateShip } from '../../store';
import { ModalPlaceholder } from '../SkeletonLoaders';

interface Props {
   handleClose: () => void,
   show: boolean,
   ship: OwnedShip
}

const Buy = ({ handleClose, show, ship }:Props) => {
   const { token, username } = useSelector((state:RootState) => state.account);
   const { credits } = useSelector((state:RootState) => state.user);
   const dispatch = useDispatch();
   const [marketData, setMarketData] = useState<Marketplace[]>();
   const [selectedMarket, setSelectedMarket] = useState<Marketplace>();
   const [purchaseQuantity, setPurchaseQuantity] = useState<number>(0);
   const [working, setWorking] = useState<boolean>(false);
   const [error, setError] = useState<string>('');
   const showHideModal = show ? 'fixed w-full h-full top-0 left-0 flex items-center justify-center text-gray-900 z-10' : 'hidden';

   useEffect(() => {
      const getMarket = async () => {
         if (!ship.location) { return; }
         const data = (await Api.getMarket(token, ship.location)).location.marketplace;
         // sort market data alphabetically by symbol
         setMarketData([...data].sort(((a, b) => ((a.symbol > b.symbol) ? 1 : (b.symbol > a.symbol) ? -1 : 0))));
      };
      getMarket();
   }, []);

   // Symbols come from the API as all caps with underscore seperate. Format it to be more readable.
   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   const maxQuantity = (): number => {
      if (!selectedMarket) { return 0; }

      const maxCargo = Math.floor(ship.spaceAvailable / selectedMarket.volumePerUnit);

      if (maxCargo * selectedMarket.pricePerUnit < credits && maxCargo <= selectedMarket.quantityAvailable && maxCargo <= 300) {
         return maxCargo;
      } if (maxCargo > selectedMarket.quantityAvailable && selectedMarket.quantityAvailable <= 300) {
         return selectedMarket.quantityAvailable;
      } if (Math.floor(credits / selectedMarket.pricePerUnit) > 300) {
         return 300;
      }

      return Math.floor(credits / selectedMarket.pricePerUnit);
   };

   const purchaseMarket = async () => {
      if (!selectedMarket) { return; }
      try {
         setWorking(true);
         const result = await Api.purchaseOrder(token, username, ship.id, selectedMarket.symbol, purchaseQuantity);
         dispatch(setCredits(result.credits));
         dispatch(updateShip(result.ship));
         setSelectedMarket(undefined);
         handleClose();
      } catch (err:unknown) {
         setError((err as Error).message);
      }
   };

   return (
      <div className={showHideModal}>
         <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={() => { setSelectedMarket(undefined); handleClose(); }} />
         <div className="modal-container bg-gray-100 w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto min-h-1/3">
            <div className="modal-content py-4 text-left px-6">
               <h3 className="text-xl font-semibold mb-6">Market Buy</h3>
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
                           {marketData?.map((market) => (
                              <div className={`py-3 flex justify-between items-center bg-gray-100 w-full ${selectedMarket ? 'absolute' : ''} ${selectedMarket?.symbol === market.symbol ? 'z-10' : ''}`} key={market.symbol + market.quantityAvailable + market.pricePerUnit + market.volumePerUnit}>
                                 <div>
                                    <p className="font-semibold">{ formatString(market.symbol) } <span className="ml-3 text-sm text-gray-500 font-normal">{ market.quantityAvailable.toLocaleString() } units available</span></p>
                                    <p className="text-sm">{ market.pricePerUnit.toLocaleString() } credit{ market.pricePerUnit > 1 ? 's' : ''} per unit</p>
                                 </div>
                                 { !selectedMarket
                                    && (
                                       <div>
                                          <button
                                             type="button"
                                             className="text-sm bg-blue-500 text-white px-4 py-1 rounded mr-3 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-500"
                                             onClick={() => setSelectedMarket(market)}
                                             disabled={market.quantityAvailable <= 0}
                                          >Buy
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
                              <div className="flex">
                                 <input type="number" min={0} max={maxQuantity()} value={purchaseQuantity} placeholder="Quantity" className="flex-grow px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none" onChange={(e) => setPurchaseQuantity(parseInt(e.target.value, 10))} />
                                 <button type="button" className="ml-2 bg-blue-400 text-gray-100 px-3 py-2 rounded hover:bg-blue-500" onClick={() => setPurchaseQuantity(maxQuantity)}>Max</button>
                              </div>
                              <button
                                 type="button"
                                 className="mt-2 w-full px-3 py-2 bg-green-400 text-white rounded hover:bg-green-500 disabled:opacity-50 disabled:bg-green-400 disabled:cursor-default"
                                 disabled={(purchaseQuantity * selectedMarket.pricePerUnit <= 0) || ((purchaseQuantity * selectedMarket.pricePerUnit > credits) || (working))}
                                 onClick={purchaseMarket}
                              >
                                 <span className={working ? 'hidden' : 'inline'}>Purchase for { (purchaseQuantity * selectedMarket.pricePerUnit).toLocaleString() } credit{ purchaseQuantity * selectedMarket.pricePerUnit > 1 ? 's' : ''}</span>
                                 <span className={!working ? 'hidden' : 'inline'}>Please wait...</span>
                              </button>
                              <button type="button" className="text-red-400 mt-3 hover:text-red-500" onClick={() => { setSelectedMarket(undefined); setError(''); setPurchaseQuantity(0); }}>Back</button>
                           </div>
                        )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default Buy;
