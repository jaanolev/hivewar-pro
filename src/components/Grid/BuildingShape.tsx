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
}

export default function BuildingShape({
  building,
  isSelected,
  onSelect,
  onDragEnd,
  onDelete,
  toolMode
}: BuildingShapeProps) {
  const buildingType = getBuildingById(building.buildingTypeId);
  if (!buildingType) return null;

  // Handle rotation for width/height
  const isRotated = building.rotation === 90 || building.rotation === 270;
  const displayWidth = (isRotated ? buildingType.height : buildingType.width) * TILE_SIZE;
  const displayHeight = (isRotated ? buildingType.width : buildingType.height) * TILE_SIZE;

  const pos = gridToCanvas(building.gridX, building.gridY);
  const padding = 2;

  const handleClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    
    if (toolMode === 'delete') {
      onDelete();
    } else {
      onSelect();
    }
  };

  return (
    <Group
      x={pos.x}
      y={pos.y}
      draggable={toolMode === 'select' && isSelected}
      onDragEnd={onDragEnd}
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

