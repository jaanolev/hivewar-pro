import { useEffect, useRef, useState } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { PlacedBuilding, ToolMode } from '../../types';
import { TILE_SIZE, gridToCanvas } from '../../utils/grid';
import { getBuildingById } from '../../data/buildings';

interface BuildingShapeProps {
  building: PlacedBuilding;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onDelete: () => void;
  toolMode: ToolMode;
  canEdit: boolean;
}

export default function BuildingShape({
  building,
  isSelected,
  onSelect,
  onDragEnd,
  onDelete,
  toolMode,
  canEdit,
}: BuildingShapeProps) {
  const buildingType = getBuildingById(building.buildingTypeId);
  const [revealProgress, setRevealProgress] = useState(0);
  const hasRevealedRef = useRef(false);

  // Hive reveal: short fade-in/scale when building first appears
  useEffect(() => {
    if (hasRevealedRef.current) return;
    hasRevealedRef.current = true;
    
    const startTime = Date.now();
    const duration = 400; // 400ms reveal
    
    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out quad for smooth landing
      const eased = 1 - (1 - progress) * (1 - progress);
      setRevealProgress(eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    
    requestAnimationFrame(animate);
  }, []);

  if (!buildingType) return null;

  // Handle rotation for width/height
  const isRotated = building.rotation === 90 || building.rotation === 270;
  const displayWidth = (isRotated ? buildingType.height : buildingType.width) * TILE_SIZE;
  const displayHeight = (isRotated ? buildingType.width : buildingType.height) * TILE_SIZE;

  const pos = gridToCanvas(building.gridX, building.gridY);
  const padding = 2;

  const handleClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;

    if (toolMode === 'delete' && canEdit) {
      onDelete();
    } else {
      onSelect();
    }
  };

  // Reveal animation: fade + subtle scale from 0.9 to 1.0
  const opacity = 0.3 + revealProgress * 0.7;
  const scale = 0.9 + revealProgress * 0.1;

  return (
    <Group
      x={pos.x}
      y={pos.y}
      opacity={opacity}
      scaleX={scale}
      scaleY={scale}
      offsetX={displayWidth * (1 - scale) / 2}
      offsetY={displayHeight * (1 - scale) / 2}
      draggable={canEdit && toolMode === 'select' && isSelected}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        onDragEnd(e);
      }}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Selection highlight */}
      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={displayWidth + 8}
          height={displayHeight + 8}
          fill="transparent"
          stroke="#00d4ff"
          strokeWidth={3}
          cornerRadius={6}
          dash={[8, 4]}
          shadowColor="#00d4ff"
          shadowBlur={15}
          shadowOpacity={0.6}
        />
      )}

      {/* Building background */}
      <Rect
        x={padding}
        y={padding}
        width={displayWidth - padding * 2}
        height={displayHeight - padding * 2}
        fill={buildingType.color}
        cornerRadius={4}
        shadowColor="black"
        shadowBlur={8}
        shadowOpacity={0.3}
        shadowOffset={{ x: 2, y: 2 }}
      />

      {/* Building gradient overlay */}
      <Rect
        x={padding}
        y={padding}
        width={displayWidth - padding * 2}
        height={(displayHeight - padding * 2) / 2}
        fill="rgba(255, 255, 255, 0.15)"
        cornerRadius={[4, 4, 0, 0]}
      />

      {/* Icon */}
      <Text
        x={0}
        y={displayHeight / 2 - 14}
        width={displayWidth}
        text={buildingType.icon}
        fontSize={Math.min(displayWidth, displayHeight) * 0.5}
        align="center"
      />

      {/* Level badge */}
      {building.level > 1 && (
        <>
          <Rect
            x={displayWidth - 20}
            y={-4}
            width={22}
            height={16}
            fill="#1a1a2e"
            cornerRadius={8}
            stroke={buildingType.color}
            strokeWidth={1}
          />
          <Text
            x={displayWidth - 20}
            y={-2}
            width={22}
            text={building.level.toString()}
            fontSize={11}
            fill="white"
            align="center"
            fontStyle="bold"
          />
        </>
      )}

      {/* Player name label */}
      {building.playerName && (
        <Text
          x={0}
          y={displayHeight + 2}
          width={displayWidth}
          text={building.playerName}
          fontSize={10}
          fill="#fff"
          align="center"
          ellipsis
          wrap="none"
        />
      )}

      {/* Delete mode indicator */}
      {toolMode === 'delete' && (
        <Group>
          <Rect
            x={0}
            y={0}
            width={displayWidth}
            height={displayHeight}
            fill="rgba(239, 68, 68, 0.4)"
            cornerRadius={4}
          />
          <Text
            x={0}
            y={displayHeight / 2 - 10}
            width={displayWidth}
            text="✕"
            fontSize={24}
            fill="white"
            align="center"
            fontStyle="bold"
          />
        </Group>
      )}
    </Group>
  );
}

