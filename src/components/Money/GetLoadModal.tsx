/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Loan, LoanType } from '../../Api/types';
import { addLoan, setCredits } from '../../store';
import { WorkerContext } from '../../WorkerContext';

interface Props {
   handleClose: () => void,
   show: boolean,
   loan: Loan | undefined
}

const GetLoan = ({ handleClose, show, loan }:Props) => {
   const [apiWorker] = useContext(WorkerContext);
   const history = useHistory();
   const dispatch = useDispatch();
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string>('');
   const showHideModal = show ? 'fixed w-full h-full top-0 left-0 flex items-center justify-center text-gray-900' : 'hidden';

   useEffect(() => {
      setLoading(false);
      setError('');
   }, [loan]);

   const requestLoan = async () => {
      setLoading(true);
      try {
         const result = await apiWorker.newLoan(LoanType.Startup);
         dispatch(setCredits(result.credits));
         dispatch(addLoan(result.loan));
         handleClose;
         history.push('/loans');
      } catch (err: unknown) {
         setLoading(false);
         setError((err as Error).message);
      }
   };

   return (
      <div className={showHideModal}>
         <div className="modal-overlay absolute w-full h-full bg-gray-900 opacity-50" onClick={handleClose} />
         <div className="modal-container bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">
            <div className="modal-content py-4 text-left px-6">
               <h3 className="text-xl font-semibold mb-6">Request the following loan</h3>
               <div className="mb-4">
                  <p className="text-sm text-gray-500">Loan amount</p>
                  <p>{ loan?.amount.toLocaleString() } credits</p>
               </div>
               <div className="mb-4">
                  <p className="text-sm text-gray-500">Repayment Due</p>
                  <p>{ loan?.termInDays } day{ loan && loan?.termInDays > 1 ? 's' : '' }</p>
               </div>
               <div className="mb-4">
                  <p className="text-sm text-gray-500">Repayment Amount</p>
                  <p>
                     { loan && (loan.amount + (loan.amount * (loan.rate / 100))).toLocaleString() }
                     {' '} credits
                  </p>
               </div>
               { error
                  && (
                     <div className="bg-red-300 text-red-800 px-4 py-3 mb-4 text-center">
                        <p>{ error }</p>
                     </div>
                  )}
               <div className="flex justify-end pt-2">
                  { !loading
                     ? (
                        <React.Fragment>
                           <button type="button" className="px-4 py-2 text-red-500 text-sm rounded mr-4 hover:text-red-400" onClick={handleClose}>Close</button>
                           <button
                              type="button"
                              className="w-1/4 px-4 py-2 text-white text-sm bg-green-500 rounded hover:bg-green-400 disabled:opacity-50 disabled:cursor-default disabled:bg-green-500"
                              disabled={loading || (error.length > 0)}
                              onClick={requestLoan}
                           >Get Loan
                           </button>
                        </React.Fragment>
                     )
                     : <p className="text-sm text-yellow-500 italic">Please Wait...</p>}
               </div>
            </div>
         </div>
      </div>
   );
};

export default GetLoan;
