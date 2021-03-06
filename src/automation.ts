/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable lines-between-class-members */
// eslint-disable-next-line max-classes-per-file
import * as Comlink from 'comlink';
import {
   CargoType, Marketplace, OwnedShip, Planet, Location, LocationType, Purchase, FlightPlanRes, Market, System, BuyShipResponse, FlightPlan,
} from './Api/types';
import { RootState, StoredMarket } from './store';
import Timer from './Timer';

export interface AutomationType {
   new(automationGetStore: () => Promise<RootState>, automationWorkerMakeApiCall: (action: AutomationWorkerApiAction, data: { shipId?: string, good?: CargoType, quantity?: number, to?: string, location?: string, flightPlan?: FlightPlan }) => Promise<OwnedShip | Purchase | FlightPlanRes | Market | BuyShipResponse | null>, errorCallback: (error: string) => void): Automation
}

enum AutomationWorkerApiAction {
   Buy,
   Sell,
   CreateFlightPlan,
   MarketData,
   BuyShip,
   RemoveFlightPlan,
   GetFlightPlan,
   UpdateShip,
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
   automationWorkerMakeApiCall: (action: AutomationWorkerApiAction, data: { shipId?: string, good?: CargoType, quantity?: number, to?: string, location?: string, flightPlan?: FlightPlan }) => Promise<OwnedShip | Purchase | FlightPlanRes | Market | BuyShipResponse | null>;
   errorCallback: (error: string) => void;
   private markets: StoredMarket[] = [];
   private credits = 0;
   private ships: OwnedShip[] = [];
   private spyShips: OwnedShip[] = [];
   private systems: System[] = [];
   private enabled = false;
   private dispatched: Dispatched[] = [];
   private marketUpdateTime = 600000;

   constructor(automationGetStore: () => Promise<RootState>, automationWorkerMakeApiCall: (action: AutomationWorkerApiAction, data: { shipId?: string, good?: CargoType, quantity?: number, to?: string, location?: string, flightPlan?: FlightPlan }) => Promise<OwnedShip | Purchase | FlightPlanRes | Market | null>, errorCallback: (error: string) => void) {
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
      this.spyShips = state.spyShips;
      this.dispatched = [];
      this.enabled = true;
      this.initialize();
   }

   updateState(state: RootState) {
      const old = this.ships;
      this.ships = state.user.ships;
      this.spyShips = state.spyShips;

      if (old.length !== state.user.ships.length) {
         const newShips = state.user.ships.filter((x) => !old.some((y) => y.id === x.id));
         for (const ship of newShips) {
            this.dispatch(ship.id);
         }
      }
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
         case 'ZA-MK-III':
         case 'EM-MK-II':
         case 'HM-MK-II':
         case 'HM-MK-I':
            return 1;
         case 'GR-MK-I':
         case 'EM-MK-I':
         case 'JW-MK-I':
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

   private async BestTradeRoutes(ship: OwnedShip) {
      const bestRoutes: SystemRoutes[] = [];

      const locations = Array.from(new Set(this.ships.map((item) => item.location)));

      const uniqueSystems:string[] = Array.from(new Set(locations.map((location: any) => Automation.getSystemSymbolFromLocation(location as string))));

      for (const system of uniqueSystems) {
         const bestSystemRoutes: TradeRoute[] = [];

         for (const type of Object.values(CargoType)) {
            if (type === CargoType.Research || type === CargoType.Fuel) { continue; } // exclude research for now

            // all locations that have up-to-date data and have the good in question
            const data = this.markets.filter((x) => Automation.getSystemSymbolFromLocation(x.planet.symbol) === system && x.planet.marketplace.find((y) => y.symbol === type));

            if (data.length <= 1) { continue; }
            for (let i = 0; i < data.length; i += 1) {
               const current = data[i];

               for (let y = 0; y < data.length; y += 1) {
                  if (data[y].planet !== current.planet) {
                     const creditDiff = (data[y].planet.marketplace.find((x) => x.symbol === type)?.sellPricePerUnit as number) - (current.planet.marketplace.find((x) => x.symbol === type)?.purchasePricePerUnit as number);
                     const distance = Automation.distanceBetween(current.planet, data[y].planet);
                     const flightTime = Math.round(distance * (2 / ship.speed)) + 60;
                     const fuelRequired = Automation.fuelRequired(current.planet, data[y].planet);
                     const cpdv = (creditDiff * (ship.maxCargo - fuelRequired)) / flightTime / (current.planet.marketplace.find((x) => x.symbol === type)?.volumePerUnit as number);
                     const lastUpdated = current.updatedAt > data[y].updatedAt ? current.updatedAt : data[y].updatedAt;

                     // exclude any negatives because we don't want to trade on routes that lose money
                     if (cpdv <= 0) { continue; }

                     const existing = bestSystemRoutes.find((x) => x.good === type);
                     if (existing && existing.cpdv < cpdv) {
                        bestSystemRoutes[bestSystemRoutes.findIndex((x) => x.good === type)] = {
                           good: type,
                           from: current.planet.symbol,
                           to: data[y].planet.symbol,
                           fuelRequired,
                           cpdv,
                           lastUpdated,
                        };
                     } else if (!existing) {
                        bestSystemRoutes.push({
                           good: type,
                           from: current.planet.symbol,
                           to: data[y].planet.symbol,
                           fuelRequired,
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

   private async getBestRoute(ship: OwnedShip, systemSymbol: string): Promise<TradeRoute | null> {
      if (!ship.location) { return null; }

      const tradeRoutes = await this.BestTradeRoutes(ship);

      if (!tradeRoutes || tradeRoutes.length === 0) {
         return null;
      }

      const systemRoutes = tradeRoutes.find((x) => x.system === systemSymbol);

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
         const nextReturnRoute = this.getBestRouteFromLocationToLocation(nextBestRoute.to, nextBestRoute.from, ship);

         if (nextReturnRoute && ((nextBestRoute.cpdv + nextReturnRoute.cpdv) > routes[0].cpdv)) {
            return nextBestRoute;
         }
      }

      // Just do the best route if nothing else
      return routes[0];
   }

   private getBestRouteFromLocationToLocation(from: string, to: string, ship: OwnedShip) {
      const fromMarket = [...this.markets].find((x) => x.planet.symbol === from);
      const toMarket = [...this.markets].find((x) => x.planet.symbol === to);

      if (!fromMarket || !toMarket) { return null; }

      const sharedGoods = fromMarket.planet.marketplace.filter((x) => toMarket.planet.marketplace.some((y) => y.symbol === x.symbol));

      if (sharedGoods.length <= 0) { return null; }

      const fromPlanet = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(from))?.locations.find((x) => x.symbol === from) as Location;
      const toPlanet = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(to))?.locations.find((x) => x.symbol === to) as Location;
      const bestGood:TradeRoute[] = [];

      for (const item of sharedGoods) {
         if (item.symbol !== CargoType.Fuel && item.symbol !== CargoType.Research) {
            const creditDiff = (toMarket.planet.marketplace.find((x) => x.symbol === item.symbol)?.sellPricePerUnit as number) - (fromMarket.planet.marketplace.find((x) => x.symbol === item.symbol)?.purchasePricePerUnit as number);
            const distance = Automation.distanceBetween(fromPlanet, toPlanet);
            const flightTime = Math.round(distance * (2 / ship.speed)) + 60;
            const fuelRequired = Automation.fuelRequired(fromPlanet, toPlanet);
            const cpdv = (creditDiff * (ship.maxCargo - fuelRequired)) / flightTime / (fromMarket.planet.marketplace.find((x) => x.symbol === item.symbol)?.volumePerUnit as number);
            const lastUpdated = fromMarket.updatedAt > toMarket.updatedAt ? fromMarket.updatedAt : toMarket.updatedAt;
            if (cpdv > 0) {
               bestGood.push({
                  good: item.symbol,
                  from,
                  to,
                  fuelRequired,
                  cpdv,
                  lastUpdated,
               });
            }
         }
      }

      if (bestGood.length === 0) { return null; }

      // Get most profitable route from current location
      return bestGood.reduce((max, obj) => (obj.cpdv > max.cpdv ? obj : max));
   }

   private async updateMarketData(location:string, force = false) {
      const planet = this.markets?.find((x) => x.planet.symbol === location);
      // const ship = this.ships.some((x) => x.location === location);

      // if there's no cached data, or if the cached data is older than 10 minutes, update
      if (force || !this.markets || !planet || (Date.now() - planet.updatedAt > this.marketUpdateTime)) {
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

      // if the target system has no market data (meaning it might not have fuel), doesn't have fuel, or doesn't have enough fuel, we need to buy extra for a return trip
      const marketFuel = this.markets.find((x) => x.planet.symbol === to.symbol)?.planet.marketplace.find((x) => x.symbol === CargoType.Fuel)?.quantityAvailable;
      if (!marketFuel || (marketFuel && marketFuel < 100)) {
         // Get the furthest location, and buy enough fuel to get there...
         const system = this.systems.find((x) => x.symbol === Automation.getSystemSymbolFromLocation(ship.location as string)) as System;
         const planet = system.locations.find((x) => x.symbol === to.symbol) as Location;
         const distances: { body: Location; distance: number; }[] = [];

         for (const body of system.locations) {
            if (body.type === LocationType.Wormhole || body.symbol === to.symbol) { continue; }
            const distance = Automation.distanceBetween(planet, body);
            distances.push({ body, distance });
         }

         const furthest = distances.sort((a, b) => ((a.distance < b.distance) ? 1 : (b.distance < a.distance) ? -1 : 0))[0];
         fuelRequired += Automation.fuelRequired(to, furthest.body) + this.fuelPenalty(ship);
      }

      // Because the calculation of fuel isn't perfect, sometimes excess fuel is purchased. So check the existing cargo for any fuel.
      const existingFuel = ship.cargo.find((x) => x.good === CargoType.Fuel)?.quantity;

      if (existingFuel && existingFuel > 0) {
         fuelRequired -= existingFuel;
      }

      if (fuelRequired <= 0) {
         return 0;
      }

      // If the current (from) system doesn't have any fuel, we shouldn't try to buy any
      const fromMarket = this.markets.find((x) => x.planet.symbol === from.symbol)?.planet.marketplace.find((x) => x.symbol === CargoType.Fuel)?.quantityAvailable;
      if (!fromMarket || (fromMarket <= fuelRequired)) {
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
      const timer = new Timer(flightPlan.flightPlan.arrivesAt);
      timer.start();
      const targetCallback = async () => {
         timer.removeEventListener('complete', targetCallback);
         await this.doRouteCompleted(ship.id, flightPlan.flightPlan);
      };
      timer.addEventListener('complete', targetCallback);
   }

   private async buyMarketGood(shipId: string, good: CargoType, quantity: number) {
      if (!quantity || quantity <= 0) { return; }
      let tempQuantity = quantity;
      while (tempQuantity > 0) {
         const order = await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.Buy, { shipId, good, quantity: tempQuantity > 500 ? 500 : tempQuantity }) as Purchase;
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
         tempQuantity -= 500;
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
         const decayConst = this.ships.length / 50;
         const value = Math.E ** (decayConst * time * -1);
         // also filter out any locations that have a ship there (but maybe haven't updated) or routes that have a ship heading there already
         if (value < 0.37
            && !this.ships.some((y) => y.location === x.planet.symbol)
            && Automation.getSystemSymbolFromLocation(x.planet.symbol) === system
            && x.planet.symbol !== this.dispatched.find((y) => y.route.to === x.planet.symbol)?.route.to
            && x.planet.type !== LocationType.Wormhole) { return true; }
         return false;
      }).map((x) => x.planet.symbol);

      result.push(...oldMarkets);

      return result;
   }

   private async sellMarketGood(shipId: string, good: CargoType, quantity: number) {
      let tempQuantity = quantity;
      while (tempQuantity > 0) {
         const order = await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.Sell, { shipId, good, quantity: tempQuantity > 500 ? 500 : tempQuantity }) as Purchase;
         const shipIndex = this.ships.findIndex((x) => x.id === order.ship.id);
         this.ships[shipIndex] = order.ship;
         this.credits = order.credits;

         // Update the local market with the particular good's buy/sell info
         const market = this.markets.find((x) => x.planet.symbol === order.ship.location);
         if (market) {
            const marketplace = market.planet.marketplace.find((x) => x.symbol === order.order.good);
            if (marketplace) {
               marketplace.sellPricePerUnit = order.order.pricePerUnit;
            }
         }
         tempQuantity -= 500;
      }
   }

   private async doRouteCompleted(shipId: string, flightPlan: FlightPlan, retry = 0) {
      await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.RemoveFlightPlan, { flightPlan });
      const ship = this.ships.find((x) => x.id === shipId);
      if (!ship || this.spyShips.some((x) => x.id === ship.id)) { return; }
      if (!this.enabled) { return; }

      try {
         if (ship.cargo.filter((x) => x.good !== CargoType.Fuel).length > 0) {
            for (const cargo of ship.cargo) {
               if (cargo.good !== CargoType.Fuel) {
                  await this.sellMarketGood(shipId, cargo.good, cargo.quantity);
               }
            }
         } else {
            ship.location = flightPlan.destination;
         }

         await this.dispatch(ship.id);
      } catch (error: unknown) {
         if ((error as Error).message === 'Ships can only place a sell order while docked.') {
            console.log('Ship has not yet arrived at destination. Waiting');
            this.wait(1000 + (1000 * retry));
            await this.doRouteCompleted(shipId, flightPlan, retry + 1);
         }
      }
   }

   private async dispatch(shipId: string, retry = 0) {
      try {
         const ship = this.ships.find((x) => x.id === shipId);
         if (!ship || !this.enabled) { return; }
         if (!ship.location) { console.log('Ship has no location'); return; }

         await this.updateMarketData(ship.location);

         const systemSymbol = Automation.getSystemSymbolFromLocation(ship.location as string);

         const shouldScout = this.shouldScout(systemSymbol);
         if (shouldScout && shouldScout.length > 0) {
            if (ship.location === shouldScout[0]) {
               await this.updateMarketData(ship.location, true);
            }
            // If we need to scout a location and there are no ships already at that location, fly there
            if (!this.ships.some((x) => x.location === shouldScout[0])) {
               const scoutRoute = { from: ship.location as string, to: shouldScout[0] };
               await this.buyFuel(ship, scoutRoute);
               await this.createFlightPlan(ship, scoutRoute, DispatchAction.Scout);
               return;
            }
         }

         const route = await this.getBestRoute(ship, systemSymbol);

         // In cases where there is only market data for a single location, there will be no best route
         if (route) {
            const location = this.systems.find((x) => x.symbol === systemSymbol)?.locations.find((x) => x.symbol === ship.location);
            if (!location) { return; }

            /**
             * If the best route is to a location that has old data, we only send 1 scout ship there.
             * Other ships will get the best trade route from their current location, if one is available.
             */
            if ((Date.now() - route.lastUpdated) > this.marketUpdateTime) {
               const scoutRoute = { from: ship.location as string, to: route.from };
               await this.buyFuel(ship, scoutRoute);
               await this.createFlightPlan(ship, scoutRoute, DispatchAction.Scout);
               return;
            }

            // At this point the ship should only be going to a location with up-to-date data...

            // If the ship's current location isn't at the starting point for the best route, we need to send it there first.
            if (ship.location !== route.from) {
               const fuel = await this.buyFuel(ship, { from: ship.location, to: route.from });
               // If there's a profitable trade, even though it might not be the best, from the current location to the location with the best trade
               const possibleTrade = this.getBestRouteFromLocationToLocation(ship.location, route.from, ship);
               if (possibleTrade) {
                  const maxQuantity = this.getMaxQuantity(this.markets.find((x) => x.planet.symbol === ship.location)?.planet.marketplace.find((x) => x.symbol === possibleTrade.good) as Marketplace, ship) - fuel;
                  if (maxQuantity > 0) {
                     await this.buyMarketGood(ship.id, possibleTrade.good, maxQuantity);
                     await this.createFlightPlan(ship, possibleTrade, DispatchAction.Trade);
                  }
               } else {
                  await this.createFlightPlan(ship, { from: ship.location, to: route.from }, DispatchAction.Scout);
               }
               return;
            }

            // Lastly, the ship is at the location with the most profitable trade
            const fuel = await this.buyFuel(ship, route);
            const maxQuantity = this.getMaxQuantity(this.markets.find((x) => x.planet.symbol === route.from)?.planet.marketplace.find((x) => x.symbol === route.good) as Marketplace, ship) - fuel;
            if (maxQuantity > 0) {
               await this.buyMarketGood(ship.id, route?.good, maxQuantity);
               await this.createFlightPlan(ship, route, DispatchAction.Trade);
               return;
            }

            await this.createFlightPlan(ship, route, DispatchAction.Trade);
            return;
         }

         console.log('No best route found');
      } catch (error: unknown) {
         // Sometimes ship state isn't updated properly at a step, so next time it tries to do something it errors (such as buying too much).
         // If that happens, update the ship and try one more time.
         try {
            if (retry === 0) {
               const ship = await this.automationWorkerMakeApiCall(AutomationWorkerApiAction.UpdateShip, { shipId }) as OwnedShip;
               this.ships[this.ships.findIndex((x) => x.id === shipId)] = ship;
               this.dispatch(shipId, 1);
            } else {
               this.enabled = false;
               this.errorCallback(`Error dispatching ship: ${JSON.stringify(shipId)}, Error: ${(error as Error).message}`);
            }
         } catch (error2: unknown) {
            this.enabled = false;
            this.errorCallback(`Error dispatching ship: ${JSON.stringify(shipId)}, Error: ${(error2 as Error).message}`);
         }
      }
   }

   private async createSpyTimer() {
      for (const ship of this.spyShips) {
         if (ship.location) {
            await this.updateMarketData(ship.location, true);
         }
      }

      const timer = new Timer(new Date(Date.now() + (2 * 60 * 1000)));
      timer.start();
      const targetCallback = () => {
         timer.removeEventListener('complete', targetCallback);
         this.createSpyTimer();
      };
      timer.addEventListener('complete', targetCallback);
   }

   private async initialize() {
      // Dispatch spy ships
      for (const system of this.systems) {
         try {
            // Get all locations without a spy ship
            const emptyLocations = system.locations.filter((x) => x.type !== LocationType.Wormhole && !this.spyShips.some((y) => y.location === x.symbol));
            const idleSpies = this.spyShips.filter((v, i, a) => v.location?.split('-')[0] === system.symbol && a.findIndex((t) => (t.location === v.location)) !== i);

            for (let i = 0; i < emptyLocations.length; i += 1) {
               if (idleSpies[i]) {
                  const scoutRoute = { from: idleSpies[i].location as string, to: emptyLocations[i].symbol };
                  await this.buyFuel(idleSpies[i], scoutRoute);
                  await this.createFlightPlan(idleSpies[i], scoutRoute, DispatchAction.Scout);
               }
            }
         } catch (error: unknown) {
            this.enabled = false;
            this.errorCallback(`Error dispatching spy ship. Error: ${(error as Error).message}`);
         }
      }

      this.createSpyTimer();

      for (const ship of this.ships.sort((a, b) => ((a.speed < b.speed) ? 1 : (b.speed < a.speed) ? -1 : 0))) {
         // Don't want to dispatch spy ships
         if (!this.spyShips.some((x) => x.id === ship.id)) {
            await this.dispatch(ship.id);
         }
      }
   }

   private getMaxQuantity(good:Marketplace, ship:OwnedShip) {
      const maxCargo = Math.floor(ship.spaceAvailable / good.volumePerUnit);

      if (maxCargo * good.pricePerUnit < this.credits && maxCargo <= good.quantityAvailable) {
         return maxCargo;
      } if (maxCargo > good.quantityAvailable) {
         return good.quantityAvailable;
      }

      return Math.floor(this.credits / good.pricePerUnit);
   }
}

Comlink.expose(Automation);
