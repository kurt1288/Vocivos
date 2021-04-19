import React, { useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Structure } from '../../../Api/types';
import { RootState } from '../../../store';
import { WorkerContext } from '../../../WorkerContext';

const BuiltStructures = () => {
   const [apiWorker] = useContext(WorkerContext);
   const { username } = useSelector((state:RootState) => state.user);
   const [userStructures, setUserStructures] = useState<Structure[]>([]);

   useEffect(() => {
      const getLocations = async () => {
         const locations = (await apiWorker.systemsInfo()).systems;
         const structures:Structure[] = [];

         locations.forEach((sysLoc) => {
            sysLoc.locations.forEach((location) => {
               location.structures?.forEach((structure) => {
                  if (structure.ownedBy && structure.ownedBy.username === (username as string)) { structures.push(structure); }
               });
            });
         });

         setUserStructures(structures);
      };

      getLocations();
   }, []);

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-5">Your Structures</h2>
         { userStructures.length > 0
            ? (
               <div>
                  Your Structures
               </div>
            ) : <p>You have no structures</p>}
      </React.Fragment>
   );
};

export default BuiltStructures;
