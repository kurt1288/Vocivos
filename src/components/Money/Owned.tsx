import { formatDistanceToNow } from 'date-fns';
import React, { useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LoanStatus } from '../../Api/types';
import { RootState, updateLoans } from '../../store';
import { WorkerContext } from '../../WorkerContext';

interface LoanRepaymentResponse {
   type: 'Success' | 'Error',
   message: string
}

const Owned = () => {
   const [apiWorker] = useContext(WorkerContext);
   const { username, token } = useSelector((state:RootState) => state.account);
   const { loans, credits } = useSelector((state:RootState) => state.user);
   const dispatch = useDispatch();
   const [response, setResponse] = useState<LoanRepaymentResponse>();

   const repayLoan = async (loanId:string) => {
      try {
         const result = await apiWorker.replayLoan(loanId);
         dispatch(updateLoans(result.user.loans));
         setResponse({ type: 'Success', message: 'Loan repayed successfully!' });
      } catch (err: unknown) {
         setResponse({ type: 'Error', message: (err as Error).message });
      }
   };

   const formatString = (value:string) => (
      value.toLowerCase().split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-5">Your Loans</h2>
         { response
         && (
            <div className={`flex justify-between items-center text-sm py-3 px-3 mb-5 ${response.type === 'Success' ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}>
               <p>{ response.message }</p>
               <button className={`w-4 h-4 ${response.type === 'Success' ? 'hover:text-green-700' : 'hover:text-red-700'}`} type="button" onClick={() => setResponse(undefined)}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
               </button>
            </div>
         )}
         <h3 className="text-lg mb-4">Current Loans</h3>
         <div className="grid grid-cols-4 gap-4">
            { ([...loans].filter((x) => x.status === LoanStatus.Current)).length > 0
               ? [...loans].filter((x) => x.status === LoanStatus.Current).map((loan) => (
                  <div className="p-3 bg-gray-900 border border-gray-700 rounded text-left" key={loan.id}>
                     <div className="mb-3">
                        <p className="text-xs text-gray-400">Repayment Amount</p>
                        <p>{ loan.repaymentAmount.toLocaleString() } credits</p>
                     </div>
                     <div>
                        <p className="text-xs text-gray-400">Due</p>
                        <p>{ formatDistanceToNow(new Date(loan.due), { addSuffix: true }) }</p>
                     </div>
                     { credits > loan.repaymentAmount
                     && (
                        <div className="mt-3">
                           <button type="button" className="py-1 px-2 bg-blue-500 rounded hover:bg-blue-600" onClick={() => repayLoan(loan.id)}>Repay</button>
                        </div>
                     )}
                  </div>
               ))
               : <p className="text-sm ml-4">You have no open loans</p>}
         </div>
         <h3 className="text-lg my-4">Closed Loans</h3>
         <div className="grid grid-cols-4 gap-4">
            { [...loans].filter((x) => x.status !== LoanStatus.Current).map((loan) => (
               <div className="p-3 bg-gray-900 border border-gray-700 rounded text-left" key={loan.id}>
                  <div className="mb-3">
                     <p className="text-xs text-gray-400">Repayment Amount</p>
                     <p>{ loan.repaymentAmount.toLocaleString() } credits</p>
                  </div>
                  <div>
                     <p className="text-xs text-gray-400">Status</p>
                     <p>{ formatString(loan.status) }</p>
                  </div>
               </div>
            ))}
         </div>
      </React.Fragment>
   );
};

export default Owned;
