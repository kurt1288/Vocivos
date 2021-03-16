import React from 'react';
import { Location, CargoType } from '../../Api/types';
import {
   AutoAction, MarketStep, Step, TravelStep,
} from './Models';

interface Props {
   step: Step,
   index: number,
   length: number,
   system: Location[],
   editStep: (value: Step) => void,
   deleteStep: () => void,
   moveStepUp: () => void,
   moveStepDown: () => void,
}

const StepButton = ({
   step, index, length, system, editStep, deleteStep, moveStepUp, moveStepDown,
}: Props) => {
   const editAction = (value: string) => {
      switch (value) {
         case '0':
            editStep({ ...step, type: { action: AutoAction.Travel, destination: system[0].symbol } });
            break;
         case '1':
            editStep({ ...step, type: { action: AutoAction.Buy, good: CargoType.Chemicals, quantity: 0 } });
            break;
         case '2':
            editStep({ ...step, type: { action: AutoAction.Sell, good: CargoType.Chemicals, quantity: 0 } });
            break;
         default:
            null;
      }
   };

   const editSubAction = (value: string) => {
      // Need the action equality check for typescript
      if (step.type.action !== AutoAction.Travel) {
         if (Number.isNaN(parseInt(value, 10))) {
            editStep({ ...step, type: { ...step.type, good: value as CargoType } });
         } else {
            editStep({ ...step, type: { ...step.type, quantity: parseInt(value, 10) } });
         }
      } else {
         editStep({ ...step, type: { ...step.type, destination: value as string } });
      }
   };

   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   const travelComp = () => (
      <React.Fragment>
         <p>to</p>
         <select
            name={`dest-${step.id}`}
            id={`dest-${step.id}`}
            className="ml-3 bg-gray-100 border-b border-yellow-500 appearance-none cursor-pointer"
            value={(step.type as TravelStep).destination}
            onChange={(e) => editSubAction(e.target.value)}
         >
            {system.map((loc) => (
               <option value={loc.symbol} key={`${step.id}-${loc.name}`}>{ loc.name } ({ loc.symbol })</option>
            ))}
         </select>
      </React.Fragment>
   );

   const buyComp = () => (
      <React.Fragment>
         <select
            name={`buy-${step.id}`}
            id={`buy-${step.id}`}
            className="ml-1 bg-gray-100 border-b border-yellow-500 appearance-none cursor-pointer"
            value={(step.type as MarketStep).good}
            onChange={(e) => editSubAction(e.target.value)}
         >
            {Object.keys(CargoType).map((type) => (
               <option value={type} key={`${step.id}-buy-${type}`}>{ formatString(type) }</option>
            ))}
         </select>
         <input
            type="number"
            min={-1}
            value={(step.type as MarketStep).quantity}
            className="w-1/4 ml-2 border border-gray-200 focus:outline-none focus:border-blue-300"
            onChange={(e) => editSubAction(e.target.value)}
         />
         {/* <span className="text-xs ml-0.5">(-1 = max)</span> */}
      </React.Fragment>
   );

   const sellComp = () => (
      <React.Fragment>
         <select
            name={`buy-${step.id}`}
            id={`buy-${step.id}`}
            className="ml-1 bg-gray-100 border-b border-yellow-500 appearance-none cursor-pointer"
            value={(step.type as MarketStep).good}
            onChange={(e) => editSubAction(e.target.value)}
         >
            {Object.keys(CargoType).map((type) => (
               <option value={type} key={`${step.id}-sell-${type}`}>{ formatString(type) }</option>
            ))}
         </select>
         <input
            type="number"
            min={-1}
            value={(step.type as MarketStep).quantity}
            className="w-1/4 ml-2 border border-gray-200 focus:outline-none focus:border-blue-300"
            onChange={(e) => editSubAction(e.target.value)}
         />
         {/* <span className="text-xs ml-0.5">(-1 = max)</span> */}
      </React.Fragment>
   );

   const getSubAction = (action: number): JSX.Element => {
      switch (action) {
         case AutoAction.Travel:
            return travelComp();
         case AutoAction.Buy:
            return buyComp();
         case AutoAction.Sell:
            return sellComp();
         default:
            return <div />;
      }
   };

   return (
      <div className="flex justify-between items-center w-full h-12 my-1 py-1 px-2 border border-gray-400 rounded-sm text-gray-500 hover:border-blue-300">
         <div className="flex flex-col w-4">
            { index !== 0
               && (
                  <button type="button" className="mb-1 w-4 h-4 hover:text-black" onClick={moveStepUp}>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                     </svg>
                  </button>
               )}
            { index !== length - 1
               && (
                  <button type="button" className="w-4 h-4 hover:text-black" onClick={moveStepDown}>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                     </svg>
                  </button>
               )}
         </div>
         <div className="flex items-center w-full px-2 text-left">
            <select
               name={`stepType-${step.id}`}
               id={`stepType-${step.id}`}
               className="mr-2 bg-gray-100 border-b border-yellow-500 appearance-none cursor-pointer"
               value={step.type.action}
               onChange={(e) => editAction(e.target.value)}
            >
               <option value="0">Travel</option>
               <option value="1">Buy</option>
               <option value="2">Sell</option>
            </select>
            { getSubAction(step.type.action) }
         </div>
         <button type="button" className="text-red-400 hover:text-white hover:bg-red-400 rounded-full" onClick={deleteStep}>
            <div className="w-5 h-5">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
         </button>
      </div>
   );
};

export default StepButton;
