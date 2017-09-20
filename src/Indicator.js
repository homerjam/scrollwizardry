/* eslint-env browser */

import _ from 'lodash';
import Util from './Util';
import Log from './Log';

const FONT_SIZE = '0.85em';
const ZINDEX = '9999';

const TPL = {
  start(color) {
    // inner element (for bottom offset -1, while keeping top position 0)
    const inner = document.createElement('div');
    inner.textContent = 'start';
    Util.css(inner, {
      position: 'absolute',
      overflow: 'visible',
      'border-width': 0,
      'border-style': 'solid',
      color,
      'border-color': color,
    });
    const element = document.createElement('div');
    // wrapper
    Util.css(element, {
      position: 'absolute',
      overflow: 'visible',
      width: 0,
      height: 0,
    });
    element.appendChild(inner);
    return element;
  },
  end(color) {
    const element = document.createElement('div');
    element.textContent = 'end';
    Util.css(element, {
      position: 'absolute',
      overflow: 'visible',
      'border-width': 0,
      'border-style': 'solid',
      color,
      'border-color': color,
    });
    return element;
  },
  bounds() {
    const element = document.createElement('div');
    Util.css(element, {
      position: 'absolute',
      overflow: 'visible',
      'white-space': 'nowrap',
      'pointer-events': 'none',
      'font-size': FONT_SIZE,
    });
    element.style.zIndex = ZINDEX;
    return element;
  },
  trigger(color) {
    // inner to be above or below line but keep position
    const inner = document.createElement('div');
    inner.textContent = 'trigger';
    Util.css(inner, {
      position: 'relative',
    });
    // wrapper for right: 0 and main element has no size
    const wrapper = document.createElement('div');
    Util.css(wrapper, {
      position: 'absolute',
      overflow: 'visible',
      'border-width': 0,
      'border-style': 'solid',
      color,
      'border-color': color,
    });
    wrapper.appendChild(inner);
    // element
    const element = document.createElement('div');
    Util.css(element, {
      position: 'fixed',
      overflow: 'visible',
      'white-space': 'nowrap',
      'pointer-events': 'none',
      'font-size': FONT_SIZE,
    });
    element.style.zIndex = ZINDEX;
    element.appendChild(wrapper);
    return element;
  },
};

let _autoindex = 0;

class Indicator {
  constructor(scene, options) {
    const DEFAULT_INDICATOR_OPTIONS = {
      name: '',
      indent: 0,
      parent: undefined,
      colorStart: 'green',
      colorEnd: 'red',
      colorTrigger: 'blue',
    };

    options = _.merge({}, DEFAULT_INDICATOR_OPTIONS, options);

    options.name = options.name || _autoindex;

    _autoindex++;

    this._elemBounds = TPL.bounds();
    this._elemStart = TPL.start(options.colorStart);
    this._elemEnd = TPL.end(options.colorEnd);

    this._boundsContainer = options.parent && Util.elements(options.parent)[0];

    // prepare bounds elements
    this._elemStart.firstChild.textContent += ` ${options.name}`;
    this._elemEnd.textContent += ` ${options.name}`;
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
  add() {
    this._ctrl = this.scene.controller();
    this._vertical = this._ctrl.info('vertical');

    const isDocument = this._ctrl.info('isDocument');

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

    setTimeout(() => { // do after all execution is finished otherwise sometimes size calculations are off
      this._ctrl.updateBoundsPositions(this);
    }, 0);

    Log.log(3, 'added indicators');
  }

  // remove indicators from DOM
  remove() {
    if (this.triggerGroup) { // if not set there's nothing to remove
      this.scene.off('change.plugin_addIndicators', this._handleTriggerParamsChange);
      this.scene.off('shift.plugin_addIndicators', this._handleBoundsParamsChange);

      if (this.triggerGroup.members.length > 1) {
        // just remove from memberlist of old group
        const group = this.triggerGroup;
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
  _handleBoundsParamsChange() {
    this._updateBounds();
  }

  // event handler for when trigger params change
  _handleTriggerParamsChange(event) {
    if (event.what === 'triggerHook') {
      this._updateTriggerGroup();
    }
  }

  // adds an new bounds elements to the array and to the DOM
  _addBounds() {
    const v = this._ctrl.info('vertical');
    // apply stuff we didn't know before...
    Util.css(this._elemStart.firstChild, {
      'border-bottom-width': v ? 1 : 0,
      'border-right-width': v ? 0 : 1,
      bottom: v ? -1 : this.options.indent,
      right: v ? this.options.indent : -1,
      padding: v ? '0 8px' : '2px 4px',
    });
    Util.css(this._elemEnd, {
      'border-top-width': v ? 1 : 0,
      'border-left-width': v ? 0 : 1,
      top: v ? '100%' : '',
      right: v ? this.options.indent : '',
      bottom: v ? '' : this.options.indent,
      left: v ? '' : '100%',
      padding: v ? '0 8px' : '2px 4px',
    });
    // append
    this._boundsContainer.appendChild(this._elemBounds);
  }

  // remove bounds from list and DOM
  _removeBounds() {
    this._elemBounds.parentNode.removeChild(this._elemBounds);
  }

  // update the start and end positions of the scene
  _updateBounds() {
    if (this._elemBounds.parentNode !== this._boundsContainer) {
      this._addBounds(); // Add Bounds elements (start/end)
    }
    const css = {};
    css[this._vertical ? 'top' : 'left'] = this.scene.triggerPosition();
    css[this._vertical ? 'height' : 'width'] = this.scene.duration();
    Util.css(this._elemBounds, css);
    Util.css(this._elemEnd, {
      display: this.scene.duration() > 0 ? '' : 'none',
    });
  }

  // adds an new trigger group to the array and to the DOM
  _addTriggerGroup() {
    const triggerElem = TPL.trigger(this.options.colorTrigger); // new trigger element
    const css = {};
    css[this._vertical ? 'right' : 'bottom'] = 0;
    css[this._vertical ? 'border-top-width' : 'border-left-width'] = 1;
    Util.css(triggerElem.firstChild, css);
    Util.css(triggerElem.firstChild.firstChild, {
      padding: this._vertical ? '0 8px 3px 8px' : '3px 4px',
    });
    document.body.appendChild(triggerElem); // directly add to body
    const newGroup = {
      triggerHook: this.scene.triggerHook(),
      element: triggerElem,
      members: [this],
    };
    this._ctrl._indicators.groups.push(newGroup);
    this.triggerGroup = newGroup;
    // update right away
    this._ctrl.updateTriggerGroupLabel(newGroup);
    this._ctrl.updateTriggerGroupPositions(newGroup);
  }

  _removeTriggerGroup() {
    this._ctrl._indicators.groups.splice(this._ctrl._indicators.groups.indexOf(this.triggerGroup), 1);
    this.triggerGroup.element.parentNode.removeChild(this.triggerGroup.element);
    this.triggerGroup = null;
  }

  // updates the trigger group -> either join existing or add new one
  _updateTriggerGroup() {
    const triggerHook = this.scene.triggerHook();
    const closeEnough = 0.0001;

    // Have a group, check if it still matches
    if (this.triggerGroup) {
      if (Math.abs(this.triggerGroup.triggerHook - triggerHook) < closeEnough) {
        // Log.log(0, "trigger", options.name, "->", "no need to change, still in sync");
        return; // all good
      }
    }

    // Don't have a group, check if a matching one exists
    // Log.log(0, "trigger", options.name, "->", "out of sync!");
    const groups = this._ctrl._indicators.groups;
    let group;
    let i = groups.length;

    while (i--) {
      group = groups[i];
      if (Math.abs(group.triggerHook - triggerHook) < closeEnough) {
        // found a match!
        // Log.log(0, "trigger", options.name, "->", "found match");
        if (this.triggerGroup) { // do I have an old group that is out of sync?
          if (this.triggerGroup.members.length === 1) { // is it the only remaining group?
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
}

export default Indicator;
