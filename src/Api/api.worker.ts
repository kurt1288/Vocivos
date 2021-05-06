/* eslint-disable class-methods-use-this */
/* eslint-disable lines-between-class-members */
import * as Comlink from 'comlink';
import Bottleneck from 'bottleneck';
import {
   Status, Account, User, ShipsAvailable, Systems, Loans,
   Market, Purchase, Locations, FlightPlanRes, ShipInfo,
   OwnedShips, Jettison, CargoType, DepositResponse, LocationResponse,
   GetLoanResponse, BuyShipResponse, AvailableStructuresResponse, ScrapShipResponse,
} from './types';

export interface ApiType {
   new(username?:string, token?:string): Api
}

// IMPORTANT: camelCase used because: https://github.com/pmmmwh/react-refresh-webpack-plugin/blob/main/docs/TROUBLESHOOTING.md#usage-with-indirection-like-workers-and-js-templates
// webworkers that reference this Api file will throw an error if PascalCase is used.
enum fetchMethod {
   Get = 'get',
   Post = 'post',
   Put = 'put',
   Delete = 'delete',
}

export class Api {
   private BASE_URL = 'https://api.spacetraders.io';
   private username?: string = undefined;
   private token?: string = undefined;
   private limiter:Bottleneck;

   constructor(username?:string, token?:string) {
      this.username = username;
      this.token = token;
      this.limiter = new Bottleneck({
         minTime: 500,
         maxConcurrent: 1,
      });

      this.limiter.on('failed', async (error, jobInfo) => {
         if (error.status === 400 || error.status === 401) {
            return null;
         } if (jobInfo.retryCount < 10) {
            if (error.status === 500) {
               console.log(`${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}: API error 500`);
               return 30000;
            }
            console.log(`${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} Error: ${error.message}`);
            return error.retryHeader ? parseInt(error.retryHeader, 10) * 1000 : 1000;
         }

         return null;
      });
   }

   private async makeRequest<T>(
      url: string, type: fetchMethod, payload: Record<string, any> = {},
   ): Promise<T> {
      const response = await this.limiter.schedule(async () => {
         const data = await fetch(url, {
            method: type,
            headers: {
               Authorization: `Bearer ${this.token}`,
               ...(type !== fetchMethod.Get && { 'Content-Type': 'application/json' }),
            },
            ...(type !== fetchMethod.Get && { body: JSON.stringify(payload) }),
         });

         if (data.status >= 400) {
            const result = await data.json();
            // Emit the 'failed' event
            const error = { status: data.status, message: data.status === 401 ? 'Incorrect username or token' : result.error.message, retryHeader: data.headers.get('retry-after') };
            throw error;
         }

         return data;
      });

      const result = await response.json();

      return result;
   }

   getInstance() {
      return this;
   }

   /** Public functions used to query the API */
   async getStatus() {
      const response = await fetch(`${this.BASE_URL}/game/status`);
      const result = await response.json() as Status;

      return result;
   }

   async getToken(username: string) {
      const response = await fetch(`${this.BASE_URL}/users/${username}/token`, { method: fetchMethod.Post });

      if (response.status >= 400) {
         throw new Error('Username already exists');
      }

      const result = await response.json() as Account;

      return result;
   }

   async setCredentials(username: string, token: string) {
      this.username = username;
      this.token = token;
   }

   async getUser() {
      const url = `${this.BASE_URL}/users/${this.username}`;
      return this.makeRequest<User>(url, fetchMethod.Get);
   }

   async getLoansAvailable() {
      const url = `${this.BASE_URL}/game/loans`;
      return this.makeRequest<Loans>(url, fetchMethod.Get);
   }

   async getLoansOwned() {
      const url = `${this.BASE_URL}/users/${this.username}/loans`;
      return this.makeRequest<Loans>(url, fetchMethod.Get);
   }

   async newLoan(type: string) {
      const url = `${this.BASE_URL}/users/${this.username}/loans`;
      return this.makeRequest<GetLoanResponse>(url, fetchMethod.Post, { type });
   }

   async replayLoan(loanId: string) {
      const url = `${this.BASE_URL}/users/${this.username}/loans/${loanId}`;
      return this.makeRequest<User>(url, fetchMethod.Put);
   }

   async availableShips(className = '') {
      const url = `${this.BASE_URL}/game/ships`;
      return this.makeRequest<ShipsAvailable>(url, fetchMethod.Get, { class: className });
   }

   async ownedShips() {
      const url = `${this.BASE_URL}/users/${this.username}/ships`;
      return this.makeRequest<OwnedShips>(url, fetchMethod.Get);
   }

   async buyShip(location: string, type: string) {
      const url = `${this.BASE_URL}/users/${this.username}/ships`;
      return this.makeRequest<BuyShipResponse>(url, fetchMethod.Post, { location, type });
   }

   async shipInfo(shipId: string) {
      const url = `${this.BASE_URL}/users/${this.username}/ships/${shipId}`;
      return this.makeRequest<ShipInfo>(url, fetchMethod.Get);
   }

   async scrapShip(shipId: string) {
      const url = `${this.BASE_URL}/users/${this.username}/ships/${shipId}`;
      return this.makeRequest<ScrapShipResponse>(url, fetchMethod.Delete);
   }

   async systemsInfo() {
      const url = `${this.BASE_URL}/game/systems`;
      return this.makeRequest<Systems>(url, fetchMethod.Get);
   }

   async getLocations(location: string) {
      const url = `${this.BASE_URL}/game/systems/${location}/locations`;
      return this.makeRequest<Locations>(url, fetchMethod.Get);
   }

   async getLocation(location: string) {
      const url = `${this.BASE_URL}/game/locations/${location}`;
      return this.makeRequest<LocationResponse>(url, fetchMethod.Get);
   }

   async getMarket(symbol: string) {
      const url = `${this.BASE_URL}/game/locations/${symbol}/marketplace`;
      return this.makeRequest<Market>(url, fetchMethod.Get);
   }

   async purchaseOrder(shipId: string, good: string, quantity: number) {
      const url = `${this.BASE_URL}/users/${this.username}/purchase-orders`;
      return this.makeRequest<Purchase>(url, fetchMethod.Post, { shipId, good, quantity });
   }

   async sellOrder(shipId: string, good: CargoType, quantity: number) {
      const url = `${this.BASE_URL}/users/${this.username}/sell-orders`;
      return this.makeRequest<Purchase>(url, fetchMethod.Post, { shipId, good, quantity });
   }

   async depositGoods(structureId: string, shipId: string, good: CargoType, quantity: number) {
      const url = `${this.BASE_URL}/game/structures/${structureId}/deposit`;
      return this.makeRequest<DepositResponse>(url, fetchMethod.Post, { shipId, good, quantity });
   }

   async deleteOrder(shipId: string, good: string, quantity: number) {
      const url = `${this.BASE_URL}/users/${this.username}/ships/${shipId}/jettison`;
      return this.makeRequest<Jettison>(url, fetchMethod.Put, { good, quantity });
   }

   async createFlightPlan(shipId: string, destination: string) {
      const url = `${this.BASE_URL}/users/${this.username}/flight-plans`;
      return this.makeRequest<FlightPlanRes>(url, fetchMethod.Post, { shipId, destination });
   }

   async queryFlightPlan(planId: string) {
      const url = `${this.BASE_URL}/users/${this.username}/flight-plans/${planId}`;
      return this.makeRequest<FlightPlanRes>(url, fetchMethod.Get);
   }

   async warpJump(shipId: string) {
      const url = `${this.BASE_URL}/users/${this.username}/warp-jump`;
      return this.makeRequest<FlightPlanRes>(url, fetchMethod.Post, { shipId });
   }

   async getStructures() {
      const url = `${this.BASE_URL}/game/structures`;
      return this.makeRequest<AvailableStructuresResponse>(url, fetchMethod.Get);
   }

   async getLocationsForStructure(type: string) {
      const url = `${this.BASE_URL}/game/systems/OE/locations?allowsConstruction=true&type=${type}`;
      return this.makeRequest<Locations>(url, fetchMethod.Get);
   }
}

Comlink.expose(Api);
