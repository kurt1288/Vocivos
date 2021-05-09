/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-webpack-loader-syntax */
import React, {
   Suspense, useContext, useEffect, useState,
} from 'react';
import { Route, Switch } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import * as Comlink from 'comlink';
import AutomationWorker from 'worker-loader?filename=automation.worker.js!./automation';
import { ToastContainer, toast } from 'react-toastify';
import { AutomationType, Automation } from './automation';
import store, {
   addFlightPlan, addShip, removeFlightPlan, reset, RootState, setAllAutomationState, setAvailableShips, setCredits,
   setSpyShip,
   setSystems,
   setUser, StoredMarket, updateGoodPriceAfterBuy, updateGoodPriceAfterSell, updateMarketData, updateShip,
} from './store';
import './App.css';
import NavBar from './components/NavBar';
import SignIn from './components/SignIn';
import Profile from './components/Profile';
import Ships from './components/Ships/Ships';
import Systems from './components/Systems/Systems';
import Location from './components/Systems/Location';
import Loans from './components/Money/Money';
import {
   CargoType, FlightPlan, OwnedShip, Purchase,
} from './Api/types';
import Markets from './components/Markets/Markets';
import { AutoAction } from './components/Automation/Models';
import { WorkerContext } from './WorkerContext';
import Structures from './components/Systems/Structures';

export interface WorkerDataUpdate {
   type: AutoAction.Travel | AutoAction.AddFlightPlan | AutoAction.RemoveFlightPlan | AutoAction.Buy | AutoAction.Sell,
   data: FlightPlan | Purchase,
}

export interface WorkerError {
   shipId: string,
   error: string | null,
}

enum AutomationWorkerApiAction {
   Buy,
   Sell,
   CreateFlightPlan,
   MarketData,
   BuyShip,
   RemoveFlightPlan,
   GetFlightPlan,
   UpdateShip,
}

function App() {
   // const store = useSelector((state:RootState) => state);
   const {
      account, user, automateAll, flightPlans,
   } = useSelector((state:RootState) => state);
   const [automationWorker, setAutomationWorker] = useState<[Comlink.Remote<Automation>]>();
   const dispatch = useDispatch();
   const [apiWorker] = useContext(WorkerContext);

   useEffect(() => {
      const FetchAccount = async () => {
         try {
            const result = await apiWorker.getUser();
            dispatch(setUser(result));

            // only needed because the ships property on the user response does not contain the 'flightPlanId' property
            if (result.user.ships.some((x) => x.location === undefined)) {
               const { ships } = await apiWorker.ownedShips();

               ships.forEach(async (ship) => {
                  if (ship.flightPlanId) {
                     const { flightPlan } = await apiWorker.queryFlightPlan(ship.flightPlanId);
                     if (flightPlan.terminatedAt === null) {
                        dispatch(addFlightPlan(flightPlan));
                     }
                  }
               });
            }

            const getSystems = async () => {
               const temp = (await apiWorker.systemsInfo()).systems;
               dispatch((setSystems(temp)));
            };
            getSystems();

            // Update market data stored in local storage
            const marketDataStore = localStorage.getItem('marketData');
            const loadedMarketData = marketDataStore !== null ? JSON.parse(marketDataStore) as StoredMarket[] : null;
            loadedMarketData?.map((data) => (
               dispatch(updateMarketData(data))
            ));

            // Update spy ships, if any saved
            const spyShipsData = localStorage.getItem('spyShips');
            const loadedSpyShipsData = spyShipsData !== null ? JSON.parse(spyShipsData) as OwnedShip[] : null;
            loadedSpyShipsData?.map((data) => (
               dispatch(setSpyShip(data))
            ));
         } catch (err: unknown) {
            if ((err as Error).message === 'Invalid username or token.') {
               dispatch(reset());
               localStorage.removeItem('apiKey');
            }
         }
      };

      const GetShips = async () => {
         try {
            const getShips = await apiWorker.availableShips();
            getShips.ships.sort((a, b) => ((a.type > b.type) ? 1 : (b.type > a.type) ? -1 : 0));
            dispatch(setAvailableShips(getShips.ships));
         } catch (err: unknown) {
            toast.error((err as Error).message, {
               position: 'bottom-right',
               autoClose: false,
               hideProgressBar: false,
               closeOnClick: true,
               pauseOnHover: true,
               draggable: true,
               progress: 0,
            });
         }
      };

      if (account.username && account.token) {
         FetchAccount();
         GetShips();
      }
   }, []);

   const webworkerError = (data:string) => {
      console.log(data);
      toast.error(data, {
         position: 'bottom-right',
         autoClose: false,
         hideProgressBar: false,
         closeOnClick: true,
         pauseOnHover: true,
         draggable: true,
         progress: 0,
      });
      dispatch(setAllAutomationState(false));
   };

   const automationWorkerMakeApiCall = async (action: AutomationWorkerApiAction, data: { shipId?: string, good?: CargoType, quantity?: number, to?: string, location?: string, flightPlan?: FlightPlan }) => {
      switch (action) {
         case AutomationWorkerApiAction.Buy: {
            const order = await apiWorker.purchaseOrder(data.shipId as string, data.good as CargoType, data.quantity as number);
            dispatch(setCredits(order.credits));
            dispatch(updateShip(order.ship));
            dispatch(updateGoodPriceAfterBuy(order));
            return order;
         }
         case AutomationWorkerApiAction.Sell: {
            const order = await apiWorker.sellOrder(data.shipId as string, data.good as CargoType, data.quantity as number);
            dispatch(setCredits(order.credits));
            dispatch(updateShip(order.ship));
            dispatch(updateGoodPriceAfterSell(order));
            return order;
         }
         case AutomationWorkerApiAction.CreateFlightPlan: {
            const flightPlan = await apiWorker.createFlightPlan(data.shipId as string, data.to as string);
            dispatch(addFlightPlan(flightPlan.flightPlan));
            return flightPlan;
         }
         case AutomationWorkerApiAction.RemoveFlightPlan: {
            dispatch(removeFlightPlan(data.flightPlan as FlightPlan));
            return null;
         }
         case AutomationWorkerApiAction.GetFlightPlan: {
            const flightPlan = await apiWorker.queryFlightPlan(data.shipId as string);
            return flightPlan;
         }
         case AutomationWorkerApiAction.MarketData: {
            const market = await apiWorker.getMarket(data.location as string);
            dispatch(updateMarketData({ updatedAt: Date.now(), planet: market.location }));
            return market;
         }
         case AutomationWorkerApiAction.BuyShip: {
            const newShip = await apiWorker.buyShip(data.location as string, data.shipId as string);
            dispatch(setCredits(newShip.credits));
            dispatch(addShip(newShip.ship));
            return newShip;
         }
         case AutomationWorkerApiAction.UpdateShip: {
            const shipInfo = await apiWorker.shipInfo(data.shipId);
            dispatch(updateShip(shipInfo.ship));
            return shipInfo.ship;
         }
         default:
            return null;
      }
   };

   const automationGetStore = async () => (store.getState());

   useEffect(() => {
      if (automationWorker) {
         automationWorker[0].updateState(store.getState());
      }
   }, [user.ships.length, flightPlans]);

   useEffect(() => {
      const createWorker = async () => {
         const AutoWorker = Comlink.wrap<AutomationType>(new AutomationWorker());
         const instance = await new AutoWorker(Comlink.proxy(automationGetStore), Comlink.proxy(automationWorkerMakeApiCall), Comlink.proxy(webworkerError));
         // set state doesn't work here with just a comlink object. needs to be in an array.
         setAutomationWorker([instance]);
      };

      if (!automationWorker) {
         createWorker();
      }

      if (!automationWorker) { return; }

      if (automateAll) {
         automationWorker[0].start();
      } else {
         automationWorker[0]?.stop();
      }
   }, [automateAll]);

   return (
      <React.Fragment>
         { (account.token === undefined || account.token === null || account.token.length === 0
            || account.username === undefined || account.username === null || account.username.length === 0) ? <SignIn /> : (
               <React.Fragment>
                  <NavBar />
                  <ToastContainer />
                  <div className="bg-gray-800 py-4 flex-grow text-gray-200">
                     <div className="container min-h-full mx-auto">
                        <Switch>
                           <Route exact path="/" component={Profile} />
                           <Route path="/ships" component={Ships} />
                           <Route path="/money" component={Loans} />
                           <Route path="/markets" component={Markets} />
                           <Route path="/structures" component={Structures} />
                           <Route path="/systems/:location" component={Location} />
                           <Suspense fallback={<div />}>
                              <Route exact path="/systems" component={Systems} />
                           </Suspense>
                        </Switch>
                     </div>
                  </div>
               </React.Fragment>
            )}
      </React.Fragment>
   );
}

export default App;
