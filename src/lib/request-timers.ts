import flatten from 'lodash.flatten';

class RequestTimer {
  static initialize(...timers) {
    timers = flatten(timers);
    return function(req, res, next) {
      if (!req.timers) {
        req.timers = {};
      }
      for (const timer of timers) {
        req.timers[`${timer}Start`] = Date.now();
        req.timers[timer] = 0;
      };
      next();
    };
  }

  static start(...timers) {
    timers = flatten(timers);
    return function(req, res, next) {
      const now = Date.now();
      for (const timer of timers) {
        const startTimer = `${timer}Start`;
        req.timers[startTimer] = now;
      };
      next();
    };
  }

  static stop(...timers) {
    timers = flatten(timers);
    return function(req, res, next) {
      const now = Date.now();
      for (const timer of timers) {
        const startTimer = `${timer}Start`;
        const offset = req.timers[startTimer];
        req.timers[timer] = now - offset;
      };
      next();
    };
  }

  static stopTimers(req, ...timers) {
    timers = flatten(timers);
    const now = Date.now();
    if (req.timers) {
      for (const timer of timers) {
        if (Object.prototype.hasOwnProperty.call(req.timers, timer)) {
          req.timers[timer] = now - (req.timers[`${timer}Start`] || now);
        }
      };
    }
  }
}

export default RequestTimer;
