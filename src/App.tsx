/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-webpack-loader-syntax */
import React, { Suspense, useEffect, useState } from 'react';
import { Route, Switch } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import * as Comlink from 'comlink';
import AutomationWorker from 'worker-loader!./automation';
import { AutomationType, Automation } from './automation';
import {
   addFlightPlan, removeFlightPlan, reset, RootState, setAllAutomationState, setCredits,
   setSystems,
   setToken, setUser, StoredMarket, updateMarketData, updateShip,
} from './store';
import Api from './Api/index';
import './App.css';
import NavBar from './components/NavBar';
import SignIn from './components/SignIn';
import Profile from './components/Profile';
import Ships from './components/Ships/Ships';
import Systems from './components/Systems/Systems';
import Location from './components/Systems/Location';
import Loans from './components/Money/Money';
import {
   FlightPlan, Market, Purchase,
} from './Api/types';
import Markets from './components/Markets/Markets';
import { AutoAction } from './components/Automation/Models';

interface Token {
   username: string,
   token: string
}

export interface WorkerDataUpdate {
   type: AutoAction.Travel | AutoAction.AddFlightPlan | AutoAction.RemoveFlightPlan | AutoAction.Buy | AutoAction.Sell,
   data: FlightPlan | Purchase,
}

export interface WorkerError {
   shipId: string,
   error: string | null,
}

function App() {
   const store = useSelector((state:RootState) => state);
   const {
      account, user, automateAll, marketData, flightPlans, systems,
   } = useSelector((state:RootState) => state);
   const [autoWorker, setAutoWorker] = useState<[Comlink.Remote<Automation>]>();
   const dispatch = useDispatch();
   const key = localStorage.getItem('apiKey');

   useEffect(() => {
      if (key === undefined || key === null) { return; }

      const apiKey = JSON.parse(key) as Token;

      dispatch(setToken(apiKey));

      const FetchAccount = async () => {
         try {
            const result = await Api.getUser(apiKey.username, apiKey.token);
            dispatch(setUser(result));

            // only needed because the ships property on the user response does not contain the 'flightPlanId' property
            if (result.user.ships.some((x) => x.location === undefined)) {
               const { ships } = await Api.ownedShips(apiKey.token, apiKey.username);

               ships.forEach(async (ship) => {
                  if (ship.flightPlanId) {
                     const { flightPlan } = await Api.queryFlightPlan(apiKey.token, apiKey.username, ship.flightPlanId);
                     if (flightPlan.terminatedAt === null) {
                        dispatch(addFlightPlan(flightPlan));
                     }
                  }
               });
            }

            const getSystems = async () => {
               const temp = (await Api.systemsInfo(apiKey.token)).systems;
               dispatch((setSystems(temp)));
            };
            getSystems();

            // Update market data stored in local storage
            const marketDataStore = localStorage.getItem('marketData');
            const loadedMarketData = marketDataStore !== null ? JSON.parse(marketDataStore) as StoredMarket[] : null;
            loadedMarketData?.map((data) => (
               dispatch(updateMarketData(data))
            ));
         } catch (err: unknown) {
            if ((err as Error).message === 'Invalid username or token.') {
               dispatch(reset());
               localStorage.removeItem('apiKey');
            }
         }
      };
      FetchAccount();
   }, []);

   const webworkerError = (data:string) => {
      console.log(data);
      dispatch(setAllAutomationState(false));
   };

   const webworkerUpdateState = async (data:WorkerDataUpdate) => {
      if (data.type === AutoAction.AddFlightPlan) {
         dispatch(addFlightPlan(data.data as FlightPlan));
      } else if (data.type === AutoAction.RemoveFlightPlan) {
         dispatch(removeFlightPlan(data.data as FlightPlan));
      } else {
         dispatch(setCredits((data.data as Purchase).credits));
         dispatch(updateShip((data.data as Purchase).ship));
      }
   };

   const webworkerUpdateMarketData = (data: Market) => {
      dispatch(updateMarketData({ updatedAt: Date.now(), planet: data.location }));
   };

   useEffect(() => {
      if (autoWorker) {
         autoWorker[0].updateState(store);
      }
   }, [user.ships, marketData, flightPlans, systems]);

   useEffect(() => {
      const createWorker = async () => {
         const AutoWorker = Comlink.wrap<AutomationType>(new AutomationWorker());
         const instance = await new AutoWorker(Comlink.proxy(webworkerUpdateState), Comlink.proxy(webworkerUpdateMarketData), Comlink.proxy(webworkerError));
         // set state doesn't work here with just a comlink object. needs to be in an array.
         setAutoWorker([instance]);
      };

      if (!autoWorker) {
         createWorker();
      }

      if (!autoWorker) { return; }

      if (automateAll) {
         autoWorker[0].start();
      } else {
         autoWorker[0]?.stop();
      }
   }, [automateAll]);

   return (
      <React.Fragment>
         { (account.token === undefined || account.token === null || account.token.length === 0
            || account.username === undefined || account.username === null || account.username.length === 0) ? <SignIn /> : (
               <React.Fragment>
                  <NavBar />
                  <div className="bg-gray-800 py-4 flex-grow text-gray-200">
                     <div className="container min-h-full mx-auto">
                        { account.token.length !== 0
                           && (
                              <Switch>
                                 <Route exact path="/" component={Profile} />
                                 <Route path="/ships" component={Ships} />
                                 <Route path="/money" component={Loans} />
                                 <Route path="/markets" component={Markets} />
                                 <Route path="/systems/:location" component={Location} />
                                 <Suspense fallback={<div />}>
                                    <Route exact path="/systems" component={Systems} />
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
