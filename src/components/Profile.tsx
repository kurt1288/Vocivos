import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../store';
import ShipCard from './Ships/ShipCard';

const Profile = () => {
   const { username, loans, ships } = useSelector((state:RootState) => state.user);

   return (
      <React.Fragment>
         <h2 className="text-3xl mb-10">Welcome { username }</h2>
         <div className="mb-4 min-h-1/4">
            <h3 className="text-xl mb-4">Loans</h3>
            <div className="pl-5">
               { loans.length === 0
                  ? (
                     <div>
                        <p>You have no loans!</p>
                        <Link to="/loans/available" className="text-sm text-yellow-700 hover:text-blue-600">Get a loan</Link>
                     </div>
                  )
                  : (
                     <div>
                        { loans.map((loan) => (
                           <p key={loan.id}>{ loan.repaymentAmount.toLocaleString() } credits due in { formatDistanceToNow(new Date(loan.due)) }</p>
                        ))}
                     </div>
                  )}
            </div>
         </div>
         <div className="mb-4 min-h-1/4">
            <h3 className="text-xl mb-4">Ships</h3>
            <div className="pl-5">
               { ships.length === 0
                  ? (
                     <div>
                        <p>You have no ships :(</p>
                        <Link to="/ships/available" className="text-sm text-yellow-700 hover:text-blue-600">Buy a ship</Link>
                     </div>
                  )
                  : (
                     ships.map((ship) => (
                        <ShipCard ship={ship} compact key={ship.class + ship.speed + ship.manufacturer + ship.maxCargo} />
                     ))
                  )}
            </div>
         </div>
      </React.Fragment>
   );
};

export default Profile;
