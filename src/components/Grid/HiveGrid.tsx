import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { PlacedBuilding, ViewportState, EditorState } from '../../types';
import { TILE_SIZE, MIN_SCALE, MAX_SCALE, canvasToGrid, gridToCanvas } from '../../utils/grid';
import { getBuildingById } from '../../data/buildings';
import BuildingShape from './BuildingShape';

interface HiveGridProps {
  buildings: PlacedBuilding[];
  gridWidth: number;
  gridHeight: number;
  editorState: EditorState;
  onPlaceBuilding: (gridX: number, gridY: number) => void;
  onSelectBuilding: (buildingId: string | null) => void;
  onMoveBuilding: (buildingId: string, gridX: number, gridY: number) => void;
  onDeleteBuilding: (buildingId: string) => void;
  stageRef: React.RefObject<any>;
}

export default function HiveGrid({
  buildings,
  gridWidth,
  gridHeight,
  editorState,
  onPlaceBuilding,
  onSelectBuilding,
  onMoveBuilding,
  onDeleteBuilding,
  stageRef
}: HiveGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, scale: 0.8 });
  const [, setIsDragging] = useState(false);

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = viewport.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale + direction * 0.1));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    };

    setViewport({ x: newPos.x, y: newPos.y, scale: newScale });
  }, [viewport, stageRef]);

  // Handle stage click
  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Check if clicked on empty space
    if (e.target === e.target.getStage()) {
      if (editorState.toolMode === 'place' && editorState.selectedBuildingTypeId) {
        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const gridPos = canvasToGrid(
          (pointer.x - viewport.x) / viewport.scale,
          (pointer.y - viewport.y) / viewport.scale
        );

        onPlaceBuilding(gridPos.x, gridPos.y);
      } else {
        onSelectBuilding(null);
      }
    }
  }, [editorState, viewport, onPlaceBuilding, onSelectBuilding, stageRef]);

  // Handle stage drag
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    setViewport(prev => ({
      ...prev,
      x: e.target.x(),
      y: e.target.y()
    }));
  }, []);

  // Render grid lines
  const renderGrid = () => {
    if (!editorState.showGrid) return null;

    const lines = [];
    const gridColor = 'rgba(255, 255, 255, 0.1)';
    const majorGridColor = 'rgba(255, 255, 255, 0.25)';

    // Vertical lines
    for (let x = 0; x <= gridWidth; x++) {
      const isMajor = x % 10 === 0;
      lines.push(
        <Rect
          key={`v-${x}`}
          x={x * TILE_SIZE}
          y={0}
          width={1}
          height={gridHeight * TILE_SIZE}
          fill={isMajor ? majorGridColor : gridColor}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= gridHeight; y++) {
      const isMajor = y % 10 === 0;
      lines.push(
        <Rect
          key={`h-${y}`}
          x={0}
          y={y * TILE_SIZE}
          width={gridWidth * TILE_SIZE}
          height={1}
          fill={isMajor ? majorGridColor : gridColor}
        />
      );
    }

    return lines;
  };

  // Render coordinate labels
  const renderCoords = () => {
    if (!editorState.showCoords) return null;

    const coords = [];
    
    // X axis labels
    for (let x = 0; x < gridWidth; x += 5) {
      coords.push(
        <Text
          key={`x-${x}`}
          x={x * TILE_SIZE + TILE_SIZE / 2}
          y={-20}
          text={x.toString()}
          fontSize={10}
          fill="#888"
          align="center"
        />
      );
    }

    // Y axis labels
    for (let y = 0; y < gridHeight; y += 5) {
      coords.push(
        <Text
          key={`y-${y}`}
          x={-20}
          y={y * TILE_SIZE + TILE_SIZE / 2}
          text={y.toString()}
          fontSize={10}
          fill="#888"
          align="right"
        />
      );
    }

    return coords;
  };

  // Handle building drag
  const handleBuildingDragEnd = useCallback((buildingId: string, e: KonvaEventObject<DragEvent>) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const buildingType = getBuildingById(building.buildingTypeId);
    if (!buildingType) return;

    const gridPos = canvasToGrid(e.target.x(), e.target.y());
    
    // Snap to grid
    const snappedPos = gridToCanvas(gridPos.x, gridPos.y);
    e.target.position(snappedPos);

    onMoveBuilding(buildingId, gridPos.x, gridPos.y);
  }, [buildings, onMoveBuilding]);

  return (
    <div 
      ref={containerRef} 
      className="grid-container"
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        touchAction: 'none'
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={editorState.toolMode === 'pan' || editorState.toolMode === 'select'}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={gridWidth * TILE_SIZE}
            height={gridHeight * TILE_SIZE}
            fill="#1a1a2e"
          />

          {/* Grid lines */}
          {renderGrid()}

          {/* Coordinate labels */}
          {renderCoords()}

          {/* Buildings */}
          {buildings.map(building => (
            <BuildingShape
              key={building.id}
              building={building}
              isSelected={editorState.selectedBuildingId === building.id}
              onSelect={() => onSelectBuilding(building.id)}
              onDragEnd={(e) => handleBuildingDragEnd(building.id, e)}
              onDelete={() => onDeleteBuilding(building.id)}
              toolMode={editorState.toolMode}
            />
          ))}
        </Layer>
      </Stage>

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button 
          onClick={() => setViewport(prev => ({ ...prev, scale: Math.min(MAX_SCALE, prev.scale + 0.2) }))}
          className="zoom-btn"
        >
          +
        </button>
        <span className="zoom-level">{Math.round(viewport.scale * 100)}%</span>
        <button 
          onClick={() => setViewport(prev => ({ ...prev, scale: Math.max(MIN_SCALE, prev.scale - 0.2) }))}
          className="zoom-btn"
        >
          −
        </button>
        <button 
          onClick={() => setViewport({ x: 50, y: 50, scale: 0.8 })}
          className="zoom-btn"
          title="Reset View"
        >
          ⌂
        </button>
      </div>
    </div>
  );
}

