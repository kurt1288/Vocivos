import React, { useContext, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Location } from '../../Api/types';
import { WorkerContext } from '../../WorkerContext';

const LocationInfo = () => {
   const history = useHistory();
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
            <button type="button" className="flex items-center text-sm mb-3 hover:text-yellow-600" onClick={() => history.goBack()}>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
               </svg>
               Back
            </button>
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
                  <div className="flex items-center">
                     <p key={structure.id}>{ formatString(structure.type) }</p>
                     { structure.ownedBy
                        && <span className="text-sm ml-3">(Owner: { structure.ownedBy.username })</span>}
                  </div>
               ))}
            </React.Fragment>
         )}
      </React.Fragment>
   );
};

export default LocationInfo;
