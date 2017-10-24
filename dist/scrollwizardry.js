(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('lodash')) :
	typeof define === 'function' && define.amd ? define(['exports', 'lodash'], factory) :
	(factory((global.ScrollWizardry = {}),global._));
}(this, (function (exports,_) { 'use strict';

_ = _ && _.hasOwnProperty('default') ? _['default'] : _;

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

/* eslint-env browser */

var Util = function () {
  function Util() {
    classCallCheck(this, Util);
  }

  createClass(Util, null, [{
    key: 'elements',
    value: function elements() {
      var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      if (_.isString(selector)) {
        return document.querySelectorAll(selector);
      }
      if (_.isElement(selector) || selector === document || selector === window) {
        return [selector];
      }
      return selector;
    }
  }, {
    key: 'scrollTop',
    value: function scrollTop() {
      var el = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return el.scrollTop || window.pageYOffset || 0;
    }
  }, {
    key: 'scrollLeft',
    value: function scrollLeft() {
      var el = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      return el.scrollLeft || window.pageXOffset || 0;
    }
  }, {
    key: 'width',
    value: function width(el) {
      if (el === window) {
        return window.innerWidth;
      }
      return el.getBoundingClientRect().width;
    }
  }, {
    key: 'height',
    value: function height(el) {
      if (el === window) {
        return window.innerHeight;
      }
      return el.getBoundingClientRect().height;
    }
  }, {
    key: 'offset',
    value: function offset(el, relativeToViewport) {
      var offset = { top: 0, left: 0 };
      if (el && el.getBoundingClientRect) {
        var rect = el.getBoundingClientRect();
        offset.top = rect.top;
        offset.left = rect.left;
        if (!relativeToViewport) {
          offset.top += Util.scrollTop();
          offset.left += Util.scrollLeft();
        }
      }
      return offset;
    }
  }, {
    key: 'marginCollapse',
    value: function marginCollapse(display) {
      return ['block', 'flex', 'list-item', 'table', '-webkit-box'].includes(display);
    }
  }, {
    key: 'css',
    value: function css(el, _css) {
      if (!_css) {
        return el.currentStyle ? el.currentStyle : window.getComputedStyle(el);
      }

      _.forEach(_css, function (value, key) {
        if (value === parseFloat(value)) {
          // assume pixel for seemingly numerical values
          value += 'px';
        }
        el.style[_.camelCase(key)] = value;
      });

      return _css;
    }
  }]);
  return Util;
}();

var Event$1 = function Event(type, namespace, target, vars) {
  classCallCheck(this, Event);

  vars = vars || {};
  for (var key in vars) {
    this[key] = vars[key];
  }
  this.type = type;
  this.target = target;
  this.currentTarget = target;
  this.namespace = namespace || '';
  this.timeStamp = Date.now();
  this.timestamp = this.timeStamp;
  return this;
};

var DEBUG = false;
var LOG_LEVELS = ['error', 'warn', 'log'];

var Log = function () {
  function Log() {
    classCallCheck(this, Log);
  }

  createClass(Log, null, [{
    key: 'log',
    value: function log(loglevel) {
      if (!DEBUG) {
        return;
      }
      if (loglevel > LOG_LEVELS.length || loglevel <= 0) loglevel = LOG_LEVELS.length;
      var now = new Date();
      var time = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':' + ('0' + now.getSeconds()).slice(-2) + ':' + ('00' + now.getMilliseconds()).slice(-3);
      var method = LOG_LEVELS[loglevel - 1];
      var args = Array.prototype.splice.call(arguments, 1);
      var func = Function.prototype.bind.call(console[method], console);
      args.unshift(time);
      func.apply(console, args);
    }
  }]);
  return Log;
}();

/* eslint-env browser */

var FONT_SIZE = '0.85em';
var ZINDEX = '9999';

var TPL = {
  start: function start(color) {
    // inner element (for bottom offset -1, while keeping top position 0)
    var inner = document.createElement('div');
    inner.textContent = 'start';
    Util.css(inner, {
      position: 'absolute',
      overflow: 'visible',
      'border-width': 0,
      'border-style': 'solid',
      color: color,
      'border-color': color
    });
    var element = document.createElement('div');
    // wrapper
    Util.css(element, {
      position: 'absolute',
      overflow: 'visible',
      width: 0,
      height: 0
    });
    element.appendChild(inner);
    return element;
  },
  end: function end(color) {
    var element = document.createElement('div');
    element.textContent = 'end';
    Util.css(element, {
      position: 'absolute',
      overflow: 'visible',
      'border-width': 0,
      'border-style': 'solid',
      color: color,
      'border-color': color
    });
    return element;
  },
  bounds: function bounds() {
    var element = document.createElement('div');
    Util.css(element, {
      position: 'absolute',
      overflow: 'visible',
      'white-space': 'nowrap',
      'pointer-events': 'none',
      'font-size': FONT_SIZE
    });
    element.style.zIndex = ZINDEX;
    return element;
  },
  trigger: function trigger(color) {
    // inner to be above or below line but keep position
    var inner = document.createElement('div');
    inner.textContent = 'trigger';
    Util.css(inner, {
      position: 'relative'
    });
    // wrapper for right: 0 and main element has no size
    var wrapper = document.createElement('div');
    Util.css(wrapper, {
      position: 'absolute',
      overflow: 'visible',
      'border-width': 0,
      'border-style': 'solid',
      color: color,
      'border-color': color
    });
    wrapper.appendChild(inner);
    // element
    var element = document.createElement('div');
    Util.css(element, {
      position: 'fixed',
      overflow: 'visible',
      'white-space': 'nowrap',
      'pointer-events': 'none',
      'font-size': FONT_SIZE
    });
    element.style.zIndex = ZINDEX;
    element.appendChild(wrapper);
    return element;
  }
};

var _autoindex = 0;

var Indicator = function () {
  function Indicator(scene, options) {
    classCallCheck(this, Indicator);

    var DEFAULT_INDICATOR_OPTIONS = {
      name: '',
      indent: 0,
      parent: undefined,
      colorStart: 'green',
      colorEnd: 'red',
      colorTrigger: 'blue'
    };

    options = _.merge({}, DEFAULT_INDICATOR_OPTIONS, options);

    options.name = options.name || _autoindex;

    _autoindex++;

    this._elemBounds = TPL.bounds();
    this._elemStart = TPL.start(options.colorStart);
    this._elemEnd = TPL.end(options.colorEnd);

    this._boundsContainer = options.parent && Util.elements(options.parent)[0];

    // prepare bounds elements
    this._elemStart.firstChild.textContent += ' ' + options.name;
    this._elemEnd.textContent += ' ' + options.name;
    this._elemBounds.appendChild(this._elemStart);
    this._elemBounds.appendChild(this._elemEnd);

    this._vertical = null;
    this._ctrl = null;

    // set public variables
    this.options = options;
    this.bounds = this._elemBounds;
    this.triggerGroup = null; // will be set later

    this.scene = scene;
  }

  // add indicators to DOM


  createClass(Indicator, [{
    key: 'add',
    value: function add() {
      var _this = this;

      this._ctrl = this.scene.controller();
      this._vertical = this._ctrl.info('vertical');

      var isDocument = this._ctrl.info('isDocument');

      if (!this._boundsContainer) {
        // no parent supplied or doesnt exist
        this._boundsContainer = isDocument ? document.body : this._ctrl.info('container'); // check if window/document (then use body)
      }
      if (!isDocument && Util.css(this._boundsContainer).position === 'static') {
        // position mode needed for correct positioning of indicators
        Util.css(this._boundsContainer, { position: 'relative' });
      }

      // add listeners for updates
      this.scene.on('change.plugin_addIndicators', this._handleTriggerParamsChange.bind(this));
      this.scene.on('shift.plugin_addIndicators', this._handleBoundsParamsChange.bind(this));

      // updates trigger & bounds (will add elements if needed)
      this._updateTriggerGroup();
      this._updateBounds();

      setTimeout(function () {
        // do after all execution is finished otherwise sometimes size calculations are off
        _this._ctrl.updateBoundsPositions(_this);
      }, 0);

      Log.log(3, 'added indicators');
    }

    // remove indicators from DOM

  }, {
    key: 'remove',
    value: function remove() {
      if (this.triggerGroup) {
        // if not set there's nothing to remove
        this.scene.off('change.plugin_addIndicators', this._handleTriggerParamsChange);
        this.scene.off('shift.plugin_addIndicators', this._handleBoundsParamsChange);

        if (this.triggerGroup.members.length > 1) {
          // just remove from memberlist of old group
          var group = this.triggerGroup;
          group.members.splice(group.members.indexOf(this), 1);
          this._ctrl.updateTriggerGroupLabel(group);
          this._ctrl.updateTriggerGroupPositions(group);
          this.triggerGroup = null;
        } else {
          // remove complete group
          this._removeTriggerGroup();
        }
        this._removeBounds();

        Log.log(3, 'removed indicators');
      }
    }

    // event handler for when bounds params change

  }, {
    key: '_handleBoundsParamsChange',
    value: function _handleBoundsParamsChange() {
      this._updateBounds();
    }

    // event handler for when trigger params change

  }, {
    key: '_handleTriggerParamsChange',
    value: function _handleTriggerParamsChange(event) {
      if (event.what === 'triggerHook') {
        this._updateTriggerGroup();
      }
    }

    // adds an new bounds elements to the array and to the DOM

  }, {
    key: '_addBounds',
    value: function _addBounds() {
      var v = this._ctrl.info('vertical');
      // apply stuff we didn't know before...
      Util.css(this._elemStart.firstChild, {
        'border-bottom-width': v ? 1 : 0,
        'border-right-width': v ? 0 : 1,
        bottom: v ? -1 : this.options.indent,
        right: v ? this.options.indent : -1,
        padding: v ? '0 8px' : '2px 4px'
      });
      Util.css(this._elemEnd, {
        'border-top-width': v ? 1 : 0,
        'border-left-width': v ? 0 : 1,
        top: v ? '100%' : '',
        right: v ? this.options.indent : '',
        bottom: v ? '' : this.options.indent,
        left: v ? '' : '100%',
        padding: v ? '0 8px' : '2px 4px'
      });
      // append
      this._boundsContainer.appendChild(this._elemBounds);
    }

    // remove bounds from list and DOM

  }, {
    key: '_removeBounds',
    value: function _removeBounds() {
      this._elemBounds.parentNode.removeChild(this._elemBounds);
    }

    // update the start and end positions of the scene

  }, {
    key: '_updateBounds',
    value: function _updateBounds() {
      if (this._elemBounds.parentNode !== this._boundsContainer) {
        this._addBounds(); // Add Bounds elements (start/end)
      }
      var css = {};
      css[this._vertical ? 'top' : 'left'] = this.scene.triggerPosition();
      css[this._vertical ? 'height' : 'width'] = this.scene.duration();
      Util.css(this._elemBounds, css);
      Util.css(this._elemEnd, {
        display: this.scene.duration() > 0 ? '' : 'none'
      });
    }

    // adds an new trigger group to the array and to the DOM

  }, {
    key: '_addTriggerGroup',
    value: function _addTriggerGroup() {
      var triggerElem = TPL.trigger(this.options.colorTrigger); // new trigger element
      var css = {};
      css[this._vertical ? 'right' : 'bottom'] = 0;
      css[this._vertical ? 'border-top-width' : 'border-left-width'] = 1;
      Util.css(triggerElem.firstChild, css);
      Util.css(triggerElem.firstChild.firstChild, {
        padding: this._vertical ? '0 8px 3px 8px' : '3px 4px'
      });
      document.body.appendChild(triggerElem); // directly add to body
      var newGroup = {
        triggerHook: this.scene.triggerHook(),
        element: triggerElem,
        members: [this]
      };
      this._ctrl._indicators.groups.push(newGroup);
      this.triggerGroup = newGroup;
      // update right away
      this._ctrl.updateTriggerGroupLabel(newGroup);
      this._ctrl.updateTriggerGroupPositions(newGroup);
    }
  }, {
    key: '_removeTriggerGroup',
    value: function _removeTriggerGroup() {
      this._ctrl._indicators.groups.splice(this._ctrl._indicators.groups.indexOf(this.triggerGroup), 1);
      this.triggerGroup.element.parentNode.removeChild(this.triggerGroup.element);
      this.triggerGroup = null;
    }

    // updates the trigger group -> either join existing or add new one

  }, {
    key: '_updateTriggerGroup',
    value: function _updateTriggerGroup() {
      var triggerHook = this.scene.triggerHook();
      var closeEnough = 0.0001;

      // Have a group, check if it still matches
      if (this.triggerGroup) {
        if (Math.abs(this.triggerGroup.triggerHook - triggerHook) < closeEnough) {
          // Log.log(0, "trigger", options.name, "->", "no need to change, still in sync");
          return; // all good
        }
      }

      // Don't have a group, check if a matching one exists
      // Log.log(0, "trigger", options.name, "->", "out of sync!");
      var groups = this._ctrl._indicators.groups;
      var group = void 0;
      var i = groups.length;

      while (i--) {
        group = groups[i];
        if (Math.abs(group.triggerHook - triggerHook) < closeEnough) {
          // found a match!
          // Log.log(0, "trigger", options.name, "->", "found match");
          if (this.triggerGroup) {
            // do I have an old group that is out of sync?
            if (this.triggerGroup.members.length === 1) {
              // is it the only remaining group?
              // Log.log(0, "trigger", options.name, "->", "kill");
              // was the last member, remove the whole group
              this._removeTriggerGroup();
            } else {
              this.triggerGroup.members.splice(this.triggerGroup.members.indexOf(this), 1); // just remove from memberlist of old group
              this._ctrl.updateTriggerGroupLabel(this.triggerGroup);
              this._ctrl.updateTriggerGroupPositions(this.triggerGroup);
              // Log.log(0, "trigger", options.name, "->", "removing from previous member list");
            }
          }
          // join new group
          group.members.push(this);
          this.triggerGroup = group;
          this._ctrl.updateTriggerGroupLabel(group);
          return;
        }
      }

      // at this point I am obviously out of sync and don't match any other group
      if (this.triggerGroup) {
        if (this.triggerGroup.members.length === 1) {
          // Log.log(0, "trigger", options.name, "->", "updating existing");
          // out of sync but i'm the only member => just change and update
          this.triggerGroup.triggerHook = triggerHook;
          this._ctrl.updateTriggerGroupPositions(this.triggerGroup);
          return;
        }
        // Log.log(0, "trigger", options.name, "->", "removing from previous member list");
        this.triggerGroup.members.splice(this.triggerGroup.members.indexOf(this), 1); // just remove from memberlist of old group
        this._ctrl.updateTriggerGroupLabel(this.triggerGroup);
        this._ctrl.updateTriggerGroupPositions(this.triggerGroup);
        this.triggerGroup = null; // need a brand new group...
      }
      // Log.log(0, "trigger", options.name, "->", "add a new one");
      // did not find any match, make new trigger group
      this._addTriggerGroup();
    }
  }]);
  return Indicator;
}();

/* eslint-env browser */

var PIN_SPACER_ATTRIBUTE$1 = 'data-scrollwizardry-pin-spacer';

var NAMESPACE$1 = 'ScrollWizardry.Scene';

var SCENE_STATE_BEFORE = 'BEFORE';
var SCENE_STATE_DURING = 'DURING';
var SCENE_STATE_AFTER = 'AFTER';

// list of options that trigger a `shift` event
var SHIFTS = ['duration', 'offset', 'triggerHook'];

var DEFAULT_SCENE_OPTIONS = {
  duration: 0,
  offset: 0,
  triggerElement: undefined,
  triggerHook: 0.5,
  reverse: true,
  loglevel: 2,
  tweenChanges: false
};

var Scene = function () {
  function Scene(options) {
    var _this = this;

    classCallCheck(this, Scene);

    this.options = _.merge({}, DEFAULT_SCENE_OPTIONS, options);

    this._state = SCENE_STATE_BEFORE;
    this._progress = 0;
    this._scrollOffset = { start: 0, end: 0 };
    this._triggerPos = 0;
    this._durationUpdateMethod = null;
    this._controller = null;
    this._listeners = {};

    this._pin = null;
    this._pinOptions = null;

    this._cssClasses = null;
    this._cssClassElems = [];

    this._tween = null;

    this._indicator = null;

    // add getters/setters for all possible options
    Object.keys(DEFAULT_SCENE_OPTIONS).forEach(function (optionName) {
      _this._addSceneOption(optionName);
    });

    this.validate = {
      duration: function duration(val) {
        var _this2 = this;

        if (_.isString(val) && val.match(/^(\.|\d)*\d+%$/)) {
          // percentage value
          var perc = parseFloat(val) / 100;
          val = function val() {
            return _this2._controller ? _this2._controller.info('size') * perc : 0;
          };
        }
        if (_.isFunction(val)) {
          // function
          this._durationUpdateMethod = val;
          try {
            val = parseFloat(this._durationUpdateMethod());
          } catch (error) {
            val = -1; // will cause error below
          }
        }
        // val has to be float
        val = parseFloat(val);
        if (!_.isNumber(val) || val < 0) {
          if (this._durationUpdateMethod) {
            this._durationUpdateMethod = null;
            throw Error('Invalid return value of supplied function for option "duration": ' + val);
          } else {
            throw Error('Invalid value for option "duration": ' + val);
          }
        }
        return val;
      },
      offset: function offset(val) {
        if (_.isFunction(val)) {
          val = val();
        }
        val = parseFloat(val);
        if (!_.isNumber(val)) {
          throw Error('Invalid value for option "offset": ' + val);
        }
        return val;
      },
      triggerElement: function triggerElement(val) {
        val = val || undefined;
        if (val) {
          var el = _.isString(val) ? Util.elements(val)[0] : val;
          if (el && el.parentNode) {
            val = el;
          } else {
            throw Error('Element defined in option "triggerElement" was not found: ' + val);
          }
        }
        return val;
      },
      triggerHook: function triggerHook(val) {
        var translate = { onCenter: 0.5, onEnter: 1, onLeave: 0 };
        if (_.isNumber(val)) {
          val = Math.max(0, Math.min(parseFloat(val), 1)); //  make sure its betweeen 0 and 1
        } else if (val in translate) {
          val = translate[val];
        } else {
          throw Error('Invalid value for option "triggerHook": ' + val);
        }
        return val;
      },
      reverse: function reverse(val) {
        return !!val; // force boolean
      },
      loglevel: function loglevel(val) {
        val = parseInt(val, 10);
        if (!_.isNumber(val) || val < 0 || val > 3) {
          throw Error('Invalid value for option "loglevel": ' + val);
        }
        return val;
      },
      tweenChanges: function tweenChanges(val) {
        return !!val;
      }
    };

    // validate all options
    this._validateOption();

    this.on('change.internal', function (event) {
      if (event.what !== 'loglevel' && event.what !== 'tweenChanges') {
        // no need for a scene update scene with these options...
        if (event.what === 'triggerElement') {
          _this._updateTriggerElementPosition();
        } else if (event.what === 'reverse') {
          // the only property left that may have an impact on the current scene state. Everything else is handled by the shift event.
          _this.update();
        }
      }
    });

    this.on('shift.internal', function (event) {
      _this.update(); // update scene to reflect new position
    });

    // pinning

    this.on('shift.internal', function (event) {
      var durationChanged = event.reason === 'duration';
      if (_this._state === SCENE_STATE_AFTER && durationChanged || _this._state === SCENE_STATE_DURING && _this.options.duration === 0) {
        // if [duration changed after a scene (inside scene progress updates pin position)] or [duration is 0, we are in pin phase and some other value changed].
        _this._updatePinState();
      }
      if (durationChanged) {
        _this._updatePinDimensions();
      }
    });

    this.on('progress.internal', function (event) {
      _this._updatePinState();
    });

    this.on('add.internal', function (event) {
      _this._updatePinDimensions();
    });

    this.on('destroy.internal', function (event) {
      _this.removePin(event.reset);
    });

    // class toggle

    this.on('destroy.internal', function (event) {
      _this.removeClassToggle(event.reset);
    });

    // gsap

    this.on('progress.plugin_gsap', function () {
      _this._updateTweenProgress();
    });

    this.on('destroy.plugin_gsap', function (event) {
      _this.removeTween(event.reset);
    });
  }

  createClass(Scene, [{
    key: 'on',
    value: function on(names, callback) {
      var _this3 = this;

      if (_.isFunction(callback)) {
        names = names.trim().split(' ');
        names.forEach(function (fullname) {
          var nameparts = fullname.split('.');
          var eventname = nameparts[0];
          var namespace = nameparts[1];
          if (eventname !== '*') {
            // disallow wildcards
            if (!_this3._listeners[eventname]) {
              _this3._listeners[eventname] = [];
            }
            _this3._listeners[eventname].push({
              namespace: namespace || '',
              callback: callback
            });
          }
        });
      } else {
        Log.log(1, 'ERROR when calling \'.on()\': Supplied callback for \'' + names + '\' is not a valid function!');
      }
      return this;
    }
  }, {
    key: 'off',
    value: function off(names, callback) {
      var _this4 = this;

      if (!names) {
        Log.log(1, 'ERROR: Invalid event name supplied.');
        return this;
      }
      names = names.trim().split(' ');
      names.forEach(function (fullname, key) {
        var nameparts = fullname.split('.');
        var eventname = nameparts[0];
        var namespace = nameparts[1] || '';
        var removeList = eventname === '*' ? Object.keys(_this4._listeners) : [eventname];
        removeList.forEach(function (remove) {
          var list = _this4._listeners[remove] || [];
          var i = list.length;
          while (i--) {
            var listener = list[i];
            if (listener && (namespace === listener.namespace || namespace === '*') && (!callback || callback === listener.callback)) {
              list.splice(i, 1);
            }
          }
          if (!list.length) {
            delete _this4._listeners[remove];
          }
        });
      });
      return this;
    }
  }, {
    key: 'trigger',
    value: function trigger(name, vars) {
      var _this5 = this;

      if (name) {
        var nameparts = name.trim().split('.');
        var eventname = nameparts[0];
        var namespace = nameparts[1];
        var listeners = this._listeners[eventname];
        Log.log(3, 'event fired:', eventname, vars ? '->' : '', vars || '');
        if (listeners) {
          listeners.forEach(function (listener) {
            if (!namespace || namespace === listener.namespace) {
              listener.callback.call(_this5, new Event$1(eventname, listener.namespace, _this5, vars));
            }
          });
        }
      } else {
        Log.log(1, 'ERROR: Invalid event name supplied.');
      }
      return this;
    }
  }, {
    key: 'addTo',
    value: function addTo(controller) {
      if (this._controller !== controller) {
        // new controller
        if (this._controller) {
          // was associated to a different controller before, so remove it...
          this._controller.removeScene(this);
        }
        this._controller = controller;
        this._validateOption();
        this._updateDuration(true);
        this._updateTriggerElementPosition(true);
        this._updateScrollOffset();
        this._controller.info('container').addEventListener('resize', this._onContainerResize.bind(this), { passive: true });
        controller.addScene(this);
        this.trigger('add', { controller: this._controller });
        Log.log(3, 'added ' + NAMESPACE$1 + ' to controller');
        this.update();
      }
      return this;
    }
  }, {
    key: 'remove',
    value: function remove() {
      if (this._controller) {
        this._controller.info('container').removeEventListener('resize', this._onContainerResize.bind(this), { passive: true });
        var tmpParent = this._controller;
        this._controller = null;
        tmpParent.removeScene(this);
        this.trigger('remove');
        Log.log(3, 'removed ' + NAMESPACE$1 + ' from controller');
      }
      return this;
    }
  }, {
    key: 'destroy',
    value: function destroy(reset) {
      this.trigger('destroy', { reset: reset });
      this.remove();
      this.triggerElement(null);
      this.off('*.*');
      Log.log(3, 'destroyed ' + NAMESPACE$1 + ' (reset: ' + (reset ? 'true' : 'false') + ')');
      return null;
    }
  }, {
    key: 'update',
    value: function update(immediately) {
      if (this._controller) {
        this._updateScrollOffset();
        if (immediately) {
          if (this._controller.enabled()) {
            var scrollPos = this._controller.info('scrollPos');
            var newProgress = void 0;

            if (this.options.duration > 0) {
              newProgress = (scrollPos - this._scrollOffset.start) / (this._scrollOffset.end - this._scrollOffset.start);
            } else {
              newProgress = scrollPos >= this._scrollOffset.start ? 1 : 0;
            }

            this.trigger('update', { startPos: this._scrollOffset.start, endPos: this._scrollOffset.end, scrollPos: scrollPos });

            this.progress(newProgress);
          } else if (this._pin && this._state === SCENE_STATE_DURING) {
            this._updatePinState(true); // unpin in position
          }
        } else {
          this._controller.updateScene(this, false);
        }
      }
      return this;
    }
  }, {
    key: 'refresh',
    value: function refresh() {
      this._updateDuration();
      this._updateTriggerElementPosition();
      // update trigger element position
      return this;
    }
  }, {
    key: 'progress',
    value: function progress(_progress) {
      var _this6 = this;

      if (!arguments.length) {
        // get
        return this._progress;
      } // set

      var doUpdate = false;
      var oldState = this._state;
      var scrollDirection = this._controller ? this._controller.info('scrollDirection') : 'PAUSED';
      var reverseOrForward = this.options.reverse || _progress >= this._progress;
      if (this.options.duration === 0) {
        // zero duration scenes
        doUpdate = this._progress !== _progress;
        this._progress = _progress < 1 && reverseOrForward ? 0 : 1;
        this._state = this._progress === 0 ? SCENE_STATE_BEFORE : SCENE_STATE_DURING;
      } else {
        // scenes with start and end
        if (_progress < 0 && this._state !== SCENE_STATE_BEFORE && reverseOrForward) {
          // go back to initial state
          this._progress = 0;
          this._state = SCENE_STATE_BEFORE;
          doUpdate = true;
        } else if (_progress >= 0 && _progress < 1 && reverseOrForward) {
          this._progress = _progress;
          this._state = SCENE_STATE_DURING;
          doUpdate = true;
        } else if (_progress >= 1 && this._state !== SCENE_STATE_AFTER) {
          this._progress = 1;
          this._state = SCENE_STATE_AFTER;
          doUpdate = true;
        } else if (this._state === SCENE_STATE_DURING && !reverseOrForward) {
          this._updatePinState(); // in case we scrolled backwards mid-scene and reverse is disabled => update the pin position, so it doesn't move back as well.
        }
      }
      if (doUpdate) {
        // fire events
        var eventVars = { progress: this._progress, state: this._state, scrollDirection: scrollDirection };
        var stateChanged = this._state !== oldState;

        var trigger = function trigger(eventName) {
          // tmp helper to simplify code
          _this6.trigger(eventName, eventVars);
        };

        if (stateChanged) {
          // enter events
          if (oldState !== SCENE_STATE_DURING) {
            trigger('enter');
            trigger(oldState === SCENE_STATE_BEFORE ? 'start' : 'end');
          }
        }
        trigger('progress');
        if (stateChanged) {
          // leave events
          if (this._state !== SCENE_STATE_DURING) {
            trigger(this._state === SCENE_STATE_BEFORE ? 'start' : 'end');
            trigger('leave');
          }
        }
      }

      return this;
    }
  }, {
    key: '_updateScrollOffset',
    value: function _updateScrollOffset() {
      var offset = _.isFunction(this.options.offset) ? this.options.offset() : this.options.offset;
      this._scrollOffset = { start: this._triggerPos + offset };
      if (this._controller && this.options.triggerElement) {
        // take away triggerHook portion to get relative to top
        this._scrollOffset.start -= this._controller.info('size') * this.options.triggerHook;
      }
      this._scrollOffset.end = this._scrollOffset.start + this.options.duration;
    }
  }, {
    key: '_updateDuration',
    value: function _updateDuration(suppressEvents) {
      // update duration
      if (this._durationUpdateMethod) {
        var varname = 'duration';
        if (this._changeOption(varname, this._durationUpdateMethod.call(this)) && !suppressEvents) {
          // set
          this.trigger('change', { what: varname, newVal: this.options[varname] });
          this.trigger('shift', { reason: varname });
        }
      }
    }
  }, {
    key: '_updateTriggerElementPosition',
    value: function _updateTriggerElementPosition(suppressEvents) {
      var elementPos = 0;
      var telem = this.options.triggerElement;
      if (this._controller && (telem || this._triggerPos > 0)) {
        // either an element exists or was removed and the triggerPos is still > 0
        if (telem) {
          // there currently a triggerElement set
          if (telem.parentNode) {
            // check if element is still attached to DOM
            var controllerInfo = this._controller.info();
            var containerOffset = Util.offset(controllerInfo.container); // container position is needed because element offset is returned in relation to document, not in relation to container.
            var param = controllerInfo.vertical ? 'top' : 'left'; // which param is of interest ?

            // if parent is spacer, use spacer position instead so correct start position is returned for pinned elements.
            while (telem.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE$1)) {
              telem = telem.parentNode;
            }

            var elementOffset = Util.offset(telem);

            if (!controllerInfo.isDocument) {
              // container is not the document root, so substract scroll Position to get correct trigger element position relative to scrollcontent
              containerOffset[param] -= this._controller.scrollPos();
            }

            elementPos = elementOffset[param] - containerOffset[param];
          } else {
            // there was an element, but it was removed from DOM
            Log.log(2, 'WARNING: triggerElement was removed from DOM and will be reset to', undefined);
            this.triggerElement(undefined); // unset, so a change event is triggered
          }
        }

        var changed = elementPos !== this._triggerPos;
        this._triggerPos = elementPos;
        if (changed && !suppressEvents) {
          this.trigger('shift', { reason: 'triggerElementPosition' });
        }
      }
    }
  }, {
    key: '_onContainerResize',
    value: function _onContainerResize(event) {
      if (this.options.triggerHook > 0) {
        this.trigger('shift', { reason: 'containerResize' });
      }
    }
  }, {
    key: '_validateOption',
    value: function _validateOption() {
      var _this7 = this;

      for (var _len = arguments.length, check = Array(_len), _key = 0; _key < _len; _key++) {
        check[_key] = arguments[_key];
      }

      check = check.length ? check : Object.keys(this.validate);
      check.forEach(function (optionName) {
        var value = void 0;
        if (_this7.validate[optionName]) {
          // there is a validation method for this option
          try {
            // validate value
            value = _this7.validate[optionName].call(_this7, _this7.options[optionName]);
          } catch (event) {
            // validation failed -> reset to default
            value = DEFAULT_SCENE_OPTIONS[optionName];
            var logMSG = _.isString(event) ? [event] : event;
            if (_.isArray(logMSG)) {
              logMSG[0] = 'ERROR: ' + logMSG[0];
              logMSG.unshift(1); // loglevel 1 for error msg
              Log.log.apply(_this7, logMSG);
            } else {
              Log.log(1, 'ERROR: Problem executing validation callback for option \'' + optionName + '\':', event.message);
            }
          } finally {
            // this.options[optionName] = value;
          }
        }
      });
    }
  }, {
    key: '_changeOption',
    value: function _changeOption(optionName, newVal) {
      var changed = false;
      var oldval = this.options[optionName];
      if (this.options[optionName] !== newVal) {
        this.options[optionName] = newVal;
        this._validateOption(optionName); // resets to default if necessary
        changed = oldval !== this.options[optionName];
      }
      return changed;
    }
  }, {
    key: '_addSceneOption',
    value: function _addSceneOption(optionName) {
      var _this8 = this;

      if (!this[optionName]) {
        this[optionName] = function () {
          if (arguments.length === 0) {
            // get
            return _this8.options[optionName];
          }
          if (optionName === 'duration') {
            // new duration is set, so any previously set function must be unset
            _this8._durationUpdateMethod = null;
          }
          if (_this8._changeOption(optionName, arguments.length <= 0 ? undefined : arguments[0])) {
            // set
            _this8.trigger('change', { what: optionName, newVal: _this8.options[optionName] });
            if (SHIFTS.indexOf(optionName) > -1) {
              _this8.trigger('shift', { reason: optionName });
            }
          }

          return _this8;
        };
      }
    }
  }, {
    key: 'controller',
    value: function controller() {
      return this._controller;
    }
  }, {
    key: 'state',
    value: function state() {
      return this._state;
    }
  }, {
    key: 'scrollOffset',
    value: function scrollOffset() {
      return this._scrollOffset.start;
    }
  }, {
    key: 'triggerPosition',
    value: function triggerPosition() {
      // the offset is the basis
      var offset = _.isFunction(this.options.offset) ? this.options.offset() : this.options.offset;
      if (this._controller) {
        // get the trigger position
        if (this.options.triggerElement) {
          // Element as trigger
          offset += this._triggerPos;
        } else {
          // return the height of the triggerHook to start at the beginning
          offset += this._controller.info('size') * this.triggerHook();
        }
      }
      return offset;
    }

    // pinning

  }, {
    key: '_updatePinState',
    value: function _updatePinState(forceUnpin) {
      if (this._pin && this._controller) {
        var containerInfo = this._controller.info();
        var pinTarget = this._pinOptions.spacer.firstChild; // may be pin element or another spacer, if cascading pins

        if (!forceUnpin && this._state === SCENE_STATE_DURING) {
          // during scene or if duration is 0 and we are past the trigger
          // pinned state
          if (Util.css(pinTarget).position !== 'fixed') {
            // change state before updating pin spacer (position changes due to fixed collapsing might occur.)
            Util.css(pinTarget, { position: 'fixed' });
            // update pin spacer
            this._updatePinDimensions();
          }

          var fixedPos = Util.offset(this._pinOptions.spacer, true); // get viewport position of spacer
          var scrollDistance = this.options.reverse || this.options.duration === 0 ? containerInfo.scrollPos - this._scrollOffset.start // quicker
          : Math.round(this._progress * this.options.duration * 10) / 10; // if no reverse and during pin the position needs to be recalculated using the progress

          // add scrollDistance
          fixedPos[containerInfo.vertical ? 'top' : 'left'] += scrollDistance;

          // set new values
          Util.css(this._pinOptions.spacer.firstChild, fixedPos);
        } else {
          // unpinned state
          var newCSS = {
            position: this._pinOptions.inFlow ? 'relative' : 'absolute',
            top: 0,
            left: 0
          };

          var change = Util.css(pinTarget).position !== newCSS.position;

          if (!this._pinOptions.pushFollowers) {
            newCSS[containerInfo.vertical ? 'top' : 'left'] = this.options.duration * this._progress;
          } else if (this.options.duration > 0) {
            // only concerns scenes with duration
            if (this._state === SCENE_STATE_AFTER && parseFloat(Util.css(this._pinOptions.spacer).paddingTop) === 0) {
              change = true; // if in after state but havent updated spacer yet (jumped past pin)
            } else if (this._state === SCENE_STATE_BEFORE && parseFloat(Util.css(this._pinOptions.spacer).paddingBottom) === 0) {
              // before
              change = true; // jumped past fixed state upward direction
            }
          }

          // set new values
          Util.css(pinTarget, newCSS);

          if (change) {
            // update pin spacer if state changed
            this._updatePinDimensions();
          }
        }
      }
    }
  }, {
    key: '_updatePinDimensions',
    value: function _updatePinDimensions() {
      if (this._pin && this._controller && this._pinOptions.inFlow) {
        // no spacer resize, if original position is absolute

        var during = this._state === SCENE_STATE_DURING;
        var vertical = this._controller.info('vertical');
        var pinTarget = this._pinOptions.spacer.firstChild; // usually the pined element but can also be another spacer (cascaded pins)
        var marginCollapse = Util.marginCollapse(Util.css(this._pinOptions.spacer).display);

        var css = {};

        // set new size

        // if relsize: spacer -> pin | else: pin -> spacer
        if (this._pinOptions.relSize.width || this._pinOptions.relSize.autoFullWidth) {
          if (during) {
            Util.css(this._pin, { width: Util.width(this._pinOptions.spacer) });
          } else {
            Util.css(this._pin, { width: '100%' });
          }
        } else {
          // minwidth is needed for cascaded pins.
          css['min-width'] = Util.width(vertical ? this._pin : pinTarget, true, true);
          css.width = during ? css['min-width'] : 'auto';
        }

        if (this._pinOptions.relSize.height) {
          if (during) {
            // the only padding the spacer should ever include is the duration (if pushFollowers = true), so we need to substract that.
            Util.css(this._pin, { height: Util.height(this._pinOptions.spacer) - (this._pinOptions.pushFollowers ? this.options.duration : 0) });
          } else {
            Util.css(this._pin, { height: '100%' });
          }
        } else {
          // margin is only included if it's a cascaded pin to resolve an IE9 bug
          css['min-height'] = Util.height(vertical ? pinTarget : this._pin, true, !marginCollapse); // needed for cascading pins
          css.height = during ? css['min-height'] : 'auto';
        }

        // add space for duration if pushFollowers is true
        if (this._pinOptions.pushFollowers) {
          css['padding' + (vertical ? 'Top' : 'Left')] = this.options.duration * this._progress;
          css['padding' + (vertical ? 'Bottom' : 'Right')] = this.options.duration * (1 - this._progress);
        }

        Util.css(this._pinOptions.spacer, css);
      }
    }
  }, {
    key: '_updatePinInContainer',
    value: function _updatePinInContainer() {
      if (this._controller && this._pin && this._state === SCENE_STATE_DURING && !this._controller.info('isDocument')) {
        this._updatePinState();
      }
    }
  }, {
    key: '_updateRelativePinSpacer',
    value: function _updateRelativePinSpacer() {
      if (this._controller && this._pin && this._state === SCENE_STATE_DURING && ( // element in pinned state?
      // is width or height relatively sized, but not in relation to body? then we need to recalc.
      (this._pinOptions.relSize.width || this._pinOptions.relSize.autoFullWidth) && Util.width(window) !== Util.width(this._pinOptions.spacer.parentNode) || this._pinOptions.relSize.height && Util.height(window) !== Util.height(this._pinOptions.spacer.parentNode))) {
        this._updatePinDimensions();
      }
    }
  }, {
    key: '_onMousewheelOverPin',
    value: function _onMousewheelOverPin(event) {
      if (this._controller && this._pin && this._state === SCENE_STATE_DURING && !this._controller.info('isDocument')) {
        // in pin state
        event.preventDefault();
        this._controller._setScrollPos(this._controller.info('scrollPos') - ((event.wheelDelta || event[this._controller.info('vertical') ? 'wheelDeltaY' : 'wheelDeltaX']) / 3 || -event.detail * 30));
      }
    }
  }, {
    key: 'setPin',
    value: function setPin(element, settings) {
      var _this9 = this;

      var defaultSettings = {
        pushFollowers: true,
        spacerClass: 'scrollwizardry-pin-spacer'
      };

      settings = _.merge({}, defaultSettings, settings);

      // validate element
      element = Util.elements(element)[0];

      if (!element) {
        Log.log(1, "ERROR calling method 'setPin()': Invalid pin element supplied");
        return this; // cancel
      } else if (Util.css(element).position === 'fixed') {
        Log.log(1, "ERROR calling method 'setPin()': Pin does not work with elements that are positioned 'fixed'");
        return this; // cancel
      }

      if (this._pin) {
        // preexisting pin?
        if (this._pin === element) {
          // same pin we already have -> do nothing
          return this; // cancel
        }
        // kill old pin
        this.removePin();
      }
      this._pin = element;

      var parentDisplay = Util.css(this._pin.parentNode).display;
      var boundsParams = ['top', 'left', 'bottom', 'right', 'margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom'];

      this._pin.parentNode.style.display = 'none'; // hack start to force css to return stylesheet values instead of calculated px values.

      var inFlow = Util.css(this._pin).position !== 'absolute';
      var pinCSS = _.pick(Util.css(this._pin), boundsParams.concat(['display']));
      var sizeCSS = _.pick(Util.css(this._pin), ['width', 'height']);

      this._pin.parentNode.style.display = parentDisplay; // hack end.

      if (!inFlow && settings.pushFollowers) {
        Log.log(2, 'WARNING: If the pinned element is positioned absolutely pushFollowers will be disabled.');
        settings.pushFollowers = false;
      }

      // wait until all finished, because with responsive duration it will only be set after scene is added to controller
      window.setTimeout(function () {
        if (_this9._pin && _this9.options.duration === 0 && settings.pushFollowers) {
          Log.log(2, 'WARNING: pushFollowers =', true, 'has no effect, when scene duration is 0.');
        }
      }, 0);

      // create spacer and insert
      var spacer = this._pin.parentNode.insertBefore(document.createElement('div'), this._pin);
      var spacerCSS = _.merge(pinCSS, {
        position: inFlow ? 'relative' : 'absolute',
        boxSizing: 'content-box',
        mozBoxSizing: 'content-box',
        webkitBoxSizing: 'content-box'
      });

      if (!inFlow) {
        // copy size if positioned absolutely, to work for bottom/right positioned elements.
        _.merge(spacerCSS, sizeCSS);
      }

      Util.css(spacer, spacerCSS);
      spacer.setAttribute(PIN_SPACER_ATTRIBUTE$1, '');
      spacer.classList.add(settings.spacerClass);

      // set the pin Options
      this._pinOptions = {
        spacer: spacer,
        relSize: { // save if size is defined using % values. if so, handle spacer resize differently...
          width: sizeCSS.width.slice(-1) === '%',
          height: sizeCSS.height.slice(-1) === '%',
          autoFullWidth: sizeCSS.width === 'auto' && inFlow && Util.marginCollapse(pinCSS.display)
        },
        pushFollowers: settings.pushFollowers,
        inFlow: inFlow // stores if the element takes up space in the document flow
      };

      if (!this._pin.___origStyle) {
        this._pin.___origStyle = {};
        var pinInlineStyle = this._pin.style;
        var copyStyles = boundsParams.concat(['width', 'height', 'position', 'boxSizing', 'mozBoxSizing', 'webkitBoxSizing']);
        copyStyles.forEach(function (val) {
          _this9._pin.___origStyle[val] = pinInlineStyle[val] || '';
        });
      }

      // if relative size, transfer it to spacer and make pin calculate it...
      if (this._pinOptions.relSize.width) {
        Util.css(spacer, { width: sizeCSS.width });
      }
      if (this._pinOptions.relSize.height) {
        Util.css(spacer, { height: sizeCSS.height });
      }

      // now place the pin element inside the spacer
      spacer.appendChild(this._pin);
      // and set new css
      Util.css(this._pin, {
        position: inFlow ? 'relative' : 'absolute',
        margin: 'auto',
        top: 'auto',
        left: 'auto',
        bottom: 'auto',
        right: 'auto'
      });

      if (this._pinOptions.relSize.width || this._pinOptions.relSize.autoFullWidth) {
        Util.css(this._pin, {
          boxSizing: 'border-box',
          mozBoxSizing: 'border-box',
          webkitBoxSizing: 'border-box'
        });
      }

      // add listener to document to update pin position in case controller is not the document.
      window.addEventListener('scroll', this._updatePinInContainer.bind(this), { passive: true });
      window.addEventListener('resize', this._updatePinInContainer.bind(this), { passive: true });
      window.addEventListener('resize', this._updateRelativePinSpacer.bind(this), { passive: true });
      // add mousewheel listener to catch scrolls over fixed elements
      this._pin.addEventListener('mousewheel', this._onMousewheelOverPin.bind(this));
      this._pin.addEventListener('DOMMouseScroll', this._onMousewheelOverPin.bind(this));

      Log.log(3, 'added pin');

      // finally update the pin to init
      this._updatePinState();

      return this;
    }
  }, {
    key: 'removePin',
    value: function removePin(reset) {
      if (this._pin) {
        if (this._state === SCENE_STATE_DURING) {
          this._updatePinState(true); // force unpin at position
        }
        if (reset || !this._controller) {
          // if there's no controller no progress was made anyway...
          var pinTarget = this._pinOptions.spacer.firstChild; // usually the pin element, but may be another spacer (cascaded pins)...
          if (pinTarget.hasAttribute(PIN_SPACER_ATTRIBUTE$1)) {
            // copy margins to child spacer
            var inlineStyle = this._pinOptions.spacer.style;
            var values = ['margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom'];
            var margins = {};
            values.forEach(function (val) {
              margins[val] = inlineStyle[val] || '';
            });
            Util.css(pinTarget, margins);
          }
          this._pinOptions.spacer.parentNode.insertBefore(pinTarget, this._pinOptions.spacer);
          this._pinOptions.spacer.parentNode.removeChild(this._pinOptions.spacer);
          if (!this._pin.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE$1)) {
            // if it's the last pin for this element -> restore inline styles
            // TODO: only correctly set for first pin (when cascading) - how to fix?
            Util.css(this._pin, this._pin.___origStyle);
            delete this._pin.___origStyle;
          }
        }
        window.removeEventListener('scroll', this._updatePinInContainer.bind(this), { passive: true });
        window.removeEventListener('resize', this._updatePinInContainer.bind(this), { passive: true });
        window.removeEventListener('resize', this._updateRelativePinSpacer.bind(this), { passive: true });
        this._pin.removeEventListener('mousewheel', this._onMousewheelOverPin.bind(this));
        this._pin.removeEventListener('DOMMouseScroll', this._onMousewheelOverPin.bind(this));
        this._pin = null;
        this._pinOptions.spacer = null;
        Log.log(3, 'removed pin (reset: ' + (reset ? 'true' : 'false') + ')');
      }
      return this;
    }

    // class toggle

  }, {
    key: 'setClassToggle',
    value: function setClassToggle(element, classes) {
      var _this10 = this;

      var els = Util.elements(element);
      if (els.length === 0 || !_.isString(classes)) {
        Log.log(1, 'ERROR calling method \'setClassToggle()\': Invalid ' + (els.length === 0 ? 'element' : 'classes') + ' supplied.');
        return this;
      }
      if (this._cssClassElems.length > 0) {
        // remove old ones
        this.removeClassToggle();
      }
      this._cssClasses = classes;
      this._cssClassElems = els;
      this.on('enter.internal_class leave.internal_class', function (event) {
        _this10._cssClassElems.forEach(function (el) {
          el.classList[event.type === 'enter' ? 'add' : 'remove'](_this10._cssClasses);
        });
      });
      return this;
    }
  }, {
    key: 'removeClassToggle',
    value: function removeClassToggle(reset) {
      var _this11 = this;

      if (reset) {
        this._cssClassElems.forEach(function (el) {
          el.classList.remove(_this11._cssClasses);
        });
      }
      this.off('start.internal_class end.internal_class');
      this._cssClasses = null;
      this._cssClassElems = [];
      return this;
    }

    // gsap

  }, {
    key: '_updateTweenProgress',
    value: function _updateTweenProgress() {
      if (this._tween) {
        var progress = this.progress();
        var state = this.state();
        if (this._tween.repeat && this._tween.repeat() === -1) {
          // infinite loop, so not in relation to progress
          if (state === 'DURING' && this._tween.paused()) {
            this._tween.play();
          } else if (state !== 'DURING' && !this._tween.paused()) {
            this._tween.pause();
          }
        } else if (progress !== this._tween.progress()) {
          // do we even need to update the progress?
          // no infinite loop - so should we just play or go to a specific point in time?
          if (this.duration() === 0) {
            // play the animation
            if (progress > 0) {
              // play from 0 to 1
              this._tween.play();
            } else {
              // play from 1 to 0
              this._tween.reverse();
            }
          } else {
            // go to a specific point in time
            if (this.tweenChanges() && this._tween.tweenTo) {
              // go smooth
              this._tween.tweenTo(progress * this._tween.duration());
            } else {
              // just hard set it
              this._tween.progress(progress).pause();
            }
          }
        }
      }
    }
  }, {
    key: 'setTween',
    value: function setTween(TweenObject, duration, params) {
      var newTween = void 0;
      if (arguments.length > 1) {
        if (arguments.length < 3) {
          params = duration;
          duration = 1;
        }
        TweenObject = window.TweenMax.to(TweenObject, duration, params);
      }
      try {
        // wrap Tween into a Timeline Object if available to include delay and repeats in the duration and standardize methods.
        if (window.TimelineMax) {
          newTween = new window.TimelineMax({ smoothChildTiming: true }).add(TweenObject);
        } else {
          newTween = TweenObject;
        }
        newTween.pause();
      } catch (event) {
        Log.log(1, "ERROR calling method 'setTween()': Supplied argument is not a valid TweenObject");
        return this;
      }

      if (this._tween) {
        // kill old tween
        this.removeTween();
      }

      this._tween = newTween;

      // some properties need to be transferred it to the wrapper, otherwise they would get lost.
      if (TweenObject.repeat && TweenObject.repeat() === -1) {
        this._tween.repeat(-1);
        this._tween.yoyo(TweenObject.yoyo());
      }

      Log.log(3, 'added tween');

      this._updateTweenProgress();

      return this;
    }
  }, {
    key: 'removeTween',
    value: function removeTween(reset) {
      if (this._tween) {
        if (reset) {
          this._tween.progress(0).pause();
        }
        this._tween.kill();
        this._tween = null;
        Log.log(3, 'removed tween (reset: ' + (reset ? 'true' : 'false') + ')');
      }
      return this;
    }

    // indicators

  }, {
    key: 'addIndicators',
    value: function addIndicators() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (!this._indicator) {
        this._indicator = new Indicator(this, options);

        this.on('add.plugin_addIndicators', this._indicator.add.bind(this._indicator));
        this.on('remove.plugin_addIndicators', this._indicator.remove.bind(this._indicator));
        this.on('destroy.plugin_addIndicators', this.removeIndicators.bind(this));

        // it the scene already has a controller we can start right away.
        if (this.controller()) {
          this._indicator.add();
        }
      }
      return this;
    }
  }, {
    key: 'removeIndicators',
    value: function removeIndicators() {
      if (this._indicator) {
        this._indicator.remove();
        this.off('*.plugin_addIndicators');
        this._indicator = null;
      }
      return this;
    }
  }]);
  return Scene;
}();

/* eslint-env browser */

var PIN_SPACER_ATTRIBUTE = 'data-scrollwizardry-pin-spacer';

var NAMESPACE = 'ScrollWizardry.Controller';

var SCROLL_DIRECTION_FORWARD = 'FORWARD';
var SCROLL_DIRECTION_REVERSE = 'REVERSE';
var SCROLL_DIRECTION_PAUSED = 'PAUSED';

var EDGE_OFFSET = 15; // minimum edge distance, added to indentation

var Controller = function () {
  function Controller(options) {
    classCallCheck(this, Controller);

    var DEFAULT_CONTROLLER_OPTIONS = {
      container: window,
      vertical: true,
      globalSceneOptions: {},
      loglevel: 2,
      refreshInterval: 100,
      addIndicators: false
    };

    this.options = _.merge({}, DEFAULT_CONTROLLER_OPTIONS, options);

    this.options.container = Util.elements(this.options.container)[0];

    if (!this.options.container) {
      Log.log(1, 'ERROR creating object ' + NAMESPACE + ': No valid scroll container supplied');
      throw Error(NAMESPACE + ' init failed');
    }

    this._isDocument = this.options.container === window || this.options.container === document.body || !document.body.contains(this.options.container);
    this._sceneObjects = [];
    this._updateScenesOnNextCycle = false;
    this._scrollPos = 0;
    this._scrollDirection = SCROLL_DIRECTION_PAUSED;
    this._viewportSize = 0;
    this._enabled = true;
    this._updateTimeout = null;
    this._refreshTimeout = null;

    // normalize to window
    if (this._isDocument) {
      this.options.container = window;
    }

    // update container size immediately
    this._viewportSize = this._getViewportSize();

    // set event handlers
    this.options.container.addEventListener('resize', this._onChange.bind(this), { passive: true });
    this.options.container.addEventListener('scroll', this._onChange.bind(this), { passive: true });

    var ri = parseInt(this.options.refreshInterval, 10);
    this.options.refreshInterval = _.isNumber(ri) ? ri : DEFAULT_CONTROLLER_OPTIONS.refreshInterval;
    this._scheduleRefresh();

    // indicators
    this._info = this.info();
    this._container = this._info.container;
    this._isDocument = this._info.isDocument;
    this._vertical = this._info.vertical;
    this._indicators = {
      groups: []
    };

    if (this.options.addIndicators) {
      this._container.addEventListener('resize', this._handleTriggerPositionChange.bind(this), { passive: true });
      if (!this._isDocument) {
        window.addEventListener('resize', this._handleTriggerPositionChange.bind(this), { passive: true });
        window.addEventListener('scroll', this._handleTriggerPositionChange.bind(this), { passive: true });
      }
      // update all related bounds containers
      this._container.addEventListener('resize', this._handleBoundsPositionChange.bind(this), { passive: true });
      this._container.addEventListener('scroll', this._handleBoundsPositionChange.bind(this), { passive: true });
    }

    Log.log(3, 'added new ' + NAMESPACE);
  }

  createClass(Controller, [{
    key: '_scheduleRefresh',
    value: function _scheduleRefresh() {
      if (this.options.refreshInterval > 0) {
        this._refreshTimeout = window.setTimeout(this._refresh.bind(this), this.options.refreshInterval);
      }
    }
  }, {
    key: '_getScrollPos',
    value: function _getScrollPos() {
      return this.options.vertical ? Util.scrollTop(this.options.container) : Util.scrollLeft(this.options.container);
    }
  }, {
    key: '_getViewportSize',
    value: function _getViewportSize() {
      return this.options.vertical ? Util.height(this.options.container) : Util.width(this.options.container);
    }
  }, {
    key: '_setScrollPos',
    value: function _setScrollPos(pos) {
      if (this.options.vertical) {
        if (this._isDocument) {
          window.scrollTo(Util.scrollLeft(), pos);
        } else {
          this.options.container.scrollTop = pos;
        }
      } else if (this._isDocument) {
        window.scrollTo(pos, Util.scrollTop());
      } else {
        this.options.container.scrollLeft = pos;
      }
    }
  }, {
    key: '_updateScenes',
    value: function _updateScenes() {
      var _this = this;

      if (this._enabled && this._updateScenesOnNextCycle) {
        // determine scenes to update
        var scenesToUpdate = _.isArray(this._updateScenesOnNextCycle) ? this._updateScenesOnNextCycle : this._sceneObjects.slice(0);

        // reset scenes
        this._updateScenesOnNextCycle = false;

        var oldScrollPos = this._scrollPos;

        // update scroll pos now instead of on change, as it might have changed since scheduling (i.e. in-browser smooth scroll)
        this._scrollPos = this.scrollPos();

        var deltaScroll = this._scrollPos - oldScrollPos;

        if (deltaScroll !== 0) {
          // scroll position changed?
          this._scrollDirection = deltaScroll > 0 ? SCROLL_DIRECTION_FORWARD : SCROLL_DIRECTION_REVERSE;
        }

        // reverse order of scenes if scrolling reverse
        if (this._scrollDirection === SCROLL_DIRECTION_REVERSE) {
          scenesToUpdate.reverse();
        }

        // update scenes
        scenesToUpdate.forEach(function (scene, index) {
          Log.log(3, 'updating scene ' + (index + 1) + '/' + scenesToUpdate.length + ' (' + _this._sceneObjects.length + ' total)');
          scene.update(true);
        });

        if (scenesToUpdate.length === 0 && this.options.loglevel >= 3) {
          Log.log(3, 'updating 0 scenes (nothing added to controller)');
        }
      }
    }
  }, {
    key: '_debounceUpdate',
    value: function _debounceUpdate() {
      this._updateTimeout = window.requestAnimationFrame(this._updateScenes.bind(this));
    }
  }, {
    key: '_onChange',
    value: function _onChange(event) {
      Log.log(3, 'event fired causing an update:', event.type);
      if (event.type === 'resize') {
        // resize
        this._viewportSize = this._getViewportSize();
        this._scrollDirection = SCROLL_DIRECTION_PAUSED;
      }
      // schedule update
      if (this._updateScenesOnNextCycle !== true) {
        this._updateScenesOnNextCycle = true;
        this._debounceUpdate();
      }
    }
  }, {
    key: '_refresh',
    value: function _refresh() {
      if (!this._isDocument) {
        // simulate resize event, only works for viewport relevant param (performance)
        if (this._viewportSize !== this._getViewportSize()) {
          var resizeEvent = void 0;
          try {
            resizeEvent = new Event('resize', { bubbles: false, cancelable: false });
          } catch (event) {
            // stupid IE
            resizeEvent = document.createEvent('Event');
            resizeEvent.initEvent('resize', false, false);
          }
          this.options.container.dispatchEvent(resizeEvent);
        }
      }

      // refresh all scenes
      this._sceneObjects.forEach(function (scene, index) {
        scene.refresh();
      });

      this._scheduleRefresh();
    }
  }, {
    key: '_sortScenes',
    value: function _sortScenes(scenesArray) {
      if (scenesArray.length <= 1) {
        return scenesArray;
      }
      var scenes = scenesArray.slice(0);
      scenes.sort(function (a, b) {
        return a.scrollOffset() > b.scrollOffset() ? 1 : -1;
      });
      return scenes;
    }
  }, {
    key: 'addScene',
    value: function addScene(newScene) {
      var _this2 = this;

      if (_.isArray(newScene)) {
        newScene.forEach(function (scene) {
          _this2.addScene(scene);
        });
      } else if (newScene.controller() !== this) {
        newScene.addTo(this);
      } else if (!this._sceneObjects.includes(newScene)) {
        this._sceneObjects.push(newScene);

        this._sceneObjects = this._sortScenes(this._sceneObjects);

        newScene.on('shift.controller_sort', function () {
          // resort whenever scene moves
          _this2._sceneObjects = _this2._sortScenes(_this2._sceneObjects);
        });

        // insert global defaults
        Object.keys(this.options.globalSceneOptions).forEach(function (key) {
          if (newScene[key]) {
            newScene[key].call(newScene, _this2.options.globalSceneOptions[key]);
          }
        });

        Log.log(3, 'adding Scene (now ' + this._sceneObjects.length + ' total)');
      }

      // indicators
      if (this.options.addIndicators) {
        if (newScene instanceof Scene && newScene.controller() === this) {
          newScene.addIndicators();
        }
      }

      return this;
    }
  }, {
    key: 'removeScene',
    value: function removeScene(scene) {
      var _this3 = this;

      if (_.isArray(scene)) {
        scene.forEach(function (_scene) {
          _this3.removeScene(_scene);
        });
      } else {
        var index = this._sceneObjects.indexOf(scene);

        if (index > -1) {
          scene.off('shift.controller_sort');

          this._sceneObjects.splice(index, 1);

          Log.log(3, 'removing Scene (now ' + this._sceneObjects.length + ' left)');

          scene.remove();
        }
      }
      return this;
    }
  }, {
    key: 'updateScene',
    value: function updateScene(scene, immediately) {
      var _this4 = this;

      if (_.isArray(scene)) {
        scene.forEach(function (_scene) {
          _this4.updateScene(_scene, immediately);
        });
      } else if (immediately) {
        scene.update(true);

        // if this._updateScenesOnNextCycle is true, all connected scenes are already scheduled for update
      } else if (this._updateScenesOnNextCycle !== true) {
        // prep array for next update cycle
        this._updateScenesOnNextCycle = this._updateScenesOnNextCycle || [];

        if (this._updateScenesOnNextCycle.indexOf(scene) === -1) {
          this._updateScenesOnNextCycle.push(scene);
        }

        this._updateScenesOnNextCycle = this._sortScenes(this._updateScenesOnNextCycle);

        this._debounceUpdate();
      }
      return this;
    }
  }, {
    key: 'update',
    value: function update(immediately) {
      this._onChange({ type: 'resize' }); // will update size and set _updateScenesOnNextCycle to true

      if (immediately) {
        this._updateScenes();
      }

      return this;
    }
  }, {
    key: 'scrollTo',
    value: function scrollTo(scrollTarget, additionalParameter) {
      if (_.isNumber(scrollTarget)) {
        this._setScrollPos.call(this.options.container, scrollTarget, additionalParameter);
      } else if (_.isFunction(scrollTarget)) {
        this._setScrollPos = scrollTarget;
      } else if (_.isElement(scrollTarget)) {
        // if parent is pin spacer, use spacer position instead
        // so correct start position is returned for pinned elements
        while (scrollTarget.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE)) {
          scrollTarget = scrollTarget.parentNode;
        }

        var offset = this.options.vertical ? 'top' : 'left';

        // container position is needed because element offset is returned in relation to document
        // not in relation to container
        var containerOffset = Util.offset(this.options.container);

        var elementOffset = Util.offset(scrollTarget);

        if (!this._isDocument) {
          // container is not the document root, so substract scroll position
          // to get correct trigger element position relative to scroll content
          containerOffset[offset] -= this.scrollPos();
        }

        this.scrollTo(elementOffset[offset] - containerOffset[offset], additionalParameter);
      } else if (scrollTarget instanceof Scene) {
        if (scrollTarget.controller() === this) {
          this.scrollTo(scrollTarget.scrollOffset(), additionalParameter);
        } else {
          Log.log(2, 'scrollTo(): The supplied scene does not belong to this controller, scroll cancelled', scrollTarget);
        }
      }

      return this;
    }
  }, {
    key: 'scrollPos',
    value: function scrollPos(scrollPosMethod) {
      if (!arguments.length) {
        return this._getScrollPos.call(this);
      }

      if (_.isFunction(scrollPosMethod)) {
        this._getScrollPos = scrollPosMethod;
      } else {
        Log.log(2, 'Provided value for method \'scrollPos()\' is not a function, to change the current scroll position use \'scrollTo()\'');
      }

      return this;
    }
  }, {
    key: 'info',
    value: function info(about) {
      var values = {
        size: this._viewportSize,
        vertical: this.options.vertical,
        scrollPos: this._scrollPos,
        scrollDirection: this._scrollDirection,
        container: this.options.container,
        isDocument: this._isDocument
      };

      if (values[about] !== undefined) {
        return values[about];
      }

      return values;
    }
  }, {
    key: 'loglevel',
    value: function loglevel(newLoglevel) {
      if (!arguments.length) {
        return this.options.loglevel;
      } else if (this.options.loglevel !== newLoglevel) {
        this.options.loglevel = newLoglevel;
      }

      return this;
    }
  }, {
    key: 'enabled',
    value: function enabled(newState) {
      if (!arguments.length) {
        return this._enabled;
      } else if (this._enabled !== newState) {
        this._enabled = !!newState;

        this.updateScene(this._sceneObjects, true);
      }

      return this;
    }
  }, {
    key: 'destroy',
    value: function destroy(resetScenes) {
      window.clearTimeout(this._refreshTimeout);

      this._sceneObjects.forEach(function (scene) {
        return scene.destroy(resetScenes);
      });

      this.options.container.removeEventListener('resize', this._onChange.bind(this), { passive: true });
      this.options.container.removeEventListener('scroll', this._onChange.bind(this), { passive: true });

      window.cancelAnimationFrame(this._updateTimeout);

      Log.log(3, 'destroyed ' + NAMESPACE + ' (reset: ' + (resetScenes ? 'true' : 'false') + ')');

      // indicators
      if (this.options.addIndicators) {
        this._container.removeEventListener('resize', this._handleTriggerPositionChange.bind(this), { passive: true });
        if (!this._isDocument) {
          window.removeEventListener('resize', this._handleTriggerPositionChange.bind(this), { passive: true });
          window.removeEventListener('scroll', this._handleTriggerPositionChange.bind(this), { passive: true });
        }
        this._container.removeEventListener('resize', this._handleBoundsPositionChange.bind(this), { passive: true });
        this._container.removeEventListener('scroll', this._handleBoundsPositionChange.bind(this), { passive: true });
      }

      return null;
    }

    // indicators

    // event handler for when associated bounds markers need to be repositioned

  }, {
    key: '_handleBoundsPositionChange',
    value: function _handleBoundsPositionChange() {
      this.updateBoundsPositions();
    }

    // event handler for when associated trigger groups need to be repositioned

  }, {
    key: '_handleTriggerPositionChange',
    value: function _handleTriggerPositionChange() {
      this.updateTriggerGroupPositions();

      this._sceneObjects.forEach(function (scene, index) {
        if (scene._indicator) {
          scene._indicator._updateBounds();
        }
      });
    }

    // updates the position of the bounds container to aligned to the right for vertical containers and to the bottom for horizontal

  }, {
    key: 'updateBoundsPositions',
    value: function updateBoundsPositions(specificIndicator) {
      // constant for all bounds
      var groups = specificIndicator ? [_.merge({}, specificIndicator.triggerGroup, { members: [specificIndicator] })] : // create a group with only one element
      this._indicators.groups; // use all
      var groupsCount = groups.length;
      var pos = this._vertical ? 'left' : 'top';
      var dimension = this._vertical ? 'width' : 'height';
      var edge = this._vertical ? Util.scrollLeft(this._container) + (Util.width(this._container) - EDGE_OFFSET) : Util.scrollTop(this._container) + (Util.height(this._container) - EDGE_OFFSET);
      var boundsCount = void 0;
      var triggerSize = void 0;
      var group = void 0;

      while (groupsCount--) {
        // group loop
        group = groups[groupsCount];
        boundsCount = group.members.length;
        triggerSize = Util[dimension](group.element.firstChild);

        while (boundsCount--) {
          // indicators loop
          var boundsCss = {};
          boundsCss[pos] = edge - triggerSize;
          Util.css(group.members[boundsCount].bounds, boundsCss);
        }
      }
    }

    // updates the positions of all trigger groups attached to a controller or a specific one, if provided

  }, {
    key: 'updateTriggerGroupPositions',
    value: function updateTriggerGroupPositions(specificGroup) {
      // constant vars
      var groups = specificGroup ? [specificGroup] : this._indicators.groups;
      var i = groups.length;
      var container = this._isDocument ? document.body : this._container;
      var containerOffset = this._isDocument ? { top: 0, left: 0 } : Util.offset(container, true);
      var edge = this._vertical ? Util.width(this._container) - EDGE_OFFSET : Util.height(this._container) - EDGE_OFFSET;
      var dimension = this._vertical ? 'width' : 'height';
      var transformAxis = this._vertical ? 'Y' : 'X';

      // changing vars
      var group = void 0;
      var el = void 0;
      var pos = void 0;
      var elSize = void 0;
      var transform = void 0;
      while (i--) {
        group = groups[i];
        el = group.element;
        pos = group.triggerHook * this.info('size');
        elSize = Util[dimension](el.firstChild.firstChild);
        transform = pos > elSize ? 'translate' + transformAxis + '(-100%)' : '';

        Util.css(el, {
          top: containerOffset.top + (this._vertical ? pos : edge - group.members[0].options.indent),
          left: containerOffset.left + (this._vertical ? edge - group.members[0].options.indent : pos)
        });

        Util.css(el.firstChild.firstChild, { transform: transform });
      }
    }

    // updates the label for the group to contain the name, if it only has one member

  }, {
    key: 'updateTriggerGroupLabel',
    value: function updateTriggerGroupLabel(group) {
      var text = 'trigger' + (group.members.length > 1 ? '' : ' ' + group.members[0].options.name);
      var elem = group.element.firstChild.firstChild;
      var doUpdate = elem.textContent !== text;
      if (doUpdate) {
        elem.textContent = text;
        if (this._vertical) {
          // bounds position is dependent on text length, so update
          this.updateBoundsPositions();
        }
      }
    }
  }]);
  return Controller;
}();

/* eslint-env browser */

exports.Controller = Controller;
exports.Scene = Scene;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=scrollwizardry.js.map
