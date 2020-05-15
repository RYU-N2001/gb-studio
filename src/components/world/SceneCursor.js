import React, { Component } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { connect } from "react-redux";
import { PlusIcon, ResizeIcon, CloseIcon, BrickIcon, PaintIcon } from "../library/Icons";
import { getScenesLookup } from "../../reducers/entitiesReducer";
import * as actions from "../../actions";
import { SceneShape } from "../../reducers/stateShape";
import { TOOL_COLORS, TOOL_COLLISIONS, TOOL_ERASER, TOOL_TRIGGERS, TOOL_ACTORS, BRUSH_FILL, BRUSH_16PX } from "../../consts";

class SceneCursor extends Component {
  constructor() {
    super();
    this.drawLine = false;
    this.startX = undefined;
    this.startY = undefined;
    this.lockX = undefined;
    this.lockY = undefined;
    this.state = {
      resize: false
    };
  }

  componentDidMount() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  onKeyDown = e => {
    if (e.target.nodeName !== "BODY") {
      return;
    }
    if(e.shiftKey) {
      this.drawLine = true;    
      this.startX = undefined;
      this.startY = undefined;      
    }
    if (e.ctrlKey || e.shiftKey || e.metaKey) {
      return;
    }
    if (e.code === "KeyP") {
      const { x, y, enabled, sceneId, editPlayerStartAt } = this.props;
      if (enabled) {
        editPlayerStartAt(sceneId, x, y);
      }
    }
  };

  onKeyUp = e => {
    if (e.target.nodeName !== "BODY") {
      return;
    }
    if(!e.shiftKey) {
      this.drawLine = false;  
    }
  };

  onMouseDown = e => {
    const {
      x,
      y,
      tool,
      setTool,
      selectedPalette,
      selectedBrush,
      addActor,
      addTrigger,
      sceneId,
      scene,
      prefab,
      selectScene,
      showCollisions,
      showLayers,
      paintCollisionTile,
      paintCollisionLine,
      paintCollisionFill,
      paintColorTile,
      paintColorLine,
      paintColorFill,
      removeActorAt,
      removeTriggerAt,
      sceneFiltered,
      editSearchTerm
    } = this.props;

    this.lockX = undefined;
    this.lockY = undefined;

    if(sceneFiltered) {
      editSearchTerm(undefined);
    }

    if (tool === "actors") {
      addActor(sceneId, x, y, prefab);
      setTool("select");
    } else if (tool === "triggers") {
      addTrigger(sceneId, x, y, prefab);
      this.startX = x;
      this.startY = y;
      this.setState({ resize: true });
      window.addEventListener("mousemove", this.onResizeTrigger);
      window.addEventListener("mouseup", this.onResizeTriggerStop);
    } else if (tool === "collisions") {

      if(!this.drawLine || this.startX === undefined || this.startY === undefined) {
        const collisionIndex = scene.width * y + x;
        const collisionByteIndex = collisionIndex >> 3;
        const collisionByteOffset = collisionIndex & 7;
        const collisionByteMask = 1 << collisionByteOffset;
        if (scene.collisions[collisionByteIndex] & collisionByteMask) {
          this.remove = true;
        } else {
          this.remove = false;
        }
      }
      if(selectedBrush === BRUSH_FILL) {
        paintCollisionFill(sceneId, x, y, !this.remove);
      } else {
        const brushSize = selectedBrush === BRUSH_16PX ? 2 : 1;
        if(this.drawLine && this.startX !== undefined && this.startY !== undefined) {
          paintCollisionLine(sceneId, this.startX, this.startY, x, y, !this.remove, brushSize);
          this.startX = x;
          this.startY = y;
        } else {
          this.startX = x;
          this.startY = y;          
          paintCollisionTile(sceneId, x, y, !this.remove, brushSize);
        }
        window.addEventListener("mousemove", this.onCollisionsMove);
        window.addEventListener("mouseup", this.onCollisionsStop);
      }
    } else if (tool === "colors") {
      if(selectedBrush === BRUSH_FILL) {
        paintColorFill(sceneId, x, y, selectedPalette);
      } else {
        const brushSize = selectedBrush === BRUSH_16PX ? 2 : 1;
        if(this.drawLine && this.startX !== undefined && this.startY !== undefined) {
          paintColorLine(sceneId, this.startX, this.startY, x, y, selectedPalette, brushSize);
          this.startX = x;
          this.startY = y;
        } else {
          this.startX = x;
          this.startY = y;          
          paintColorTile(sceneId, x, y, selectedPalette, brushSize);
        }
        window.addEventListener("mousemove", this.onColorsMove);
        window.addEventListener("mouseup", this.onColorsStop);
      }
    } else if (tool === "eraser") {
      if (showCollisions) {
        this.remove = true;
        if(selectedBrush === BRUSH_FILL) {
          paintCollisionFill(sceneId, x, y, !this.remove);
        } else {
          const brushSize = selectedBrush === BRUSH_16PX ? 2 : 1;
          if(this.drawLine && this.startX !== undefined && this.startY !== undefined) {
            paintCollisionLine(sceneId, this.startX, this.startY, x, y, !this.remove, brushSize);
            this.startX = x;
            this.startY = y;
          } else {
            this.startX = x;
            this.startY = y;          
            paintCollisionTile(sceneId, x, y, !this.remove, brushSize);
          }
          window.addEventListener("mousemove", this.onCollisionsMove);
          window.addEventListener("mouseup", this.onCollisionsStop);
        }
      }
      if(showLayers) {
        removeActorAt(sceneId, x, y);
        removeTriggerAt(sceneId, x, y);
        if(selectedBrush === BRUSH_16PX) {
          removeActorAt(sceneId, x + 1, y);
          removeTriggerAt(sceneId, x + 1, y);
          removeActorAt(sceneId, x, y + 1);
          removeTriggerAt(sceneId, x, y + 1);
          removeActorAt(sceneId, x + 1, y + 1);
          removeTriggerAt(sceneId, x + 1, y + 1);                              
        }
      }
    } else if (tool === "select") {
      selectScene(sceneId);
    }
  };

  onResizeTrigger = e => {
    const { x, y, sceneId, entityId, resizeTrigger } = this.props;
    if (entityId && (this.currentX !== x || this.currentY !== y)) {
      resizeTrigger(sceneId, entityId, this.startX, this.startY, x, y);
      this.currentX = x;
      this.currentY = y;
    }
  };

  onResizeTriggerStop = e => {
    const { setTool } = this.props;
    setTool("select");
    this.setState({ resize: false });
    window.removeEventListener("mousemove", this.onResizeTrigger);
    window.removeEventListener("mouseup", this.onResizeTriggerStop);
  };

  onCollisionsMove = e => {
    const {
      x,
      y,
      enabled,
      sceneId,
      selectedBrush,
      paintCollisionTile,
      paintCollisionLine
    } = this.props;
    if (enabled && (this.currentX !== x || this.currentY !== y)) {
      const brushSize = selectedBrush === BRUSH_16PX ? 2 : 1;

      if(this.drawLine) {
        if(this.startX === undefined || this.startY === undefined) {
          this.startX = x;
          this.startY = y;
        }
        let x1 = x;
        let y1 = y;
        if(this.lockX) {
          x1 = this.startX;
        } else if(this.lockY) {
          y1 = this.startY;
        } else if (x !== this.startX) {
          this.lockY = true;
          y1 = this.startY;
        } else if (y !== this.startY) {
          this.lockX = true;
          x1 = this.startX;
        }
        paintCollisionLine(sceneId, this.startX, this.startY, x1, y1, !this.remove, brushSize);        
        this.startX = x1;
        this.startY = y1;
      } else {
        paintCollisionTile(sceneId, x, y, !this.remove, brushSize);
      }
      this.currentX = x;
      this.currentY = y;
    }
  };

  onCollisionsStop = e => {
    window.removeEventListener("mousemove", this.onCollisionsMove);
    window.removeEventListener("mouseup", this.onCollisionsStop);
  };

  onColorsMove = e => {
    const {
      x,
      y,
      enabled,
      sceneId,
      selectedPalette,
      selectedBrush,
      paintColorTile,
      paintColorLine
    } = this.props;
    if (enabled && (this.currentX !== x || this.currentY !== y)) {
      const brushSize = selectedBrush === BRUSH_16PX ? 2 : 1;

      if(this.drawLine) {
        if(this.startX === undefined || this.startY === undefined) {
          this.startX = x;
          this.startY = y;
        }        
        let x1 = x;
        let y1 = y;
        if(this.lockX) {
          x1 = this.startX;
        } else if(this.lockY) {
          y1 = this.startY;
        } else if (x !== this.startX) {
          this.lockY = true;
          y1 = this.startY;
        } else if (y !== this.startY) {
          this.lockX = true;
          x1 = this.startX;
        }
        paintColorLine(sceneId, this.startX, this.startY, x1, y1, selectedPalette, brushSize);        
        this.startX = x1;
        this.startY = y1;
      } else {
        paintColorTile(sceneId, x, y, selectedPalette, brushSize);
      }
      this.currentX = x;
      this.currentY = y;
    }
  };

  onColorsStop = e => {
    window.removeEventListener("mousemove", this.onColorsMove);
    window.removeEventListener("mouseup", this.onColorsStop);
  };

  render() {
    const { x, y, tool, enabled, selectedBrush } = this.props;
    const { resize } = this.state;
    if (!enabled) {
      return <div />;
    }
    return (
      <div
        className={cx("SceneCursor", {
          "SceneCursor--AddActor": tool === TOOL_ACTORS,
          "SceneCursor--AddTrigger": tool === TOOL_TRIGGERS,
          "SceneCursor--Eraser": tool === TOOL_ERASER,
          "SceneCursor--Collisions": tool === TOOL_COLLISIONS,
          "SceneCursor--Colors": tool === TOOL_COLORS,
          "SceneCursor--Size16px": (tool === TOOL_COLORS || tool === TOOL_COLLISIONS || tool === TOOL_ERASER) && selectedBrush === BRUSH_16PX
        })}
        onMouseDown={this.onMouseDown}
        style={{
          top: y * 8,
          left: x * 8
        }}
      >
        {(tool === TOOL_ACTORS ||
          tool === TOOL_TRIGGERS ||
          tool === TOOL_ERASER ||
          tool === TOOL_COLORS ||
          tool === TOOL_COLLISIONS) && (
          <div className="SceneCursor__AddBubble">
            {tool === TOOL_ACTORS && <PlusIcon />}
            {tool === TOOL_TRIGGERS && (resize ? <ResizeIcon /> : <PlusIcon />)}
            {tool === TOOL_ERASER && <CloseIcon />}
            {tool === TOOL_COLLISIONS && <BrickIcon />}
            {tool === TOOL_COLORS && <PaintIcon />}
          </div>
        )}
      </div>
    );
  }
}

SceneCursor.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  entityId: PropTypes.string,
  prefab: PropTypes.shape(),
  sceneId: PropTypes.string.isRequired,
  scene: SceneShape.isRequired,
  showCollisions: PropTypes.bool.isRequired,
  showLayers: PropTypes.bool.isRequired,
  enabled: PropTypes.bool.isRequired,
  tool: PropTypes.string.isRequired,
  setTool: PropTypes.func.isRequired,
  selectScene: PropTypes.func.isRequired,
  addActor: PropTypes.func.isRequired,
  addTrigger: PropTypes.func.isRequired,
  editPlayerStartAt: PropTypes.func.isRequired,
  resizeTrigger: PropTypes.func.isRequired,
  removeActorAt: PropTypes.func.isRequired,
  removeTriggerAt: PropTypes.func.isRequired
};

SceneCursor.defaultProps = {
  entityId: null,
  prefab: {}
};

function mapStateToProps(state, props) {
  const { selected: tool, prefab } = state.tools;
  const { x, y } = state.editor.hover;
  const { type: editorType, entityId, selectedPalette, selectedBrush, showLayers } = state.editor;
  const showCollisions = state.entities.present.result.settings.showCollisions;
  const scenesLookup = getScenesLookup(state);
  const scene = scenesLookup[props.sceneId];
  return {
    x: x || 0,
    y: y || 0,
    tool,
    selectedPalette,
    selectedBrush,
    prefab,
    editorType,
    entityId,
    showCollisions,
    scene,
    showLayers
  };
}

const mapDispatchToProps = {
  addActor: actions.addActor,
  removeActorAt: actions.removeActorAt,
  paintCollisionTile: actions.paintCollisionTile,
  paintCollisionLine: actions.paintCollisionLine,
  paintCollisionFill: actions.paintCollisionFill,
  paintColorTile: actions.paintColorTile,
  paintColorLine: actions.paintColorLine,
  paintColorFill: actions.paintColorFill,
  addTrigger: actions.addTrigger,
  removeTriggerAt: actions.removeTriggerAt,
  resizeTrigger: actions.resizeTrigger,
  selectScene: actions.selectScene,
  setTool: actions.setTool,
  editPlayerStartAt: actions.editPlayerStartAt,
  editDestinationPosition: actions.editDestinationPosition,
  editSearchTerm: actions.editSearchTerm
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SceneCursor);
