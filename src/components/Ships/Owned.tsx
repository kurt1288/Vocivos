/* eslint-disable react/jsx-props-no-spreading */
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { OwnedShip } from '../../Api/types';
import { RootState } from '../../store';
import ShipCard from './ShipCard';

const Owned = () => {
   const { ships } = useSelector((state:RootState) => state.user);
   const [sortedShips, setShips] = useState<OwnedShip[]>();
   const [sortOrder, setOrder] = useState(false);
   const [sortType, setSortType] = useState('class');

   useEffect(() => {
      const sort = (value:string) => {
         if (!ships) {
            return;
         }

         let sorted;

         switch (value) {
            case 'type':
               sortOrder ? sorted = [...ships].sort((a, b) => ((a.type < b.type) ? 1 : (b.type < a.type) ? -1 : 0)) : sorted = [...ships].sort((a, b) => ((a.type > b.type) ? 1 : (b.type > a.type) ? -1 : 0));
               break;
            case 'manufacturer':
               sortOrder ? sorted = [...ships].sort((a, b) => ((a.manufacturer > b.manufacturer) ? 1 : (b.manufacturer > a.manufacturer) ? -1 : 0)) : sorted = [...ships].sort((a, b) => ((a.manufacturer < b.manufacturer) ? 1 : (b.manufacturer < a.manufacturer) ? -1 : 0));
               break;
            case 'maxCargo':
               sortOrder ? sorted = [...ships].sort((a, b) => ((a.maxCargo > b.maxCargo) ? 1 : (b.maxCargo > a.maxCargo) ? -1 : 0)) : sorted = [...ships].sort((a, b) => ((a.maxCargo < b.maxCargo) ? 1 : (b.maxCargo < a.maxCargo) ? -1 : 0));
               break;
            case 'speed':
               sortOrder ? sorted = [...ships].sort((a, b) => ((a.speed > b.speed) ? 1 : (b.speed > a.speed) ? -1 : 0)) : sorted = [...ships].sort((a, b) => ((a.speed < b.speed) ? 1 : (b.speed < a.speed) ? -1 : 0));
               break;
            case 'plating':
               sortOrder ? sorted = [...ships].sort((a, b) => ((a.plating > b.plating) ? 1 : (b.plating > a.plating) ? -1 : 0)) : sorted = [...ships].sort((a, b) => ((a.plating < b.plating) ? 1 : (b.plating < a.plating) ? -1 : 0));
               break;
            case 'weapons':
               sortOrder ? sorted = [...ships].sort((a, b) => ((a.weapons > b.weapons) ? 1 : (b.weapons > a.weapons) ? -1 : 0)) : sorted = [...ships].sort((a, b) => ((a.weapons < b.weapons) ? 1 : (b.weapons < a.weapons) ? -1 : 0));
               break;
            default:
               sortOrder ? sorted = [...ships].sort((a, b) => ((a.class > b.class) ? 1 : (b.class > a.class) ? -1 : 0)) : sorted = [...ships].sort((a, b) => ((a.class < b.class) ? 1 : (b.class < a.class) ? -1 : 0));
               break;
         }

         setShips(sorted);
      };

      sort(sortType);
   }, [sortType, sortOrder, ships]);

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-5">Your Ships</h2>
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
         <div className="grid grid-cols-4 gap-4">
            { sortedShips?.map((ship) => (
               <ShipCard ship={ship} key={ship.class + ship.speed + ship.manufacturer + ship.maxCargo} />
            ))}
         </div>
      </React.Fragment>
   );
};

export default Owned;
