import React, { useState, useEffect, useRef } from 'react';
import './Sankey.css';
import SankeyD3 from './Sankey-d3';
import DimensionControls from './DimensionControls';

function SankeyWithControls({ sankeyData, selectedItems, sankeyControllerMethods, selectionSource, onClearSelection }) {
    const divContainerRef = useRef(null);
    const sankeyD3Ref = useRef(null);

    // State for dimension management
    const [activeDimensions, setActiveDimensions] = useState([
        'bedrooms', 'bathrooms', 'furnishingstatus', 'mainroad', 'parking'
    ]);

    const [availableDimensions, setAvailableDimensions] = useState([
        'stories', 'guestroom', 'basement', 'hotwaterheating',
        'airconditioning', 'prefarea'
    ]);

    // Handle dimension changes from DimensionControls
    const handleDimensionChange = ({ active, available }) => {
        setActiveDimensions(active);
        setAvailableDimensions(available);
    };

    // Handle clear selection
    const handleClearSelection = () => {
        if (onClearSelection) {
            onClearSelection();
        }
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
            {/* Dimension Controls using DimensionControls component */}
            <DimensionControls
                activeDimensions={activeDimensions}
                availableDimensions={availableDimensions}
                selectedCount={selectedItems.length}
                onDimensionChange={handleDimensionChange}
                onClearSelection={handleClearSelection}
            />

            {/* Sankey Diagram */}
            <div ref={divContainerRef} className="sankeyDivContainer">
            </div>
        </div>
    );
}

export default SankeyWithControls;
