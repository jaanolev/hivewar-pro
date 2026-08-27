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
  canEdit: boolean;
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
  stageRef,
  canEdit,
}: HiveGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, scale: 0.8 });
  const [, setIsDragging] = useState(false);
  const prevBuildingCountRef = useRef(buildings.length);
  const hadEmptyBuildingsRef = useRef(buildings.length === 0);

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

  // Zoom the buttons (+/-) around the stage center, so the content the user
  // is looking at stays roughly under their eye. The previous implementation
  // changed scale while leaving viewport.x/y untouched, which made content
  // jump off-screen on each click — Clarity recordings showed users hitting
  // "+" and immediately re-clicking because it felt broken.
  const zoomFromCenter = useCallback((delta: number) => {
    setViewport((prev) => {
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, prev.scale + delta)
      );
      if (newScale === prev.scale) return prev;
      const stage = stageRef.current;
      const cx = stage ? stage.width() / 2 : 0;
      const cy = stage ? stage.height() / 2 : 0;
      const worldX = (cx - prev.x) / prev.scale;
      const worldY = (cy - prev.y) / prev.scale;
      return {
        x: cx - worldX * newScale,
        y: cy - worldY * newScale,
        scale: newScale,
      };
    });
  }, [stageRef]);

  // One-tap frame of the full grid, or of placed buildings when the hive
  // has content. Clarity sessions showed users spam −/+ trying to "see
  // everything" — button zoom is the wrong tool for that job.
  const fitToView = useCallback(() => {
    const stage = stageRef.current;
    const viewW = stage?.width() ?? dimensions.width;
    const viewH = stage?.height() ?? dimensions.height;
    if (viewW <= 0 || viewH <= 0) return;

    const padding = 28;
    let worldX = 0;
    let worldY = 0;
    let worldW = gridWidth * TILE_SIZE;
    let worldH = gridHeight * TILE_SIZE;

    if (buildings.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const b of buildings) {
        const type = getBuildingById(b.buildingTypeId);
        const bw = type?.width ?? 1;
        const bh = type?.height ?? 1;
        // Rotation swaps footprint axes for 90°/270°.
        const rot = ((b.rotation % 360) + 360) % 360;
        const w = rot === 90 || rot === 270 ? bh : bw;
        const h = rot === 90 || rot === 270 ? bw : bh;
        minX = Math.min(minX, b.gridX);
        minY = Math.min(minY, b.gridY);
        maxX = Math.max(maxX, b.gridX + w);
        maxY = Math.max(maxY, b.gridY + h);
      }
      // 2-tile breathing room around the hive
      minX = Math.max(0, minX - 2);
      minY = Math.max(0, minY - 2);
      maxX = Math.min(gridWidth, maxX + 2);
      maxY = Math.min(gridHeight, maxY + 2);
      worldX = minX * TILE_SIZE;
      worldY = minY * TILE_SIZE;
      worldW = Math.max(TILE_SIZE, (maxX - minX) * TILE_SIZE);
      worldH = Math.max(TILE_SIZE, (maxY - minY) * TILE_SIZE);
    }

    const scale = Math.max(
      MIN_SCALE,
      Math.min(
        MAX_SCALE,
        Math.min((viewW - padding * 2) / worldW, (viewH - padding * 2) / worldH)
      )
    );
    setViewport({
      x: (viewW - worldW * scale) / 2 - worldX * scale,
      y: (viewH - worldH * scale) / 2 - worldY * scale,
      scale,
    });
  }, [buildings, dimensions.height, dimensions.width, gridHeight, gridWidth, stageRef]);

  // After a template apply (empty → many buildings), frame the hive so users
  // don't have to spam zoom-out to find what just appeared.
  useEffect(() => {
    const prev = prevBuildingCountRef.current;
    const next = buildings.length;
    prevBuildingCountRef.current = next;
    if (prev === 0 && next >= 5) {
      const id = requestAnimationFrame(() => fitToView());
      return () => cancelAnimationFrame(id);
    }
  }, [buildings.length, fitToView]);

  // Auto-fit on first load when buildings are already present (e.g., shared
  // plan on mobile). Without this, view-only links on phones show an empty-
  // looking canvas until the user taps "Fit hive to screen".
  const hasAutoFittedRef = useRef(false);
  useEffect(() => {
    // Only run once after we've performed the fit
    if (hasAutoFittedRef.current) return;
    // Only when buildings are already loaded (shared/view links)
    if (buildings.length < 5) return;
    // Skip if buildings were ever empty (template-apply scenario)
    // — the effect above already handles that case
    if (hadEmptyBuildingsRef.current) return;
    // Only on mobile/tablet viewports where zoom-out is harder
    // (dimensions.width is measured from the container on mount, so this is reliable)
    if (dimensions.width > 768) return;
    
    hasAutoFittedRef.current = true;
    const id = requestAnimationFrame(() => fitToView());
    return () => cancelAnimationFrame(id);
  }, [buildings.length, dimensions.width, dimensions.height, fitToView]);

  // Handle stage click
  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Check if clicked on empty space
    if (e.target === e.target.getStage()) {
      if (canEdit && editorState.toolMode === 'place' && editorState.selectedBuildingTypeId) {
        const stage = stageRef.current;
        if (!stage) return;

        // For touch events, calculate pointer position manually to ensure correct
        // offset handling when the Stage is pushed down by the paste-reminder strip.
        // On touch devices, stage.getPointerPosition() can return incorrect coordinates
        // when there are layout shifts from dynamic chrome (gold share strip, etc).
        let pointer;
        const evt = e.evt;
        if ('touches' in evt || 'changedTouches' in evt) {
          // Touch event - get coordinates from the touch
          const touch = evt.touches?.[0] || evt.changedTouches?.[0];
          if (touch && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            pointer = {
              x: touch.clientX - rect.left,
              y: touch.clientY - rect.top
            };
          }
        } else {
          // Mouse event - use Konva's built-in method
          pointer = stage.getPointerPosition();
        }
        
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
  }, [canEdit, editorState, viewport, onPlaceBuilding, onSelectBuilding, stageRef]);

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
          listening={false}
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
          listening={false}
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
          listening={false}
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
          listening={false}
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
        draggable={editorState.toolMode === 'pan'}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Layer>
          {/* Background - listening={false} so clicks pass through to Stage */}
          <Rect
            x={0}
            y={0}
            width={gridWidth * TILE_SIZE}
            height={gridHeight * TILE_SIZE}
            fill="#1a1a2e"
            listening={false}
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
              canEdit={canEdit}
            />
          ))}
        </Layer>
      </Stage>

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button
          type="button"
          onClick={() => zoomFromCenter(0.2)}
          className="zoom-btn"
          aria-label="Zoom in"
        >
          +
        </button>
        <span className="zoom-level">{Math.round(viewport.scale * 100)}%</span>
        <button
          type="button"
          onClick={() => zoomFromCenter(-0.2)}
          className="zoom-btn"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={fitToView}
          className="zoom-btn zoom-btn-fit"
          title={buildings.length > 0 ? 'Fit hive to screen' : 'Fit full grid to screen'}
          aria-label={buildings.length > 0 ? 'Fit hive to screen' : 'Fit full grid to screen'}
        >
          ⊡
        </button>
        <button
          type="button"
          onClick={() => setViewport({ x: 50, y: 50, scale: 0.8 })}
          className="zoom-btn"
          title="Reset view"
          aria-label="Reset view"
        >
          ⌂
        </button>
      </div>
    </div>
  );
}

