import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { LoanStatus } from '../Api/types';
import { RootState } from '../store';
import ShipCard from './Ships/ShipCard';
import { ProfileLoader } from './SkeletonLoaders';

const Profile = () => {
   const { username, loans, ships } = useSelector((state:RootState) => state.user);
   const { systems } = useSelector((state:RootState) => state);

   return (
      <React.Fragment>
         {username === undefined
            ? (
               <React.Fragment>
                  <ProfileLoader />
               </React.Fragment>
            )
            : (
               <React.Fragment>
                  <p className="text-gray-400">Welcome</p>
                  <h2 className="text-3xl mb-4">{ username }</h2>
                  <div>
                     <h3 className="text-xl mb-4">Messages</h3>
                     { systems.map((system) => system.locations.map((location) => (location.messages && location.messages.length > 0
                        ? (
                           <div className="text-sm p-4 bg-blue-800 text-blue-200 rounded-sm" key={location.symbol}>
                              <p>{ [...location.messages].slice(0, -2).join(' ') }</p>
                              <Link to={`/systems/${location.symbol}`} className="underline text-xs mt-1 block">View</Link>
                           </div>
                        )
                        : null)))}
                  </div>
                  <div className="my-4 min-h-1/4">
                     <h3 className="text-xl mb-4">Loans</h3>
                     <div className="pl-5">
                        { loans.filter((x) => x.status === LoanStatus.Current).length === 0
                           ? (
                              <div>
                                 <p>You have no loans!</p>
                                 <Link to="/money/loans/available" className="text-sm text-yellow-700 hover:text-blue-600">Get a loan</Link>
                              </div>
                           )
                           : (
                              <div>
                                 { loans.filter((x) => x.status === LoanStatus.Current).map((loan) => (
                                    <p key={loan.id}>{ loan.repaymentAmount.toLocaleString() } credits due { formatDistanceToNow(new Date(loan.due), { addSuffix: true }) }</p>
                                 ))}
                              </div>
                           )}
                     </div>
                  </div>
                  <div className="mb-4 min-h-1/4">
                     <h3 className="text-xl mb-4">Ships</h3>
                     <div className="pl-5 grid grid-cols-5 gap-3">
                        { ships.length === 0
                           ? (
                              <div>
                                 <p>You have no ships :(</p>
                                 <Link to="/ships/available" className="text-sm text-yellow-700 hover:text-blue-600">Buy a ship</Link>
                              </div>
                           )
                           : (
                              [...ships].sort((a, b) => ((a.type > b.type) ? 1 : (b.type > a.type) ? -1 : 0)).map((ship) => (
                                 <ShipCard ship={ship} compact key={ship.id} />
                              ))
                           )}
                     </div>
                  </div>
               </React.Fragment>
            )}
      </React.Fragment>
   );
};

export default Profile;
