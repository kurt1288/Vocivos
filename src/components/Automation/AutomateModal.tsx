/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Api from '../../Api';
import { OwnedShip, Location } from '../../Api/types';
import {
   addAutomation, RootState, setAutomationState,
} from '../../store';
import { AutoStepLoader } from '../SkeletonLoaders';
import { AutoAction, Step, Steps } from './Models';
import StepButton from './StepButton';

interface Props {
   handleClose: () => void,
   show: boolean,
   ship: OwnedShip,
}

const AutomateModal = ({ handleClose, show, ship }: Props) => {
   const { token } = useSelector((state:RootState) => state.account);
   const automations = useSelector((state:RootState) => state.automations);
   const { ships } = useSelector((state:RootState) => state.user);
   const dispatch = useDispatch();
   const [autoSteps, setAutoSteps] = useState<Steps>({
      shipId: ship.id, steps: [], enabled: false, error: null,
   });
   const [system, setSystem] = useState<Location[]>([]);
   const showHideModal = show ? 'fixed w-full h-full top-0 left-0 flex items-center justify-center text-gray-900' : 'hidden';

   useEffect(() => {
      const getLocations = async () => {
         const loc = (await Api.getLocations(token, 'OE')).locations;
         setSystem(loc);

         const currentAutomation = automations.find((x) => x.shipId === ship.id);
         if (currentAutomation) {
            setAutoSteps(currentAutomation);
         }
      };
      getLocations();
   }, []);

   const makeId = () => {
      let id = '';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < 24; i += 1) {
         id += chars.charAt(Math.floor(Math.random() * 62));
      }
      return id;
   };

   const addNewStep = () => {
      const newStep: Step = {
         type: {
            action: AutoAction.Travel,
            destination: system[0].symbol,
         },
         id: makeId(),
      };

      setAutoSteps({ ...autoSteps, steps: [...autoSteps.steps, newStep] });
   };

   const deleteStep = (id: string) => {
      setAutoSteps({ ...autoSteps, steps: autoSteps.steps.filter((x) => x.id !== id) });
   };

   const moveStepUp = (index: number) => {
      const tempArray = [...autoSteps.steps];
      const element = tempArray[index];
      tempArray.splice(index, 1);
      tempArray.splice(index - 1, 0, element);
      setAutoSteps({ ...autoSteps, steps: tempArray });
   };

   const moveStepDown = (index: number) => {
      const tempArray = [...autoSteps.steps];
      const element = tempArray[index];
      tempArray.splice(index, 1);
      tempArray.splice(index + 1, 0, element);
      setAutoSteps({ ...autoSteps, steps: tempArray });
   };

   const editStep = (value: Step) => {
      const updated = autoSteps.steps.map((step) => (step.id === value.id ? { ...step, type: value.type } : step));
      setAutoSteps({ ...autoSteps, steps: updated });
   };

   const runAuto = () => {
      dispatch(addAutomation(autoSteps));
      dispatch(setAutomationState({ shipId: ship.id, enabled: true }));
      handleClose();
   };

   const stopAuto = () => {
      dispatch(setAutomationState({ shipId: ship.id, enabled: false }));
      handleClose();
   };

   const copyAutomation = (shipId:string) => {
      const steps = automations.find((x) => x.shipId === shipId)?.steps;
      if (!steps) { return; }
      setAutoSteps({ ...autoSteps, steps });
   };

   return (
      <div className={showHideModal}>
         <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={() => { handleClose(); }} />
         <div className="modal-container flex flex-col bg-gray-100 w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto min-h-1/3">
            <div className="modal-content py-4 text-left px-6">
               <h3 className="text-xl font-semibold">Automate</h3>
               <p className="text-sm mt-2 mb-1">Steps will begin at ship&apos;s current location</p>
               <p className="text-sm">Browser tab must be kept open for automation to run.</p>
            </div>
            { autoSteps.error
            && (
               <div className="px-6 mb-4">
                  <p className="bg-red-300 text-red-800 py-3 px-4">{ autoSteps.error }</p>
               </div>
            )}
            { automations.length > 0
            && (
               <div className="flex items-center p-4 pt-0">
                  <select name="copyAutomation" id="copyAutomation" className="text-sm ml-2 bg-gray-100 border-b border-yellow-500 appearance-none cursor-pointer" onChange={(e) => copyAutomation(e.target.value)}>
                     <option disabled selected value=""> -- Copy from -- </option>
                     { automations.map((automation) => {
                        if (automation.shipId !== ship.id) {
                           return <option value={automation.shipId}>{ ships.find((x) => x.id === automation.shipId)?.type }</option>
                        }
                        return null;
                     })}
                  </select>
               </div>
            )}
            <div className="flex flex-grow p-4 pt-0">
               <div className="w-full border border-gray-300 p-2">
                  { autoSteps.steps.map((step, index) => (
                     <StepButton key={step.id} step={step} index={index} length={autoSteps.steps.length} system={system} editStep={editStep} deleteStep={() => deleteStep(step.id)} moveStepUp={() => moveStepUp(index)} moveStepDown={() => moveStepDown(index)} />
                  ))}
                  {system[0]
                     ? (
                        <button
                           type="button"
                           className="flex justify-center items-center w-full py-2 bg-gray-300 border border-gray-400 rounded-sm text-gray-500 cursor-pointer hover:bg-gray-400 hover:text-gray-600"
                           onClick={() => addNewStep()}
                        >
                           <div className="w-6 h-6">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                           </div>
                        </button>
                     )
                     : <AutoStepLoader />}
               </div>
            </div>
            <div className="text-center">
               <button type="button" className="mb-1 text-red-500 hover:text-red-600" onClick={() => { handleClose(); }}>Close</button>
               { autoSteps.enabled
                  ? (
                     <button
                        type="button"
                        className="mt-2 w-full px-3 py-2 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:bg-red-400 disabled:cursor-default"
                        disabled={autoSteps.steps.length === 0}
                        onClick={stopAuto}
                     >Stop
                     </button>
                  )
                  : (
                     <button
                        type="button"
                        className="mt-2 w-full px-3 py-2 bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:bg-green-400 disabled:cursor-default"
                        disabled={autoSteps.steps.length === 0}
                        onClick={runAuto}
                     >Run
                     </button>
                  )}
            </div>
         </div>
      </div>
   );
};

export default AutomateModal;
