import { CargoType } from '../../Api/types';

export enum AutoAction {
   Travel,
   AddFlightPlan,
   RemoveFlightPlan,
   Buy,
   Sell,
}

export interface TravelStep {
   action: AutoAction.Travel,
   destination: string,
}

export interface MarketStep {
   action: AutoAction.Buy | AutoAction.Sell
   good: CargoType,
   quantity: number,
}

export interface Step {
   type: TravelStep | MarketStep,
   id: string,
}

export interface Steps {
   enabled: boolean,
   shipId: string,
   steps: Step[],
   error: string | null,
}
