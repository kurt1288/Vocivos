import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
   FlightPlan, Planet, OwnedLoan, OwnedShip, User,
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
};

const spacetraders = createSlice({
   name: 'spacetraders',
   initialState,
   reducers: {
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
   },
});

export const {
   setUser, setToken, setCredits, updateShip, addFlightPlan, removeFlightPlan, updateMarketData,
} = spacetraders.actions;

const { reducer } = spacetraders;

// STORE

const store = configureStore({
   reducer,
   preloadedState: undefined,
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
