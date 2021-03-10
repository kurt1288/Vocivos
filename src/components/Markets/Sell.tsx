/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Api from '../../Api';
import { Cargo, Marketplace, OwnedShip } from '../../Api/types';
import { RootState, setCredits, updateShip } from '../../store';

interface Props {
   handleClose: () => void,
   show: boolean,
   ship: OwnedShip
}

const Sell = ({ handleClose, show, ship }:Props) => {
   const { token, username } = useSelector((state:RootState) => state.account);
   const dispatch = useDispatch();
   const [marketData, setMarketData] = useState<Marketplace[]>();
   const [selectedMarket, setSelectedMarket] = useState<Cargo>();
   const [sellQuantity, setSellQuantity] = useState<number>(0);
   const showHideModal = show ? 'fixed w-full h-full top-0 left-0 flex items-center justify-center text-gray-900' : 'hidden';

   useEffect(() => {
      const getMarket = async () => {
         if (!ship.location) { return; }
         const data = (await Api.getMarket(token, ship.location)).planet.marketplace;
         setMarketData(data);
      };
      getMarket();
   }, []);

   const sellMarket = async () => {
      if (!selectedMarket) { return; }
      const result = await Api.sellOrder(token, username, ship.id, selectedMarket.good, sellQuantity);
      dispatch(setCredits(result.credits));
      dispatch(updateShip(result.ship));
      setSelectedMarket(undefined);
      handleClose();
   };

   // Symbols come from the API as all caps with underscore seperate. Format it to be more readable.
   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   return (
      <div className={showHideModal}>
         <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={() => { setSelectedMarket(undefined); handleClose(); }} />
         <div className={`modal-container bg-gray-100 w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto ${selectedMarket ? 'min-h-1/3' : ''}`}>
            <div className="modal-content py-4 text-left px-6">
               <h3 className="text-xl font-semibold mb-6">Sell Cargo</h3>
               <div className="relative">
                  <div className="divide-y">
                     {ship.cargo?.map((cargo) => (
                        <div className={`py-3 flex justify-between items-center bg-gray-100 w-full ${selectedMarket ? 'absolute' : ''} ${selectedMarket?.good === cargo.good ? 'z-10' : ''}`} key={cargo.good + cargo.quantity + cargo.totalVolume}>
                           <div>
                              <p className="font-semibold">{ formatString(cargo.good) } <span className="ml-3 text-sm text-gray-500 font-normal">{ cargo.quantity.toLocaleString() } units available</span></p>
                              { marketData?.some((x) => x.symbol === cargo.good)
                                 && <p className="text-sm">{ marketData.find((x) => x.symbol === cargo.good)?.pricePerUnit.toLocaleString() } credits per unit</p>}
                           </div>
                           { !selectedMarket
                              && (
                                 <div>
                                    <button
                                       type="button"
                                       className="text-sm bg-blue-500 text-white px-4 py-1 rounded mr-3 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-default disabled:bg-blue-500"
                                       disabled={!marketData?.some((x) => x.symbol === cargo.good)}
                                       onClick={() => setSelectedMarket(cargo)}
                                    >Sell
                                    </button>
                                 </div>
                              )}
                        </div>
                     ))}
                  </div>
                  { selectedMarket
                        && (
                           <div className="absolute top-20 w-full text-center">
                              <div className="flex">
                                 <input type="number" min={0} max={selectedMarket.quantity} value={sellQuantity} placeholder="Quantity" className="flex-grow px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:outline-none" onChange={(e) => setSellQuantity(parseInt(e.target.value, 10))} />
                                 <button type="button" className="ml-2 bg-blue-400 text-gray-100 px-3 py-2 rounded hover:bg-blue-500" onClick={() => setSellQuantity(selectedMarket.quantity)}>Max</button>
                              </div>
                              <button
                                 type="button"
                                 className="mt-2 w-full px-3 py-2 bg-green-400 text-white rounded hover:bg-green-500 disabled:opacity-50 disabled:bg-green-400 disabled:cursor-default"
                                 disabled={sellQuantity <= 0}
                                 onClick={sellMarket}
                              >
                                 Sell for { (sellQuantity * (marketData?.find((x) => x.symbol === selectedMarket.good) as Marketplace).pricePerUnit).toLocaleString() } credits
                              </button>
                              <button type="button" className="text-red-400 mt-3 hover:text-red-500" onClick={() => { setSelectedMarket(undefined); setSellQuantity(0); }}>Back</button>
                           </div>
                        )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default Sell;
