/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable lines-between-class-members */
import * as Comlink from 'comlink';
import {
   CargoType, Marketplace, OwnedShip, Planet, Location, LocationType, Purchase, FlightPlanRes, Market, System,
} from './Api/types';
import store, { RootState, StoredMarket } from './store';

export interface AutomationType {
   new(automationGetStore: () => Promise<RootState>, automationWorkerMakeApiCall: (action: AutomationWorkerApiAction, data: { shipId?: string, good?: CargoType, quantity?: number, to?: string, location?: string }) => Promise<Purchase | FlightPlanRes | Market | null>, errorCallback: (error: string) => void): Automation
}

enum AutomationWorkerApiAction {
   Buy,
   Sell,
   CreateFlightPlan,
   MarketData,
}

enum DispatchAction {
   Trade,
   Scout,
}

interface SystemRoutes {
   system: string;
   routes: TradeRoute[];
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
   automationGetStore: () => Promise<RootState>;
   automationWorkerMakeApiCall: (action: AutomationWorkerApiAction, data: { shipId?: string, good?: CargoType, quantity?: number, to?: string, location?: string }) => Promise<Purchase | FlightPlanRes | Market | null>;
   errorCallback: (error: string) => void;
   // private state = store.getState();
   private markets: StoredMarket[] = [];
   private credits = 0;
   private ships: OwnedShip[] = [];
   private systems: System[] = [];
   private enabled = false;
   private dispatched: Dispatched[] = [];
   private marketUpdateTime = 60000;

   constructor(automationGetStore: () => Promise<RootState>, automationWorkerMakeApiCall: (action: AutomationWorkerApiAction, data: { shipId?: string, good?: CargoType, quantity?: number, to?: string, location?: string }) => Promise<Purchase | FlightPlanRes | Market | null>, errorCallback: (error: string) => void) {
      this.automationGetStore = automationGetStore;
      this.automationWorkerMakeApiCall = automationWorkerMakeApiCall;
      this.errorCallback = errorCallback;
   }

   stop() {
      this.enabled = false;
   }

   async start() {
      const state = await this.automationGetStore();
      this.markets = state.marketData;
      this.credits = state.user.credits;
      this.ships = state.user.ships;
      this.systems = state.systems;
      this.enabled = true;
      this.automate();
   }

   updateState(state: RootState) {
      this.ships = state.user.ships;
   }

   private wait = (time:number) => (
      new Promise((resolve) => setTimeout(resolve, time))
   );

   private static getSystemSymbolFromLocation(location: string) {
      if (!location) {
         console.log(location);
         return '';
      }
      return location.split('-')[0];
   }

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
      if (this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(ship.location as string))?.locations.find((x) => x.symbol === ship.location)?.type !== 'PLANET') {
         return 0;
      }

      switch (ship.type) {
         case 'ZA-MK-II':
         case 'EM-MK-II':
         case 'HM-MK-II':
            return 1;
         case 'GR-MK-I':
         case 'EM-MK-I':
         case 'HM-MK-III':
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
      const bestRoutes: SystemRoutes[] = [];

      // const locations = Array.from(new Set(this.state.user.ships.map((item) => item.location)));
      const locations = Array.from(new Set(this.markets.map((market) => market.planet.symbol)));
      for (const location of locations) {
         if (!location) { continue; }
         await this.updateMarketData(location);
      }

      const uniqueSystems:string[] = Array.from(new Set(locations.map((location: any) => Automation.getSystemSymbolFromLocation(location as string))));

      for (const system of uniqueSystems) {
         const bestSystemRoutes: TradeRoute[] = [];

         for (const type of Object.values(CargoType)) {
            if (type === CargoType.Research || type === CargoType.Fuel) { continue; } // exclude research for now

            // all locations that have up-to-date data and have the good in question
            const data = [...this.markets].filter((x) => Automation.getSystemSymbolFromLocation(x.planet.symbol) === system && x.planet.marketplace.find((y) => y.symbol === type));
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

                     const existing = bestSystemRoutes.find((x) => x.good === type);
                     if (existing && existing.cpdv < cpdv) {
                        bestSystemRoutes[bestSystemRoutes.findIndex((x) => x.good === type)] = {
                           good: type,
                           from: current.planet.symbol,
                           to: data[y].planet.symbol,
                           fuelRequired: Automation.fuelRequired(current.planet, data[y].planet),
                           cpdv,
                           lastUpdated,
                        };
                     } else if (!existing) {
                        bestSystemRoutes.push({
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

         bestRoutes.push({ system, routes: bestSystemRoutes.sort((a, b) => ((a.cpdv < b.cpdv) ? 1 : (b.cpdv < a.cpdv) ? -1 : 0)) });
      }

      return bestRoutes;
   }

   private static async getBestRoute(tradeRoutes: SystemRoutes[], location: string): Promise<TradeRoute | null> {
      if (!tradeRoutes || tradeRoutes.length === 0 || !location) {
         return null;
      }

      const systemRoutes = tradeRoutes.find((x) => x.system === Automation.getSystemSymbolFromLocation(location));

      if (!systemRoutes) {
         return null;
      }

      const { routes } = systemRoutes;

      // Check if the most profitable route has a return route that's also profitable
      const returnRoute = routes.find((x) => x.from === routes[0].to);

      if (returnRoute) {
         return routes[0];
      }

      // If the best route doesn't have a profitable return route, look for a route/return combo that's more profitable than just the best route
      for (let i = 1; i < routes.length; i += 1) {
         const nextBestRoute = routes[i];
         const nextReturnRoute = routes.find((x) => x.from === nextBestRoute.to && x.to === nextBestRoute.from);

         if (nextReturnRoute && ((nextBestRoute.cpdv + nextReturnRoute.cpdv) > routes[0].cpdv)) {
            return nextBestRoute;
         }
      }

      // Just do the best route if nothing else
      return routes[0];
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
      const planet = this.markets?.find((x) => x.planet.symbol === location);
      const ship = this.ships.some((x) => x.location === location);

      // if there's no cached data, or if the cached data is older than 10 minutes, update
      if (ship && (!this.markets || !planet || (Date.now() - planet.updatedAt > this.marketUpdateTime))) {
         const data = await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.MarketData, { location }) as Market;
         if (this.markets.some((item) => (item.planet.symbol === location))) {
            this.markets = this.markets.map((item) => ((item.planet.symbol === location) ? { updatedAt: Date.now(), planet: data.location } : item));
         } else {
            this.markets.push({ updatedAt: Date.now(), planet: data.location });
         }
      }
   }

   private async buyFuel(ship: OwnedShip, route: TradeRoute | ScoutRoute) {
      const from = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(route.from))?.locations.find((x) => x.symbol === route.from) as Location;
      const to = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(route.to))?.locations.find((x) => x.symbol === route.to) as Location;
      let fuelRequired = Automation.fuelRequired(from, to) + this.fuelPenalty(ship);

      // Because the calculation of fuel isn't perfect, sometimes excess fuel is purchased. So check the existing cargo for any fuel.
      const existingFuel = ship.cargo.find((x) => x.good === CargoType.Fuel)?.quantity;

      if (existingFuel && existingFuel > 0) {
         fuelRequired -= existingFuel;
      }

      if (fuelRequired <= 0) {
         return 0;
      }

      this.buyMarketGood(ship.id, CargoType.Fuel, fuelRequired);
      return fuelRequired;
   }

   private async createFlightPlan(ship: OwnedShip, route: TradeRoute | ScoutRoute, action: DispatchAction.Trade | DispatchAction.Scout) {
      const flightPlan = await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.CreateFlightPlan, { shipId: ship.id, to: route.to }) as FlightPlanRes;
      const shipIndex = this.ships.findIndex((x) => x.id === flightPlan.flightPlan.shipId);
      if (shipIndex) {
         this.ships[shipIndex].location = undefined;
         this.ships[shipIndex].flightPlanId = flightPlan.flightPlan.id;
         this.ships[shipIndex].spaceAvailable += flightPlan.flightPlan.fuelConsumed;
         const fuel = ship.cargo.find((x) => x.good === CargoType.Fuel);
         if (fuel && flightPlan.flightPlan.fuelRemaining > 0) {
            fuel.quantity = flightPlan.flightPlan.fuelRemaining;
         } else if (fuel && flightPlan.flightPlan.fuelRemaining === 0) {
            ship.cargo.splice(ship.cargo.findIndex((x) => x.good === CargoType.Fuel), 1);
         }
      }
      this.dispatched.push({ ship: ship.id, action, route });
   }

   private async buyMarketGood(shipId: string, good: CargoType, quantity: number) {
      if (!quantity || quantity <= 0) { return; }
      const order = await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.Buy, { shipId, good, quantity }) as Purchase;
      const shipIndex = this.ships.findIndex((x) => x.id === order.ship.id);
      this.ships[shipIndex] = order.ship;
      this.credits = order.credits;
   }

   private getClosestBodies(location: string) {
      const system = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(location));

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
            const idleShips = [...this.ships.filter((x) => {
               if (!x.location) { return false; }
               const currentLocation = this.systems.find((y) => y.symbol === Automation.getSystemSymbolFromLocation(x.location as string))?.locations.find((z) => z.symbol === x.location);
               if (!currentLocation) { return false; }
               if (Automation.getSystemSymbolFromLocation(currentLocation.symbol) !== 'OE') { return false; }
               if (currentLocation?.type === LocationType.Wormhole) { return false; }
               if (this.dispatched.some((y) => y.ship === x.id)) { return false; }
               return true;
            })].sort((a, b) => ((a.speed < b.speed) ? 1 : (b.speed < a.speed) ? -1 : 0));

            const routes = await this.BestTradeRoutes();
            // const route = await Automation.getBestRoute(routes);

            for (const ship of idleShips) {
               if (!ship.location) { continue; }
               const route = await Automation.getBestRoute(routes, ship.location);

               // If there are no profitable routes, that probably means there's only market data for a single location. So we need to scout.
               if (!route) {
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
               } else {
                  const location = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(ship.location as string))?.locations.find((x) => x.symbol === ship.location);
                  if (!location) { continue; }

                  // If there's any locations missing market data entirely, we should scout them.
                  const systemLocations = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(ship.location as string))?.locations;
                  const missing = systemLocations?.filter(
                     (x) => !this.markets.some((y) => y.planet.symbol === x.symbol)
                     && x.type !== LocationType.Wormhole
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
                        const systemRoutes = routes.find((x) => x.system === Automation.getSystemSymbolFromLocation(location.symbol))?.routes.filter((x) => (Date.now() - x.lastUpdated) < this.marketUpdateTime && x.from === ship.location) as TradeRoute[];
                        const possibleTrade = await Automation.getBestRouteFromLocation(ship.location as string, systemRoutes);

                        if (!possibleTrade) { continue; }

                        const fuel = await this.buyFuel(ship, possibleTrade);

                        const maxQuantity = this.getMaxQuantity(this.markets.find((x) => x.planet.symbol === ship.location)?.planet.marketplace.find((x) => x.symbol === possibleTrade.good) as Marketplace, ship) - fuel;
                        if (maxQuantity !== 0) {
                           await this.buyMarketGood(ship.id, possibleTrade.good, maxQuantity);
                           await this.createFlightPlan(ship, possibleTrade, DispatchAction.Trade);
                        }
                     }
                     continue;
                  }

                  // At this point the ship should only be going to a location with up-to-date data...

                  // If the ship's current location isn't at the starting point for the best route, we need to send it there first.
                  if (ship.location !== route.from) {
                     // If there's a profitable trade, even though it might not be the best, from the current location to the location with the best trade
                     const systemRoutes = routes.find((x) => x.system === Automation.getSystemSymbolFromLocation(location.symbol))?.routes.filter((x) => (Date.now() - x.lastUpdated) < this.marketUpdateTime && x.from === ship.location) as TradeRoute[];
                     const possibleTrade = await Automation.getBestRouteFromLocationToLocation(ship.location, route.from, systemRoutes);
                     if (possibleTrade) {
                        const fuel = await this.buyFuel(ship, possibleTrade);
                        const maxQuantity = this.getMaxQuantity(this.markets.find((x) => x.planet.symbol === ship.location)?.planet.marketplace.find((x) => x.symbol === possibleTrade.good) as Marketplace, ship) - fuel;
                        if (maxQuantity > 0) {
                           await this.buyMarketGood(ship.id, possibleTrade.good, maxQuantity);
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
                     await this.buyMarketGood(ship.id, route?.good, maxQuantity);
                     await this.createFlightPlan(ship, route, DispatchAction.Trade);
                  }
               }
            }

            for (const ship of this.dispatched) {
               const stateShip = this.ships.find((x) => x.id === ship.ship);
               if (stateShip?.location === ship.route.to && ship.action === DispatchAction.Trade) {
                  const order = await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.Sell, { shipId: ship.ship, good: (ship.route as TradeRoute).good, quantity: stateShip.cargo.find((x) => x.good === (ship.route as TradeRoute).good)?.quantity as number }) as Purchase;
                  const shipIndex = this.ships.findIndex((x) => x.id === order.ship.id);
                  this.ships[shipIndex] = order.ship;
                  this.credits = order.credits;
                  this.dispatched.splice(this.dispatched.findIndex((x) => x.ship === ship.ship), 1);
               } else if (stateShip?.location === ship.route.to && ship.action === DispatchAction.Scout) {
                  this.dispatched.splice(this.dispatched.findIndex((x) => x.ship === ship.ship), 1);
               }
            }

            await this.wait(500);
         } catch (error: unknown) {
            this.enabled = false;
            this.errorCallback((error as Error).message);
         }
      }
   }

   private getMaxQuantity(good:Marketplace, ship:OwnedShip) {
      const maxCargo = Math.floor(ship.spaceAvailable / good.volumePerUnit);

      if (maxCargo * good.pricePerUnit < this.credits && maxCargo <= good.quantityAvailable && maxCargo <= 300) {
         return maxCargo;
      } if (maxCargo > good.quantityAvailable && good.quantityAvailable <= 300) {
         return good.quantityAvailable;
      } if (Math.floor(this.credits / good.pricePerUnit) > 300) {
         return 300;
      }

      return Math.floor(this.credits / good.pricePerUnit);
   }
}

Comlink.expose(Automation);
