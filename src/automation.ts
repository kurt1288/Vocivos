/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable lines-between-class-members */
import * as Comlink from 'comlink';
import {
   CargoType, Marketplace, OwnedShip, Planet, Location, LocationType, Purchase, FlightPlanRes, Market, System,
} from './Api/types';
import { RootState, StoredMarket } from './store';

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
   shipId: string;
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
   private marketUpdateTime = 600000;

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
      this.dispatched = [];
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

      const locations = Array.from(new Set(this.ships.map((item) => item.location)));
      // const locations = Array.from(new Set(this.markets.map((market) => market.planet.symbol)));
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

   private async getBestRoute(tradeRoutes: SystemRoutes[], location: string): Promise<TradeRoute | null> {
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
         // const nextReturnRoute = routes.find((x) => x.from === nextBestRoute.to && x.to === nextBestRoute.from);
         const nextReturnRoute = this.getBestRouteFromLocationToLocation(nextBestRoute.to, nextBestRoute.from);

         if (nextReturnRoute && ((nextBestRoute.cpdv + nextReturnRoute.cpdv) > routes[0].cpdv)) {
            return nextBestRoute;
         }
      }

      // Just do the best route if nothing else
      return routes[0];
   }

   private static getBestRouteFromLocation(from: string, routes: TradeRoute[]) {
      const route = [...routes].filter((x) => x.from === from);

      // if the current location doesn't have any profitable routes...
      if (route === undefined || route.length === 0) {
         return null;
      }

      // Get most profitable route from current location
      return route.reduce((max, obj) => (obj.cpdv > max.cpdv ? obj : max));
   }

   private getBestRouteFromLocationToLocation(from: string, to: string) {
      const fromMarket = [...this.markets].find((x) => x.planet.symbol === from);
      const toMarket = [...this.markets].find((x) => x.planet.symbol === to);

      if (!fromMarket || !toMarket) { return null; }

      const sharedGoods = fromMarket.planet.marketplace.filter((x) => toMarket.planet.marketplace.some((y) => y.symbol === x.symbol));

      if (sharedGoods.length <= 0) { return null; }

      const fromPlanet = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(from))?.locations.find((x) => x.symbol === from) as Location;
      const toPlanet = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(to))?.locations.find((x) => x.symbol === to) as Location;
      const bestGood:TradeRoute[] = [];

      for (const item of sharedGoods) {
         const creditDiff = (toMarket.planet.marketplace.find((x) => x.symbol === item.symbol)?.sellPricePerUnit as number) - (fromMarket.planet.marketplace.find((x) => x.symbol === item.symbol)?.purchasePricePerUnit as number);
         const distance = Automation.distanceBetween(fromPlanet, toPlanet);
         const cpdv = creditDiff / distance / (fromMarket.planet.marketplace.find((x) => x.symbol === item.symbol)?.volumePerUnit as number);
         const lastUpdated = fromMarket.updatedAt > toMarket.updatedAt ? fromMarket.updatedAt : toMarket.updatedAt;
         if (cpdv > 0) {
            bestGood.push({
               good: item.symbol as CargoType,
               from,
               to,
               fuelRequired: Automation.fuelRequired(fromPlanet, toPlanet),
               cpdv,
               lastUpdated,
            });
         }
      }

      if (bestGood.length === 0) { return null; }

      // Get most profitable route from current location
      return bestGood.reduce((max, obj) => (obj.cpdv > max.cpdv ? obj : max));
   }

   private async updateMarketData(location:string, force = false) {
      const planet = this.markets?.find((x) => x.planet.symbol === location);
      const ship = this.ships.some((x) => x.location === location);

      // if there's no cached data, or if the cached data is older than 10 minutes, update
      if (ship && (force || !this.markets || !planet || (Date.now() - planet.updatedAt > this.marketUpdateTime))) {
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

      await this.buyMarketGood(ship.id, CargoType.Fuel, fuelRequired);
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
      this.dispatched.push({ shipId: ship.id, action, route });
   }

   private async buyMarketGood(shipId: string, good: CargoType, quantity: number) {
      if (!quantity || quantity <= 0) { return; }
      const order = await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.Buy, { shipId, good, quantity }) as Purchase;
      const shipIndex = this.ships.findIndex((x) => x.id === order.ship.id);
      this.ships[shipIndex] = order.ship;
      this.credits = order.credits;
      const market = this.markets.find((x) => x.planet.symbol === order.ship.location);
      if (market) {
         const marketplace = market.planet.marketplace.find((x) => x.symbol === order.order.good);
         if (marketplace) {
            marketplace.purchasePricePerUnit = order.order.pricePerUnit;
         }
      }
   }

   private shouldScout(system: string) {
      const systemLocations = this.systems.find((x) => x.symbol === system)?.locations as Location[];

      const result = systemLocations.filter((x) => (
         !this.markets.some((y) => y.planet.symbol === x.symbol)
         && x.type !== LocationType.Wormhole
         && !this.dispatched.some((y) => y.route.to === x.symbol)
      )).map((x) => x.symbol);

      const oldMarkets = [...this.markets].filter((x) => {
         // logarithmic decay
         const time = (Date.now() - x.updatedAt) / 600000; // time in 10 minute intervals
         const decayConst = this.ships.length / 35;
         const value = Math.E ** (decayConst * time * -1);
         // also filter out any routes that have a ship heading there already
         if (value < 0.37
            && Automation.getSystemSymbolFromLocation(x.planet.symbol) === system
            && x.planet.symbol !== this.dispatched.find((y) => y.route.to === x.planet.symbol)?.route.to
            && x.planet.type !== LocationType.Wormhole) { return true; }
         return false;
      }).map((x) => x.planet.symbol);

      result.push(...oldMarkets);

      return result;
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
               if (this.dispatched.some((y) => y.shipId === x.id)) { return false; }
               return true;
            })].sort((a, b) => ((a.speed < b.speed) ? 1 : (b.speed < a.speed) ? -1 : 0));

            const routes = await this.BestTradeRoutes();

            for (const ship of idleShips) {
               if (!ship.location) { continue; }

               const shouldScout = this.shouldScout(Automation.getSystemSymbolFromLocation(ship.location as string));
               if (shouldScout && shouldScout.length > 0) {
                  if (ship.location === shouldScout[0]) {
                     await this.updateMarketData(ship.location, true);
                  }
                  // If we need to scout a location and there are no ships already at that location, fly there
                  if (!this.ships.some((x) => x.location === shouldScout[0])) {
                     const scoutRoute = { from: ship.location as string, to: shouldScout[0] };
                     await this.buyFuel(ship, scoutRoute);
                     await this.createFlightPlan(ship, scoutRoute, DispatchAction.Scout);
                     continue;
                  }
               }

               const route = await this.getBestRoute(routes, ship.location);

               // In cases where there is only market data for a single location, there will be no best route
               if (route) {
                  const location = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(ship.location as string))?.locations.find((x) => x.symbol === ship.location);
                  if (!location) { continue; }

                  /**
                   * If the best route is to a location that has old data, we only send 1 scout ship there.
                   * Other ships will get the best trade route from their current location, if one is available.
                   */
                  if ((Date.now() - route.lastUpdated) > this.marketUpdateTime) {
                     if (!this.dispatched.some((x) => x.route.to === route.from)) {
                        const scoutRoute = { from: ship.location as string, to: route.from };
                        await this.buyFuel(ship, scoutRoute);
                        await this.createFlightPlan(ship, scoutRoute, DispatchAction.Scout);
                     } else {
                        // Get the best possible trade route, if there is one, from the routes at the ship's location and that are not old
                        const systemRoutes = routes.find((x) => x.system === Automation.getSystemSymbolFromLocation(location.symbol))?.routes.filter((x) => (Date.now() - x.lastUpdated) < this.marketUpdateTime && x.from === ship.location) as TradeRoute[];
                        const possibleTrade = Automation.getBestRouteFromLocation(ship.location as string, systemRoutes);

                        if (possibleTrade) {
                           const fuel = await this.buyFuel(ship, possibleTrade);

                           const maxQuantity = this.getMaxQuantity(this.markets.find((x) => x.planet.symbol === ship.location)?.planet.marketplace.find((x) => x.symbol === possibleTrade.good) as Marketplace, ship) - fuel;
                           if (maxQuantity !== 0) {
                              await this.buyMarketGood(ship.id, possibleTrade.good, maxQuantity);
                              await this.createFlightPlan(ship, possibleTrade, DispatchAction.Trade);
                           }
                        }
                     }
                     continue;
                  }

                  // At this point the ship should only be going to a location with up-to-date data...

                  // If the ship's current location isn't at the starting point for the best route, we need to send it there first.
                  if (ship.location !== route.from) {
                     const fuel = await this.buyFuel(ship, { from: ship.location, to: route.from });
                     // If there's a profitable trade, even though it might not be the best, from the current location to the location with the best trade
                     const possibleTrade = this.getBestRouteFromLocationToLocation(ship.location, route.from);
                     if (possibleTrade) {
                        const maxQuantity = this.getMaxQuantity(this.markets.find((x) => x.planet.symbol === ship.location)?.planet.marketplace.find((x) => x.symbol === possibleTrade.good) as Marketplace, ship) - fuel;
                        if (maxQuantity > 0) {
                           await this.buyMarketGood(ship.id, possibleTrade.good, maxQuantity);
                           await this.createFlightPlan(ship, possibleTrade, DispatchAction.Trade);
                        }
                     } else {
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
               const stateShip = this.ships.find((x) => x.id === ship.shipId);
               if (stateShip && stateShip.location === ship.route.to && ship.action === DispatchAction.Trade) {
                  const quantity = stateShip.cargo.find((x) => x.good === (ship.route as TradeRoute).good)?.quantity;
                  if (!quantity || quantity === 0) {
                     // This shouldn't happen, but somehow ships seem to be getting marked as a trade action but not buying the good
                     console.log(`Bad stateShip: ${JSON.stringify(ship)}`);
                     this.dispatched.splice(this.dispatched.findIndex((x) => x.shipId === ship.shipId), 1);
                     continue;
                  }
                  const order = await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.Sell, { shipId: ship.shipId, good: (ship.route as TradeRoute).good, quantity }) as Purchase;
                  const shipIndex = this.ships.findIndex((x) => x.id === order.ship.id);
                  this.ships[shipIndex] = order.ship;
                  this.credits = order.credits;
                  const market = this.markets.find((x) => x.planet.symbol === order.ship.location);
                  if (market) {
                     const marketplace = market.planet.marketplace.find((x) => x.symbol === order.order.good);
                     if (marketplace) {
                        marketplace.sellPricePerUnit = order.order.pricePerUnit;
                     }
                  }
                  this.dispatched.splice(this.dispatched.findIndex((x) => x.shipId === ship.shipId), 1);
               } else if (stateShip?.location === ship.route.to && ship.action === DispatchAction.Scout) {
                  this.dispatched.splice(this.dispatched.findIndex((x) => x.shipId === ship.shipId), 1);
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
