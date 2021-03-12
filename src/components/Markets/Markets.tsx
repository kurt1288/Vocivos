import { formatDistanceToNow } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Api from '../../Api';
import { Location } from '../../Api/types';
import { RootState, updateMarketData } from '../../store';

const Markets = () => {
   const { token } = useSelector((state:RootState) => state.account);
   const { ships } = useSelector((state:RootState) => state.user);
   const marketData = useSelector((state:RootState) => state.marketData);
   const dispatch = useDispatch();
   const [locations, setLocations] = useState<Location[]>();
   const [time, setTime] = useState<number>(Date.now());

   useEffect(() => {
      const getData = async () => {
         const system = (await Api.getLocations(token, 'OE')).locations;
         setLocations(system);
      };
      getData();

      // Update the 'time' state, to refresh "last updated" times
      const interval = setInterval(() => setTime(Date.now()), 60000);

      return () => clearInterval(interval);
   }, []);

   useEffect(() => {
      const getMarketData = async () => {
         locations?.forEach(async (location) => {
            if (ships.some((x) => x.location === location.symbol)) {
               const data = await Api.getMarket(token, location.symbol);
               dispatch(updateMarketData({ updatedAt: Date.now(), planet: data.planet }));
            }
         });
      };
      getMarketData();
   }, [locations, ships]);

   const getDataForLocation = (location: Location) => {
      const data = marketData.find((x) => x.planet.symbol === location.symbol);

      const formatString = (value:string) => (
         value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

      if (!data || data?.planet.marketplace.length === 0) {
         return <p className="mt-3 text-sm text-gray-400">No data available</p>;
      }

      return (
         data?.planet.marketplace.slice().sort((a, b) => ((a.symbol > b.symbol) ? 1 : (b.symbol > a.symbol) ? -1 : 0)).map((market) => (
            <div className="text-sm my-3" key={market.symbol + market.pricePerUnit + market.volumePerUnit}>
               <p className="font-bold">{ formatString(market.symbol) }</p>
               <p className="pl-2">Quantity: { market.quantityAvailable.toLocaleString() }</p>
               <p className="pl-2">Price per unit: { market.pricePerUnit.toLocaleString() } credits</p>
            </div>
         ))
      );
   };

   const getUpdatedTime = (location: Location) => {
      const data = marketData.find((x) => x.planet.symbol === location.symbol);

      if (!data) { return null; }

      return `Updated ${formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true })}`;
   };

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-5">Markets</h2>
         <div className="grid grid-cols-3 gap-4">
            { locations?.sort((a, b) => ((a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0)).map((location) => (
               <div className="p-3 bg-gray-900 border border-gray-700 rounded" key={location.symbol}>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                     <h3 className="text-xl">{ location.name }</h3>
                     <p className="text-xs text-gray-400">{ time !== Date.now() && getUpdatedTime(location) }</p>
                  </div>
                  { getDataForLocation(location) }
               </div>
            ))}
         </div>
      </React.Fragment>
   );
};

export default Markets;