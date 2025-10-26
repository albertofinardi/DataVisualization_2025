import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDimensionName } from './sankeyDataUtils';

// Sortable chip component
function SortableChip({ id, dimension, formatDimensionName, onRemove, canRemove, compact = false }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const chipClass = compact ? 'dimension-chip-compact' : 'dimension-chip';
    const btnClass = compact ? 'remove-btn-compact' : 'remove-btn';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${chipClass} ${isDragging ? 'dragging' : ''}`}
            {...attributes}
            {...listeners}
        >
            <span>{formatDimensionName(dimension)}</span>
            {canRemove && (
                <button
                    className={btnClass}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(dimension);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Remove dimension"
                >
                    ×
                </button>
            )}
        </div>
    );
}

function DimensionControls({ activeDimensions, availableDimensions, selectedCount, onDimensionChange, onClearSelection }) {
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragStart(event) {
        setActiveId(event.active.id);
    }

    function handleDragEnd(event) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = activeDimensions.indexOf(active.id);
            const newIndex = activeDimensions.indexOf(over.id);

            const newActive = arrayMove(activeDimensions, oldIndex, newIndex);

            onDimensionChange({
                active: newActive,
                available: availableDimensions
            });
        }

        setActiveId(null);
    }

    // Handle click to add dimension
    const handleAddDimension = (dimension) => {
        const newActive = [...activeDimensions, dimension];
        const newAvailable = availableDimensions.filter(d => d !== dimension);

        onDimensionChange({
            active: newActive,
            available: newAvailable
        });
    };

    // Handle click to remove dimension
    const handleRemoveDimension = (dimension) => {
        if (activeDimensions.length <= 2) {
            alert('You must keep at least 2 dimensions active');
            return;
        }

        const newActive = activeDimensions.filter(d => d !== dimension);
        const newAvailable = [...availableDimensions, dimension];

        onDimensionChange({
            active: newActive,
            available: newAvailable
        });
    };

    return (
        <div className="dimension-controls-compact">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="dimension-row">
                    <div className="dimension-section">
                        <span className="dimension-label-compact"><strong>Active:</strong></span>
                        <div className="dimension-chips-container-compact">
                            <SortableContext
                                items={activeDimensions}
                                strategy={horizontalListSortingStrategy}
                            >
                                {activeDimensions.map((dimension) => (
                                    <SortableChip
                                        key={dimension}
                                        id={dimension}
                                        dimension={dimension}
                                        formatDimensionName={formatDimensionName}
                                        onRemove={handleRemoveDimension}
                                        canRemove={activeDimensions.length > 2}
                                        compact={true}
                                    />
                                ))}
                            </SortableContext>
                        </div>
                    </div>

                    <div className="dimension-section">
                        <span className="dimension-label-compact"><strong>Available:</strong></span>
                        <div className="available-dimensions-compact">
                            {availableDimensions.map((dimension) => (
                                <div
                                    key={dimension}
                                    className="dimension-chip-compact available"
                                    onClick={() => handleAddDimension(dimension)}
                                >
                                    <span>{formatDimensionName(dimension)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedCount > 0 && (
                        <div className="dimension-section">
                            <span className="dimension-label-compact"><strong>Selected:</strong></span>
                            <span className="dimension-label-compact" style={{ marginRight: '8px' }}>
                                {selectedCount} house{selectedCount !== 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={onClearSelection}
                                style={{
                                    padding: '3px 10px',
                                    background: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontSize: '10px'
                                }}
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="dimension-section legend-section">
                        <span className="dimension-label-compact"><strong>Legend:</strong></span>
                        <div className="legend-items">
                            <div className="legend-item">
                                <div className="legend-box" style={{ backgroundColor: '#d3d3d3', border: '1px solid #999' }}></div>
                                <span className="legend-text">Default</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-box" style={{ backgroundColor: '#808080', border: '1px solid #333' }}></div>
                                <span className="legend-text">Data flows</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-box" style={{ backgroundColor: '#ff6b6b', border: '1px solid #d63031' }}></div>
                                <span className="legend-text">Selected</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="dimension-chip-compact dragging-overlay">
                            <span>{formatDimensionName(activeId)}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

export default DimensionControls;
