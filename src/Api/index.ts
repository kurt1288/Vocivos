import Bottleneck from 'bottleneck';
import {
   Status, Account, User, ShipsAvailable, Systems, Loans, Market, Purchase, Locations, FlightPlanRes, ShipInfo, OwnedShips, Jettison, CargoType, DepositResponse, Location, LocationResponse,
} from './types';

// IMPORTANT: camelCase used because: https://github.com/pmmmwh/react-refresh-webpack-plugin/blob/main/docs/TROUBLESHOOTING.md#usage-with-indirection-like-workers-and-js-templates
// webworkers that reference this Api file will throw an error if PascalCase is used.
enum fetchMethod {
   Get = 'get',
   Post = 'post',
   Put = 'put',
}

const BASE_URL = 'https://api.spacetraders.io';

const limiter = new Bottleneck({
   minTime: 500,
   maxConcurrent: 1,
});

const wait = (time:number) => (
   new Promise((resolve) => setTimeout(resolve, time))
);

async function authFetch<T>(
   url: string, token: string, type: fetchMethod, payload: Record<string, any> = {}, retry = 0,
): Promise<T> {
   let response;

   if (type === fetchMethod.Get) {
      response = await limiter.schedule(() => fetch(url, {
         method: type,
         headers: {
            Authorization: `Bearer ${token}`,
         },
      }));
   } else {
      response = await limiter.schedule(() => fetch(url, {
         method: type,
         headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(payload),
      }));
   }

   // Retry 3 times if rate limit error
   if (response.status === 429 && retry < 3) {
      const header = response.headers.get('retry-after');
      const retryAfter = header ? parseInt(header, 10) * 1000 : 1000;
      await wait(retryAfter);
      authFetch(url, token, type, payload, retry + 1);
   }

   if (response.status === 401) {
      throw new Error('Invalid username or token.');
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
      const response = await fetch(`${BASE_URL}/users/${username}/token`, { method: fetchMethod.Post });

      if (response.status >= 400) {
         throw new Error('Username already exists');
      }

      const result = await response.json() as Account;

      return result;
   },

   async getUser(username: string, token: string) {
      const url = `${BASE_URL}/users/${username}`;
      return authFetch<User>(url, token, fetchMethod.Get);
   },

   async getLoansAvailable(token: string) {
      const url = `${BASE_URL}/game/loans`;
      return authFetch<Loans>(url, token, fetchMethod.Get);
   },

   async getLoansOwned(username: string, token: string) {
      const url = `${BASE_URL}/users/${username}/loans`;
      return authFetch<Loans>(url, token, fetchMethod.Get);
   },

   async newLoan(username: string, token: string, type: string) {
      const url = `${BASE_URL}/users/${username}/loans`;
      return authFetch<User>(url, token, fetchMethod.Post, { type });
   },

   async replayLoan(username: string, token: string, loanId: string) {
      const url = `${BASE_URL}/users/${username}/loans/${loanId}`;
      return authFetch<User>(url, token, fetchMethod.Put);
   },

   async availableShips(token: string, className = '') {
      const url = `${BASE_URL}/game/ships`;
      return authFetch<ShipsAvailable>(url, token, fetchMethod.Get, { class: className });
   },

   async ownedShips(token: string, username: string) {
      const url = `${BASE_URL}/users/${username}/ships`;
      return authFetch<OwnedShips>(url, token, fetchMethod.Get);
   },

   async buyShip(token: string, username: string, location: string, type: string) {
      const url = `${BASE_URL}/users/${username}/ships`;
      return authFetch<User>(url, token, fetchMethod.Post, { location, type });
   },

   async shipInfo(token: string, username: string, shipId: string) {
      const url = `${BASE_URL}/users/${username}/ships/${shipId}`;
      return authFetch<ShipInfo>(url, token, fetchMethod.Get);
   },

   async systemsInfo(token: string) {
      const url = `${BASE_URL}/game/systems`;
      return authFetch<Systems>(url, token, fetchMethod.Get);
   },

   async getLocations(token: string, location: string) {
      const url = `${BASE_URL}/game/systems/${location}/locations`;
      return authFetch<Locations>(url, token, fetchMethod.Get);
   },

   async getLocation(token: string, location: string) {
      const url = `${BASE_URL}/game/locations/${location}`;
      return authFetch<LocationResponse>(url, token, fetchMethod.Get);
   },

   async getMarket(token: string, symbol: string) {
      const url = `${BASE_URL}/game/locations/${symbol}/marketplace`;
      return authFetch<Market>(url, token, fetchMethod.Get);
   },

   async purchaseOrder(token: string, username: string, shipId: string, good: string, quantity: number) {
      const url = `${BASE_URL}/users/${username}/purchase-orders`;
      return authFetch<Purchase>(url, token, fetchMethod.Post, { shipId, good, quantity });
   },

   async sellOrder(token: string, username: string, shipId: string, good: CargoType, quantity: number) {
      const url = `${BASE_URL}/users/${username}/sell-orders`;
      return authFetch<Purchase>(url, token, fetchMethod.Post, { shipId, good, quantity });
   },

   async depositGoods(token: string, structureId: string, shipId: string, good: CargoType, quantity: number) {
      const url = `${BASE_URL}/game/structures/${structureId}/deposit`;
      return authFetch<DepositResponse>(url, token, fetchMethod.Post, { shipId, good, quantity });
   },

   async deleteOrder(token: string, username: string, shipId: string, good: string, quantity: number) {
      const url = `${BASE_URL}/users/${username}/ships/${shipId}/jettison`;
      return authFetch<Jettison>(url, token, fetchMethod.Put, { good, quantity });
   },

   async createFlightPlan(token: string, username: string, shipId: string, destination: string) {
      const url = `${BASE_URL}/users/${username}/flight-plans`;
      return authFetch<FlightPlanRes>(url, token, fetchMethod.Post, { shipId, destination });
   },

   async queryFlightPlan(token: string, username: string, planId: string) {
      const url = `${BASE_URL}/users/${username}/flight-plans/${planId}`;
      return authFetch<FlightPlanRes>(url, token, fetchMethod.Get);
   },

   async warpJump(token: string, username: string, shipId: string) {
      const url = `${BASE_URL}/users/${username}/warp-jump`;
      return authFetch<FlightPlanRes>(url, token, fetchMethod.Post, { shipId });
   },
};
