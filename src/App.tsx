import React, { Suspense, useEffect, useState } from 'react';
import { Route, Switch } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import * as Comlink from 'comlink';
import { Automation, WorkerType } from './webworker';
import {
   addAutomationError,
   addFlightPlan, reset, RootState, setAutomationState, setCredits,
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
import Loans from './components/Loans/Loans';
import {
   FlightPlan, Market, OwnedShip, Purchase,
} from './Api/types';
import Markets from './components/Markets/Markets';
import { AutoAction } from './components/Automation/Models';

interface Props {
   Worker: Comlink.Remote<WorkerType>
}

interface Token {
   username: string,
   token: string
}

export interface WorkerDataUpdate {
   type: AutoAction.Travel | AutoAction.Buy | AutoAction.Sell,
   data: FlightPlan | Purchase,
}

export interface WorkerError {
   shipId: string,
   error: string | null,
}

function App({ Worker }:Props) {
   const [automationsList, setAutomationsList] = useState<{ shipId:string, instance: Comlink.Remote<Automation>}[]>([]);
   const { account, automations, user } = useSelector((state:RootState) => state);
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
            const marketData = marketDataStore !== null ? JSON.parse(marketDataStore) as StoredMarket[] : null;
            marketData?.map((data) => (
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

   const webworkerError = (data:WorkerError) => {
      console.log(data);
      dispatch(setAutomationState({ shipId: data.shipId, enabled: false }));
      dispatch(addAutomationError(data));
   };

   const webworkerUpdateState = async (data:WorkerDataUpdate) => {
      if (data.type === AutoAction.Travel) {
         dispatch(addFlightPlan(data.data as FlightPlan));
         // ship fuel and cargo space change after flight plan, so update the ship
         const updatedShip = await Api.shipInfo(account.token, account.username, (data.data as FlightPlan).shipId);
         dispatch(updateShip(updatedShip.ship));
      } else {
         dispatch(setCredits((data.data as Purchase).credits));
         dispatch(updateShip((data.data as Purchase).ship));
      }
   };

   const webworkerGetLocalStorage = (worker: Automation) => {
      worker.setMarketData(localStorage.getItem('marketData'));
   };

   const webworkerUpdateMarketData = (data: Market) => {
      dispatch(updateMarketData({ updatedAt: Date.now(), planet: data.location }));
   };

   useEffect(() => {
      automations.forEach(async (item) => {
         const automation = automationsList.find((x) => x.shipId === item.shipId);

         // If the automation in the store is not enabled and there's no running automation, then we should create a new one and start it.
         if (item.enabled && !automation) {
            const ship = user.ships.find((x) => x.id === item.shipId) as OwnedShip;
            const instance = await new Worker(account.token,
               account.username, item, ship, user.credits,
               Comlink.proxy(webworkerError),
               Comlink.proxy(webworkerUpdateState),
               Comlink.proxy(webworkerGetLocalStorage),
               Comlink.proxy(webworkerUpdateMarketData));
            await instance.run();
            setAutomationsList([...automationsList, { shipId: item.shipId, instance }]);
         }

         // If the automation in the store is not enabled and there's an automation worker, we should stop it.
         if (!item.enabled && automation) {
            await automation.instance.stop();
            setAutomationsList(automationsList.filter((x) => x.shipId !== automation.shipId));
         }
      });
   }, [automations]);

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
                                 <Route path="/loans" component={Loans} />
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
