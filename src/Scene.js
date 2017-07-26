/* eslint-env browser */

import _util from './_util';
import Event from './Event';
import Indicator from './Indicator';

const PIN_SPACER_ATTRIBUTE = 'data-scrollmagic-pin-spacer';

const NAMESPACE = 'ScrollWizardry.Scene';

const SCENE_STATE_BEFORE = 'BEFORE';
const SCENE_STATE_DURING = 'DURING';
const SCENE_STATE_AFTER = 'AFTER';

let _state = SCENE_STATE_BEFORE;
let _progress = 0;
let _scrollOffset = { start: 0, end: 0 };
let _triggerPos = 0;
let _durationUpdateMethod;
let _controller;
const _listeners = {};

let _pin;
let _pinOptions;

let _cssClasses;
let _cssClassElems = [];

let _tween;

let _indicator;
const _autoindex = 0;

const DEFAULT_INDICATOR_OPTIONS = {
  name: '',
  indent: 0,
  parent: undefined,
  colorStart: 'green',
  colorEnd: 'red',
  colorTrigger: 'blue',
};

const SCENE_OPTIONS = {
  defaults: {
    duration: 0,
    offset: 0,
    triggerElement: undefined,
    triggerHook: 0.5,
    reverse: true,
    loglevel: 2,
    tweenChanges: false,
  },
  validate: {
    duration(val) {
      if (_util.type.String(val) && val.match(/^(\.|\d)*\d+%$/)) {
        // percentage value
        const perc = parseFloat(val) / 100;
        val = function () {
          return _controller ? _controller.info('size') * perc : 0;
        };
      }
      if (_util.type.Function(val)) {
        // function
        _durationUpdateMethod = val;
        try {
          val = parseFloat(_durationUpdateMethod());
        } catch (e) {
          val = -1; // will cause error below
        }
      }
      // val has to be float
      val = parseFloat(val);
      if (!_util.type.Number(val) || val < 0) {
        if (_durationUpdateMethod) {
          _durationUpdateMethod = undefined;
          throw Error(`Invalid return value of supplied function for option "duration": ${val}`);
        } else {
          throw Error(`Invalid value for option "duration": ${val}`);
        }
      }
      return val;
    },
    offset(val) {
      val = parseFloat(val);
      if (!_util.type.Number(val)) {
        throw Error(`Invalid value for option "offset": ${val}`);
      }
      return val;
    },
    triggerElement(val) {
      val = val || undefined;
      if (val) {
        const elem = _util.get.elements(val)[0];
        if (elem && elem.parentNode) {
          val = elem;
        } else {
          throw Error(`Element defined in option "triggerElement" was not found: ${val}`);
        }
      }
      return val;
    },
    triggerHook(val) {
      const translate = { onCenter: 0.5, onEnter: 1, onLeave: 0 };
      if (_util.type.Number(val)) {
        val = Math.max(0, Math.min(parseFloat(val), 1)); //  make sure its betweeen 0 and 1
      } else if (val in translate) {
        val = translate[val];
      } else {
        throw Error(`Invalid value for option "triggerHook": ${val}`);
      }
      return val;
    },
    reverse(val) {
      return !!val; // force boolean
    },
    loglevel(val) {
      val = parseInt(val, 10);
      if (!_util.type.Number(val) || val < 0 || val > 3) {
        throw Error(`Invalid value for option "loglevel": ${val}`);
      }
      return val;
    },
    tweenChanges(val) {
      return !!val;
    },
  },
  // list of options that trigger a `shift` event
  shifts: ['duration', 'offset', 'triggerHook'],
};

const DEFAULT_OPTIONS = SCENE_OPTIONS.defaults;

class Scene {
  constructor(options) {
    this.options = _util.extend({}, DEFAULT_OPTIONS, options);

    // add getters/setters for all possible options
    for (const optionName in DEFAULT_OPTIONS) {
      this._addSceneOption(optionName);
    }

    // validate all options
    this._validateOption();

    this.on('change.internal', (event) => {
      if (event.what !== 'loglevel' && event.what !== 'tweenChanges') { // no need for a scene update scene with these options...
        if (event.what === 'triggerElement') {
          this._updateTriggerElementPosition();
        } else if (event.what === 'reverse') { // the only property left that may have an impact on the current scene state. Everything else is handled by the shift event.
          this.update();
        }
      }
    });

    this.on('shift.internal', (event) => {
      this._updateScrollOffset();
      this.update(); // update scene to reflect new position
    });

    // pinning

    this.on('shift.internal', (event) => {
      const durationChanged = event.reason === 'duration';
      if ((_state === SCENE_STATE_AFTER && durationChanged) || (_state === SCENE_STATE_DURING && this.options.duration === 0)) {
        // if [duration changed after a scene (inside scene progress updates pin position)] or [duration is 0, we are in pin phase and some other value changed].
        this._updatePinState();
      }
      if (durationChanged) {
        this._updatePinDimensions();
      }
    });

    this.on('progress.internal', (event) => {
      this._updatePinState();
    });

    this.on('add.internal', (event) => {
      this._updatePinDimensions();
    });

    this.on('destroy.internal', (event) => {
      this.removePin(event.reset);
    });

    // class toggle

    this.on('destroy.internal', (event) => {
      this.removeClassToggle(event.reset);
    });

    // gsap

    this.on('progress.plugin_gsap', () => {
      this._updateTweenProgress();
    });

    this.on('destroy.plugin_gsap', (event) => {
      this.removeTween(event.reset);
    });
  }

  on(names, callback) {
    if (_util.type.Function(callback)) {
      names = names.trim().split(' ');
      names.forEach((fullname) => {
        const nameparts = fullname.split('.');
        const eventname = nameparts[0];
        const namespace = nameparts[1];
        if (eventname !== '*') { // disallow wildcards
          if (!_listeners[eventname]) {
            _listeners[eventname] = [];
          }
          _listeners[eventname].push({
            namespace: namespace || '',
            callback,
          });
        }
      });
    } else {
      _util.log(1, `ERROR when calling '.on()': Supplied callback for '${names}' is not a valid function!`);
    }
    return this;
  }

  off(names, callback) {
    if (!names) {
      _util.log(1, 'ERROR: Invalid event name supplied.');
      return this;
    }
    names = names.trim().split(' ');
    names.forEach((fullname, key) => {
      const nameparts = fullname.split('.');
      const eventname = nameparts[0];
      const namespace = nameparts[1] || '';
      const removeList = eventname === '*' ? Object.keys(_listeners) : [eventname];
      removeList.forEach((remove) => {
        const list = _listeners[remove] || [];
        let i = list.length;
        while (i--) {
          const listener = list[i];
          if (listener && (namespace === listener.namespace || namespace === '*') && (!callback || callback === listener.callback)) {
            list.splice(i, 1);
          }
        }
        if (!list.length) {
          delete _listeners[remove];
        }
      });
    });
    return this;
  }

  trigger(name, vars) {
    if (name) {
      const nameparts = name.trim().split('.');
      const eventname = nameparts[0];
      const namespace = nameparts[1];
      const listeners = _listeners[eventname];
      _util.log(3, 'event fired:', eventname, vars ? '->' : '', vars || '');
      if (listeners) {
        listeners.forEach((listener, key) => {
          if (!namespace || namespace === listener.namespace) {
            listener.callback.call(this, new Event(eventname, listener.namespace, this, vars));
          }
        });
      }
    } else {
      _util.log(1, 'ERROR: Invalid event name supplied.');
    }
    return this;
  }

  addTo(controller) {
    if (_controller !== controller) {
      // new controller
      if (_controller) { // was associated to a different controller before, so remove it...
        _controller.removeScene(this);
      }
      _controller = controller;
      this._validateOption();
      this._updateDuration(true);
      this._updateTriggerElementPosition(true);
      this._updateScrollOffset();
      _controller.info('container').addEventListener('resize', this._onContainerResize);
      controller.addScene(this);
      this.trigger('add', { controller: _controller });
      _util.log(3, `added ${NAMESPACE} to controller`);
      this.update();
    }
    return this;
  }

  remove() {
    if (_controller) {
      _controller.info('container').removeEventListener('resize', this._onContainerResize);
      const tmpParent = _controller;
      _controller = undefined;
      tmpParent.removeScene(this);
      this.trigger('remove');
      _util.log(3, `removed ${NAMESPACE} from controller`);
    }
    return this;
  }

  destroy(reset) {
    this.trigger('destroy', { reset });
    this.remove();
    this.off('*.*');
    _util.log(3, `destroyed ${NAMESPACE} (reset: ${reset ? 'true' : 'false'})`);
    return null;
  }

  update(immediately) {
    if (_controller) {
      if (immediately) {
        if (_controller.enabled()) {
          const scrollPos = _controller.info('scrollPos');
          let newProgress;

          if (this.options.duration > 0) {
            newProgress = (scrollPos - _scrollOffset.start) / (_scrollOffset.end - _scrollOffset.start);
          } else {
            newProgress = scrollPos >= _scrollOffset.start ? 1 : 0;
          }

          this.trigger('update', { startPos: _scrollOffset.start, endPos: _scrollOffset.end, scrollPos });

          this.progress(newProgress);
        } else if (_pin && _state === SCENE_STATE_DURING) {
          this._updatePinState(true); // unpin in position
        }
      } else {
        _controller.updateScene(this, false);
      }
    }
    return this;
  }

  refresh() {
    this._updateDuration();
    this._updateTriggerElementPosition();
    // update trigger element position
    return this;
  }

  progress(progress) {
    if (!arguments.length) { // get
      return _progress;
    } // set

    let doUpdate = false;
    const oldState = _state;
    const scrollDirection = _controller ? _controller.info('scrollDirection') : 'PAUSED';
    const reverseOrForward = this.options.reverse || progress >= _progress;
    if (this.options.duration === 0) {
      // zero duration scenes
      doUpdate = _progress !== progress;
      _progress = progress < 1 && reverseOrForward ? 0 : 1;
      _state = _progress === 0 ? SCENE_STATE_BEFORE : SCENE_STATE_DURING;
    } else {
      // scenes with start and end
      if (progress < 0 && _state !== SCENE_STATE_BEFORE && reverseOrForward) {
        // go back to initial state
        _progress = 0;
        _state = SCENE_STATE_BEFORE;
        doUpdate = true;
      } else if (progress >= 0 && progress < 1 && reverseOrForward) {
        _progress = progress;
        _state = SCENE_STATE_DURING;
        doUpdate = true;
      } else if (progress >= 1 && _state !== SCENE_STATE_AFTER) {
        _progress = 1;
        _state = SCENE_STATE_AFTER;
        doUpdate = true;
      } else if (_state === SCENE_STATE_DURING && !reverseOrForward) {
        this._updatePinState(); // in case we scrolled backwards mid-scene and reverse is disabled => update the pin position, so it doesn't move back as well.
      }
    }
    if (doUpdate) {
      // fire events
      const eventVars = { progress: _progress, state: _state, scrollDirection };
      const stateChanged = _state !== oldState;

      const trigger = (eventName) => { // tmp helper to simplify code
        this.trigger(eventName, eventVars);
      };

      if (stateChanged) { // enter events
        if (oldState !== SCENE_STATE_DURING) {
          trigger('enter');
          trigger(oldState === SCENE_STATE_BEFORE ? 'start' : 'end');
        }
      }
      trigger('progress');
      if (stateChanged) { // leave events
        if (_state !== SCENE_STATE_DURING) {
          trigger(_state === SCENE_STATE_BEFORE ? 'start' : 'end');
          trigger('leave');
        }
      }
    }

    return this;
  }

  _updateScrollOffset() {
    _scrollOffset = { start: _triggerPos + this.options.offset };
    if (_controller && this.options.triggerElement) {
      // take away triggerHook portion to get relative to top
      _scrollOffset.start -= _controller.info('size') * this.options.triggerHook;
    }
    _scrollOffset.end = _scrollOffset.start + this.options.duration;
  }

  _updateDuration(suppressEvents) {
    // update duration
    if (_durationUpdateMethod) {
      const varname = 'duration';
      if (this._changeOption(varname, _durationUpdateMethod.call(this)) && !suppressEvents) { // set
        this.trigger('change', { what: varname, newval: this.options[varname] });
        this.trigger('shift', { reason: varname });
      }
    }
  }

  _updateTriggerElementPosition(suppressEvents) {
    let elementPos = 0;
    let telem = this.options.triggerElement;
    if (_controller && (telem || _triggerPos > 0)) { // either an element exists or was removed and the triggerPos is still > 0
      if (telem) { // there currently a triggerElement set
        if (telem.parentNode) { // check if element is still attached to DOM
          const controllerInfo = _controller.info();
          const containerOffset = _util.get.offset(controllerInfo.container); // container position is needed because element offset is returned in relation to document, not in relation to container.
          const param = controllerInfo.vertical ? 'top' : 'left'; // which param is of interest ?

          // if parent is spacer, use spacer position instead so correct start position is returned for pinned elements.
          while (telem.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE)) {
            telem = telem.parentNode;
          }

          const elementOffset = _util.get.offset(telem);

          if (!controllerInfo.isDocument) { // container is not the document root, so substract scroll Position to get correct trigger element position relative to scrollcontent
            containerOffset[param] -= _controller.scrollPos();
          }

          elementPos = elementOffset[param] - containerOffset[param];
        } else { // there was an element, but it was removed from DOM
          _util.log(2, 'WARNING: triggerElement was removed from DOM and will be reset to', undefined);
          this.triggerElement(undefined); // unset, so a change event is triggered
        }
      }

      const changed = elementPos !== _triggerPos;
      _triggerPos = elementPos;
      if (changed && !suppressEvents) {
        this.trigger('shift', { reason: 'triggerElementPosition' });
      }
    }
  }

  _onContainerResize(event) {
    if (this.options.triggerHook > 0) {
      this.trigger('shift', { reason: 'containerResize' });
    }
  }

  _validateOption(check) {
    check = arguments.length ? [check] : Object.keys(SCENE_OPTIONS.validate);
    check.forEach((optionName, key) => {
      let value;
      if (SCENE_OPTIONS.validate[optionName]) { // there is a validation method for this option
        try { // validate value
          value = SCENE_OPTIONS.validate[optionName](this.options[optionName]);
        } catch (event) { // validation failed -> reset to default
          value = DEFAULT_OPTIONS[optionName];
          const logMSG = _util.type.String(event) ? [event] : event;
          if (_util.type.Array(logMSG)) {
            logMSG[0] = `ERROR: ${logMSG[0]}`;
            logMSG.unshift(1); // loglevel 1 for error msg
            _util.log.apply(this, logMSG);
          } else {
            _util.log(1, `ERROR: Problem executing validation callback for option '${optionName}':`, event.message);
          }
        } finally {
          this.options[optionName] = value;
        }
      }
    });
  }

  _changeOption(varname, newval) {
    let changed = false;
    const oldval = this.options[varname];
    if (this.options[varname] !== newval) {
      this.options[varname] = newval;
      this._validateOption(varname); // resets to default if necessary
      changed = oldval !== this.options[varname];
    }
    return changed;
  }

  _addSceneOption(optionName) {
    if (!this[optionName]) {
      this[optionName] = function (newVal) {
        if (!arguments.length) { // get
          return this.options[optionName];
        }
        if (optionName === 'duration') { // new duration is set, so any previously set function must be unset
          _durationUpdateMethod = undefined;
        }
        if (this._changeOption(optionName, newVal)) { // set
          this.trigger('change', { what: optionName, newval: this.options[optionName] });
          if (SCENE_OPTIONS.shifts.indexOf(optionName) > -1) {
            this.trigger('shift', { reason: optionName });
          }
        }

        return this;
      };
    }
  }

  controller() {
    return _controller;
  }

  state() {
    return _state;
  }

  scrollOffset() {
    return _scrollOffset.start;
  }

  triggerPosition() {
    let pos = this.options.offset; // the offset is the basis
    if (_controller) {
      // get the trigger position
      if (this.options.triggerElement) {
        // Element as trigger
        pos += _triggerPos;
      } else {
        // return the height of the triggerHook to start at the beginning
        pos += _controller.info('size') * this.triggerHook();
      }
    }
    return pos;
  }

  // pinning

  _updatePinState(forceUnpin) {
    if (_pin && _controller) {
      const containerInfo = _controller.info();
      const pinTarget = _pinOptions.spacer.firstChild; // may be pin element or another spacer, if cascading pins

      if (!forceUnpin && _state === SCENE_STATE_DURING) { // during scene or if duration is 0 and we are past the trigger
        // pinned state
        if (_util.css(pinTarget, 'position') !== 'fixed') {
          // change state before updating pin spacer (position changes due to fixed collapsing might occur.)
          _util.css(pinTarget, { position: 'fixed' });
          // update pin spacer
          this._updatePinDimensions();
        }

        const fixedPos = _util.get.offset(_pinOptions.spacer, true); // get viewport position of spacer
        const scrollDistance = this.options.reverse || this.options.duration === 0 ?
          containerInfo.scrollPos - _scrollOffset.start // quicker
          : Math.round(_progress * this.options.duration * 10) / 10; // if no reverse and during pin the position needs to be recalculated using the progress

        // add scrollDistance
        fixedPos[containerInfo.vertical ? 'top' : 'left'] += scrollDistance;

        // set new values
        _util.css(_pinOptions.spacer.firstChild, {
          top: fixedPos.top,
          left: fixedPos.left,
        });
      } else {
        // unpinned state
        const newCSS = {
          position: _pinOptions.inFlow ? 'relative' : 'absolute',
          top: 0,
          left: 0,
        };
        let change = _util.css(pinTarget, 'position') !== newCSS.position;

        if (!_pinOptions.pushFollowers) {
          newCSS[containerInfo.vertical ? 'top' : 'left'] = this.options.duration * _progress;
        } else if (this.options.duration > 0) { // only concerns scenes with duration
          if (_state === SCENE_STATE_AFTER && parseFloat(_util.css(_pinOptions.spacer, 'padding-top')) === 0) {
            change = true; // if in after state but havent updated spacer yet (jumped past pin)
          } else if (_state === SCENE_STATE_BEFORE && parseFloat(_util.css(_pinOptions.spacer, 'padding-bottom')) === 0) { // before
            change = true; // jumped past fixed state upward direction
          }
        }
        // set new values
        _util.css(pinTarget, newCSS);
        if (change) {
          // update pin spacer if state changed
          this._updatePinDimensions();
        }
      }
    }
  }

  _updatePinDimensions() {
    if (_pin && _controller && _pinOptions.inFlow) { // no spacerresize, if original position is absolute
      const after = (_state === SCENE_STATE_AFTER);
      const before = (_state === SCENE_STATE_BEFORE);
      const during = (_state === SCENE_STATE_DURING);
      const vertical = _controller.info('vertical');
      const pinTarget = _pinOptions.spacer.firstChild; // usually the pined element but can also be another spacer (cascaded pins)
      const marginCollapse = _util.isMarginCollapseType(_util.css(_pinOptions.spacer, 'display'));
      const css = {};

      // set new size
      // if relsize: spacer -> pin | else: pin -> spacer
      if (_pinOptions.relSize.width || _pinOptions.relSize.autoFullWidth) {
        if (during) {
          _util.css(_pin, { width: _util.get.width(_pinOptions.spacer) });
        } else {
          _util.css(_pin, { width: '100%' });
        }
      } else {
        // minwidth is needed for cascaded pins.
        css['min-width'] = _util.get.width(vertical ? _pin : pinTarget, true, true);
        css.width = during ? css['min-width'] : 'auto';
      }
      if (_pinOptions.relSize.height) {
        if (during) {
          // the only padding the spacer should ever include is the duration (if pushFollowers = true), so we need to substract that.
          _util.css(_pin, { height: _util.get.height(_pinOptions.spacer) - (_pinOptions.pushFollowers ? this.options.duration : 0) });
        } else {
          _util.css(_pin, { height: '100%' });
        }
      } else {
        // margin is only included if it's a cascaded pin to resolve an IE9 bug
        css['min-height'] = _util.get.height(vertical ? pinTarget : _pin, true, !marginCollapse); // needed for cascading pins
        css.height = during ? css['min-height'] : 'auto';
      }

      // add space for duration if pushFollowers is true
      if (_pinOptions.pushFollowers) {
        css[`padding${vertical ? 'Top' : 'Left'}`] = this.options.duration * _progress;
        css[`padding${vertical ? 'Bottom' : 'Right'}`] = this.options.duration * (1 - _progress);
      }
      _util.css(_pinOptions.spacer, css);
    }
  }

  _updatePinInContainer() {
    if (_controller && _pin && _state === SCENE_STATE_DURING && !_controller.info('isDocument')) {
      this._updatePinState();
    }
  }

  _updateRelativePinSpacer() {
    if (_controller && _pin &&
      _state === SCENE_STATE_DURING && // element in pinned state?
      ( // is width or height relatively sized, but not in relation to body? then we need to recalc.
        ((_pinOptions.relSize.width || _pinOptions.relSize.autoFullWidth) && _util.get.width(window) !== _util.get.width(_pinOptions.spacer.parentNode)) ||
        (_pinOptions.relSize.height && _util.get.height(window) !== _util.get.height(_pinOptions.spacer.parentNode))
      )
    ) {
      this._updatePinDimensions();
    }
  }

  _onMousewheelOverPin(event) {
    if (_controller && _pin && _state === SCENE_STATE_DURING && !_controller.info('isDocument')) { // in pin state
      event.preventDefault();
      _controller._setScrollPos(_controller.info('scrollPos') - ((event.wheelDelta || event[_controller.info('vertical') ? 'wheelDeltaY' : 'wheelDeltaX']) / 3 || -event.detail * 30));
    }
  }

  setPin(element, settings) {
    const defaultSettings = {
      pushFollowers: true,
      spacerClass: 'scrollmagic-pin-spacer',
    };
    settings = _util.extend({}, defaultSettings, settings);

    // validate Element
    element = _util.get.elements(element)[0];
    if (!element) {
      _util.log(1, "ERROR calling method 'setPin()': Invalid pin element supplied.");
      return this; // cancel
    } else if (_util.css(element, 'position') === 'fixed') {
      _util.log(1, "ERROR calling method 'setPin()': Pin does not work with elements that are positioned 'fixed'.");
      return this; // cancel
    }

    if (_pin) { // preexisting pin?
      if (_pin === element) {
        // same pin we already have -> do nothing
        return this; // cancel
      }
      // kill old pin
      this.removePin();
    }
    _pin = element;

    const parentDisplay = _pin.parentNode.style.display;
    const boundsParams = ['top', 'left', 'bottom', 'right', 'margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom'];

    _pin.parentNode.style.display = 'none'; // hack start to force css to return stylesheet values instead of calculated px values.

    const inFlow = _util.css(_pin, 'position') !== 'absolute';
    const pinCSS = _util.css(_pin, boundsParams.concat(['display']));
    const sizeCSS = _util.css(_pin, ['width', 'height']);
    _pin.parentNode.style.display = parentDisplay; // hack end.

    if (!inFlow && settings.pushFollowers) {
      _util.log(2, 'WARNING: If the pinned element is positioned absolutely pushFollowers will be disabled.');
      settings.pushFollowers = false;
    }

    // wait until all finished, because with responsive duration it will only be set after scene is added to controller
    window.setTimeout(() => {
      if (_pin && this.options.duration === 0 && settings.pushFollowers) {
        _util.log(2, 'WARNING: pushFollowers =', true, 'has no effect, when scene duration is 0.');
      }
    }, 0);

    // create spacer and insert
    const spacer = _pin.parentNode.insertBefore(document.createElement('div'), _pin);
    const spacerCSS = _util.extend(pinCSS, {
      position: inFlow ? 'relative' : 'absolute',
      boxSizing: 'content-box',
      mozBoxSizing: 'content-box',
      webkitBoxSizing: 'content-box',
    });

    if (!inFlow) { // copy size if positioned absolutely, to work for bottom/right positioned elements.
      _util.extend(spacerCSS, _util.css(_pin, ['width', 'height']));
    }

    _util.css(spacer, spacerCSS);
    spacer.setAttribute(PIN_SPACER_ATTRIBUTE, '');
    _util.addClass(spacer, settings.spacerClass);

    // set the pin Options
    _pinOptions = {
      spacer,
      relSize: { // save if size is defined using % values. if so, handle spacer resize differently...
        width: sizeCSS.width.slice(-1) === '%',
        height: sizeCSS.height.slice(-1) === '%',
        autoFullWidth: sizeCSS.width === 'auto' && inFlow && _util.isMarginCollapseType(pinCSS.display),
      },
      pushFollowers: settings.pushFollowers,
      inFlow, // stores if the element takes up space in the document flow
    };

    if (!_pin.___origStyle) {
      _pin.___origStyle = {};
      const pinInlineCSS = _pin.style;
      const copyStyles = boundsParams.concat(['width', 'height', 'position', 'boxSizing', 'mozBoxSizing', 'webkitBoxSizing']);
      copyStyles.forEach((val) => {
        _pin.___origStyle[val] = pinInlineCSS[val] || '';
      });
    }

    // if relative size, transfer it to spacer and make pin calculate it...
    if (_pinOptions.relSize.width) {
      _util.css(spacer, { width: sizeCSS.width });
    }
    if (_pinOptions.relSize.height) {
      _util.css(spacer, { height: sizeCSS.height });
    }

    // now place the pin element inside the spacer
    spacer.appendChild(_pin);
    // and set new css
    _util.css(_pin, {
      position: inFlow ? 'relative' : 'absolute',
      margin: 'auto',
      top: 'auto',
      left: 'auto',
      bottom: 'auto',
      right: 'auto',
    });

    if (_pinOptions.relSize.width || _pinOptions.relSize.autoFullWidth) {
      _util.css(_pin, {
        boxSizing: 'border-box',
        mozBoxSizing: 'border-box',
        webkitBoxSizing: 'border-box',
      });
    }

    // add listener to document to update pin position in case controller is not the document.
    window.addEventListener('scroll', this._updatePinInContainer);
    window.addEventListener('resize', this._updatePinInContainer);
    window.addEventListener('resize', this._updateRelativePinSpacer);
    // add mousewheel listener to catch scrolls over fixed elements
    _pin.addEventListener('mousewheel', this._onMousewheelOverPin);
    _pin.addEventListener('DOMMouseScroll', this._onMousewheelOverPin);

    _util.log(3, 'added pin');

    // finally update the pin to init
    this._updatePinState();

    return this;
  }

  removePin(reset) {
    if (_pin) {
      if (_state === SCENE_STATE_DURING) {
        this._updatePinState(true); // force unpin at position
      }
      if (reset || !_controller) { // if there's no controller no progress was made anyway...
        const pinTarget = _pinOptions.spacer.firstChild; // usually the pin element, but may be another spacer (cascaded pins)...
        if (pinTarget.hasAttribute(PIN_SPACER_ATTRIBUTE)) { // copy margins to child spacer
          const style = _pinOptions.spacer.style;
          const values = ['margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom'];
          const margins = {};
          values.forEach((val) => {
            margins[val] = style[val] || '';
          });
          _util.css(pinTarget, margins);
        }
        _pinOptions.spacer.parentNode.insertBefore(pinTarget, _pinOptions.spacer);
        _pinOptions.spacer.parentNode.removeChild(_pinOptions.spacer);
        if (!_pin.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE)) { // if it's the last pin for this element -> restore inline styles
          // TODO: only correctly set for first pin (when cascading) - how to fix?
          _util.css(_pin, _pin.___origStyle);
          delete _pin.___origStyle;
        }
      }
      window.removeEventListener('scroll', this._updatePinInContainer);
      window.removeEventListener('resize', this._updatePinInContainer);
      window.removeEventListener('resize', this._updateRelativePinSpacer);
      _pin.removeEventListener('mousewheel', this._onMousewheelOverPin);
      _pin.removeEventListener('DOMMouseScroll', this._onMousewheelOverPin);
      _pin = undefined;
      _util.log(3, `removed pin (reset: ${reset ? 'true' : 'false'})`);
    }
    return this;
  }

  // class toggle

  setClassToggle(element, classes) {
    const elems = _util.get.elements(element);
    if (elems.length === 0 || !_util.type.String(classes)) {
      _util.log(1, `ERROR calling method 'setClassToggle()': Invalid ${elems.length === 0 ? 'element' : 'classes'} supplied.`);
      return this;
    }
    if (_cssClassElems.length > 0) {
      // remove old ones
      this.removeClassToggle();
    }
    _cssClasses = classes;
    _cssClassElems = elems;
    this.on('enter.internal_class leave.internal_class', (e) => {
      const toggle = e.type === 'enter' ? _util.addClass : _util.removeClass;
      _cssClassElems.forEach((elem, key) => {
        toggle(elem, _cssClasses);
      });
    });
    return this;
  }

  removeClassToggle(reset) {
    if (reset) {
      _cssClassElems.forEach((elem, key) => {
        _util.removeClass(elem, _cssClasses);
      });
    }
    this.off('start.internal_class end.internal_class');
    _cssClasses = undefined;
    _cssClassElems = [];
    return this;
  }

  // gsap

  _updateTweenProgress() {
    if (_tween) {
      const progress = this.progress();
      const state = this.state();
      if (_tween.repeat && _tween.repeat() === -1) {
        // infinite loop, so not in relation to progress
        if (state === 'DURING' && _tween.paused()) {
          _tween.play();
        } else if (state !== 'DURING' && !_tween.paused()) {
          _tween.pause();
        }
      } else if (progress !== _tween.progress()) { // do we even need to update the progress?
        // no infinite loop - so should we just play or go to a specific point in time?
        if (this.duration() === 0) {
          // play the animation
          if (progress > 0) { // play from 0 to 1
            _tween.play();
          } else { // play from 1 to 0
            _tween.reverse();
          }
        } else {
          // go to a specific point in time
          if (this.tweenChanges() && _tween.tweenTo) {
            // go smooth
            _tween.tweenTo(progress * _tween.duration());
          } else {
            // just hard set it
            _tween.progress(progress).pause();
          }
        }
      }
    }
  }

  setTween(TweenObject, duration, params) {
    let newTween;
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
        newTween = new window.TimelineMax({ smoothChildTiming: true })
          .add(TweenObject);
      } else {
        newTween = TweenObject;
      }
      newTween.pause();
    } catch (event) {
      _util.log(1, "ERROR calling method 'setTween()': Supplied argument is not a valid TweenObject");
      return this;
    }
    if (_tween) { // kill old tween?
      this.removeTween();
    }
    _tween = newTween;

    // some properties need to be transferred it to the wrapper, otherwise they would get lost.
    if (TweenObject.repeat && TweenObject.repeat() === -1) { // TweenMax or TimelineMax Object?
      _tween.repeat(-1);
      _tween.yoyo(TweenObject.yoyo());
    }

    // (BUILD) - REMOVE IN MINIFY - START

    // Some tween validations and debugging helpers

    if (this.tweenChanges() && !_tween.tweenTo) {
      _util.log(2, 'WARNING: tweenChanges will only work if the TimelineMax object is available for ScrollMagic.');
    }

    // check if there are position tweens defined for the trigger and warn about it :)
    if (_tween && this.controller() && this.triggerElement() && this.loglevel() >= 2) { // controller is needed to know scroll direction.
      const triggerTweens = window.TweenMax.getTweensOf(this.triggerElement());
      const vertical = this.controller().info('vertical');
      triggerTweens.forEach((value, index) => {
        const tweenvars = value.vars.css || value.vars;
        const condition = vertical ? (tweenvars.top !== undefined || tweenvars.bottom !== undefined) : (tweenvars.left !== undefined || tweenvars.right !== undefined);
        if (condition) {
          _util.log(2, 'WARNING: Tweening the position of the trigger element affects the scene timing and should be avoided!');
        }
      });
    }

    // warn about tween overwrites, when an element is tweened multiple times
    if (parseFloat(window.TweenMax.version) >= 1.14) { // onOverwrite only present since GSAP v1.14.0
      const list = _tween.getChildren ? _tween.getChildren(true, true, false) : [_tween]; // get all nested tween objects
      const newCallback = () => {
        _util.log(2, 'WARNING: tween was overwritten by another. To learn how to avoid this issue see here: https://github.com/janpaepke/ScrollMagic/wiki/WARNING:-tween-was-overwritten-by-another');
      };
      for (let i = 0, thisTween, oldCallback; i < list.length; i++) {
        /* jshint loopfunc: true */
        thisTween = list[i];
        if (oldCallback !== newCallback) { // if tweens is added more than once
          oldCallback = thisTween.vars.onOverwrite;
          thisTween.vars.onOverwrite = function () {
            if (oldCallback) {
              oldCallback.apply(this, arguments);
            }
            newCallback.apply(this, arguments);
          };
        }
      }
    }

    _util.log(3, 'added tween');

    // (BUILD) - REMOVE IN MINIFY - END

    this._updateTweenProgress();

    return this;
  }

  removeTween(reset) {
    if (_tween) {
      if (reset) {
        _tween.progress(0).pause();
      }
      _tween.kill();
      _tween = undefined;
      _util.log(3, `removed tween (reset: ${reset ? 'true' : 'false'})`);
    }
    return this;
  }

  // indicators

  addIndicators(options) {
    if (!_indicator) {
      options = _util.extend({}, DEFAULT_INDICATOR_OPTIONS, options);

      _indicator = new Indicator(this, options);

      this.on('add.plugin_addIndicators', _indicator.add.bind(_indicator));
      this.on('remove.plugin_addIndicators', _indicator.remove.bind(_indicator));
      this.on('destroy.plugin_addIndicators', this.removeIndicators);

      // it the scene already has a controller we can start right away.
      if (this.controller()) {
        _indicator.add();
      }
    }
    return this;
  }

  removeIndicators() {
    if (_indicator) {
      _indicator.remove();
      this.off('*.plugin_addIndicators');
      _indicator = undefined;
    }
    return this;
  }
}

export default Scene;
