/* eslint-disable react/jsx-props-no-spreading */
import React, { useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { Ship } from '../../Api/types';
import { RootState } from '../../store';
import { WorkerContext } from '../../WorkerContext';
import { CardLoader } from '../SkeletonLoaders';
import PurchaseShipModal from './PurchaseShipModal';

const Available = () => {
   const [apiWorker] = useContext(WorkerContext);
   const user = useSelector((state:RootState) => state);
   const [ships, setShips] = useState<Ship[]>();
   const [sortOrder, setOrder] = useState(false);
   const [sortType, setSortType] = useState('class');
   const [showModal, setModalShow] = useState(false);
   const [selectedShip, setSelectedShip] = useState<Ship>();

   const GetShips = async () => {
      try {
         const getShips = await apiWorker.availableShips();
         getShips.ships.sort((a, b) => ((a.type > b.type) ? 1 : (b.type > a.type) ? -1 : 0));
         setShips(getShips.ships);
      } catch (err: unknown) {
         toast((err as Error).message, {
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

   const lowestPrice = (ship: Ship) => (
      ship.purchaseLocations.reduce((prev, curr) => (prev.price < curr.price ? prev : curr)).price
   );

   useEffect(() => {
      const sort = (value:string) => {
         if (!ships) {
            return;
         }

         let sorted;

         switch (value) {
            case 'cost':
               sortOrder ? sorted = [...ships].sort((a, b) => ((a.purchaseLocations[0].price > b.purchaseLocations[0].price) ? 1 : (b.purchaseLocations[0].price > a.purchaseLocations[0].price) ? -1 : 0)) : sorted = [...ships].sort((a, b) => ((a.purchaseLocations[0].price < b.purchaseLocations[0].price) ? 1 : (b.purchaseLocations[0].price < a.purchaseLocations[0].price) ? -1 : 0));
               break;
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
   }, [sortType, sortOrder]);

   useEffect(() => {
      GetShips();
   }, []);

   return (
      <React.Fragment>
         <PurchaseShipModal show={showModal} ship={selectedShip} handleClose={() => setModalShow(false)} />
         <h2 className="text-3xl mb-5">Purchase Ships</h2>
         <div className="flex mb-5">
            <button type="button" className="cursor-pointer w-6 h-6" onClick={() => setOrder(!sortOrder)}>
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E5E7EB" {...(sortOrder ? { transform: 'rotate(180) scale(-1,1)' } : {})} className="origin-center"><path d="M0 0h24v24H0V0z" fill="none" /><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" /></svg>
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
            { !ships
               && (
                  <React.Fragment>
                     <div className="p-3 bg-gray-900 border border-gray-700 rounded">
                        <CardLoader />
                     </div>
                     <div className="p-3 bg-gray-900 border border-gray-700 rounded">
                        <CardLoader />
                     </div>
                     <div className="p-3 bg-gray-900 border border-gray-700 rounded">
                        <CardLoader />
                     </div>
                  </React.Fragment>
               )}
            { ships?.map((ship) => (
               <button type="button" className="p-3 bg-gray-900 border border-gray-700 rounded hover:border-yellow-900 hover:shadow-xl" key={ship.class + ship.speed + ship.manufacturer + ship.maxCargo} onClick={() => { setModalShow(true); setSelectedShip(ship); }}>
                  <div className="flex justify-between items-center mb-5">
                     <div className="text-left">
                        <h3>{ ship.type }</h3>
                        <p className="text-xs text-gray-400">{ ship.manufacturer }</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-400">{ ship.purchaseLocations.length } available</p>
                        <p className={`text-sm ${(lowestPrice(ship) > user.user.credits) ? 'text-red-400' : ''}`}>{ lowestPrice(ship).toLocaleString() } credits</p>
                     </div>
                  </div>
                  <div className="flex mt-3">
                     <div className="w-6 h-6 mr-3">
                        <svg version="1.1" fill="#E5E7EB" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 485.32 485.32" enableBackground="new 0 0 485.32 485.32">
                           <g>
                              <path d="m480.76,79.05c-0.6-0.2-235-78.3-235-78.3-2.1-1-4.1-1-6.2,0l-231.9,76.3c-5.8,2.4-7.2,7.4-7.2,10.3v313.3c0,5.2 3.1,9.3 7.2,10.3l229,73.2c3.5,1.3 7.3,1.8 12.1,0l228.9-73.2c4.1-2.1 7.2-6.2 7.2-10.3v-313.3c5.68434e-14-3.1-1-6.2-4.1-8.3zm-238.1-56.7l198.9,63.9-75.1,24.1-196-64.5 72.2-23.5zm-10.3,438l-211.3-67v-291.4l211.3,67.6v290.8zm10.3-310.2l-198.9-62.8 93.7-30.6 195.3,64.5-90.1,28.9zm10.3,310.2v-291.6l105.1-33.3v32.3l20.6-8.8v-30l85.5-27v290.4h0.1l-211.3,68z" />
                           </g>
                        </svg>
                     </div>
                     <p>{ ship.maxCargo }</p>
                  </div>
                  <div className="flex mt-3">
                     <div className="w-6 h-6 mr-3">
                        <svg fill="#E5E7EB" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m512 358.121c0-68.38-26.629-132.667-74.98-181.02-48.353-48.352-112.64-74.98-181.02-74.98s-132.667 26.629-181.02 74.98c-48.351 48.353-74.98 112.64-74.98 181.02v15h205.016c4.085 12.323 12.371 22.642 23.657 29.305 8.558 5.052 17.953 7.453 27.236 7.453 18.406 0 36.36-9.448 46.376-26.413 1.956-3.313 3.522-6.781 4.717-10.345h204.998zm-235.548 10.093c-6.656 11.276-21.247 15.037-32.526 8.378-5.463-3.225-9.343-8.384-10.925-14.528-1.583-6.144-.679-12.535 2.547-17.998s8.385-9.343 14.528-10.925c1.976-.509 3.977-.76 5.964-.76 4.194 0 8.328 1.12 12.034 3.308 5.463 3.225 9.343 8.384 10.925 14.528 1.583 6.143.679 12.535-2.547 17.997zm31.689-25.093c-.032-.129-.057-.259-.09-.388-2.296-8.916-6.74-16.908-12.887-23.425l43.106-73.015-25.834-15.252-43.106 73.015c-8.675-2.233-17.819-2.264-26.737.032-13.903 3.581-25.58 12.362-32.879 24.726-2.674 4.53-4.636 9.344-5.882 14.307h-173.34c1.992-30.247 9.976-58.88 22.75-84.742l33.311 19.232 15-25.98-33.274-19.21c16.444-24.477 37.541-45.578 62.018-62.022l19.212 33.276 25.98-15-19.236-33.318c25.861-12.774 54.5-20.737 84.746-22.729v38.493h30v-38.493c30.246 1.992 58.885 9.955 84.746 22.729l-19.236 33.318 25.98 15 19.212-33.276c24.477 16.444 45.573 37.545 62.018 62.022l-33.274 19.21 15 25.98 33.311-19.232c12.774 25.862 20.758 54.495 22.75 84.742z" /></svg>
                     </div>
                     <p>{ ship.speed }</p>
                  </div>
                  <div className="flex mt-3">
                     <div className="w-6 h-6 mr-3">
                        <svg version="1.1" fill="#E5E7EB" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 512 512">
                           <g>
                              <path d="M461.144,60.883L260.312,0.633c-2.809-0.844-5.808-0.844-8.62,0L50.858,60.883c-6.345,1.903-10.69,7.743-10.69,14.367
                                 v220.916c0,28.734,11.632,58.148,34.573,87.425c17.522,22.36,41.762,44.813,72.048,66.736
                                 c50.877,36.828,100.975,59.42,103.083,60.363c1.95,0.873,4.039,1.31,6.129,1.31c2.089,0,4.179-0.436,6.129-1.31
                                 c2.108-0.943,52.205-23.535,103.082-60.363c30.285-21.923,54.525-44.376,72.047-66.736c22.941-29.276,34.573-58.69,34.573-87.425
                                 V75.25C471.833,68.626,467.489,62.786,461.144,60.883z M441.833,296.166c0,50.852-51.023,98.534-93.826,129.581
                                 c-38.374,27.833-77.291,47.583-92.005,54.678c-14.714-7.095-53.632-26.845-92.006-54.678
                                 c-42.804-31.047-93.828-78.729-93.828-129.581V86.41l185.833-55.75l185.832,55.75V296.166z"
                              />
                           </g>
                        </svg>
                     </div>
                     <p>{ ship.plating }</p>
                  </div>
                  <div className="flex mt-3">
                     <div className="w-6 h-6 mr-3">
                        <svg fill="#E5E7EB" enableBackground="new 0 0 510.192 510.192" viewBox="0 0 510.192 510.192" xmlns="http://www.w3.org/2000/svg"><g><path d="m510.192 0-122.656 13.628-300.462 300.463-22.694-22.694 33.301-33.3-21.213-21.213-54.514 54.513c10.689 10.689 55.253 55.254 65.86 65.861l-87.814 87.814 65.12 65.12 87.813-87.814c10.633 10.632 55.212 55.211 65.861 65.86l54.513-54.514-21.213-21.213-33.3 33.301-22.694-22.693 300.464-300.463zm-467.766 445.072 22.693-22.694 22.695 22.695-22.694 22.693zm66.602-21.212-22.695-22.695 22.694-22.693 22.694 22.694zm358.881-314.976-293.022 293.022-22.693-22.694 252.835-252.835-21.213-21.213-252.835 252.835-22.694-22.693 293.021-293.023 74.927-8.325z" /></g></svg>
                     </div>
                     <p>{ ship.weapons }</p>
                  </div>
               </button>
            ))}
         </div>
      </React.Fragment>
   );
};

export default Available;
