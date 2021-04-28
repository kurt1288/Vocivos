/* eslint-disable lines-between-class-members */
class Timer extends EventTarget {
   expected!: number;
   timeout!: NodeJS.Timeout;
   completedEvent = new Event('complete');
   interval = 500;
   targetTime: Date;

   constructor(targetTime: Date) {
      super();
      this.targetTime = targetTime;
   }

   stop() {
      clearTimeout(this.timeout);
   }

   step() {
      const drift = Date.now() - this.expected;

      if (drift > this.interval) {
         // bad
      }

      if (new Date() >= new Date(this.targetTime)) {
         this.dispatchEvent(this.completedEvent);
         this.stop();
         return;
      }

      this.expected += this.interval;
      this.timeout = setTimeout(this.step.bind(this), Math.max(0, this.interval - drift));
   }

   start() {
      this.expected = Date.now() + this.interval;
      this.timeout = setTimeout(this.step.bind(this), this.interval);
   }
}

export default Timer;
