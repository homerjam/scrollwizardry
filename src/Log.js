const DEBUG = false;
const LOG_LEVELS = ['error', 'warn', 'log'];

class Log {
  static log(loglevel) {
    if (!DEBUG) {
      return;
    }
    if (loglevel > LOG_LEVELS.length || loglevel <= 0) loglevel = LOG_LEVELS.length;
    const now = new Date();
    const time = `${(`0${now.getHours()}`).slice(-2)}:${(`0${now.getMinutes()}`).slice(-2)}:${(`0${now.getSeconds()}`).slice(-2)}:${(`00${now.getMilliseconds()}`).slice(-3)}`;
    const method = LOG_LEVELS[loglevel - 1];
    const args = Array.prototype.splice.call(arguments, 1);
    const func = Function.prototype.bind.call(console[method], console);
    args.unshift(time);
    func.apply(console, args);
  }
}

export default Log;
