import { formatDistanceToNow } from 'date-fns';
import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Location } from '../../Api/types';
import { RootState, setSystems, updateMarketData } from '../../store';
import { WorkerContext } from '../../WorkerContext';
import { MarketCardLoader } from '../SkeletonLoaders';

const Markets = () => {
   const [apiWorker] = useContext(WorkerContext);
   const { ships } = useSelector((state:RootState) => state.user);
   const marketData = useSelector((state:RootState) => state.marketData);
   const systems = useSelector((state:RootState) => state.systems);
   const dispatch = useDispatch();
   const [locations, setLocations] = useState<Location[]>();
   const [time, setTime] = useState<number>(Date.now());
   const [activeSystem, setActiveSystem] = useState<string>();

   const changeSystem = async (system:string) => {
      setActiveSystem(system);
      setLocations(undefined);
      const data = (await apiWorker.getLocations(system)).locations;
      setLocations(data);
   };

   useEffect(() => {
      const GetSystems = async () => {
         if (systems.length === 0) {
            const temp = (await apiWorker.systemsInfo()).systems;
            dispatch((setSystems(temp)));
         }
      };
      GetSystems();

      // Update the 'time' state, to refresh "last updated" times
      const interval = setInterval(() => setTime(Date.now()), 60000);

      return () => clearInterval(interval);
   }, []);

   useEffect(() => {
      if (systems.length === 0) { return; }
      changeSystem(systems[0].symbol);
   }, [systems]);

   useEffect(() => {
      const getMarketData = async () => {
         locations?.forEach(async (location) => {
            if (ships.some((x) => x.location === location.symbol)) {
               const data = await apiWorker.getMarket(location.symbol);
               dispatch(updateMarketData({ updatedAt: Date.now(), planet: data.location }));
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
               <p className="pl-2">Buy: { (market.purchasePricePerUnit).toLocaleString() } credits</p>
               <p className="pl-2">Sell: { (market.sellPricePerUnit).toLocaleString() } credits</p>
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
         <p className="text-xs text-gray-400 mb-1">System</p>
         { systems.map((system) => (
            <button key={system.symbol} type="button" className={`text-sm mr-4 pb-1 mb-5 ${activeSystem === system.symbol ? 'subMenuActive' : ''}`} value={system.symbol} onClick={(e) => changeSystem(e.currentTarget.value)}>{ system.name }</button>
         ))}
         <div className="grid grid-cols-4 gap-4">
            { !locations
               ? (
                  <MarketCardLoader />
               )
               : (
                  locations.sort((a, b) => ((a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0)).map((location) => (
                     <div className="p-3 bg-gray-900 border border-gray-700 rounded" key={location.symbol}>
                        <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                           <h3 className="text-xl">{ location.name }</h3>
                           <p className="text-xs text-gray-400">{ time && getUpdatedTime(location) }</p>
                        </div>
                        { getDataForLocation(location) }
                     </div>
                  )))}
         </div>
      </React.Fragment>
   );
};

export default Markets;
