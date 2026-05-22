const startTime = Date.now();
let lastCycleStart = null;
let nextCycleAt = null;

module.exports = {
  getStartTime: () => startTime,
  setLastCycleStart: (t) => { lastCycleStart = t; },
  getLastCycleStart: () => lastCycleStart,
  setNextCycleAt: (t) => { nextCycleAt = t; },
  getNextCycleAt: () => nextCycleAt,
};
