class Event {
  constructor(type, namespace, target, vars) {
    vars = vars || {};
    Object.keys(vars).forEach(key => {
      this[key] = vars[key];
    });
    this.type = type;
    this.target = target;
    this.currentTarget = target;
    this.namespace = namespace || '';
    this.timeStamp = Date.now();
    this.timestamp = this.timeStamp;
    return this;
  }
}

export default Event;
