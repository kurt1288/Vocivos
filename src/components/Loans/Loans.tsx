import React from 'react';
import { NavLink, Route, Switch } from 'react-router-dom';
import Available from './Available';
import Owned from './Owned';

const Loans = () => (
   <div>
      <div className="text-sm mb-5">
         <NavLink exact to="/loans" className="mr-4 pb-1" activeClassName="subMenuActive">Your Loans</NavLink>
         <NavLink exact to="/loans/available" className="mr-4 pb-1" activeClassName="subMenuActive">Get a Loan</NavLink>
      </div>
      <Switch>
         <Route exact path="/loans" component={Owned} />
         <Route path="/loans/available" component={Available} />
      </Switch>
   </div>
);

export default Loans;
