import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
   FlightPlan, Planet, OwnedLoan, OwnedShip, User, System,
} from '../Api/types';
import { WorkerError } from '../App';
import { Steps } from '../components/Automation/Models';

export interface StoredMarket {
   updatedAt: number,
   planet: Planet,
}

interface InitialState {
   user: {
      credits: number,
      loans: OwnedLoan[],
      ships: OwnedShip[],
      username: string | undefined
   },
   account: {
      token: string,
      username: string
   },
   flightPlans: FlightPlan[],
   marketData: StoredMarket[],
   automations: Steps[],
   systems: System[],
}

const initialState: InitialState = {
   user: {
      credits: 0,
      loans: [],
      ships: [],
      username: undefined,
   },
   account: {
      token: '',
      username: '',
   },
   flightPlans: [],
   marketData: [],
   automations: [],
   systems: [],
};

const spacetraders = createSlice({
   name: 'spacetraders',
   initialState,
   reducers: {
      reset: (state) => {
         Object.assign(state, initialState);
      },
      setUser: (state, { payload }:PayloadAction<User>) => {
         state.user = payload.user;
      },
      setToken: (state, { payload }:PayloadAction<{ username:string, token:string }>) => {
         state.account = payload;
      },
      setCredits: (state, { payload }:PayloadAction<number>) => {
         state.user.credits = payload;
      },
      updateShip: (state, { payload }:PayloadAction<OwnedShip>) => {
         Object.assign(state.user.ships.find((x) => x.id === payload.id), payload);
      },
      updateShips: (state, { payload }:PayloadAction<OwnedShip[]>) => {
         state.user.ships = payload;
      },
      addFlightPlan: (state, { payload }:PayloadAction<FlightPlan>) => {
         state.flightPlans.push(payload);
         // when in transit, ship location is 'undefined'
         const ship = state.user.ships.find((x) => x.id === payload.ship);
         if (ship) {
            ship.location = undefined;
         }

         localStorage.setItem('flightPlans', JSON.stringify(state.flightPlans));
      },
      removeFlightPlan: (state, { payload }:PayloadAction<FlightPlan>) => {
         if (state.flightPlans.findIndex((x) => x.id === payload.id) > -1) {
            state.flightPlans.splice(state.flightPlans.findIndex((x) => x.id === payload.id), 1);

            // update ship with new location
            const ship = state.user.ships.find((x) => x.id === payload.ship);
            if (ship) {
               ship.location = payload.destination;
            }
            localStorage.setItem('flightPlans', JSON.stringify(state.flightPlans));
         }
      },
      updateMarketData: (state, { payload }:PayloadAction<StoredMarket>) => {
         // check state for existing market object
         if (state.marketData.some((item) => (item.planet.symbol === payload.planet.symbol))) {
            state.marketData = state.marketData.map((item) => ((item.planet.symbol === payload.planet.symbol) ? payload : item));
         } else {
            state.marketData.push(payload);
         }
         localStorage.setItem('marketData', JSON.stringify(state.marketData));
      },
      addAutomation: (state, { payload }:PayloadAction<Steps>) => {
         // check for existing automation for given ship and replace if it exists
         if (state.automations.findIndex((x) => x.shipId === payload.shipId) !== -1) {
            state.automations.splice(state.automations.findIndex((x) => x.shipId === payload.shipId), 1);
         }

         state.automations.push(payload);
      },
      setAutomationState: (state, { payload }:PayloadAction<{ shipId: string, enabled: boolean}>) => {
         const ship = state.automations.find((x) => x.shipId === payload.shipId);
         if (ship) {
            ship.enabled = payload.enabled;
         }
      },
      addAutomationError: (state, { payload }:PayloadAction<WorkerError>) => {
         const ship = state.automations.find((x) => x.shipId === payload.shipId);
         if (ship) {
            ship.error = payload.error;
         }
      },
      setSystems: (state, { payload }:PayloadAction<System[]>) => {
         state.systems = payload;
      },
   },
});

export const {
   setUser, setToken, setCredits, updateShip, addFlightPlan, removeFlightPlan, updateMarketData, addAutomation, setAutomationState, addAutomationError, reset, updateShips, setSystems,
} = spacetraders.actions;

const { reducer } = spacetraders;

// STORE

const store = configureStore({
   reducer,
   preloadedState: undefined,
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
