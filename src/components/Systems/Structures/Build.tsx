import React, { useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AvailableStructures, Location } from '../../../Api/types';
import { RootState } from '../../../store';
import { WorkerContext } from '../../../WorkerContext';

const Structures = () => {
   const { credits } = useSelector((state:RootState) => state.user);
   const [apiWorker] = useContext(WorkerContext);
   const [structures, setStructures] = useState<AvailableStructures[]>([]);
   const [locationsForStructure, setLocationsForStructure] = useState<Location[]>([]);
   const [selectedStructure, setSelectedStructure] = useState<AvailableStructures>();
   const [selectedLocation, setSelectedLocation] = useState<Location>();

   useEffect(() => {
      const getStructures = async () => {
         setStructures((await apiWorker.getStructures()).structures);
      };
      getStructures();
   }, []);

   // Symbols come from the API as all caps with underscore seperate. Format it to be more readable.
   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   const findStructureLocation = async (structure: AvailableStructures) => {
      setSelectedStructure(structure);
      setSelectedLocation(undefined);
      setLocationsForStructure([]);
      const locations:Location[] = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const locationType of structure.allowedLocationTypes) {
         // eslint-disable-next-line no-await-in-loop
         const location = (await apiWorker.getLocationsForStructure(locationType)).locations;
         location.forEach((loc) => locations.push(loc));
      }
      setLocationsForStructure(locations);
   };

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-5">Available Structures</h2>
         <h3 className="text-lg mt-5 mb-3">1. Select a structure...</h3>
         <table className="mt-3 table-auto w-full mx-auto">
            <thead>
               <tr className="bg-gray-300 text-gray-700 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Type</th>
                  <th className="py-3 px-6 text-left">Price</th>
                  <th className="py-3 px-6 text-left">Allowed Locations</th>
                  <th className="py-3 px-6 text-left">Consumes</th>
                  <th className="py-3 px-6 text-left">Produces</th>
               </tr>
            </thead>
            <tbody className="bg-gray-700 text-gray-200 text-sm font-light">
               { structures.map((structure) => (
                  <tr className={`cursor-pointer border-b border-gray-500 hover:bg-gray-900 ${selectedStructure?.name === structure.name ? 'bg-yellow-600 text-gray-100' : ''}`} key={structure.name + structure.price} onClick={() => findStructureLocation(structure)}>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.name }</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.price.toLocaleString() }</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.allowedLocationTypes.map((location) => formatString(location)).join(', ') }</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.consumes.map((item) => formatString(item)).join(', ') }</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.produces.map((item) => formatString(item)).join(', ') }</td>
                  </tr>
               ))}
            </tbody>
         </table>
         { selectedStructure
         && (
            <React.Fragment>
               <h3 className="text-lg mt-10 mb-3">2. Select a location...</h3>
               <table className="mt-3 table-auto w-full mx-auto">
                  <thead>
                     <tr className="bg-gray-300 text-gray-700 uppercase text-sm leading-normal">
                        <th className="py-3 px-6 text-left">Name</th>
                        <th className="py-3 px-6 text-left">Type</th>
                        <th className="py-3 px-6 text-left">Symbol</th>
                     </tr>
                  </thead>
                  <tbody className="bg-gray-700 text-gray-200 text-sm font-light">
                     { locationsForStructure.map((location) => (
                        <tr className={`cursor-pointer border-b border-gray-500 hover:bg-gray-900 ${selectedLocation?.symbol === location.symbol ? 'bg-yellow-600 text-gray-100' : ''}`} key={location.symbol} onClick={() => setSelectedLocation(location)}>
                           <td className="py-3 px-6 text-left whitespace-nowrap">{ location.name }</td>
                           <td className="py-3 px-6 text-left whitespace-nowrap">{ formatString(location.type) }</td>
                           <td className="py-3 px-6 text-left whitespace-nowrap">{ location.symbol }</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </React.Fragment>
         )}
         { selectedLocation && selectedStructure
         && (
            <React.Fragment>
               <h3 className="text-lg mt-10 mb-3">3. Confirm build</h3>
               <table className="mb-3">
                  <thead>
                     <tr>
                        <th className="pr-10 font-normal text-gray-400 text-left">Structure</th>
                        <th className="pr-8 font-normal text-gray-400 text-left">Location</th>
                        <th className="pr-8 font-normal text-gray-400 text-left">Cost</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr>
                        <td>{ selectedStructure.name }</td>
                        <td>{ selectedLocation.name }</td>
                        <td>{ selectedStructure.price.toLocaleString() }</td>
                     </tr>
                  </tbody>
               </table>
               <button
                  type="button"
                  className="bg-green-600 px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:bg-green-600 disabled:cursor-default"
                  disabled={credits < selectedStructure.price}
               >Build
               </button>
            </React.Fragment>
         )}
      </React.Fragment>
   );
};

export default Structures;
