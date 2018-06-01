/* eslint-env browser */

import _ from 'lodash';
import Util from './Util';
import Scene from './Scene';
import Log from './Log';

const PIN_SPACER_ATTRIBUTE = 'data-scrollwizardry-pin-spacer';

const NAMESPACE = 'ScrollWizardry.Controller';

const SCROLL_DIRECTION_FORWARD = 'FORWARD';
const SCROLL_DIRECTION_REVERSE = 'REVERSE';
const SCROLL_DIRECTION_PAUSED = 'PAUSED';

const EDGE_OFFSET = 15; // minimum edge distance, added to indentation

class Controller {
  constructor(options) {
    const DEFAULT_CONTROLLER_OPTIONS = {
      container: window,
      vertical: true,
      globalSceneOptions: {},
      loglevel: 2,
      refreshInterval: 100,
      addIndicators: false,
    };

    this.options = _.merge({}, DEFAULT_CONTROLLER_OPTIONS, options);

    this.options.container = Util.elements(this.options.container)[0];

    if (!this.options.container) {
      Log.log(1, `ERROR creating object ${NAMESPACE}: No valid scroll container supplied`);
      throw Error(`${NAMESPACE} init failed`);
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

    const ri = parseInt(this.options.refreshInterval, 10);
    this.options.refreshInterval = _.isNumber(ri) ? ri : DEFAULT_CONTROLLER_OPTIONS.refreshInterval;
    this._scheduleRefresh();

    // indicators
    this._info = this.info();
    this._container = this._info.container;
    this._isDocument = this._info.isDocument;
    this._vertical = this._info.vertical;
    this._indicators = {
      groups: [],
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

    Log.log(3, `added new ${NAMESPACE}`);
  }

  _scheduleRefresh() {
    if (this.options.refreshInterval > 0 && this._sceneObjects.length) {
      this._refreshTimeout = window.setTimeout(this._refresh.bind(this), this.options.refreshInterval);
    } else {
      this._refreshTimeout = null;
    }
  }

  _getScrollPos() {
    return this.options.vertical ? Util.scrollTop(this.options.container) : Util.scrollLeft(this.options.container);
  }

  _getViewportSize() {
    return this.options.vertical ? Util.height(this.options.container) : Util.width(this.options.container);
  }

  _setScrollPos(pos) {
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

  _updateScenes() {
    if (this._enabled && this._updateScenesOnNextCycle) {
      // determine scenes to update
      const scenesToUpdate = _.isArray(this._updateScenesOnNextCycle) ? this._updateScenesOnNextCycle : this._sceneObjects.slice(0);

      // reset scenes
      this._updateScenesOnNextCycle = false;

      const oldScrollPos = this._scrollPos;

      // update scroll pos now instead of on change, as it might have changed since scheduling (i.e. in-browser smooth scroll)
      this._scrollPos = this.scrollPos();

      const deltaScroll = this._scrollPos - oldScrollPos;

      if (deltaScroll !== 0) { // scroll position changed?
        this._scrollDirection = (deltaScroll > 0) ? SCROLL_DIRECTION_FORWARD : SCROLL_DIRECTION_REVERSE;
      }

      // reverse order of scenes if scrolling reverse
      if (this._scrollDirection === SCROLL_DIRECTION_REVERSE) {
        scenesToUpdate.reverse();
      }

      // update scenes
      scenesToUpdate.forEach((scene, index) => {
        Log.log(3, `updating scene ${index + 1}/${scenesToUpdate.length} (${this._sceneObjects.length} total)`);
        scene.update(true);
      });

      if (scenesToUpdate.length === 0 && this.options.loglevel >= 3) {
        Log.log(3, 'updating 0 scenes (nothing added to controller)');
      }
    }
  }

  _debounceUpdate() {
    if (this._sceneObjects.length) {
      this._updateTimeout = window.requestAnimationFrame(this._updateScenes.bind(this));
    } else {
      this._updateTimeout = null;
    }
  }

  _onChange(event) {
    Log.log(3, 'event fired causing an update:', event.type);

    if (event.type === 'resize') {
      // resize
      this._viewportSize = this._getViewportSize();
      this._scrollDirection = SCROLL_DIRECTION_PAUSED;
    }

    if (!this._refreshTimeout) {
      // schedule refresh
      this._scheduleRefresh();
    }

    if (this._updateScenesOnNextCycle !== true) {
      // schedule update
      this._updateScenesOnNextCycle = true;
      this._debounceUpdate();
    }
  }

  _refresh() {
    if (!this._isDocument) {
      // simulate resize event, only works for viewport relevant param (performance)
      if (this._viewportSize !== this._getViewportSize()) {
        let resizeEvent;
        try {
          resizeEvent = new Event('resize', { bubbles: false, cancelable: false });
        } catch (event) { // stupid IE
          resizeEvent = document.createEvent('Event');
          resizeEvent.initEvent('resize', false, false);
        }
        this.options.container.dispatchEvent(resizeEvent);
      }
    }

    // refresh all scenes
    this._sceneObjects.forEach((scene) => {
      scene.refresh();
    });

    this._scheduleRefresh();
  }

  _sortScenes(scenesArray) {
    if (scenesArray.length <= 1) {
      return scenesArray;
    }
    const scenes = scenesArray.slice(0);
    scenes.sort((a, b) => (a.scrollOffset() > b.scrollOffset() ? 1 : -1));
    return scenes;
  }

  addScene(newScene) {
    if (_.isArray(newScene)) {
      newScene.forEach((scene) => {
        this.addScene(scene);
      });

    } else if (newScene.controller() !== this) {
      newScene.addTo(this);

    } else if (!this._sceneObjects.includes(newScene)) {
      this._sceneObjects.push(newScene);

      this._sceneObjects = this._sortScenes(this._sceneObjects);

      newScene.on('shift.controller_sort', () => { // resort whenever scene moves
        this._sceneObjects = this._sortScenes(this._sceneObjects);
      });

      // insert global defaults
      Object.keys(this.options.globalSceneOptions).forEach((key) => {
        if (newScene[key]) {
          newScene[key].call(newScene, this.options.globalSceneOptions[key]);
        }
      });

      Log.log(3, `adding Scene (now ${this._sceneObjects.length} total)`);
    }

    // indicators
    if (this.options.addIndicators) {
      if (newScene instanceof Scene && newScene.controller() === this) {
        newScene.addIndicators();
      }
    }

    this._debounceUpdate();

    return this;
  }

  removeScene(scene) {
    if (_.isArray(scene)) {
      scene.forEach((_scene) => {
        this.removeScene(_scene);
      });

    } else {
      const index = this._sceneObjects.indexOf(scene);

      if (index > -1) {
        scene.off('shift.controller_sort');

        this._sceneObjects.splice(index, 1);

        Log.log(3, `removing Scene (now ${this._sceneObjects.length} left)`);

        scene.remove();
      }
    }
    return this;
  }

  updateScene(scene, immediately) {
    if (_.isArray(scene)) {
      scene.forEach((_scene) => {
        this.updateScene(_scene, immediately);
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

  update(immediately) {
    this._onChange({ type: 'resize' }); // will update size and set _updateScenesOnNextCycle to true

    if (immediately) {
      this._updateScenes();
    }

    return this;
  }

  scrollTo(scrollTarget, additionalParameter) {
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

      const offset = this.options.vertical ? 'top' : 'left';

      // container position is needed because element offset is returned in relation to document
      // not in relation to container
      const containerOffset = Util.offset(this.options.container);

      const elementOffset = Util.offset(scrollTarget);

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

  scrollPos(scrollPosMethod) {
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

  info(about) {
    const values = {
      size: this._viewportSize,
      vertical: this.options.vertical,
      scrollPos: this._scrollPos,
      scrollDirection: this._scrollDirection,
      container: this.options.container,
      isDocument: this._isDocument,
    };

    if (values[about] !== undefined) {
      return values[about];
    }

    return values;
  }

  loglevel(newLoglevel) {
    if (!arguments.length) {
      return this.options.loglevel;

    } else if (this.options.loglevel !== newLoglevel) {
      this.options.loglevel = newLoglevel;
    }

    return this;
  }

  enabled(newState) {
    if (!arguments.length) {
      return this._enabled;

    } else if (this._enabled !== newState) {
      this._enabled = !!newState;

      this.updateScene(this._sceneObjects, true);
    }

    return this;
  }

  destroy(resetScenes) {
    window.clearTimeout(this._refreshTimeout);

    const sceneObjectsTmp = this._sceneObjects.map(scene => scene);

    sceneObjectsTmp.forEach(scene => scene.destroy(resetScenes));

    this.options.container.removeEventListener('resize', this._onChange.bind(this), { passive: true });
    this.options.container.removeEventListener('scroll', this._onChange.bind(this), { passive: true });

    window.cancelAnimationFrame(this._updateTimeout);

    Log.log(3, `destroyed ${NAMESPACE} (reset: ${resetScenes ? 'true' : 'false'})`);

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
  _handleBoundsPositionChange() {
    this.updateBoundsPositions();
  }

  // event handler for when associated trigger groups need to be repositioned
  _handleTriggerPositionChange() {
    this.updateTriggerGroupPositions();

    this._sceneObjects.forEach((scene) => {
      if (scene._indicator) {
        scene._indicator._updateBounds();
      }
    });
  }

  // updates the position of the bounds container to aligned to the right for vertical containers and to the bottom for horizontal
  updateBoundsPositions(specificIndicator) {
    // constant for all bounds
    const groups = specificIndicator ?
      [_.merge({}, specificIndicator.triggerGroup, { members: [specificIndicator] })] : // create a group with only one element
      this._indicators.groups; // use all
    let groupsCount = groups.length;
    const pos = this._vertical ? 'left' : 'top';
    const dimension = this._vertical ? 'width' : 'height';
    const edge = this._vertical ?
      Util.scrollLeft(this._container) + (Util.width(this._container) - EDGE_OFFSET) :
      Util.scrollTop(this._container) + (Util.height(this._container) - EDGE_OFFSET);
    let boundsCount;
    let triggerSize;
    let group;

    while (groupsCount--) { // group loop
      group = groups[groupsCount];
      boundsCount = group.members.length;
      triggerSize = Util[dimension](group.element.firstChild);

      while (boundsCount--) { // indicators loop
        const boundsCss = {};
        boundsCss[pos] = edge - triggerSize;
        Util.css(group.members[boundsCount].bounds, boundsCss);
      }
    }
  }

  // updates the positions of all trigger groups attached to a controller or a specific one, if provided
  updateTriggerGroupPositions(specificGroup) {
    // constant vars
    const groups = specificGroup ? [specificGroup] : this._indicators.groups;
    let i = groups.length;
    const container = this._isDocument ? document.body : this._container;
    const containerOffset = this._isDocument ? { top: 0, left: 0 } : Util.offset(container, true);
    const edge = this._vertical ?
      Util.width(this._container) - EDGE_OFFSET :
      Util.height(this._container) - EDGE_OFFSET;
    const dimension = this._vertical ? 'width' : 'height';
    const transformAxis = this._vertical ? 'Y' : 'X';

    // changing vars
    let group;
    let el;
    let pos;
    let elSize;
    let transform;
    while (i--) {
      group = groups[i];
      el = group.element;
      pos = group.triggerHook * this.info('size');
      elSize = Util[dimension](el.firstChild.firstChild);
      transform = pos > elSize ? `translate${transformAxis}(-100%)` : '';

      Util.css(el, {
        top: containerOffset.top + (this._vertical ? pos : edge - group.members[0].options.indent),
        left: containerOffset.left + (this._vertical ? edge - group.members[0].options.indent : pos),
      });

      Util.css(el.firstChild.firstChild, { transform });
    }
  }

  // updates the label for the group to contain the name, if it only has one member
  updateTriggerGroupLabel(group) {
    const text = `trigger${group.members.length > 1 ? '' : ` ${group.members[0].options.name}`}`;
    const elem = group.element.firstChild.firstChild;
    const doUpdate = elem.textContent !== text;
    if (doUpdate) {
      elem.textContent = text;
      if (this._vertical) { // bounds position is dependent on text length, so update
        this.updateBoundsPositions();
      }
    }
  }
}

export default Controller;
