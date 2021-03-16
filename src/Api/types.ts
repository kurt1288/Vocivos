export enum LoanType {
   Startup = 'STARTUP',
}

export enum LocationType {
   Planet = 'PLANET',
   Moon = 'MOON',
   GasGiant = 'GAS_GIANT',
   Asteroid = 'ASTEROID',
}

export enum CargoType {
   Chemicals = 'CHEMICALS',
   Construction = 'CONSTRUCTION_MATERIALS',
   Consumer = 'CONSUMER_GOODS',
   Electronics = 'ELECTRONICS',
   Food = 'FOOD',
   Fuel = 'FUEL',
   Machinery = 'MACHINERY',
   Metals = 'METALS',
   Research = 'RESEARCH',
   ShipParts = 'SHIP_PARTS',
   Textiles = 'TEXTILES',
   Workers = 'WORKERS',
}

export interface Status {
   status: string;
}

export interface Account {
   token: string,
   user: {
      createdAt: string,
      credits: number,
      id: string,
      email: string,
      picture: string,
      updatedAt: string,
      username: string,
   }
}

export interface Loans {
   loans: Loan[],
}

export interface Loan {
   type: string,
   amount: number,
   collateralRequired: boolean,
   rate: number,
   termInDays: number,
}

export interface OwnedLoan {
   due: Date,
   id: string,
   repaymentAmount: number,
   status: number,
   type: LoanType,
}

export interface ShipsAvailable {
   ships: Ship[],
}

export interface ShipInfo {
   ship: OwnedShip,
}

export interface Ship {
   class: string,
   manufacturer: string,
   maxCargo: number,
   plating: number,
   purchaseLocations: PurchaseLocation[],
   speed: number,
   type: string,
   weapons: number,
}

export interface OwnedShip {
   cargo: Cargo[],
   class: string,
   id: string,
   location: string | undefined,
   manufacturer: string,
   maxCargo: number,
   plating: number,
   spaceAvailable: number,
   speed: number,
   type: string,
   weapons: number,
   x: number,
   y: number,
}

export interface Cargo {
   good: CargoType,
   quantity: number,
   totalVolume: number,
}

export interface PurchaseLocation {
   location: string,
   price: number,
}

export interface User {
   user: {
      credits: number,
      loans: OwnedLoan[],
      ships: OwnedShip[],
      username: string,
   }
}

export interface Location {
   symbol: string,
   type: LocationType,
   name: string,
   x: number,
   y: number,
}

export interface Locations {
   locations: Location[],
}

export interface System {
   symbol: string,
   name: string,
   locations: Location[],
}

export interface Systems {
   systems: System[],
}

export interface Market {
   location: Planet,
}

export interface Marketplace {
   symbol: string,
   volumePerUnit: number,
   pricePerUnit: number,
   quantityAvailable: number,
}

export interface Planet {
   marketplace: Marketplace[],
   name: string,
   symbol: string,
   type: string,
   x: number,
   y: number,
}

export interface Purchase {
   credits: number,
   order: Order,
   ship: OwnedShip,
}

export interface Order {
   good: string,
   pricePerUnit: number,
   quantity: number,
   total: number,
}

export interface FlightPlanRes {
   flightPlan: FlightPlan,
}

export interface FlightPlan {
   arrivesAt: Date,
   departure: string,
   destination: string,
   distance: number,
   fuelConsumed: number,
   fuelRemaining: number,
   id: string,
   ship: string,
   terminatedAt: Date | null,
   timeRemainingInSeconds: number,
}
