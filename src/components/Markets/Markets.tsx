/* eslint-disable no-continue */
import { formatDistanceToNow } from 'date-fns';
import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { CargoType, Location, Planet } from '../../Api/types';
import { RootState, setSystems, updateMarketData } from '../../store';
import { WorkerContext } from '../../WorkerContext';
import { MarketCardLoader } from '../SkeletonLoaders';

interface SystemRoutes {
   system: string;
   routes: TradeRoute[];
}

interface TradeRoute {
   good: CargoType;
   from: string;
   to: string;
   fuelRequired: number;
   cpdv: number;
   lastUpdated: number;
}

const Markets = () => {
   const [apiWorker] = useContext(WorkerContext);
   const { ships } = useSelector((state:RootState) => state.user);
   const marketData = useSelector((state:RootState) => state.marketData);
   const systems = useSelector((state:RootState) => state.systems);
   const automationEnabled = useSelector((state:RootState) => state.automateAll);
   const dispatch = useDispatch();
   const [locations, setLocations] = useState<Location[]>();
   const [time, setTime] = useState<number>(Date.now());
   const [activeSystem, setActiveSystem] = useState<string>();

   const changeSystem = async (system:string) => {
      try {
         setActiveSystem(system);
         setLocations(undefined);
         const data = (await apiWorker.getLocations(system)).locations;
         setLocations(data);
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
               try {
                  const data = await apiWorker.getMarket(location.symbol);
                  dispatch(updateMarketData({ updatedAt: Date.now(), planet: data.location }));
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
         });
      };
      // When automating, this request can be queued and by the time it executes the ship may have left, which results in an API error
      if (!automationEnabled) {
         getMarketData();
      }
   }, [locations, ships]);

   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   const getDataForLocation = (location: Location) => {
      const data = marketData.find((x) => x.planet.symbol === location.symbol);

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

   const getSystemSymbolFromLocation = (location: string) => {
      if (!location) {
         console.log(location);
         return '';
      }
      return location.split('-')[0];
   };

   const distanceBetween = (point1: Planet | Location, point2: Planet | Location) => (
      Math.ceil(Math.sqrt(((point2.x - point1.x) ** 2) + ((point2.y - point1.y) ** 2)))
   );

   const fuelRequired = (from: Planet | Location, to: Planet | Location) => (
      Math.round((distanceBetween(to, from) / 4)) + 1
   );

   const getBestRoutes = () => {
      const bestRoutes: SystemRoutes[] = [];
      const uniqueLocations = Array.from(new Set(marketData.map((market) => market.planet.symbol)));
      const uniqueSystems:string[] = Array.from(new Set(uniqueLocations.map((location: any) => getSystemSymbolFromLocation(location as string))));

      // eslint-disable-next-line no-restricted-syntax
      for (const system of uniqueSystems) {
         const bestSystemRoutes: TradeRoute[] = [];

         // eslint-disable-next-line no-restricted-syntax
         for (const type of Object.values(CargoType)) {
            if (type === CargoType.Research || type === CargoType.Fuel) { continue; } // exclude research for now

            // all locations that have up-to-date data and have the good in question
            const data = [...marketData].filter((x) => getSystemSymbolFromLocation(x.planet.symbol) === system && x.planet.marketplace.find((y) => y.symbol === type));
            // const data = [...this.markets].filter((x) => (Date.now() - x.updatedAt <= this.marketUpdateTime) && x.planet.marketplace.find((y) => y.symbol === type));

            if (data.length <= 1) { continue; }
            for (let i = 0; i < data.length; i += 1) {
               const current = data[i];

               for (let y = 0; y < data.length; y += 1) {
                  if (data[y].planet !== current.planet) {
                     const creditDiff = (data[y].planet.marketplace.find((x) => x.symbol === type)?.sellPricePerUnit as number) - (current.planet.marketplace.find((x) => x.symbol === type)?.purchasePricePerUnit as number);
                     const distance = distanceBetween(current.planet, data[y].planet);
                     const cpdv = creditDiff / distance / (current.planet.marketplace.find((x) => x.symbol === type)?.volumePerUnit as number);
                     const lastUpdated = current.updatedAt > data[y].updatedAt ? current.updatedAt : data[y].updatedAt;

                     // exclude any negatives because we don't want to trade on routes that lose money
                     if (cpdv <= 0) { continue; }

                     const existing = bestSystemRoutes.find((x) => x.good === type);
                     if (existing && existing.cpdv < cpdv) {
                        bestSystemRoutes[bestSystemRoutes.findIndex((x) => x.good === type)] = {
                           good: type,
                           from: current.planet.symbol,
                           to: data[y].planet.symbol,
                           fuelRequired: fuelRequired(current.planet, data[y].planet),
                           cpdv,
                           lastUpdated,
                        };
                     } else if (!existing) {
                        bestSystemRoutes.push({
                           good: type,
                           from: current.planet.symbol,
                           to: data[y].planet.symbol,
                           fuelRequired: fuelRequired(current.planet, data[y].planet),
                           cpdv,
                           lastUpdated,
                        });
                     }
                  }
               }
            }
         }

         bestRoutes.push({ system, routes: bestSystemRoutes.sort((a, b) => ((a.cpdv < b.cpdv) ? 1 : (b.cpdv < a.cpdv) ? -1 : 0)) });
      }

      return bestRoutes;
   };

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-5">Markets</h2>
         <div className="my-7">
            <h3>Best Routes</h3>
            <table className="mx-auto mt-3 w-3/4 text-sm">
               <thead>
                  <tr className="border-b border-gray-500 text-sm leading-normal">
                     <th className="font-normal text-gray-400 text-left">Good</th>
                     <th className="font-normal text-gray-400 text-left">From</th>
                     <th className="font-normal text-gray-400 text-left">To</th>
                     <th className="font-normal text-gray-400 text-left">Credits per distance volume</th>
                  </tr>
               </thead>
               <tbody>
                  { getBestRoutes().map((systemRoute) => (
                     systemRoute.routes.map((route) => (
                        <tr className="border-b border-gray-500 hover:bg-gray-900" key={route.from + route.to + route.cpdv}>
                           <td className="py-1">{ formatString(route.good) }</td>
                           <td className="py-1">{ route.from }</td>
                           <td className="py-1">{ route.to }</td>
                           <td className="py-1">{ Math.ceil(route.cpdv * 100) / 100 }</td>
                        </tr>
                     ))
                  ))}
               </tbody>
            </table>
         </div>
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
                  ))
               )}
         </div>
      </React.Fragment>
   );
};

export default Markets;
