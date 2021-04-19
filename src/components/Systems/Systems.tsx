import React from 'react';
import { NavLink, Route, Switch } from 'react-router-dom';
import Locations from './Locations';
import Structures from './Structures';

const SystemMap = () => (
   <React.Fragment>
      <div className="text-sm mb-5">
         <NavLink exact to="/systems" className="mr-4 pb-1" activeClassName="subMenuActive">Systems</NavLink>
         <NavLink exact to="/systems/structures" className="mr-4 pb-1" activeClassName="subMenuActive">Your Structures</NavLink>
      </div>
      <div className="h-1/4">
         <Switch>
            <Route exact path="/systems" component={Locations} />
            <Route exact path="/systems/structures" component={Structures} />
         </Switch>
      </div>
   </React.Fragment>
);

export default SystemMap;
