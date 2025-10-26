import React, { useState, useEffect, useRef } from 'react';
import './Sankey.css';
import SankeyD3 from './Sankey-d3';

function SankeyWithControls({ sankeyData, selectedItems, sankeyControllerMethods, selectionSource, onClearSelection }) {
    const divContainerRef = useRef(null);
    const sankeyD3Ref = useRef(null);
    const [draggedDimension, setDraggedDimension] = useState(null);

    // State for dimension management
    const [activeDimensions, setActiveDimensions] = useState([
        'bedrooms', 'bathrooms', 'furnishingstatus', 'mainroad', 'parking'
    ]);

    const [availableDimensions, setAvailableDimensions] = useState([
        'stories', 'guestroom', 'basement', 'hotwaterheating',
        'airconditioning', 'prefarea'
    ]);

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

            setActiveDimensions(newActive);
        } else {
            // Adding from available to active
            const newActive = [...activeDimensions];
            newActive.splice(dropIndex, 0, dimension);
            const newAvailable = availableDimensions.filter(d => d !== dimension);

            setActiveDimensions(newActive);
            setAvailableDimensions(newAvailable);
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

            setActiveDimensions(newActive);
            setAvailableDimensions(newAvailable);
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

        setActiveDimensions(newActive);
        setAvailableDimensions(newAvailable);
    };

    // Handle click to remove dimension
    const handleRemoveDimension = (dimension) => {
        if (activeDimensions.length <= 2) {
            alert('You must keep at least 2 dimensions active');
            return;
        }

        const newActive = activeDimensions.filter(d => d !== dimension);
        const newAvailable = [...availableDimensions, dimension];

        setActiveDimensions(newActive);
        setAvailableDimensions(newAvailable);
    };

    const getChartSize = function() {
        let width;
        let height;
        if (divContainerRef.current !== undefined) {
            width = divContainerRef.current.offsetWidth;
            height = divContainerRef.current.offsetHeight - 4;
        }
        return { width: width, height: height };
    };

    // Did mount called once the component did mount
    useEffect(() => {
        console.log("SankeyWithControls useEffect [] called once the component did mount");
        const sankeyD3 = new SankeyD3(divContainerRef.current);
        sankeyD3.create({ size: getChartSize() });
        sankeyD3Ref.current = sankeyD3;
        return () => {
            console.log("SankeyWithControls useEffect [] return function, called when the component did unmount...");
            const sankeyD3 = sankeyD3Ref.current;
            sankeyD3.clear();
        };
    }, []);

    const sankeyDataRef = useRef(sankeyData);
    const activeDimensionsRef = useRef(activeDimensions);

    // Did update, called each time dependencies change
    useEffect(() => {
        console.log("SankeyWithControls useEffect with dependency [sankeyData, activeDimensions, sankeyControllerMethods]");

        const handleLinkClick = function(linkData) {
            console.log("handleLinkClick in container...", linkData.houses.length);
            sankeyControllerMethods.updateSelectedItems(linkData.houses);
        };

        const handleBoxSelection = function(selectedItems) {
            console.log("handleBoxSelection in Sankey...", selectedItems.length);
            sankeyControllerMethods.updateSelectedItems(selectedItems);
        };

        const handleNodeClick = function(nodeData) {
            console.log("handleNodeClick in container...", nodeData.name);
            const sankeyD3 = sankeyD3Ref.current;
            sankeyD3.handleNodeClick(nodeData);
        };

        const controllerMethods = {
            handleLinkClick,
            handleBoxSelection,
            handleNodeClick
        };

        if (sankeyDataRef.current !== sankeyData || activeDimensionsRef.current !== activeDimensions) {
            console.log("SankeyWithControls useEffect when sankeyData or activeDimensions changes...");
            const sankeyD3 = sankeyD3Ref.current;

            // Don't clear selected boxes - renderSankey will handle cleanup of removed nodes automatically

            sankeyD3.renderSankey(sankeyData, activeDimensions, controllerMethods);
            sankeyDataRef.current = sankeyData;
            activeDimensionsRef.current = activeDimensions;
        }
    }, [sankeyData, activeDimensions, sankeyControllerMethods]);

    useEffect(() => {
        console.log("SankeyWithControls useEffect with dependency [selectedItems]");
        const sankeyD3 = sankeyD3Ref.current;
        sankeyD3.highlightSelectedItems(selectedItems);
    }, [selectedItems]);

    // Clear selected boxes when scatterplot makes a selection
    useEffect(() => {
        if (selectionSource === 'scatterplot') {
            console.log("Scatterplot selection detected - clearing Sankey box selection");
            const sankeyD3 = sankeyD3Ref.current;
            if (sankeyD3) {
                sankeyD3.clearSelectedBoxes();
            }
        }
    }, [selectionSource]);

    return (
        <div className="sankey-with-controls">
            {/* Dimension Controls - Compact */}
            <div className="dimension-controls-compact">
                <div className="dimension-row">
                    <div className="dimension-section">
                        <span className="dimension-label-compact"><strong>Active:</strong></span>
                        <div
                            className="dimension-chips-container-compact"
                            onDragOver={(e) => {
                                e.preventDefault();
                            }}
                            onDrop={(e) => handleDropOnActive(e, activeDimensions.length)}
                        >
                            {activeDimensions.map((dimension, index) => (
                                <div
                                    key={dimension}
                                    className={`dimension-chip-compact ${draggedDimension?.dimension === dimension ? 'dragging' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, dimension, true)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDrop={(e) => handleDropOnActive(e, index)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <span>{formatDimensionName(dimension)}</span>
                                    <button
                                        className="remove-btn-compact"
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
                        </div>
                    </div>

                    <div className="dimension-section">
                        <span className="dimension-label-compact"><strong>Available:</strong></span>
                        <div
                            className="available-dimensions-compact"
                            onDragOver={handleDragOver}
                            onDrop={handleDropOnAvailable}
                        >
                            {availableDimensions.map((dimension) => (
                                <div
                                    key={dimension}
                                    className="dimension-chip-compact available"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, dimension, false)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => handleAddDimension(dimension)}
                                >
                                    <span>{formatDimensionName(dimension)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

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
            </div>

            {/* Sankey Diagram */}
            <div ref={divContainerRef} className="sankeyDivContainer">
            </div>
        </div>
    );
}

export default SankeyWithControls;
