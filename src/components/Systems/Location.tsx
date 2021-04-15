import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Location } from '../../Api/types';
import { WorkerContext } from '../../WorkerContext';

const LocationInfo = () => {
   const [apiWorker] = useContext(WorkerContext);
   const { location } = useParams<{ location: string }>();
   const [locInfo, setLocInfo] = useState<Location>();
   const [error, setError] = useState<string>();

   useEffect(() => {
      const getLocation = async () => {
         try {
            const result = await apiWorker.getLocation(location);
            setLocInfo(result.location);
         } catch (err: unknown) {
            setError((err as Error).message);
         }
      };

      getLocation();
   }, []);

   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   return (
      <React.Fragment>
         <div className="mb-4">
            <h2 className="text-3xl">{ locInfo?.name }</h2>
            <h3>({ location })</h3>
         </div>
         { locInfo?.messages
         && (
            <div className="text-sm mb-4 p-4 bg-blue-800 text-blue-200 rounded-sm">
               <p>{ [...locInfo.messages].slice(0, -2).join(' ') }</p>
            </div>
         )}
         { locInfo?.structures
         && (
            <React.Fragment>
               <p className="mb-2 text-lg border-b border-gray-500 w-max">Structures</p>
               {locInfo?.structures?.map((structure) => (
                  <div key={structure.id}>
                     <p className="font-bold">{ structure.name }</p>
                     <p className="text-sm mb-2 text-gray-400">{ structure.completed ? 'Completed' : 'Not completed' }</p>
                     <ul className="pl-3">
                        { structure.materials.slice().sort((a, b) => a.good.localeCompare(b.good)).map((material) => (
                           <li className="py-1" key={material.good}>
                              <p>{ formatString(material.good) } - {`${(Math.round(((material.quantity / material.targetQuantity) * 100) * 10) / 10).toFixed(1)}%`}</p>
                              <p className="text-sm text-gray-400">{`${material.quantity.toLocaleString()} of ${material.targetQuantity.toLocaleString()}`}</p>
                           </li>
                        ))}
                     </ul>
                  </div>
               ))}
            </React.Fragment>
         )}
      </React.Fragment>
   );
};

export default LocationInfo;
