import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Api from '../../Api';
import { Loan } from '../../Api/types';
import { RootState } from '../../store';
import { CardLoader } from '../SkeletonLoaders';
import GetLoan from './GetLoadModal';

const Available = () => {
   const user = useSelector((state:RootState) => state.account);
   const [loans, setLoans] = useState<Loan[]>();
   const [showModal, setModalShow] = useState(false);
   const [selectedLoan, setSelectedLoan] = useState<Loan>();

   useEffect(() => {
      const GetLoans = async () => {
         setLoans((await Api.getLoansAvailable(user.token)).loans);
      };
      GetLoans();
   }, []);

   return (
      <React.Fragment>
         <GetLoan show={showModal} loan={selectedLoan} handleClose={() => { setModalShow(false); setSelectedLoan(undefined); }} />
         <h2 className="text-3xl mb-5">Available Loans</h2>
         <div className="grid grid-cols-4 gap-4">
            { !loans
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
            { loans?.map((loan) => (
               <button type="button" className="p-3 bg-gray-900 border border-gray-700 rounded text-left hover:border-yellow-900 hover:shadow-xl" key={loan.amount + loan.type + loan.rate} onClick={() => { setModalShow(true); setSelectedLoan(loan); }}>
                  <div className="flex justify-between items-start">
                     <div className="flex items-center">
                        <div className="w-6 h-6 mr-2">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                           </svg>
                        </div>
                        <h3 className="text-lg">{ loan.amount.toLocaleString() }</h3>
                     </div>
                     <div>
                        { loan.collateralRequired
                           && <p className="text-red-400">Collateral Required</p> }
                     </div>
                  </div>
                  <p className="text-xs text-gray-400">{ loan.type }</p>
                  <div className="mt-5">
                     <div className="flex mt-3">
                        <div className="w-6 h-6 mr-3" title="Term">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                           </svg>
                        </div>
                        <p>{ loan.termInDays }</p>
                     </div>
                     <div className="flex mt-3">
                        <p className="text-xl text-center w-6 h-6 mr-3" title="Origination fee">%</p>
                        <p>
                           <span>{ loan.rate } </span>
                           <span className="text-gray-400 text-sm">
                              (
                              { loan.amount * (loan.rate / 100)}
                              {' '}
                              credits)
                           </span>
                        </p>
                     </div>
                     <p className="mt-3 pt-3 text-sm border-t border-gray-700">
                        Total repayment cost:
                        {' '}
                        { (loan.amount + (loan.amount * (loan.rate / 100))).toLocaleString() }
                        {' '}
                        credits
                     </p>
                  </div>
               </button>
            ))}
         </div>
      </React.Fragment>
   );
};

export default Available;
