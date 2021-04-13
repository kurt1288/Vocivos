/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable lines-between-class-members */
import * as Comlink from 'comlink';
import Timer from 'easytimer.js';
import Api from './Api';
import {
   CargoType, Market, Marketplace, OwnedShip, Planet, Location, LocationType,
} from './Api/types';
import { WorkerDataUpdate } from './App';
import { AutoAction } from './components/Automation/Models';
import store, { RootState } from './store';

export interface AutomationType {
   new(stateUpdateCallback: (data: WorkerDataUpdate) => void, updateMarketDataCallback: (data: Market) => void, errorCallback: (error: string) => void): Automation
}

enum DispatchAction {
   Trade,
   Scout,
}

interface TradeRoute {
   good: CargoType;
   from: string;
   to: string;
   fuelRequired: number;
   cpdv: number;
   lastUpdated: number;
}

interface ScoutRoute {
   from: string,
   to: string,
}

interface Dispatched {
   ship: string;
   action: DispatchAction;
   route: TradeRoute | ScoutRoute;
}

export class Automation {
   stateUpdateCallback: (data: WorkerDataUpdate) => void;
   updateMarketDataCallback: (data: Market) => void;
   errorCallback: (error: string) => void;
   private state = store.getState();
   private markets = this.state.marketData;
   private enabled = false;
   private dispatched: Dispatched[] = [];
   private marketUpdateTime = 600000;

   constructor(stateUpdateCallback: (data: WorkerDataUpdate) => void, updateMarketDataCallback: (data: Market) => void, errorCallback: (error: string) => void) {
      this.stateUpdateCallback = stateUpdateCallback;
      this.updateMarketDataCallback = updateMarketDataCallback;
      this.errorCallback = errorCallback;
   }

   stop() {
      this.enabled = false;
   }

   start() {
      this.enabled = true;
      this.automate();
   }

   updateState(state: RootState) {
      this.state = state;
      this.markets = state.marketData;
   }

   private wait = (time:number) => (
      new Promise((resolve) => setTimeout(resolve, time))
   );

   private static distanceBetween(point1: Planet | Location, point2: Planet | Location) {
      return Math.ceil(Math.sqrt(((point2.x - point1.x) ** 2) + ((point2.y - point1.y) ** 2)));
   }

   /**
    * Does not include penalty
    */
   private static fuelRequired(from: Planet | Location, to: Planet | Location) {
      return Math.round((Automation.distanceBetween(to, from) / 4)) + 1;
   }

   private fuelPenalty(ship: OwnedShip) {
      if (this.state.systems.find((x) => x.symbol === ship.location?.split('-')[0])?.locations.find((x) => x.symbol === ship.location)?.type !== 'PLANET') {
         return 0;
      }

      switch (ship.type) {
         case 'ZA-MK-II':
         case 'EM-MK-II':
         case 'HM-MK-II':
            return 1;
         case 'GR-MK-I':
         case 'EM-MK-I':
            return 2;
         case 'GR-MK-II':
            return 3;
         case 'GR-MK-III':
            return 4;
         default:
            return 0;
      }
   }

   private async BestTradeRoutes() {
      const bestRoutes: TradeRoute[] = [];

      const locations = Array.from(new Set(this.state.user.ships.map((item) => item.location)));
      for (const location of locations) {
         if (!location) { continue; }
         await this.updateMarketData(location);
      }

      for (const type of Object.values(CargoType)) {
         if (type === CargoType.Research || type === CargoType.Fuel) { continue; } // exclude research for now

         // all locations that have up-to-date data and have the good in question
         const data = [...this.markets].filter((x) => x.planet.marketplace.find((y) => y.symbol === type));
         // const data = [...this.markets].filter((x) => (Date.now() - x.updatedAt <= this.marketUpdateTime) && x.planet.marketplace.find((y) => y.symbol === type));

         if (data.length <= 1) { continue; }
         for (let i = 0; i < data.length; i += 1) {
            const current = data[i];

            for (let y = 0; y < data.length; y += 1) {
               if (data[y].planet !== current.planet) {
                  const creditDiff = (data[y].planet.marketplace.find((x) => x.symbol === type)?.sellPricePerUnit as number) - (current.planet.marketplace.find((x) => x.symbol === type)?.purchasePricePerUnit as number);
                  const distance = Automation.distanceBetween(current.planet, data[y].planet);
                  const cpdv = creditDiff / distance / (current.planet.marketplace.find((x) => x.symbol === type)?.volumePerUnit as number);
                  const lastUpdated = current.updatedAt > data[y].updatedAt ? current.updatedAt : data[y].updatedAt;

                  // exclude any negatives because we don't want to trade on routes that lose money
                  if (cpdv <= 0) { continue; }

                  const existing = bestRoutes.find((x) => x.good === type);
                  if (existing && existing.cpdv < cpdv) {
                     bestRoutes[bestRoutes.findIndex((x) => x.good === type)] = {
                        good: type,
                        from: current.planet.symbol,
                        to: data[y].planet.symbol,
                        fuelRequired: Automation.fuelRequired(current.planet, data[y].planet),
                        cpdv,
                        lastUpdated,
                     };
                  } else if (!existing) {
                     bestRoutes.push({
                        good: type,
                        from: current.planet.symbol,
                        to: data[y].planet.symbol,
                        fuelRequired: Automation.fuelRequired(current.planet, data[y].planet),
                        cpdv,
                        lastUpdated,
                     });
                  }
               }
            }
         }
      }

      return bestRoutes.sort((a, b) => ((a.cpdv < b.cpdv) ? 1 : (b.cpdv < a.cpdv) ? -1 : 0));
   }

   private static async getBestRoute(tradeRoutes: TradeRoute[]): Promise<TradeRoute | null> {
      if (!tradeRoutes || tradeRoutes.length === 0) {
         return null;
      }

      // Check if the most profitable route has a return route that's also profitable
      const returnRoute = tradeRoutes.find((x) => x.from === tradeRoutes[0].to);

      if (returnRoute) {
         return tradeRoutes[0];
      }

      // If the best route doesn't have a profitable return route, look for a route/return combo that's more profitable than just the best route
      for (let i = 1; i < tradeRoutes.length; i += 1) {
         const nextBestRoute = tradeRoutes[i];
         const nextReturnRoute = tradeRoutes.find((x) => x.from === nextBestRoute.to && x.to === nextBestRoute.from);

         if (nextReturnRoute && ((nextBestRoute.cpdv + nextReturnRoute.cpdv) > tradeRoutes[0].cpdv)) {
            return nextBestRoute;
         }
      }

      // Just do the best route if nothing else
      return tradeRoutes[0];
   }

   private static async getBestRouteFromLocation(from: string, routes: TradeRoute[]) {
      const route = [...routes].filter((x) => x.from === from);

      // if the current location doesn't have any profitable routes...
      if (route === undefined || route.length === 0) {
         return null;
      }

      // Get most profitable route from current location
      return route.reduce((max, obj) => (obj.cpdv > max.cpdv ? obj : max));
   }

   private static async getBestRouteFromLocationToLocation(from: string, to: string, routes: TradeRoute[]) {
      const route = [...routes].filter((x) => x.from === from && x.to === to);

      // if the current location doesn't have any profitable routes...
      if (route === undefined || route.length === 0) {
         return null;
      }

      // Get most profitable route from current location
      return route.reduce((max, obj) => (obj.cpdv > max.cpdv ? obj : max));
   }

   private async updateMarketData(location:string) {
      const planet = this.state.marketData?.find((x) => x.planet.symbol === location);

      // if there's no cached data, or if the cached data is older than 10 minutes, update
      if (!this.state.marketData || !planet || (Date.now() - planet.updatedAt > this.marketUpdateTime)) {
         const data = await Api.getMarket(this.state.account.token, location);
         if (this.markets.some((item) => (item.planet.symbol === location))) {
            this.markets = this.markets.map((item) => ((item.planet.symbol === location) ? { updatedAt: Date.now(), planet: data.location } : item));
         } else {
            this.markets.push({ updatedAt: Date.now(), planet: data.location });
         }
         this.updateMarketDataCallback(data);
      }
   }

   private async buyFuel(ship: OwnedShip, route: TradeRoute | ScoutRoute) {
      const from = this.state.systems.find((x) => x.symbol === route.from.split('-')[0])?.locations.find((x) => x.symbol === route.from) as Location;
      const to = this.state.systems.find((x) => x.symbol === route.to.split('-')[0])?.locations.find((x) => x.symbol === route.to) as Location;
      let fuelRequired = Automation.fuelRequired(from, to) + this.fuelPenalty(ship);

      // Because the calculation of fuel isn't perfect, sometimes excess fuel is purchased. So check the existing cargo for any fuel.
      const existingFuel = ship.cargo.find((x) => x.good === CargoType.Fuel)?.quantity;

      if (existingFuel && existingFuel > 0) {
         fuelRequired -= existingFuel;
      }

      if (fuelRequired <= 0) {
         return 0;
      }

      const order = await Api.purchaseOrder(this.state.account.token, this.state.account.username, ship.id, CargoType.Fuel, fuelRequired);
      this.stateUpdateCallback({ type: AutoAction.Buy, data: order });
      this.state.user.credits = order.credits;
      return fuelRequired;
   }

   private async createFlightPlan(ship: OwnedShip, route: TradeRoute | ScoutRoute, action: DispatchAction.Trade | DispatchAction.Scout) {
      const flightplan = await Api.createFlightPlan(this.state.account.token, this.state.account.username, ship.id, route.to);
      this.stateUpdateCallback({ type: AutoAction.AddFlightPlan, data: flightplan.flightPlan });
      this.dispatched.push({ ship: ship.id, action, route });

      const timer = new Timer();
      timer.start({ precision: 'seconds', target: { seconds: flightplan.flightPlan.timeRemainingInSeconds } });
      timer.addEventListener('targetAchieved', () => {
         this.stateUpdateCallback({ type: AutoAction.RemoveFlightPlan, data: flightplan.flightPlan });
      });
   }

   private getClosestBodies(location: string) {
      const system = this.state.systems.find((x) => x.symbol === location.split('-')[0]);

      if (!system) { return null; }

      const planet = system.locations.find((x) => x.symbol === location);

      if (!planet) { return null; }

      const distances: { body: Location; distance: number; }[] = [];

      for (const body of system.locations) {
         if (body.type === LocationType.Wormhole || body.symbol === location) { continue; }
         const distance = Automation.distanceBetween(planet, body);
         distances.push({ body, distance });
      }

      return distances.sort((a, b) => ((a.distance > b.distance) ? 1 : (b.distance > a.distance) ? -1 : 0));
   }

   private async automate() {
      while (this.enabled) {
         try {
            // sort ships by speed so the fastest get dispatched first and filter out ships already dispatched, in transit, and at wormholes
            const idleShips = [...this.state.user.ships.filter((x) => {
               const currentLocation = this.state.systems.find((y) => y.symbol === x.location?.split('-')[0])?.locations.find((z) => z.symbol === x.location);
               if (!currentLocation) { return false; }
               if (currentLocation?.type === LocationType.Wormhole) { return false; }
               if (this.dispatched.some((y) => y.ship === x.id)) { return false; }
               return true;
            })].sort((a, b) => ((a.speed < b.speed) ? 1 : (b.speed < a.speed) ? -1 : 0));

            const routes = await this.BestTradeRoutes();
            const route = await Automation.getBestRoute(routes);

            // If there are no profitable routes, that probably means there's only market data for a single location. So we need to scout.
            if (!route) {
               for (const ship of idleShips) {
                  if (!ship.location) { continue; }
                  // Get the closest locations
                  const closestBodies = this.getClosestBodies(ship.location);
                  if (!closestBodies || closestBodies.length === 0) { throw new Error('There are no profitable routes and unable to find any additional locations to scout.'); }

                  // Filter out routes that are already being scouted
                  const remaining = closestBodies.filter((x) => x.body.symbol !== this.dispatched.find((y) => y.route.to === x.body.symbol)?.route.to);

                  // If there are any remaining routes to a close location, send the ship there
                  if (remaining.length > 0) {
                     const scoutRoute = { from: ship.location as string, to: remaining[0].body.symbol };
                     await this.buyFuel(ship, scoutRoute);
                     await this.createFlightPlan(ship, scoutRoute, DispatchAction.Scout);
                  }
                  continue;
               }
            } else {
               for (const ship of idleShips) {
                  if (!ship.location) { continue; }

                  const location = this.state.systems.find((x) => x.symbol === ship.location?.split('-')[0])?.locations.find((x) => x.symbol === ship.location);
                  if (!location) { continue; }

                  // If there's any locations missing market data entirely, we should scout them.
                  const systemLocations = this.state.systems.find((x) => x.symbol === ship.location?.split('-')[0])?.locations;
                  const missing = systemLocations?.filter(
                     (x) => x.symbol !== this.markets.find((y) => y.planet.symbol === x.symbol)?.planet.symbol
                     && x.symbol !== LocationType.Wormhole
                     && !this.dispatched.some((y) => y.route.to !== x.symbol),
                  );
                  if (missing && missing.length > 0) {
                     const scoutRoute = { from: ship.location as string, to: missing[0].symbol };
                     await this.buyFuel(ship, scoutRoute);
                     await this.createFlightPlan(ship, scoutRoute, DispatchAction.Scout);
                     continue;
                  }
                  /**
                   * If the best route is to a location that has old data, we only send 1 scout ship there.
                   * Other ships will get the best trade route from their current location, if one is available.
                   */
                  // const lastUpdated = this.markets.find((x) => x.planet.symbol === route.from)?.updatedAt;
                  if ((Date.now() - route.lastUpdated) > this.marketUpdateTime) {
                     if (!this.dispatched.some((x) => x.route.to === route.from)) {
                        const scoutRoute = { from: ship.location as string, to: route.from };
                        await this.buyFuel(ship, scoutRoute);
                        await this.createFlightPlan(ship, scoutRoute, DispatchAction.Scout);
                     } else {
                        // Get the best possible trade route, if there is one, from the routes at the ship's location and that are not old
                        const possibleTrade = await Automation.getBestRouteFromLocation(ship.location as string, routes.filter((x) => (Date.now() - x.lastUpdated) < this.marketUpdateTime && x.from === ship.location));

                        if (!possibleTrade) { continue; }

                        const fuel = await this.buyFuel(ship, possibleTrade);

                        const maxQuantity = this.getMaxQuantity(this.markets.find((x) => x.planet.symbol === ship.location)?.planet.marketplace.find((x) => x.symbol === possibleTrade.good) as Marketplace, ship) - fuel;
                        if (maxQuantity !== 0) {
                           const goodOrder = await Api.purchaseOrder(this.state.account.token, this.state.account.username, ship.id, possibleTrade.good, maxQuantity);
                           this.stateUpdateCallback({ type: AutoAction.Buy, data: goodOrder });
                           this.state.user.credits = goodOrder.credits;
                           await this.createFlightPlan(ship, possibleTrade, DispatchAction.Trade);
                        }
                     }
                     continue;
                  }

                  // At this point the ship should only be going to a location with up-to-date data...

                  // If the ship's current location isn't at the starting point for the best route, we need to send it there first.
                  if (ship.location !== route.from) {
                     // If there's a profitable trade, even though it might not be the best, from the current location to the location with the best trade
                     const possibleTrade = await Automation.getBestRouteFromLocationToLocation(ship.location, route.from, routes);
                     if (possibleTrade) {
                        const fuel = await this.buyFuel(ship, possibleTrade);
                        const maxQuantity = this.getMaxQuantity(this.markets.find((x) => x.planet.symbol === ship.location)?.planet.marketplace.find((x) => x.symbol === possibleTrade.good) as Marketplace, ship) - fuel;
                        if (maxQuantity > 0) {
                           const goodOrder = await Api.purchaseOrder(this.state.account.token, this.state.account.username, ship.id, possibleTrade.good, maxQuantity);
                           this.stateUpdateCallback({ type: AutoAction.Buy, data: goodOrder });
                           this.state.user.credits = goodOrder.credits;
                           await this.createFlightPlan(ship, possibleTrade, DispatchAction.Trade);
                        }
                     } else {
                        await this.buyFuel(ship, { from: ship.location, to: route.from });
                        await this.createFlightPlan(ship, { from: ship.location, to: route.from }, DispatchAction.Scout);
                     }
                     continue;
                  }

                  // Lastly, the ship is at the location with the most profitable trade
                  const fuel = await this.buyFuel(ship, route);
                  const maxQuantity = this.getMaxQuantity(this.markets.find((x) => x.planet.symbol === route.from)?.planet.marketplace.find((x) => x.symbol === route.good) as Marketplace, ship) - fuel;
                  if (maxQuantity > 0) {
                     const order = await Api.purchaseOrder(this.state.account.token, this.state.account.username, ship.id, route?.good, maxQuantity);
                     this.stateUpdateCallback({ type: AutoAction.Buy, data: order });
                     this.state.user.credits = order.credits;
                     await this.createFlightPlan(ship, route, DispatchAction.Trade);
                  }
               }
            }

            for (const ship of this.dispatched) {
               const stateShip = this.state.user.ships.find((x) => x.id === ship.ship);
               if (stateShip?.location === ship.route.to && ship.action === DispatchAction.Trade) {
                  const order = await Api.sellOrder(this.state.account.token, this.state.account.username, ship.ship, (ship.route as TradeRoute).good, stateShip.cargo.find((x) => x.good === (ship.route as TradeRoute).good)?.quantity as number);
                  this.stateUpdateCallback({ type: AutoAction.Buy, data: order });
                  this.state.user.credits = order.credits;
                  this.dispatched.splice(this.dispatched.findIndex((x) => x.ship === ship.ship), 1);
               } else if (stateShip?.location === ship.route.to && ship.action === DispatchAction.Scout) {
                  this.dispatched.splice(this.dispatched.findIndex((x) => x.ship === ship.ship), 1);
               }
            }

            await this.wait(500);
         } catch (error: unknown) {
            this.errorCallback((error as Error).message);
         }
      }
   }

   private getMaxQuantity(good:Marketplace, ship:OwnedShip) {
      const maxCargo = Math.floor(ship.spaceAvailable / good.volumePerUnit);

      if (maxCargo * good.pricePerUnit < this.state.user.credits && maxCargo <= good.quantityAvailable && maxCargo <= 300) {
         return maxCargo;
      } if (maxCargo > good.quantityAvailable && good.quantityAvailable <= 300) {
         return good.quantityAvailable;
      } if (Math.floor(this.state.user.credits / good.pricePerUnit) > 300) {
         return 300;
      }

      return Math.floor(this.state.user.credits / good.pricePerUnit);
   }
}

Comlink.expose(Automation);
