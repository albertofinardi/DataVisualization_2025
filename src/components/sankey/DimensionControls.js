import React, { useState } from 'react';

function DimensionControls({ activeDimensions, availableDimensions, selectedCount, onDimensionChange, onClearSelection }) {
    const [draggedDimension, setDraggedDimension] = useState(null);

    // Format dimension names for display
    const formatDimensionName = (dim) => {
        const names = {
            'bedrooms': 'Bedrooms',
            'bathrooms': 'Bathrooms',
            'stories': 'Stories',
            'parking': 'Parking',
            'mainroad': 'Main Road',
            'guestroom': 'Guest Room',
            'basement': 'Basement',
            'hotwaterheating': 'Hot Water',
            'airconditioning': 'Air Conditioning',
            'prefarea': 'Preferred Area',
            'furnishingstatus': 'Furnishing'
        };
        return names[dim] || dim;
    };

    // Handle drag start
    const handleDragStart = (e, dimension, fromActive) => {
        setDraggedDimension({ dimension, fromActive });
        e.dataTransfer.effectAllowed = 'move';
    };

    // Handle drag over
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Handle drop on active dimensions
    const handleDropOnActive = (e, dropIndex) => {
        e.preventDefault();

        if (!draggedDimension) return;

        const { dimension, fromActive } = draggedDimension;

        if (fromActive) {
            // Reordering within active dimensions
            const currentIndex = activeDimensions.indexOf(dimension);
            if (currentIndex === dropIndex) return;

            const newActive = [...activeDimensions];
            newActive.splice(currentIndex, 1);
            newActive.splice(dropIndex, 0, dimension);

            onDimensionChange({
                active: newActive,
                available: availableDimensions
            });
        } else {
            // Adding from available to active
            const newActive = [...activeDimensions];
            newActive.splice(dropIndex, 0, dimension);
            const newAvailable = availableDimensions.filter(d => d !== dimension);

            onDimensionChange({
                active: newActive,
                available: newAvailable
            });
        }

        setDraggedDimension(null);
    };

    // Handle drop on available dimensions (remove from active)
    const handleDropOnAvailable = (e) => {
        e.preventDefault();

        if (!draggedDimension) return;

        const { dimension, fromActive } = draggedDimension;

        if (fromActive && activeDimensions.length > 2) {
            // Remove from active, add to available
            const newActive = activeDimensions.filter(d => d !== dimension);
            const newAvailable = [...availableDimensions, dimension];

            onDimensionChange({
                active: newActive,
                available: newAvailable
            });
        }

        setDraggedDimension(null);
    };

    // Handle drag end
    const handleDragEnd = () => {
        setDraggedDimension(null);
    };

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
        <div className="dimension-controls">
            {selectedCount > 0 && (
                <div style={{ marginBottom: '15px', padding: '10px', background: '#e8f5e9', borderRadius: '4px', border: '1px solid #4caf50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="dimension-label" style={{ margin: 0 }}>
                        <strong>Selected:</strong> {selectedCount} house{selectedCount !== 1 ? 's' : ''}
                    </div>
                    <button
                        onClick={onClearSelection}
                        style={{
                            padding: '4px 12px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        Clear Selection
                    </button>
                </div>
            )}
            <div>
                <div className="dimension-label">
                    <strong>Active Dimensions</strong> (drag to reorder)
                </div>
                <div
                    className="dimension-chips-container"
                    onDragOver={(e) => {
                        e.preventDefault();
                    }}
                    onDrop={(e) => handleDropOnActive(e, activeDimensions.length)}
                >
                    {activeDimensions.map((dimension, index) => (
                        <div
                            key={dimension}
                            className={`dimension-chip ${draggedDimension?.dimension === dimension ? 'dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, dimension, true)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDropOnActive(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            <span>{formatDimensionName(dimension)}</span>
                            <button
                                className="remove-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveDimension(dimension);
                                }}
                                title="Remove dimension"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {activeDimensions.length === 0 && (
                        <span style={{ color: '#999', fontSize: '12px' }}>
                            Drag dimensions here
                        </span>
                    )}
                </div>
            </div>

            <div style={{ marginTop: '15px' }}>
                <div className="dimension-label">
                    <strong>Available Dimensions</strong> (click or drag to add)
                </div>
                <div
                    className="available-dimensions"
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnAvailable}
                >
                    {availableDimensions.map((dimension) => (
                        <div
                            key={dimension}
                            className="dimension-chip available"
                            draggable
                            onDragStart={(e) => handleDragStart(e, dimension, false)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleAddDimension(dimension)}
                        >
                            <span>{formatDimensionName(dimension)}</span>
                        </div>
                    ))}
                    {availableDimensions.length === 0 && (
                        <span style={{ color: '#999', fontSize: '12px' }}>
                            All dimensions are active
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DimensionControls;
