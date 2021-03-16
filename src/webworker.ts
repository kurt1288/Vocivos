/* eslint-disable class-methods-use-this */
/* eslint-disable no-constant-condition */
/* eslint-disable lines-between-class-members */
import * as Comlink from 'comlink';
import Timer from 'easytimer.js';
import Api from './Api';
import {
   Cargo, CargoType, Market, Marketplace, OwnedShip, Purchase,
} from './Api/types';
import { WorkerDataUpdate, WorkerError } from './App';
import {
   AutoAction, MarketStep, Steps, TravelStep,
} from './components/Automation/Models';
import { StoredMarket } from './store';

export interface WorkerType {
   new(token:string, username:string, steps:Steps, ship:OwnedShip, credits:number, errorCallback: (error: WorkerError) => void, stateUpdateCallback: (data: WorkerDataUpdate) => void, webworkerGetLocalStorage: (worker: Automation) => void, webworkerUpdateMarketData: (data: Market) => void): Automation,
}

export class Automation {
   private token;
   private username;
   private stepIndex = 0;
   private steps;
   private timer: Timer | null = null;
   private repeat = true;
   private ship;
   private credits;
   private marketData: StoredMarket[] | null = null;
   errorCallback: (error: WorkerError) => void;
   stateUpdateCallback: (data: WorkerDataUpdate) => void;
   webworkerGetLocalStorage: (worker: Automation) => void;
   webworkerUpdateMarketData: (data: Market) => void;
   enabled = false;

   constructor(token:string, username:string, steps:Steps, ship:OwnedShip, credits:number, errorCallback: (error: WorkerError) => void, stateUpdateCallback: (data: WorkerDataUpdate) => void, webworkerGetLocalStorage: (worker: Automation) => void, webworkerUpdateMarketData: (data: Market) => void) {
      this.token = token;
      this.username = username;
      this.steps = steps;
      this.ship = ship;
      this.credits = credits;
      this.errorCallback = errorCallback;
      this.stateUpdateCallback = stateUpdateCallback;
      this.webworkerGetLocalStorage = webworkerGetLocalStorage;
      this.webworkerUpdateMarketData = webworkerUpdateMarketData;
   }

   run() {
      this.enabled = true;
      this.doStep();
   }

   stop() {
      this.enabled = false;
   }

   setMarketData(data:string | null) {
      if (!data) {
         this.marketData = null;
      } else {
         this.marketData = JSON.parse(data);
      }
   }

   private nextStep() {
      if (this.steps === null) { this.enabled = false; return; }

      if (this.timer !== null) {
         this.timer.removeEventListener('targetAchieved', this.nextStep);
      }

      if ((this.stepIndex + 1) === this.steps.steps.length && this.repeat) {
         this.stepIndex = 0;
      } else if ((this.stepIndex + 1) === this.steps.steps.length && !this.repeat) {
         this.enabled = false;
      } else {
         this.stepIndex += 1;
      }

      if (this.enabled) {
         this.doStep();
      }
   }

   private async doStep() {
      if (this.steps === null) { this.enabled = false; return; }

      this.ship = (await Api.shipInfo(this.token, this.username, this.ship.id)).ship;

      try {
         if (this.steps.steps[this.stepIndex].type.action === AutoAction.Travel) {
            const flightPlan = await Api.createFlightPlan(this.token, this.username, this.steps.shipId, (this.steps.steps[this.stepIndex].type as TravelStep).destination);
            this.stateUpdateCallback({ type: AutoAction.Travel, data: flightPlan.flightPlan });
            this.timer = new Timer();
            // 5 second buffer after arrival time
            this.timer.start({ precision: 'seconds', target: { seconds: flightPlan.flightPlan.timeRemainingInSeconds + 5 } });
            this.timer.addEventListener('targetAchieved', this.nextStep.bind(this));
         } else {
            if (this.steps.steps[this.stepIndex].type.action === AutoAction.Buy) {
               let marketOrder:Purchase;
               if ((this.steps.steps[this.stepIndex].type as MarketStep).quantity === -1) {
                  const good = await this.getMarketData((this.steps.steps[this.stepIndex].type as MarketStep).good);
                  if (!good) {
                     throw new Error(`Cargo type ${good} does not exist at ${this.ship.location}`);
                  }
                  const max = this.getMaxQuantity(good);
                  marketOrder = await Api.purchaseOrder(this.token, this.username, this.steps.shipId, (this.steps.steps[this.stepIndex].type as MarketStep).good, max);
               } else {
                  marketOrder = await Api.purchaseOrder(this.token, this.username, this.steps.shipId, (this.steps.steps[this.stepIndex].type as MarketStep).good, (this.steps.steps[this.stepIndex].type as MarketStep).quantity);
               }
               this.credits = marketOrder.credits;
               // this.ship.spaceAvailable = marketOrder.ship.spaceAvailable;
               this.stateUpdateCallback({ type: AutoAction.Buy, data: marketOrder });
            } else {
               let { quantity } = this.steps.steps[this.stepIndex].type as MarketStep;
               if (quantity === -1) {
                  quantity = (this.ship.cargo.find((x) => x.good === (this.steps.steps[this.stepIndex].type as MarketStep).good) as Cargo).quantity;
               }
               const marketOrder = await Api.sellOrder(this.token, this.username, this.steps.shipId, (this.steps.steps[this.stepIndex].type as MarketStep).good, quantity);
               this.credits = marketOrder.credits;
               // this.ship.spaceAvailable = marketOrder.ship.spaceAvailable;
               this.stateUpdateCallback({ type: AutoAction.Sell, data: marketOrder });
            }

            this.nextStep();
         }
      } catch (error:unknown) {
         this.stop();
         this.errorCallback({ shipId: this.steps.shipId, error: (error as Error).message });
      }
   }

   private async getMarketData(good:CargoType) {
      this.webworkerGetLocalStorage(this);
      // const localData = localStorage.getItem('marketData') as StoredMarket[] | null;
      const planet = this.marketData?.find((x) => x.planet.symbol === this.ship.location);

      // if there's no cached data, or if the cached data is older than 10 minutes, update
      if (!this.marketData || !planet || (Date.now() - planet.updatedAt > 600000)) {
         const data = (await Api.getMarket(this.token, this.ship.location as string));
         this.webworkerUpdateMarketData(data);
         return data.location.marketplace.find((x) => x.symbol === good);
      }

      return planet.planet.marketplace.find((x) => x.symbol === good);
   }

   private getMaxQuantity(good:Marketplace) {
      const maxCargo = Math.floor(this.ship.spaceAvailable / good.volumePerUnit);

      if (maxCargo * good.pricePerUnit < this.credits && maxCargo <= good.quantityAvailable) {
         return maxCargo;
      } if (maxCargo > good.quantityAvailable) {
         return good.quantityAvailable;
      }

      return Math.floor(this.credits / good.pricePerUnit);
   }
}

Comlink.expose(Automation);
