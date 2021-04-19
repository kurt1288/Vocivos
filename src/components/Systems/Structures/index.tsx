import React from 'react';
import { NavLink, Route, Switch } from 'react-router-dom';
import Build from './Build';
import BuiltStructures from './BuiltStructures';

const Structures = () => (
   <React.Fragment>
      <div className="text-sm mb-5">
         <NavLink exact to="/structures" className="mr-4 pb-1" activeClassName="subMenuActive">Structures</NavLink>
         <NavLink exact to="/structures/build" className="mr-4 pb-1" activeClassName="subMenuActive">Build</NavLink>
      </div>
      <div className="h-1/4">
         <Switch>
            <Route exact path="/structures" component={BuiltStructures} />
            <Route exact path="/structures/build" component={Build} />
         </Switch>
      </div>
   </React.Fragment>
);

export default Structures;
