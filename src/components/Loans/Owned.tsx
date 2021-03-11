import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const Owned = () => {
   const { loans } = useSelector((state:RootState) => state.user);

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-5">Your Loans</h2>
         <div className="grid grid-cols-4 gap-4">
            { loans.map((loan) => (
               <button type="button" className="p-3 bg-gray-900 border border-gray-700 rounded text-left hover:border-yellow-900 hover:shadow-xl" key={loan.id}>
                  <div className="mb-3">
                     <p className="text-xs text-gray-400">Repayment Amount</p>
                     <p>{ loan.repaymentAmount.toLocaleString() } credits</p>
                  </div>
                  <div>
                     <p className="text-xs text-gray-400">Due in</p>
                     <p>{ formatDistanceToNow(new Date(loan.due), { addSuffix: true }) }</p>
                  </div>
               </button>
            ))}
         </div>
      </React.Fragment>
   );
};

export default Owned;
