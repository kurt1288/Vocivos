import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
   FlightPlan, OwnedLoan, OwnedShip, User,
} from '../Api/types';

interface InitialState {
   user: {
      credits: number,
      loans: OwnedLoan[],
      ships: OwnedShip[],
      username: string
   },
   account: {
      token: string,
      username: string
   },
   flightPlans: FlightPlan[]
}

const initialState: InitialState = {
   user: {
      credits: 0,
      loans: [],
      ships: [],
      username: 'undefined',
   },
   account: {
      token: '',
      username: '',
   },
   flightPlans: [],
};

const spacetraders = createSlice({
   name: 'spacetraders',
   initialState,
   reducers: {
      setUser: (state, { payload }:PayloadAction<User>) => {
         state.user = payload.user;
      },
      setToken: (state, { payload }:PayloadAction<string>) => {
         state.account = JSON.parse(payload);
      },
      setCredits: (state, { payload }:PayloadAction<number>) => {
         state.user.credits = payload;
      },
      updateShip: (state, { payload }:PayloadAction<OwnedShip>) => {
         Object.assign(state.user.ships.find((x) => x.id === payload.id), payload);
      },
      addFlightPlan: (state, { payload }:PayloadAction<FlightPlan>) => {
         state.flightPlans.push(payload);
         localStorage.setItem('flightPlans', JSON.stringify(state.flightPlans));
      },
      removeFlightPlan: (state, { payload }:PayloadAction<FlightPlan>) => {
         const temp = state.flightPlans.filter((x) => x !== payload);
         state.flightPlans = temp;
         localStorage.setItem('flightPlans', JSON.stringify(state.flightPlans));
      },
   },
});

export const {
   setUser, setToken, setCredits, updateShip, addFlightPlan, removeFlightPlan,
} = spacetraders.actions;

const { reducer } = spacetraders;

// STORE

const store = configureStore({
   reducer,
   preloadedState: undefined,
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
