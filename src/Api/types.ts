export enum LoanType {
   Startup = 'STARTUP',
}

export enum LocationType {
   Planet = 'PLANET',
   Moon = 'MOON',
   GasGiant = 'GAS_GIANT',
   Asteroid = 'ASTEROID',
   Wormhole = 'WORMHOLE',
   Nebula = 'NEBULA',
}

export enum CargoType {
   BiometricFirearms = 'BIOMETRIC_FIREARMS',
   Chemicals = 'CHEMICALS',
   Construction = 'CONSTRUCTION_MATERIALS',
   Consumer = 'CONSUMER_GOODS',
   Electronics = 'ELECTRONICS',
   ExoticPlasma = 'EXOTIC PLASMA',
   Explosives = 'EXPLOSIVES',
   Food = 'FOOD',
   Fuel = 'FUEL',
   FusionReactors = 'FUSION_REACTORS',
   Machinery = 'MACHINERY',
   Metals = 'METALS',
   Nanobots = 'NANOTBOTS',
   Narcotics = 'NARCOTICS',
   PrecisionInstruments = 'PRECISION_INSTRUMENTS',
   ProteinSynthesizers = 'PROTEIN_SYNTHESIZERS',
   RareMetals = 'RARE_METALS',
   Research = 'RESEARCH',
   ShipParts = 'SHIP_PARTS',
   ShipPlating = 'SHIP_PLATING',
   Textiles = 'TEXTILES',
   UnstableCompounds = 'UNSTABLE_COMPOUNDS',
   Drones = 'DRONES',
}

export enum LoanStatus {
   Current = 'CURRENT',
   Paid = 'PAID',
   PaidLate = 'PAID_LATE',
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
   status: LoanStatus,
   type: LoanType,
}

export interface ShipsAvailable {
   ships: Ship[],
}

export interface OwnedShips {
   ships: OwnedShip[]
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
   flightPlanId?: string,
   id: string,
   location?: string,
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

export interface BuyShipResponse {
   credits: number,
   ship: OwnedShip,
}

export interface ScrapShipResponse {
   success: string,
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

export interface GetLoanResponse {
   credits: number,
   loan: OwnedLoan,
}

export interface Location {
   symbol: string,
   type: LocationType,
   name: string,
   x: number,
   y: number,
   ships: {
      shipId: string,
      username: string,
      shipType: string,
   }[],
   allowsConstruction: boolean,
   anomaly?: string,
   messages?: string[],
   structures?: Structure[]
}

export interface Locations {
   locations: Location[],
}

export interface Structure {
   id: string,
   type: LocationType,
   location: string,
   ownedBy?: {
      username: string
   }
}

export interface LocationResponse {
   location: Location,
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
   purchasePricePerUnit: number,
   sellPricePerUnit: number,
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

export interface StructureMaterials {
   good: CargoType,
   quantity: number,
   targetQuantity: number,
}

export interface DepositResponse {
   deposit: {
      good: CargoType,
      quantity: number,
   },
   structure: Structure,
}

export interface Jettison {
   good: CargoType,
   quantityRemaining: number,
   shipId: string,
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
   shipId: string,
   terminatedAt: Date | null,
   timeRemainingInSeconds: number,
}

export interface AvailableStructures {
   allowedLocationTypes: LocationType[],
   consumes: CargoType[],
   price: number,
   name: string,
   produces: CargoType[],
   symbol: string,
}

export interface AvailableStructuresResponse {
   structures: AvailableStructures[]
}
