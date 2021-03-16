/* eslint-disable no-constant-condition */
/* eslint-disable lines-between-class-members */
import * as Comlink from 'comlink';
import Timer from 'easytimer.js';
import Api from './Api';
import { WorkerDataUpdate, WorkerError } from './App';
import {
   AutoAction, MarketStep, Steps, TravelStep,
} from './components/Automation/Models';

export interface WorkerType {
   new(token:string, username:string, steps:Steps, errorCallback: (error: WorkerError) => void, stateUpdateCallback: (data: WorkerDataUpdate) => void): Automation,
}

export class Automation {
   private token;
   private username;
   private stepIndex = 0;
   private steps;
   private timer: Timer | null = null;
   private repeat = true;
   errorCallback: (error: WorkerError) => void;
   stateUpdateCallback: (data: WorkerDataUpdate) => void;
   enabled = false;

   constructor(token:string, username:string, steps:Steps, errorCallback: (error: WorkerError) => void, stateUpdateCallback: (data: WorkerDataUpdate) => void) {
      this.token = token;
      this.username = username;
      this.steps = steps;
      this.errorCallback = errorCallback;
      this.stateUpdateCallback = stateUpdateCallback;
   }

   run() {
      this.enabled = true;
      this.doStep();
   }

   stop() {
      this.enabled = false;
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
               const marketOrder = await Api.purchaseOrder(this.token, this.username, this.steps.shipId, (this.steps.steps[this.stepIndex].type as MarketStep).good, (this.steps.steps[this.stepIndex].type as MarketStep).quantity);
               this.stateUpdateCallback({ type: AutoAction.Buy, data: marketOrder });
            } else {
               const marketOrder = await Api.sellOrder(this.token, this.username, this.steps.shipId, (this.steps.steps[this.stepIndex].type as MarketStep).good, (this.steps.steps[this.stepIndex].type as MarketStep).quantity);
               this.stateUpdateCallback({ type: AutoAction.Sell, data: marketOrder });
            }

            this.nextStep();
         }
      } catch (error:unknown) {
         this.stop();
         this.errorCallback({ shipId: this.steps.shipId, error: (error as Error).message });
      }
   }
}

Comlink.expose(Automation);
