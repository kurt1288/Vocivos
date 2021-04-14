import React from 'react';
import { NavLink, Route, Switch } from 'react-router-dom';
import Available from './Available';
import Owned from './Owned';
import Worth from './Worth';

const Loans = () => (
   <div>
      <div className="text-sm mb-5">
         <NavLink exact to="/money" className="mr-4 pb-1" activeClassName="subMenuActive">Net Worth</NavLink>
         <NavLink exact to="/money/loans" className="mr-4 pb-1" activeClassName="subMenuActive">Your Loans</NavLink>
         <NavLink exact to="/money/loans/available" className="mr-4 pb-1" activeClassName="subMenuActive">Get a Loan</NavLink>
      </div>
      <Switch>
         <Route exact path="/money" component={Worth} />
         <Route exact path="/money/loans" component={Owned} />
         <Route path="/money/loans/available" component={Available} />
      </Switch>
   </div>
);

export default Loans;
