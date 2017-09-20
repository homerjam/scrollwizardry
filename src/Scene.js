/* eslint-env browser */

import _ from 'lodash';
import Util from './Util';
import Event from './Event';
import Indicator from './Indicator';
import Log from './Log';

const PIN_SPACER_ATTRIBUTE = 'data-scrollmagic-pin-spacer';

const NAMESPACE = 'ScrollWizardry.Scene';

const SCENE_STATE_BEFORE = 'BEFORE';
const SCENE_STATE_DURING = 'DURING';
const SCENE_STATE_AFTER = 'AFTER';

const DEFAULT_INDICATOR_OPTIONS = {
  name: '',
  indent: 0,
  parent: undefined,
  colorStart: 'green',
  colorEnd: 'red',
  colorTrigger: 'blue',
};

const DEFAULT_SCENE_OPTIONS = {
  duration: 0,
  offset: 0,
  triggerElement: undefined,
  triggerHook: 0.5,
  reverse: true,
  loglevel: 2,
  tweenChanges: false,
};

// list of options that trigger a `shift` event
const SHIFTS = ['duration', 'offset', 'triggerHook'];

class Scene {
  constructor(options) {
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
    Object.keys(DEFAULT_SCENE_OPTIONS).forEach((optionName) => {
      this._addSceneOption(optionName);
    });

    this.validate = {
      duration(val) {
        if (_.isString(val) && val.match(/^(\.|\d)*\d+%$/)) {
        // percentage value
          const perc = parseFloat(val) / 100;
          val = () => {
            return this._controller ? this._controller.info('size') * perc : 0;
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
            throw Error(`Invalid return value of supplied function for option "duration": ${val}`);
          } else {
            throw Error(`Invalid value for option "duration": ${val}`);
          }
        }
        return val;
      },
      offset(val) {
        if (_.isFunction(val)) {
          val = val();
        }
        val = parseFloat(val);
        if (!_.isNumber(val)) {
          throw Error(`Invalid value for option "offset": ${val}`);
        }
        return val;
      },
      triggerElement(val) {
        val = val || undefined;
        if (val) {
          const el = _.isString(val) ? Util.elements(val)[0] : val;
          if (el && el.parentNode) {
            val = el;
          } else {
            throw Error(`Element defined in option "triggerElement" was not found: ${val}`);
          }
        }
        return val;
      },
      triggerHook(val) {
        const translate = { onCenter: 0.5, onEnter: 1, onLeave: 0 };
        if (_.isNumber(val)) {
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
        if (!_.isNumber(val) || val < 0 || val > 3) {
          throw Error(`Invalid value for option "loglevel": ${val}`);
        }
        return val;
      },
      tweenChanges(val) {
        return !!val;
      },
    };

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
      this.update(); // update scene to reflect new position
    });

    // pinning

    this.on('shift.internal', (event) => {
      const durationChanged = event.reason === 'duration';
      if ((this._state === SCENE_STATE_AFTER && durationChanged) || (this._state === SCENE_STATE_DURING && this.options.duration === 0)) {
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
    if (_.isFunction(callback)) {
      names = names.trim().split(' ');
      names.forEach((fullname) => {
        const nameparts = fullname.split('.');
        const eventname = nameparts[0];
        const namespace = nameparts[1];
        if (eventname !== '*') { // disallow wildcards
          if (!this._listeners[eventname]) {
            this._listeners[eventname] = [];
          }
          this._listeners[eventname].push({
            namespace: namespace || '',
            callback,
          });
        }
      });
    } else {
      Log.log(1, `ERROR when calling '.on()': Supplied callback for '${names}' is not a valid function!`);
    }
    return this;
  }

  off(names, callback) {
    if (!names) {
      Log.log(1, 'ERROR: Invalid event name supplied.');
      return this;
    }
    names = names.trim().split(' ');
    names.forEach((fullname, key) => {
      const nameparts = fullname.split('.');
      const eventname = nameparts[0];
      const namespace = nameparts[1] || '';
      const removeList = eventname === '*' ? Object.keys(this._listeners) : [eventname];
      removeList.forEach((remove) => {
        const list = this._listeners[remove] || [];
        let i = list.length;
        while (i--) {
          const listener = list[i];
          if (listener && (namespace === listener.namespace || namespace === '*') && (!callback || callback === listener.callback)) {
            list.splice(i, 1);
          }
        }
        if (!list.length) {
          delete this._listeners[remove];
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
      const listeners = this._listeners[eventname];
      Log.log(3, 'event fired:', eventname, vars ? '->' : '', vars || '');
      if (listeners) {
        listeners.forEach((listener) => {
          if (!namespace || namespace === listener.namespace) {
            listener.callback.call(this, new Event(eventname, listener.namespace, this, vars));
          }
        });
      }
    } else {
      Log.log(1, 'ERROR: Invalid event name supplied.');
    }
    return this;
  }

  addTo(controller) {
    if (this._controller !== controller) {
      // new controller
      if (this._controller) { // was associated to a different controller before, so remove it...
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
      Log.log(3, `added ${NAMESPACE} to controller`);
      this.update();
    }
    return this;
  }

  remove() {
    if (this._controller) {
      this._controller.info('container').removeEventListener('resize', this._onContainerResize.bind(this), { passive: true });
      const tmpParent = this._controller;
      this._controller = null;
      tmpParent.removeScene(this);
      this.trigger('remove');
      Log.log(3, `removed ${NAMESPACE} from controller`);
    }
    return this;
  }

  destroy(reset) {
    this.trigger('destroy', { reset });
    this.remove();
    this.triggerElement(null);
    this.off('*.*');
    Log.log(3, `destroyed ${NAMESPACE} (reset: ${reset ? 'true' : 'false'})`);
    return null;
  }

  update(immediately) {
    if (this._controller) {
      this._updateScrollOffset();
      if (immediately) {
        if (this._controller.enabled()) {
          const scrollPos = this._controller.info('scrollPos');
          let newProgress;

          if (this.options.duration > 0) {
            newProgress = (scrollPos - this._scrollOffset.start) / (this._scrollOffset.end - this._scrollOffset.start);
          } else {
            newProgress = scrollPos >= this._scrollOffset.start ? 1 : 0;
          }

          this.trigger('update', { startPos: this._scrollOffset.start, endPos: this._scrollOffset.end, scrollPos });

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

  refresh() {
    this._updateDuration();
    this._updateTriggerElementPosition();
    // update trigger element position
    return this;
  }

  progress(progress) {
    if (!arguments.length) { // get
      return this._progress;
    } // set

    let doUpdate = false;
    const oldState = this._state;
    const scrollDirection = this._controller ? this._controller.info('scrollDirection') : 'PAUSED';
    const reverseOrForward = this.options.reverse || progress >= this._progress;
    if (this.options.duration === 0) {
      // zero duration scenes
      doUpdate = this._progress !== progress;
      this._progress = progress < 1 && reverseOrForward ? 0 : 1;
      this._state = this._progress === 0 ? SCENE_STATE_BEFORE : SCENE_STATE_DURING;
    } else {
      // scenes with start and end
      if (progress < 0 && this._state !== SCENE_STATE_BEFORE && reverseOrForward) {
        // go back to initial state
        this._progress = 0;
        this._state = SCENE_STATE_BEFORE;
        doUpdate = true;
      } else if (progress >= 0 && progress < 1 && reverseOrForward) {
        this._progress = progress;
        this._state = SCENE_STATE_DURING;
        doUpdate = true;
      } else if (progress >= 1 && this._state !== SCENE_STATE_AFTER) {
        this._progress = 1;
        this._state = SCENE_STATE_AFTER;
        doUpdate = true;
      } else if (this._state === SCENE_STATE_DURING && !reverseOrForward) {
        this._updatePinState(); // in case we scrolled backwards mid-scene and reverse is disabled => update the pin position, so it doesn't move back as well.
      }
    }
    if (doUpdate) {
      // fire events
      const eventVars = { progress: this._progress, state: this._state, scrollDirection };
      const stateChanged = this._state !== oldState;

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
        if (this._state !== SCENE_STATE_DURING) {
          trigger(this._state === SCENE_STATE_BEFORE ? 'start' : 'end');
          trigger('leave');
        }
      }
    }

    return this;
  }

  _updateScrollOffset() {
    const offset = _.isFunction(this.options.offset) ? this.options.offset() : this.options.offset;
    this._scrollOffset = { start: this._triggerPos + offset };
    if (this._controller && this.options.triggerElement) {
      // take away triggerHook portion to get relative to top
      this._scrollOffset.start -= this._controller.info('size') * this.options.triggerHook;
    }
    this._scrollOffset.end = this._scrollOffset.start + this.options.duration;
  }

  _updateDuration(suppressEvents) {
    // update duration
    if (this._durationUpdateMethod) {
      const varname = 'duration';
      if (this._changeOption(varname, this._durationUpdateMethod.call(this)) && !suppressEvents) { // set
        this.trigger('change', { what: varname, newVal: this.options[varname] });
        this.trigger('shift', { reason: varname });
      }
    }
  }

  _updateTriggerElementPosition(suppressEvents) {
    let elementPos = 0;
    let telem = this.options.triggerElement;
    if (this._controller && (telem || this._triggerPos > 0)) { // either an element exists or was removed and the triggerPos is still > 0
      if (telem) { // there currently a triggerElement set
        if (telem.parentNode) { // check if element is still attached to DOM
          const controllerInfo = this._controller.info();
          const containerOffset = Util.offset(controllerInfo.container); // container position is needed because element offset is returned in relation to document, not in relation to container.
          const param = controllerInfo.vertical ? 'top' : 'left'; // which param is of interest ?

          // if parent is spacer, use spacer position instead so correct start position is returned for pinned elements.
          while (telem.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE)) {
            telem = telem.parentNode;
          }

          const elementOffset = Util.offset(telem);

          if (!controllerInfo.isDocument) { // container is not the document root, so substract scroll Position to get correct trigger element position relative to scrollcontent
            containerOffset[param] -= this._controller.scrollPos();
          }

          elementPos = elementOffset[param] - containerOffset[param];
        } else { // there was an element, but it was removed from DOM
          Log.log(2, 'WARNING: triggerElement was removed from DOM and will be reset to', undefined);
          this.triggerElement(undefined); // unset, so a change event is triggered
        }
      }

      const changed = elementPos !== this._triggerPos;
      this._triggerPos = elementPos;
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

  _validateOption(...check) {
    check = check.length ? check : Object.keys(this.validate);
    check.forEach((optionName) => {
      let value;
      if (this.validate[optionName]) { // there is a validation method for this option
        try { // validate value
          value = this.validate[optionName].call(this, this.options[optionName]);
        } catch (event) { // validation failed -> reset to default
          value = DEFAULT_SCENE_OPTIONS[optionName];
          const logMSG = _.isString(event) ? [event] : event;
          if (_.isArray(logMSG)) {
            logMSG[0] = `ERROR: ${logMSG[0]}`;
            logMSG.unshift(1); // loglevel 1 for error msg
            Log.log.apply(this, logMSG);
          } else {
            Log.log(1, `ERROR: Problem executing validation callback for option '${optionName}':`, event.message);
          }
        } finally {
          // this.options[optionName] = value;
        }
      }
    });
  }

  _changeOption(optionName, newVal) {
    let changed = false;
    const oldval = this.options[optionName];
    if (this.options[optionName] !== newVal) {
      this.options[optionName] = newVal;
      this._validateOption(optionName); // resets to default if necessary
      changed = oldval !== this.options[optionName];
    }
    return changed;
  }

  _addSceneOption(optionName) {
    if (!this[optionName]) {
      this[optionName] = (...args) => {
        if (args.length === 0) { // get
          return this.options[optionName];
        }
        if (optionName === 'duration') { // new duration is set, so any previously set function must be unset
          this._durationUpdateMethod = null;
        }
        if (this._changeOption(optionName, args[0])) { // set
          this.trigger('change', { what: optionName, newVal: this.options[optionName] });
          if (SHIFTS.indexOf(optionName) > -1) {
            this.trigger('shift', { reason: optionName });
          }
        }

        return this;
      };
    }
  }

  controller() {
    return this._controller;
  }

  state() {
    return this._state;
  }

  scrollOffset() {
    return this._scrollOffset.start;
  }

  triggerPosition() {
    // the offset is the basis
    let offset = _.isFunction(this.options.offset) ? this.options.offset() : this.options.offset;
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

  _updatePinState(forceUnpin) {
    if (this._pin && this._controller) {
      const containerInfo = this._controller.info();
      const pinTarget = this._pinOptions.spacer.firstChild; // may be pin element or another spacer, if cascading pins

      if (!forceUnpin && this._state === SCENE_STATE_DURING) { // during scene or if duration is 0 and we are past the trigger
        // pinned state
        if (Util.css(pinTarget).position !== 'fixed') {
          // change state before updating pin spacer (position changes due to fixed collapsing might occur.)
          Util.css(pinTarget, { position: 'fixed' });
          // update pin spacer
          this._updatePinDimensions();
        }

        const fixedPos = Util.offset(this._pinOptions.spacer, true); // get viewport position of spacer
        const scrollDistance = this.options.reverse || this.options.duration === 0 ?
          containerInfo.scrollPos - this._scrollOffset.start // quicker
          : Math.round(this._progress * this.options.duration * 10) / 10; // if no reverse and during pin the position needs to be recalculated using the progress

        // add scrollDistance
        fixedPos[containerInfo.vertical ? 'top' : 'left'] += scrollDistance;

        // set new values
        Util.css(this._pinOptions.spacer.firstChild, fixedPos);

      } else {
        // unpinned state
        const newCSS = {
          position: this._pinOptions.inFlow ? 'relative' : 'absolute',
          top: 0,
          left: 0,
        };

        let change = Util.css(pinTarget).position !== newCSS.position;

        if (!this._pinOptions.pushFollowers) {
          newCSS[containerInfo.vertical ? 'top' : 'left'] = this.options.duration * this._progress;

        } else if (this.options.duration > 0) { // only concerns scenes with duration
          if (this._state === SCENE_STATE_AFTER && parseFloat(Util.css(this._pinOptions.spacer).paddingTop) === 0) {
            change = true; // if in after state but havent updated spacer yet (jumped past pin)
          } else if (this._state === SCENE_STATE_BEFORE && parseFloat(Util.css(this._pinOptions.spacer).paddingBottom) === 0) { // before
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

  _updatePinDimensions() {
    if (this._pin && this._controller && this._pinOptions.inFlow) {
      // no spacer resize, if original position is absolute

      const during = (this._state === SCENE_STATE_DURING);
      const vertical = this._controller.info('vertical');
      const pinTarget = this._pinOptions.spacer.firstChild; // usually the pined element but can also be another spacer (cascaded pins)
      const marginCollapse = Util.marginCollapse(Util.css(this._pinOptions.spacer).display);

      const css = {};

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
        css[`padding${vertical ? 'Top' : 'Left'}`] = this.options.duration * this._progress;
        css[`padding${vertical ? 'Bottom' : 'Right'}`] = this.options.duration * (1 - this._progress);
      }

      Util.css(this._pinOptions.spacer, css);
    }
  }

  _updatePinInContainer() {
    if (this._controller && this._pin && this._state === SCENE_STATE_DURING && !this._controller.info('isDocument')) {
      this._updatePinState();
    }
  }

  _updateRelativePinSpacer() {
    if (this._controller && this._pin &&
      this._state === SCENE_STATE_DURING && // element in pinned state?
      ( // is width or height relatively sized, but not in relation to body? then we need to recalc.
        ((this._pinOptions.relSize.width || this._pinOptions.relSize.autoFullWidth) && Util.width(window) !== Util.width(this._pinOptions.spacer.parentNode)) ||
        (this._pinOptions.relSize.height && Util.height(window) !== Util.height(this._pinOptions.spacer.parentNode))
      )
    ) {
      this._updatePinDimensions();
    }
  }

  _onMousewheelOverPin(event) {
    if (this._controller && this._pin && this._state === SCENE_STATE_DURING && !this._controller.info('isDocument')) { // in pin state
      event.preventDefault();
      this._controller._setScrollPos(this._controller.info('scrollPos') - ((event.wheelDelta || event[this._controller.info('vertical') ? 'wheelDeltaY' : 'wheelDeltaX']) / 3 || -event.detail * 30));
    }
  }

  setPin(element, settings) {
    const defaultSettings = {
      pushFollowers: true,
      spacerClass: 'scrollmagic-pin-spacer',
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

    if (this._pin) { // preexisting pin?
      if (this._pin === element) {
        // same pin we already have -> do nothing
        return this; // cancel
      }
      // kill old pin
      this.removePin();
    }
    this._pin = element;

    const parentDisplay = Util.css(this._pin.parentNode).display;
    const boundsParams = ['top', 'left', 'bottom', 'right', 'margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom'];

    this._pin.parentNode.style.display = 'none'; // hack start to force css to return stylesheet values instead of calculated px values.

    const inFlow = Util.css(this._pin).position !== 'absolute';
    const pinCSS = _.pick(Util.css(this._pin), boundsParams.concat(['display']));
    const sizeCSS = _.pick(Util.css(this._pin), ['width', 'height']);

    this._pin.parentNode.style.display = parentDisplay; // hack end.

    if (!inFlow && settings.pushFollowers) {
      Log.log(2, 'WARNING: If the pinned element is positioned absolutely pushFollowers will be disabled.');
      settings.pushFollowers = false;
    }

    // wait until all finished, because with responsive duration it will only be set after scene is added to controller
    window.setTimeout(() => {
      if (this._pin && this.options.duration === 0 && settings.pushFollowers) {
        Log.log(2, 'WARNING: pushFollowers =', true, 'has no effect, when scene duration is 0.');
      }
    }, 0);

    // create spacer and insert
    const spacer = this._pin.parentNode.insertBefore(document.createElement('div'), this._pin);
    const spacerCSS = _.merge(pinCSS, {
      position: inFlow ? 'relative' : 'absolute',
      boxSizing: 'content-box',
      mozBoxSizing: 'content-box',
      webkitBoxSizing: 'content-box',
    });

    if (!inFlow) { // copy size if positioned absolutely, to work for bottom/right positioned elements.
      _.merge(spacerCSS, sizeCSS);
    }

    Util.css(spacer, spacerCSS);
    spacer.setAttribute(PIN_SPACER_ATTRIBUTE, '');
    spacer.classList.add(settings.spacerClass);

    // set the pin Options
    this._pinOptions = {
      spacer,
      relSize: { // save if size is defined using % values. if so, handle spacer resize differently...
        width: sizeCSS.width.slice(-1) === '%',
        height: sizeCSS.height.slice(-1) === '%',
        autoFullWidth: sizeCSS.width === 'auto' && inFlow && Util.marginCollapse(pinCSS.display),
      },
      pushFollowers: settings.pushFollowers,
      inFlow, // stores if the element takes up space in the document flow
    };

    if (!this._pin.___origStyle) {
      this._pin.___origStyle = {};
      const pinInlineStyle = this._pin.style;
      const copyStyles = boundsParams.concat(['width', 'height', 'position', 'boxSizing', 'mozBoxSizing', 'webkitBoxSizing']);
      copyStyles.forEach((val) => {
        this._pin.___origStyle[val] = pinInlineStyle[val] || '';
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
      right: 'auto',
    });

    if (this._pinOptions.relSize.width || this._pinOptions.relSize.autoFullWidth) {
      Util.css(this._pin, {
        boxSizing: 'border-box',
        mozBoxSizing: 'border-box',
        webkitBoxSizing: 'border-box',
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

  removePin(reset) {
    if (this._pin) {
      if (this._state === SCENE_STATE_DURING) {
        this._updatePinState(true); // force unpin at position
      }
      if (reset || !this._controller) { // if there's no controller no progress was made anyway...
        const pinTarget = this._pinOptions.spacer.firstChild; // usually the pin element, but may be another spacer (cascaded pins)...
        if (pinTarget.hasAttribute(PIN_SPACER_ATTRIBUTE)) { // copy margins to child spacer
          const inlineStyle = this._pinOptions.spacer.style;
          const values = ['margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom'];
          const margins = {};
          values.forEach((val) => {
            margins[val] = inlineStyle[val] || '';
          });
          Util.css(pinTarget, margins);
        }
        this._pinOptions.spacer.parentNode.insertBefore(pinTarget, this._pinOptions.spacer);
        this._pinOptions.spacer.parentNode.removeChild(this._pinOptions.spacer);
        if (!this._pin.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE)) { // if it's the last pin for this element -> restore inline styles
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
      Log.log(3, `removed pin (reset: ${reset ? 'true' : 'false'})`);
    }
    return this;
  }

  // class toggle

  setClassToggle(element, classes) {
    const els = Util.elements(element);
    if (els.length === 0 || !_.isString(classes)) {
      Log.log(1, `ERROR calling method 'setClassToggle()': Invalid ${els.length === 0 ? 'element' : 'classes'} supplied.`);
      return this;
    }
    if (this._cssClassElems.length > 0) {
      // remove old ones
      this.removeClassToggle();
    }
    this._cssClasses = classes;
    this._cssClassElems = els;
    this.on('enter.internal_class leave.internal_class', (event) => {
      this._cssClassElems.forEach((el) => {
        el.classList[event.type === 'enter' ? 'add' : 'remove'](this._cssClasses);
      });
    });
    return this;
  }

  removeClassToggle(reset) {
    if (reset) {
      this._cssClassElems.forEach((el) => {
        el.classList.remove(this._cssClasses);
      });
    }
    this.off('start.internal_class end.internal_class');
    this._cssClasses = null;
    this._cssClassElems = [];
    return this;
  }

  // gsap

  _updateTweenProgress() {
    if (this._tween) {
      const progress = this.progress();
      const state = this.state();
      if (this._tween.repeat && this._tween.repeat() === -1) {
        // infinite loop, so not in relation to progress
        if (state === 'DURING' && this._tween.paused()) {
          this._tween.play();
        } else if (state !== 'DURING' && !this._tween.paused()) {
          this._tween.pause();
        }
      } else if (progress !== this._tween.progress()) { // do we even need to update the progress?
        // no infinite loop - so should we just play or go to a specific point in time?
        if (this.duration() === 0) {
          // play the animation
          if (progress > 0) { // play from 0 to 1
            this._tween.play();
          } else { // play from 1 to 0
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

  removeTween(reset) {
    if (this._tween) {
      if (reset) {
        this._tween.progress(0).pause();
      }
      this._tween.kill();
      this._tween = null;
      Log.log(3, `removed tween (reset: ${reset ? 'true' : 'false'})`);
    }
    return this;
  }

  // indicators

  addIndicators(options) {
    if (!this._indicator) {
      options = _.merge({}, DEFAULT_INDICATOR_OPTIONS, options);

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

  removeIndicators() {
    if (this._indicator) {
      this._indicator.remove();
      this.off('*.plugin_addIndicators');
      this._indicator = null;
    }
    return this;
  }
}

export default Scene;
