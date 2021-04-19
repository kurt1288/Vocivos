import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { AvailableStructures } from '../../Api/types';
import { WorkerContext } from '../../WorkerContext';

const Structures = () => {
   const history = useHistory();
   const [apiWorker] = useContext(WorkerContext);
   const [structures, setStructures] = useState<AvailableStructures[]>([]);

   useEffect(() => {
      const getStructures = async () => {
         setStructures((await apiWorker.getStructures()).structures);
      };
      getStructures();
   }, []);

   // Symbols come from the API as all caps with underscore seperate. Format it to be more readable.
   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-5">Available Structures</h2>
         <button type="button" className="flex items-center text-sm hover:text-yellow-600" onClick={() => history.goBack()}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
         </button>
         <table className="mt-3 table-auto w-3/4 mx-auto">
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
                  <tr className="border-b border-gray-500 hover:bg-gray-900" key={structure.name + structure.price}>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.name }</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.price.toLocaleString() }</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.allowedLocationTypes.map((location) => formatString(location)).join(', ') }</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.consumes.map((item) => formatString(item)).join(', ') }</td>
                     <td className="py-3 px-6 text-left whitespace-nowrap">{ structure.produces.map((item) => formatString(item)).join(', ') }</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </React.Fragment>
   );
};

export default Structures;
