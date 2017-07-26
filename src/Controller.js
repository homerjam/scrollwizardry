/* eslint-env browser */

import _util from './_util';
import Scene from './Scene';

const PIN_SPACER_ATTRIBUTE = 'data-scrollmagic-pin-spacer';

const NAMESPACE = 'ScrollWizardry.Controller';

const SCROLL_DIRECTION_FORWARD = 'FORWARD';
const SCROLL_DIRECTION_REVERSE = 'REVERSE';
const SCROLL_DIRECTION_PAUSED = 'PAUSED';

const EDGE_OFFSET = 15; // minimum edge distance, added to indentation

let _sceneObjects = [];
let _updateScenesOnNextCycle = false;
let _scrollPos = 0;
let _scrollDirection = SCROLL_DIRECTION_PAUSED;
let _isDocument = true;
let _viewPortSize = 0;
let _enabled = true;
let _updateTimeout;
let _refreshTimeout;

const CONTROLLER_OPTIONS = {
  defaults: {
    container: window,
    vertical: true,
    globalSceneOptions: {},
    loglevel: 2,
    refreshInterval: 100,
    addIndicators: false,
  },
};

const DEFAULT_OPTIONS = CONTROLLER_OPTIONS.defaults;

class Controller {
  constructor(options) {
    this.options = _util.extend({}, DEFAULT_OPTIONS, options);

    this.options.container = _util.get.elements(this.options.container)[0];

    // check scroll container
    if (!this.options.container) {
      _util.log(1, `ERROR creating object ${NAMESPACE}: No valid scroll container supplied`);
      throw Error(`${NAMESPACE} init failed.`); // cancel
    }

    _isDocument = this.options.container === window || this.options.container === document.body || !document.body.contains(this.options.container);

    // normalize to window
    if (_isDocument) {
      this.options.container = window;
    }

    // update container size immediately
    _viewPortSize = this._getViewportSize();

    // set event handlers
    this.options.container.addEventListener('resize', (event) => {
      this._onChange(event);
    });
    this.options.container.addEventListener('scroll', (event) => {
      this._onChange(event);
    });

    const ri = parseInt(this.options.refreshInterval, 10);
    this.options.refreshInterval = _util.type.Number(ri) ? ri : DEFAULT_OPTIONS.refreshInterval;
    this._scheduleRefresh();

    // indicators
    this._info = this.info();
    this._container = this._info.container;
    this._isDocument = this._info.isDocument;
    this._vertical = this._info.vertical;
    this._indicators = { // container for all indicators and methods
      groups: [],
    };

    if (this.options.addIndicators) {
      this._container.addEventListener('resize', this._handleTriggerPositionChange.bind(this));
      if (!this._isDocument) {
        window.addEventListener('resize', this._handleTriggerPositionChange.bind(this));
        window.addEventListener('scroll', this._handleTriggerPositionChange.bind(this));
      }
      // update all related bounds containers
      this._container.addEventListener('resize', this._handleBoundsPositionChange.bind(this));
      this._container.addEventListener('scroll', this._handleBoundsPositionChange.bind(this));
    }

    _util.log(3, `added new ${NAMESPACE}`);
  }

  _scheduleRefresh() {
    if (this.options.refreshInterval > 0) {
      _refreshTimeout = window.setTimeout(() => {
        this._refresh();
      }, this.options.refreshInterval);
    }
  }

  _getScrollPos() {
    return this.options.vertical ? _util.get.scrollTop(this.options.container) : _util.get.scrollLeft(this.options.container);
  }

  _getViewportSize() {
    return this.options.vertical ? _util.get.height(this.options.container) : _util.get.width(this.options.container);
  }

  _setScrollPos(pos) {
    if (this.options.vertical) {
      if (_isDocument) {
        window.scrollTo(_util.get.scrollLeft(), pos);
      } else {
        this.options.container.scrollTop = pos;
      }
    } else if (_isDocument) {
      window.scrollTo(pos, _util.get.scrollTop());
    } else {
      this.options.container.scrollLeft = pos;
    }
  }

  _updateScenes() {
    if (_enabled && _updateScenesOnNextCycle) {
      // determine scenes to update
      const scenesToUpdate = _util.type.Array(_updateScenesOnNextCycle) ? _updateScenesOnNextCycle : _sceneObjects.slice(0);

      // reset scenes
      _updateScenesOnNextCycle = false;

      const oldScrollPos = _scrollPos;

      // update scroll pos now instead of on change, as it might have changed since scheduling (i.e. in-browser smooth scroll)
      _scrollPos = this.scrollPos();

      const deltaScroll = _scrollPos - oldScrollPos;

      if (deltaScroll !== 0) { // scroll position changed?
        _scrollDirection = (deltaScroll > 0) ? SCROLL_DIRECTION_FORWARD : SCROLL_DIRECTION_REVERSE;
      }

      // reverse order of scenes if scrolling reverse
      if (_scrollDirection === SCROLL_DIRECTION_REVERSE) {
        scenesToUpdate.reverse();
      }

      // update scenes
      scenesToUpdate.forEach((scene, index) => {
        _util.log(3, `updating scene ${index + 1}/${scenesToUpdate.length} (${_sceneObjects.length} total)`);
        scene.update(true);
      });

      if (scenesToUpdate.length === 0 && this.options.loglevel >= 3) {
        _util.log(3, 'updating 0 scenes (nothing added to controller)');
      }
    }
  }

  _debounceUpdate() {
    _updateTimeout = _util.rAF(() => {
      this._updateScenes();
    });
  }

  _onChange(event) {
    _util.log(3, 'event fired causing an update:', event.type);
    if (event.type === 'resize') {
      // resize
      _viewPortSize = this._getViewportSize();
      _scrollDirection = SCROLL_DIRECTION_PAUSED;
    }
    // schedule update
    if (_updateScenesOnNextCycle !== true) {
      _updateScenesOnNextCycle = true;
      this._debounceUpdate();
    }
  }

  _refresh() {
    if (!_isDocument) {
      // simulate resize event, only works for viewport relevant param (performance)
      if (_viewPortSize !== this._getViewportSize()) {
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
    _sceneObjects.forEach((scene, index) => {
      scene.refresh();
    });

    this._scheduleRefresh();
  }

  _sortScenes(ScenesArray) {
    if (ScenesArray.length <= 1) {
      return ScenesArray;
    }
    const scenes = ScenesArray.slice(0);
    scenes.sort((a, b) => (a.scrollOffset() > b.scrollOffset() ? 1 : -1));
    return scenes;
  }

  addScene(newScene) {
    if (_util.type.Array(newScene)) {
      newScene.forEach((scene, index) => {
        this.addScene(scene);
      });
    } else if (newScene.controller() !== this) {
      newScene.addTo(this);
    } else if (_sceneObjects.indexOf(newScene) < 0) {
      // new scene
      _sceneObjects.push(newScene); // add to array
      _sceneObjects = this._sortScenes(_sceneObjects); // sort
      newScene.on('shift.controller_sort', () => { // resort whenever scene moves
        _sceneObjects = this._sortScenes(_sceneObjects);
      });
      // insert global defaults.
      for (const key in this.options.globalSceneOptions) {
        if (newScene[key]) {
          newScene[key].call(newScene, this.options.globalSceneOptions[key]);
        }
      }
      _util.log(3, `adding Scene (now ${_sceneObjects.length} total)`);
    }

    // indicators

    if (this.options.addIndicators) {
      if (newScene instanceof Scene && newScene.controller() === this) {
        newScene.addIndicators();
      }
    }

    return this;
  }

  removeScene(scene) {
    if (_util.type.Array(scene)) {
      scene.forEach((_scene, index) => {
        this.removeScene(_scene);
      });
    } else {
      const index = _sceneObjects.indexOf(scene);
      if (index > -1) {
        scene.off('shift.controller_sort');
        _sceneObjects.splice(index, 1);
        _util.log(3, `removing Scene (now ${_sceneObjects.length} left)`);
        scene.remove();
      }
    }
    return this;
  }

  updateScene(scene, immediately) {
    if (_util.type.Array(scene)) {
      scene.forEach((_scene, index) => {
        this.updateScene(_scene, immediately);
      });
    } else if (immediately) {
      scene.update(true);

    // if _updateScenesOnNextCycle is true, all connected scenes are already scheduled for update
    } else if (_updateScenesOnNextCycle !== true) {
      // prep array for next update cycle
      _updateScenesOnNextCycle = _updateScenesOnNextCycle || [];
      if (_updateScenesOnNextCycle.indexOf(scene) === -1) {
        _updateScenesOnNextCycle.push(scene);
      }
      _updateScenesOnNextCycle = this._sortScenes(_updateScenesOnNextCycle); // sort
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
    if (_util.type.Number(scrollTarget)) { // excecute
      this._setScrollPos.call(this.options.container, scrollTarget, additionalParameter);
    } else if (_util.type.Function(scrollTarget)) { // assign new scroll function
      this._setScrollPos = scrollTarget;
    } else if (scrollTarget instanceof HTMLElement) { // scroll to element
      let elem = _util.get.elements(scrollTarget)[0];
      if (elem) {
        // if parent is pin spacer, use spacer position instead so correct start position is returned for pinned elements.
        while (elem.parentNode.hasAttribute(PIN_SPACER_ATTRIBUTE)) {
          elem = elem.parentNode;
        }

        // which param is of interest ?
        const param = this.options.vertical ? 'top' : 'left';

        // container position is needed because element offset is returned in relation to document, not in relation to container.
        const containerOffset = _util.get.offset(this.options.container);

        const elementOffset = _util.get.offset(elem);

        if (!_isDocument) { // container is not the document root, so substract scroll Position to get correct trigger element position relative to scrollcontent
          containerOffset[param] -= this.scrollPos();
        }

        this.scrollTo(elementOffset[param] - containerOffset[param], additionalParameter);
      } else {
        _util.log(2, 'scrollTo(): The supplied argument is invalid. Scroll cancelled.', scrollTarget);
      }
    } else { // scroll to scene
      if (scrollTarget.controller() === this) { // check if the controller is associated with this scene
        this.scrollTo(scrollTarget.scrollOffset(), additionalParameter);
      } else {
        _util.log(2, 'scrollTo(): The supplied scene does not belong to this controller. Scroll cancelled.', scrollTarget);
      }
    }
    return this;
  }

  scrollPos(scrollPosMethod) {
    if (!arguments.length) { // get
      return this._getScrollPos.call(this);
    } // set
    if (_util.type.Function(scrollPosMethod)) {
      this._getScrollPos = scrollPosMethod;
    } else {
      _util.log(2, "Provided value for method 'scrollPos' is not a function. To change the current scroll position use 'scrollTo()'.");
    }

    return this;
  }

  info(about) {
    const values = {
      size: _viewPortSize, // contains height or width (in regard to orientation)
      vertical: this.options.vertical,
      scrollPos: _scrollPos,
      scrollDirection: _scrollDirection,
      container: this.options.container,
      isDocument: _isDocument,
    };
    if (values[about]) {
      return values[about];
    }
    return values;
  }

  loglevel(newLoglevel) {
    if (!arguments.length) { // get
      return this.options.loglevel;
    } else if (this.options.loglevel !== newLoglevel) { // set
      this.options.loglevel = newLoglevel;
    }
    return this;
  }

  enabled(newState) {
    if (!arguments.length) { // get
      return _enabled;
    } else if (_enabled !== newState) { // set
      _enabled = !!newState;
      this.updateScene(_sceneObjects, true);
    }
    return this;
  }

  destroy(resetScenes) {
    window.clearTimeout(_refreshTimeout);

    let i = _sceneObjects.length;

    while (i--) {
      _sceneObjects[i].destroy(resetScenes);
    }

    this.options.container.removeEventListener('resize', (event) => {
      this._onChange(event);
    });
    this.options.container.removeEventListener('scroll', (event) => {
      this._onChange(event);
    });

    _util.cAF(_updateTimeout);

    _util.log(3, `destroyed ${NAMESPACE} (reset: ${resetScenes ? 'true' : 'false'})`);

    // indicators

    if (this.options.addIndicators) {
      this._container.removeEventListener('resize', this._handleTriggerPositionChange.bind(this));
      if (!this._isDocument) {
        window.removeEventListener('resize', this._handleTriggerPositionChange.bind(this));
        window.removeEventListener('scroll', this._handleTriggerPositionChange.bind(this));
      }
      this._container.removeEventListener('resize', this._handleBoundsPositionChange.bind(this));
      this._container.removeEventListener('scroll', this._handleBoundsPositionChange.bind(this));
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
  }

  // updates the position of the bounds container to aligned to the right for vertical containers and to the bottom for horizontal
  updateBoundsPositions(specificIndicator) {
    // constant for all bounds
    const groups = specificIndicator ?
      [_util.extend({}, specificIndicator.triggerGroup, { members: [specificIndicator] })] : // create a group with only one element
      this._indicators.groups; // use all
    let g = groups.length;
    const css = {};
    const paramPos = this._vertical ? 'left' : 'top';
    const paramDimension = this._vertical ? 'width' : 'height';
    const edge = this._vertical ?
      _util.get.scrollLeft(this._container) + _util.get.width(this._container) - EDGE_OFFSET :
      _util.get.scrollTop(this._container) + _util.get.height(this._container) - EDGE_OFFSET;
    let b;
    let triggerSize;
    let group;
    while (g--) { // group loop
      group = groups[g];
      b = group.members.length;
      triggerSize = _util.get[paramDimension](group.element.firstChild);
      while (b--) { // indicators loop
        css[paramPos] = edge - triggerSize;
        _util.css(group.members[b].bounds, css);
      }
    }
  }

  // updates the positions of all trigger groups attached to a controller or a specific one, if provided
  updateTriggerGroupPositions(specificGroup) {
    // constant vars
    const groups = specificGroup ? [specificGroup] : this._indicators.groups;
    let i = groups.length;
    const container = this._isDocument ? document.body : this._container;
    const containerOffset = this._isDocument ? { top: 0, left: 0 } : _util.get.offset(container, true);
    const edge = this._vertical ?
      _util.get.width(this._container) - EDGE_OFFSET :
      _util.get.height(this._container) - EDGE_OFFSET;
    const paramDimension = this._vertical ? 'width' : 'height';
    const paramTransform = this._vertical ? 'Y' : 'X';
    // changing vars
    let group;
    let elem;
    let pos;
    let elemSize;
    let transform;
    while (i--) {
      group = groups[i];
      elem = group.element;
      pos = group.triggerHook * this.info('size');
      elemSize = _util.get[paramDimension](elem.firstChild.firstChild);
      transform = pos > elemSize ? `translate${paramTransform}(-100%)` : '';

      _util.css(elem, {
        top: containerOffset.top + (this._vertical ? pos : edge - group.members[0].options.indent),
        left: containerOffset.left + (this._vertical ? edge - group.members[0].options.indent : pos),
      });
      _util.css(elem.firstChild.firstChild, {
        '-ms-transform': transform,
        '-webkit-transform': transform,
        transform,
      });
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
