import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
   formatDistanceToNowStrict, getUnixTime, isFuture, isPast,
} from 'date-fns';
import {
   Cargo, CargoType, OwnedShip,
} from '../../Api/types';
import { addAutomationError, removeFlightPlan, RootState } from '../../store';
import Buy from '../Markets/Buy';
import Sell from '../Markets/Sell';
import Travel from './Travel';
import TravelProgressBar from './TravelProgress';
import AutomateModal from '../Automation/AutomateModal';

interface Props {
   ship: OwnedShip,
   compact?: boolean,
   shipError?: (message:string) => void,
}

const ShipCard = ({
   ship, compact, shipError,
}:Props) => {
   const systems = useSelector((state:RootState) => state.systems);
   const flightPlan = useSelector((state:RootState) => state.flightPlans.find((x) => x.shipId === ship.id));
   const automation = useSelector((state:RootState) => state.automations.find((x) => x.shipId === ship.id));
   const dispatch = useDispatch();
   const [showBuyModal, setBuyModalShow] = useState(false);
   const [showSellModal, setSellModalShow] = useState(false);
   const [showTravelModal, setTravelModalShow] = useState(false);
   const [showAutomateModal, setAutomateModalShow] = useState(false);
   const [remainingTime, setRemainingTime] = useState<string>();
   const [time, setTime] = useState<number>(Date.now());

   useEffect(() => {
      const interval = setInterval(() => setTime(Date.now()), 1000);

      return () => clearInterval(interval);
   });

   useEffect(() => {
      if (!flightPlan) { return; }

      if (isPast(new Date(flightPlan.arrivesAt))) {
         dispatch(removeFlightPlan(flightPlan));
      }

      setRemainingTime(formatDistanceToNowStrict(new Date(flightPlan.arrivesAt)));
   }, [time]);

   const fuelIsEmpty = (cargo:Cargo[]) => {
      const fuel = cargo.filter((x) => x.good === CargoType.Fuel).reduce((acc, item) => acc + item.quantity, 0);
      return !(fuel > 0);
   };

   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   const calcProgress = ():number => {
      if (!flightPlan) { return 0; }

      return (((Date.now() / 1000) - (getUnixTime(new Date(flightPlan.arrivesAt)) - flightPlan.timeRemainingInSeconds)) / flightPlan.timeRemainingInSeconds) * 100;
   };

   const closeModal = () => {
      setAutomateModalShow(false);
      if (automation?.error) {
         dispatch(addAutomationError({ shipId: ship.id, error: null }));
      }
   };

   return (
      <React.Fragment>
         { showBuyModal ? <Buy show={showBuyModal} ship={ship} handleClose={() => setBuyModalShow(false)} /> : null }
         { showSellModal ? <Sell show={showSellModal} ship={ship} handleClose={() => setSellModalShow(false)} /> : null }
         { showTravelModal ? <Travel show={showTravelModal} ship={ship} handleClose={() => setTravelModalShow(false)} shipError={(message) => shipError && shipError(message)} /> : null }
         { showAutomateModal ? <AutomateModal show={showAutomateModal} ship={ship} handleClose={() => closeModal()} /> : null }
         { compact ? (
            <div className="p-3 bg-gray-900 border border-gray-700 rounded divide-y divide-gray-500 hover:border-yellow-900 hover:shadow-xl">
               <div className="flex justify-between items-center ">
                  <div className="text-left">
                     <h3>{ ship.type }</h3>
                     <p className="text-xs text-gray-400">{ ship.location ?? 'In transit' }</p>
                  </div>
                  { (flightPlan && isFuture(new Date(flightPlan.arrivesAt))) || !ship.location
                     ? (
                        <div className="text-right">
                           <p className="text-xs text-gray-400">In Transit</p>
                           <p className="text-xs text-gray-300">{ remainingTime ? `Arrives in ${remainingTime}` : 'ETA Unknown' }</p>
                        </div>
                     ) : (
                        <div>
                           { automation?.enabled
                              ? <p className="text-sm">Automating</p>
                              : (
                                 <React.Fragment>
                                    <button type="button" title="Travel" className="mr-2 w-6 h-6 bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50 disabled:bg-blue-500 disabled:cursor-default" onClick={() => setTravelModalShow(true)} disabled={fuelIsEmpty(ship.cargo)}>
                                       <p className="text-sm font-bold">T</p>
                                    </button>
                                    <button type="button" title="Buy" className="mr-2 w-6 h-6 bg-green-500 rounded hover:bg-green-600" onClick={() => setBuyModalShow(true)}>
                                       <p className="text-sm font-bold">B</p>
                                    </button>
                                    <button type="button" title="Sell" className="mr-2 w-6 h-6 bg-red-500 rounded hover:bg-red-600" onClick={() => setSellModalShow(true)}>
                                       <p className="text-sm font-bold">S</p>
                                    </button>
                                 </React.Fragment>
                              )}
                        </div>
                     )}
               </div>
               { (flightPlan && isFuture(new Date(flightPlan.arrivesAt))) || !ship.location
                  ? <div className="mt-2"><TravelProgressBar completed={calcProgress()} /></div> : null}
            </div>
         ) : (
            <div className="focus:outline-none bg-gray-900 border border-gray-700 rounded">
               <div className="flex justify-between items-center p-3 bg-gray-700 border-b border-gray-600">
                  <div>
                     <h3 className="text-xl">{ ship.type }</h3>
                     <p className="text-xs text-gray-400">{ ship.manufacturer }</p>
                  </div>
                  <div className="flex flex-col">
                     <div className="grid grid-cols-3 gap-2 mt-1">
                        <div className="flex items-center">
                           <div className="w-5 h-5 mr-1">
                              <svg fill="#E5E7EB" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m512 358.121c0-68.38-26.629-132.667-74.98-181.02-48.353-48.352-112.64-74.98-181.02-74.98s-132.667 26.629-181.02 74.98c-48.351 48.353-74.98 112.64-74.98 181.02v15h205.016c4.085 12.323 12.371 22.642 23.657 29.305 8.558 5.052 17.953 7.453 27.236 7.453 18.406 0 36.36-9.448 46.376-26.413 1.956-3.313 3.522-6.781 4.717-10.345h204.998zm-235.548 10.093c-6.656 11.276-21.247 15.037-32.526 8.378-5.463-3.225-9.343-8.384-10.925-14.528-1.583-6.144-.679-12.535 2.547-17.998s8.385-9.343 14.528-10.925c1.976-.509 3.977-.76 5.964-.76 4.194 0 8.328 1.12 12.034 3.308 5.463 3.225 9.343 8.384 10.925 14.528 1.583 6.143.679 12.535-2.547 17.997zm31.689-25.093c-.032-.129-.057-.259-.09-.388-2.296-8.916-6.74-16.908-12.887-23.425l43.106-73.015-25.834-15.252-43.106 73.015c-8.675-2.233-17.819-2.264-26.737.032-13.903 3.581-25.58 12.362-32.879 24.726-2.674 4.53-4.636 9.344-5.882 14.307h-173.34c1.992-30.247 9.976-58.88 22.75-84.742l33.311 19.232 15-25.98-33.274-19.21c16.444-24.477 37.541-45.578 62.018-62.022l19.212 33.276 25.98-15-19.236-33.318c25.861-12.774 54.5-20.737 84.746-22.729v38.493h30v-38.493c30.246 1.992 58.885 9.955 84.746 22.729l-19.236 33.318 25.98 15 19.212-33.276c24.477 16.444 45.573 37.545 62.018 62.022l-33.274 19.21 15 25.98 33.311-19.232c12.774 25.862 20.758 54.495 22.75 84.742z" /></svg>
                           </div>
                           <p>{ ship.speed }</p>
                        </div>
                        <div className="flex items-center">
                           <div className="w-4 h-4 mr-1">
                              <svg fill="#E5E7EB" enableBackground="new 0 0 510.192 510.192" viewBox="0 0 510.192 510.192" xmlns="http://www.w3.org/2000/svg"><g><path d="m510.192 0-122.656 13.628-300.462 300.463-22.694-22.694 33.301-33.3-21.213-21.213-54.514 54.513c10.689 10.689 55.253 55.254 65.86 65.861l-87.814 87.814 65.12 65.12 87.813-87.814c10.633 10.632 55.212 55.211 65.861 65.86l54.513-54.514-21.213-21.213-33.3 33.301-22.694-22.693 300.464-300.463zm-467.766 445.072 22.693-22.694 22.695 22.695-22.694 22.693zm66.602-21.212-22.695-22.695 22.694-22.693 22.694 22.694zm358.881-314.976-293.022 293.022-22.693-22.694 252.835-252.835-21.213-21.213-252.835 252.835-22.694-22.693 293.021-293.023 74.927-8.325z" /></g></svg>
                           </div>
                           <p>{ ship.weapons }</p>
                        </div>
                        <div className="flex items-center">
                           <div className="w-4 h-4 mr-1">
                              <svg fill="#E5E7EB" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 512 512">
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
                     </div>
                  </div>
               </div>
               {/* {automation?.enabled
                  ? (
                     <div className="flex items-center justify-end">
                        {automation.error
                        && (
                           <div className="w-6 h-6 mr-1 pt-0.5" title="Automation error">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#EF4444">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                           </div>
                        )}
                        <p className="text-xs">Automating</p>
                        <button type="button" className="text-xs ml-2 px-2 py-1 bg-purple-500 rounded hover:bg-purple-600" onClick={() => setAutomateModalShow(true)}>Tasks</button>
                     </div>
                  ) : null} */}
               <div className="py-3 px-3 pl-2 border-b border-gray-700 relative">
                  {(flightPlan && isFuture(new Date(flightPlan.arrivesAt))) || !ship.location
                     ? (
                        <React.Fragment>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                 <svg className="w-6 h-6 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                 </svg>
                                 <p className="flex items-center mt-0.5">
                                    { systems.find((x) => x.symbol === flightPlan?.departure.split('-')[0])?.locations.find((x) => x.symbol === flightPlan?.departure)?.name }
                                    <svg className="h-4 w-4 mx-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                       <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    { systems.find((x) => x.symbol === flightPlan?.destination.split('-')[0])?.locations.find((x) => x.symbol === flightPlan?.destination)?.name }
                                 </p>
                              </div>
                              <span className="text-sm text-gray-400 mt-1">({ remainingTime ? `Arrives in ${remainingTime}` : 'ETA Unknown' })</span>
                           </div>
                           { automation?.enabled
                              && (
                                 <div className="w-full flex items-center justify-end pr-0.5 mt-2">
                                    <p className="text-xs">Automating</p>
                                    <button type="button" className="text-xs ml-2 px-2 py-1 bg-purple-500 rounded hover:bg-purple-600" onClick={() => setAutomateModalShow(true)}>Tasks</button>
                                 </div>
                              )}
                           <div className="absolute inset-0">
                              <div><TravelProgressBar completed={calcProgress()} /></div>
                           </div>
                        </React.Fragment>
                     )
                     : (
                        <div className="w-full flex justify-between items-center">
                           <div className="flex items-center">
                              <svg className="h-6 w-6 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.3} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <p className="pt-0.5">{ systems.find((x) => x.symbol === ship.location?.split('-')[0])?.locations.find((x) => x.symbol === ship.location)?.name }</p>
                              <span className="ml-1 pt-1 text-sm text-gray-400">({ ship.location })</span>
                           </div>
                           <div>
                              { automation?.enabled
                                 ? null : (
                                    <React.Fragment>
                                       <button
                                          type="button"
                                          className="text-xs mr-2 px-2 py-1 bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50 disabled:bg-blue-500 disabled:cursor-default"
                                          onClick={() => setTravelModalShow(true)}
                                       >Travel
                                       </button>
                                       <button type="button" className="text-xs px-2 py-1 bg-purple-500 rounded hover:bg-purple-600" onClick={() => setAutomateModalShow(true)}>Automate</button>
                                    </React.Fragment>
                                 )}
                           </div>
                        </div>
                     )}
               </div>
               <div className="p-3">
                  <div className="flex items-center mb-2">
                     <p className="mr-3">Cargo <span className="ml-2 text-sm text-gray-400">{ ship.maxCargo - ship.spaceAvailable } of { ship.maxCargo }</span></p>
                     { ship.location && !automation?.enabled
                     && (
                        <React.Fragment>
                           <button type="button" className="text-xs mr-2 px-2 py-1 bg-green-500 rounded hover:bg-green-600" onClick={() => setBuyModalShow(true)}>Buy</button>
                           <button type="button" className="text-xs px-2 py-1 bg-red-500 rounded hover:bg-red-600" onClick={() => setSellModalShow(true)}>Sell</button>
                        </React.Fragment>
                     )}
                  </div>
                  <div className="pl-3">
                     { ship.cargo.slice().sort((a, b) => ((a.good > b.good) ? 1 : (b.good > a.good) ? -1 : 0)).map((cargo) => (
                        <p className="text-sm py-0.5" key={cargo.good + cargo.quantity + cargo.totalVolume + ship.id}>{ formatString(cargo.good) } ({ cargo.quantity } units)</p>
                     ))}
                  </div>
               </div>
            </div>
         )}
      </React.Fragment>
   );
};

ShipCard.defaultProps = {
   compact: false,
   shipError: '',
};

export default ShipCard;
