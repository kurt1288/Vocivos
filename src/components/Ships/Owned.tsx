/* eslint-disable react/jsx-props-no-spreading */
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { OwnedShip } from '../../Api/types';
import { RootState } from '../../store';
import ShipCard from './ShipCard';

interface shipGroups {
   [index:string]: OwnedShip[];
}

const Owned = () => {
   const { ships } = useSelector((state:RootState) => state.user);
   const { flightPlans, systems } = useSelector((state:RootState) => state);
   const [shipGroups, setShipGroups] = useState<shipGroups>();
   const [sortOrder, setOrder] = useState(false);
   const [sortType, setSortType] = useState('type');
   const [shipError, setShipError] = useState('');

   useEffect(() => {
      const result:shipGroups = {};
      ships.forEach((ship) => {
         if (!ship.location) {
            if (ship.flightPlanId || flightPlans.some((x) => x.ship === ship.id)) {
               const destinationSystem = flightPlans.find((x) => x.ship === ship.id)?.destination.split('-')[0] as string;
               (result[destinationSystem] = result[destinationSystem] || []).push(ship);
            } else {
               (result.UNKNOWN = result.UNKNOWN || []).push(ship);
            }
         } else if (result[ship.location.split('-')[0]]) {
            result[ship.location.split('-')[0]].push(ship);
         } else {
            result[ship.location.split('-')[0]] = [];
            result[ship.location.split('-')[0]].push(ship);
         }
      });
      const ordered = Object.keys(result).sort().reduce((obj:shipGroups, key) => {
         // eslint-disable-next-line no-param-reassign
         obj[key] = result[key];
         return obj;
      }, {});
      setShipGroups(ordered);
   }, [ships, flightPlans]);

   const sortShips = (group:OwnedShip[]) => {
      switch (sortType) {
         case 'class':
            return [...group].sort((a, b) => (sortOrder ? b.class.localeCompare(a.class) : a.class.localeCompare(b.class)));
         case 'type':
            return [...group].sort((a, b) => (sortOrder ? b.type.localeCompare(a.type) : a.type.localeCompare(b.type)));
         case 'manufacturer':
            return [...group].sort((a, b) => (sortOrder ? a.manufacturer.localeCompare(b.manufacturer) : b.manufacturer.localeCompare(a.manufacturer)));
         case 'maxCargo':
            return sortOrder ? [...group].sort((a, b) => ((a.maxCargo > b.maxCargo) ? 1 : (b.maxCargo > a.maxCargo) ? -1 : 0)) : [...group].sort((a, b) => ((a.maxCargo < b.maxCargo) ? 1 : (b.maxCargo < a.maxCargo) ? -1 : 0));
         case 'speed':
            return sortOrder ? [...group].sort((a, b) => ((a.speed > b.speed) ? 1 : (b.speed > a.speed) ? -1 : 0)) : [...group].sort((a, b) => ((a.speed < b.speed) ? 1 : (b.speed < a.speed) ? -1 : 0));
         case 'plating':
            return sortOrder ? [...group].sort((a, b) => ((a.plating > b.plating) ? 1 : (b.plating > a.plating) ? -1 : 0)) : [...group].sort((a, b) => ((a.plating < b.plating) ? 1 : (b.plating < a.plating) ? -1 : 0));
         case 'weaponse':
            return sortOrder ? [...group].sort((a, b) => ((a.weapons > b.weapons) ? 1 : (b.weapons > a.weapons) ? -1 : 0)) : [...group].sort((a, b) => ((a.weapons < b.weapons) ? 1 : (b.weapons < a.weapons) ? -1 : 0));
         default:
            return group;
      }
   };

   const addShipError = (message:string) => {
      setShipError(message);
   };

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-5">Your Ships</h2>
         { shipError !== ''
         && (
            <div className="flex justify-between items-center text-sm py-3 px-2 bg-red-400 text-red-900 mb-5">
               <p>{ shipError }</p>
               <button className="w-4 h-4 hover:text-red-700" type="button" onClick={() => setShipError('')}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
               </button>
            </div>
         )}
         <div className="flex mb-5">
            <button type="button" className="cursor-pointer w-6 h-6" onClick={() => setOrder(!sortOrder)}>
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E5E7EB" {... (sortOrder ? { transform: 'rotate(180) scale(-1,1)' } : {})} className="origin-center"><path d="M0 0h24v24H0V0z" fill="none" /><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" /></svg>
            </button>
            <select name="sort" id="sort" className="appearance-none bg-gray-800 text-gray-200 cursor-pointer" onChange={(e) => setSortType(e.target.value)}>
               <option value="type">Name</option>
               <option value="manufacturer">Manufacturer</option>
               <option value="cost">Cost</option>
               <option value="maxCargo">Max Cargo</option>
               <option value="speed">Speed</option>
               <option value="plating">Plating</option>
               <option value="weapons">Weapons</option>
            </select>
         </div>
         <div>
            { shipGroups && Object.keys(shipGroups).map((group) => (
               <div className="mb-10" key={group}>
                  <h3 className="text-xl pb-2 mb-4 border-b border-gray-600">{ systems.find((x) => x.symbol === group)?.name }</h3>
                  <div className="grid grid-cols-4 gap-4">
                     { sortShips(shipGroups[group]).map((ship) => (
                        <ShipCard ship={ship} key={ship.id} shipError={(message) => addShipError(message)} />
                     ))}
                  </div>
               </div>
            ))}
         </div>
      </React.Fragment>
   );
};

export default Owned;
