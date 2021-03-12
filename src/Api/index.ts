import {
   Status, Account, User, ShipsAvailable, Systems, Loans, Market, Purchase, Locations, FlightPlanRes, ShipInfo,
} from './types';

enum FetchMethod {
   Get = 'get',
   Post = 'post'
}

const BASE_URL = 'https://api.spacetraders.io';

async function AuthFetch<T>(
   url: string, token: string, type: FetchMethod, payload: Record<string, any> = {},
): Promise<T> {
   let response;

   if (type === FetchMethod.Get) {
      response = await fetch(url, {
         method: type,
         headers: {
            Authorization: `Bearer ${token}`,
         },
      });
   } else {
      response = await fetch(url, {
         method: type,
         headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(payload),
      });
   }

   if (response.status === 401) {
      throw new Error('Incorrect username or token.');
   }

   const result = await response.json();

   if (response.status >= 400) {
      throw new Error(result.error.message);
   }

   return result;
}

export default {
   async getStatus() {
      const response = await fetch(`${BASE_URL}/game/status`);
      const result = await response.json() as Status;

      return result;
   },

   async getToken(username: string) {
      const response = await fetch(`${BASE_URL}/users/${username}/token`);

      if (response.status >= 400) {
         throw new Error('Username already exists');
      }

      const result = await response.json() as Account;

      return result;
   },

   async getUser(username: string, token: string) {
      const url = `${BASE_URL}/users/${username}`;
      return AuthFetch<User>(url, token, FetchMethod.Get);
   },

   async getLoansAvailable(token: string) {
      const url = `${BASE_URL}/game/loans`;
      return AuthFetch<Loans>(url, token, FetchMethod.Get);
   },

   async getLoansOwned(username: string, token: string) {
      const url = `${BASE_URL}/users/${username}/loans`;
      return AuthFetch<Loans>(url, token, FetchMethod.Get);
   },

   async newLoan(username: string, token: string, type: string) {
      const url = `${BASE_URL}/users/${username}/loans`;
      return AuthFetch<User>(url, token, FetchMethod.Post, { type });
   },

   async availableShips(token: string, className = '') {
      const url = `${BASE_URL}/game/ships`;
      return AuthFetch<ShipsAvailable>(url, token, FetchMethod.Get, { class: className });
   },

   async ownedShips(token: string, username: string) {
      const url = `${BASE_URL}/users/${username}/ships`;
      return AuthFetch<ShipsAvailable>(url, token, FetchMethod.Get);
   },

   async buyShip(token: string, username: string, location: string, type: string) {
      const url = `${BASE_URL}/users/${username}/ships`;
      return AuthFetch<User>(url, token, FetchMethod.Post, { location, type });
   },

   async shipInfo(token: string, username: string, shipId: string) {
      const url = `${BASE_URL}/users/${username}/ships/${shipId}`;
      return AuthFetch<ShipInfo>(url, token, FetchMethod.Get);
   },

   async systemsInfo(token: string) {
      const url = `${BASE_URL}/game/systems`;
      return AuthFetch<Systems>(url, token, FetchMethod.Get);
   },

   async getLocations(token: string, location: string) {
      const url = `${BASE_URL}/game/systems/${location}/locations`;
      return AuthFetch<Locations>(url, token, FetchMethod.Get);
   },

   async getMarket(token: string, symbol: string) {
      const url = `${BASE_URL}/game/locations/${symbol}/marketplace`;
      return AuthFetch<Market>(url, token, FetchMethod.Get);
   },

   async purchaseOrder(token: string, username: string, shipId: string, good: string, quantity: number) {
      const url = `${BASE_URL}/users/${username}/purchase-orders`;
      return AuthFetch<Purchase>(url, token, FetchMethod.Post, { shipId, good, quantity });
   },

   async sellOrder(token: string, username: string, shipId: string, good: string, quantity: number) {
      const url = `${BASE_URL}/users/${username}/sell-orders`;
      return AuthFetch<Purchase>(url, token, FetchMethod.Post, { shipId, good, quantity });
   },

   async createFlightPlan(token: string, username: string, shipId: string, destination: string) {
      const url = `${BASE_URL}/users/${username}/flight-plans`;
      return AuthFetch<FlightPlanRes>(url, token, FetchMethod.Post, { shipId, destination });
   },

   async queryFlightPlan(token: string, username: string, planId: string) {
      const url = `${BASE_URL}/users/${username}/flight-plans/${planId}`;
      return AuthFetch<FlightPlanRes>(url, token, FetchMethod.Get);
   },
};
