import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
   FlightPlan, Planet, OwnedLoan, OwnedShip, User, System, CargoType,
} from '../Api/types';

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
   automateAll: boolean,
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
   automateAll: false,
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
      updateLoans: (state, { payload }:PayloadAction<OwnedLoan[]>) => {
         state.user.loans = payload;
      },
      updateShip: (state, { payload }:PayloadAction<OwnedShip>) => {
         Object.assign(state.user.ships.find((x) => x.id === payload.id), payload);
      },
      updateShips: (state, { payload }:PayloadAction<OwnedShip[]>) => {
         state.user.ships = payload;
      },
      addFlightPlan: (state, { payload }:PayloadAction<FlightPlan>) => {
         state.flightPlans.push(payload);

         // update ship with new flightplan Id
         const ship = state.user.ships.find((x) => x.id === payload.shipId);
         if (ship) {
            ship.location = undefined;
            ship.flightPlanId = payload.id;
            ship.spaceAvailable += payload.fuelConsumed;
            const fuel = ship.cargo.find((x) => x.good === CargoType.Fuel);
            if (fuel && payload.fuelRemaining > 0) {
               fuel.quantity = payload.fuelRemaining;
            } else if (fuel && payload.fuelRemaining === 0) {
               ship.cargo.splice(ship.cargo.findIndex((x) => x.good === CargoType.Fuel), 1);
            }
         }
      },
      removeFlightPlan: (state, { payload }:PayloadAction<FlightPlan>) => {
         if (state.flightPlans.findIndex((x) => x.id === payload.id) > -1) {
            state.flightPlans.splice(state.flightPlans.findIndex((x) => x.id === payload.id), 1);

            // update ship with new location
            const ship = state.user.ships.find((x) => x.id === payload.shipId);
            if (ship) {
               ship.location = payload.destination;
               ship.flightPlanId = undefined;
            }
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
      setSystems: (state, { payload }:PayloadAction<System[]>) => {
         state.systems = payload;
      },
      setAllAutomationState: (state, { payload }:PayloadAction<boolean>) => {
         state.automateAll = payload;
      },
   },
});

export const {
   setUser, setToken, setCredits, updateShip, addFlightPlan, removeFlightPlan,
   updateMarketData, reset,
   updateShips, setSystems, updateLoans, setAllAutomationState,
} = spacetraders.actions;

const { reducer } = spacetraders;

// STORE

const store = configureStore({
   reducer,
   preloadedState: undefined,
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
