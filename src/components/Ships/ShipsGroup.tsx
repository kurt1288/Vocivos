import React, { useState } from 'react';
import AnimateHeight from 'react-animate-height';
import { useSelector } from 'react-redux';
import { OwnedShip } from '../../Api/types';
import { RootState } from '../../store';
import ShipCard from './ShipCard';

interface Props {
   sortOrder: boolean,
   sortType: string,
   system: string,
   ships: OwnedShip[],
   setShipError: (message:string) => void,
}

const ShipsGroup = ({
   sortOrder, sortType, system, ships, setShipError,
}:Props) => {
   const { systems } = useSelector((state:RootState) => state);
   const [collapseHeight, setCollapseHeight] = useState<number | 'auto'>('auto');

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

   const toggleCollapse = () => {
      setCollapseHeight(collapseHeight === 0 ? 'auto' : 0);
   };

   return (
      <div className="mb-10">
         <button type="button" className="flex items-center border-b border-gray-600 pb-2 mb-4" onClick={() => toggleCollapse()}>
            <span className={`mr-2 mt-0.5 ${collapseHeight === 'auto' ? 'arrow-down' : 'arrow-up'}`} />
            <h3 className="text-xl">{ systems.find((x) => x.symbol === system)?.name }</h3>
         </button>
         <AnimateHeight id={`locations-${system}`} className={`locations-${system}`} duration={250} height={collapseHeight}>
            <div className="grid grid-cols-4 gap-4">
               { sortShips(ships).map((ship) => (
                  <ShipCard ship={ship} key={ship.id} shipError={(message) => setShipError(message)} />
               ))}
            </div>
         </AnimateHeight>
      </div>
   );
};

export default ShipsGroup;
