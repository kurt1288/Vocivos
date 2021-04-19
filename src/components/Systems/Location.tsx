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
                  <p key={structure.id}>{ formatString(structure.type) }</p>
               ))}
            </React.Fragment>
         )}
      </React.Fragment>
   );
};

export default LocationInfo;
