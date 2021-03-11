import React, { Suspense, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
   addFlightPlan, removeFlightPlan, RootState, setToken, setUser, StoredMarket, updateMarketData,
} from './store';
import Api from './Api/index';
import './App.css';
import NavBar from './components/NavBar';
import SignIn from './components/SignIn';
import Profile from './components/Profile';
import Ships from './components/Ships/Ships';
import Systems from './components/Systems/Systems';
import Loans from './components/Loans/Loans';
import { FlightPlan } from './Api/types';
import Markets from './components/Markets/Markets';

interface Token {
   username: string,
   token: string
}

function App() {
   const user = useSelector((state:RootState) => state);
   const dispatch = useDispatch();
   const key = localStorage.getItem('apiKey');

   useEffect(() => {
      if (key === undefined || key === null) { return; }

      const apiKey = JSON.parse(key) as Token;

      dispatch(setToken(key));

      const FetchAccount = async () => {
         const result = await Api.getUser(apiKey.username, apiKey.token);
         dispatch(setUser(result));
      };

      // Update flight paths stored in local storage
      const flightPlansStore = localStorage.getItem('flightPlans');
      const flightPlans = flightPlansStore !== null ? JSON.parse(flightPlansStore) as FlightPlan[] : null;
      if (flightPlans && flightPlans.length > 0) {
         flightPlans.map(async (plan) => {
            const { flightPlan } = await Api.queryFlightPlan(apiKey.token, apiKey.username, plan.id);
            if (flightPlan.terminatedAt === null) {
               dispatch(addFlightPlan(flightPlan));
            } else if (flightPlan.terminatedAt) {
               // This will remove outdated flights from the local storage
               dispatch(removeFlightPlan(flightPlan));
            }
         });
      }

      // Update market data stored in local storage
      const marketDataStore = localStorage.getItem('marketData');
      const marketData = marketDataStore !== null ? JSON.parse(marketDataStore) as StoredMarket[] : null;
      marketData?.map((data) => (
         dispatch(updateMarketData(data))
      ));

      FetchAccount();
   }, []);

   return (
      <React.Fragment>
         { (key === undefined || key === null) ? <SignIn /> : (
            <React.Fragment>
               <NavBar />
               <div className="bg-gray-800 py-4 flex-grow text-gray-200">
                  <div className="container min-h-full mx-auto">
                     { user.account.token.length !== 0
                        && (
                           <Switch>
                              <Route exact path="/" component={Profile} />
                              <Route path="/ships" component={Ships} />
                              <Route path="/loans" component={Loans} />
                              <Route path="/markets" component={Markets} />
                              <Suspense fallback={<div />}>
                                 <Route path="/systems" component={Systems} />
                              </Suspense>
                           </Switch>
                        )}
                  </div>
               </div>
            </React.Fragment>
         )}
      </React.Fragment>
   );
}

export default App;
