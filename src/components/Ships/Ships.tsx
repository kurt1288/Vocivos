import React from 'react';
import { NavLink, Route, Switch } from 'react-router-dom';
import Available from './Available';
import Owned from './Owned';

const Ships = () => (
   <div>
      <div className="text-sm mb-5">
         <NavLink exact to="/ships" className="mr-4 pb-1" activeClassName="subMenuActive">Owned</NavLink>
         <NavLink exact to="/ships/available" className="mr-4 pb-1" activeClassName="subMenuActive">Purchase</NavLink>
      </div>
      <Switch>
         <Route exact path="/ships" component={Owned} />
         <Route path="/ships/available" component={Available} />
      </Switch>
   </div>
);

export default Ships;
