import React from 'react';
import { NavLink, Route } from 'react-router-dom';
import Locations from './Locations';

const SystemMap = () => (
   <React.Fragment>
      <div className="text-sm mb-5">
         <NavLink exact to="/systems" className="mr-4 pb-1" activeClassName="subMenuActive">Systems</NavLink>
         <NavLink exact to="/structures" className="mr-4 pb-1" activeClassName="subMenuActive">Structures</NavLink>
      </div>
      <div className="h-1/4">
         <Route exact path="/systems" component={Locations} />
      </div>
   </React.Fragment>
);

export default SystemMap;
