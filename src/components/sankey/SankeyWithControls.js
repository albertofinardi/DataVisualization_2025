import React, { useState, useEffect, useRef } from "react";
import "./Sankey.css";
import SankeyD3 from "./Sankey-d3";
import DimensionControls from "./DimensionControls";
import {
  defaultAvailableDimensions,
  defaultActiveDimensions,
} from "./sankeyDataUtils";

function SankeyWithControls({
  sankeyData,
  selectedItems,
  sankeyControllerMethods,
  selectionSource,
  onClearSelection,
}) {
  const divContainerRef = useRef(null);
  const sankeyD3Ref = useRef(null);

  const [activeDimensions, setActiveDimensions] = useState(
    defaultActiveDimensions
  );

  const [availableDimensions, setAvailableDimensions] = useState(
    defaultAvailableDimensions
  );

  const handleDimensionChange = ({ active, available }) => {
    setActiveDimensions(active);
    setAvailableDimensions(available);
  };

  const handleClearSelection = () => {
    const sankeyD3 = sankeyD3Ref.current;
    if (sankeyD3) {
      sankeyD3.clearSelectedBoxes();
    }

    if (onClearSelection) {
      onClearSelection();
    }
  };

  const getChartSize = function () {
    let width;
    let height;
    if (divContainerRef.current !== undefined) {
      width = divContainerRef.current.offsetWidth;
      height = divContainerRef.current.offsetHeight - 4;
    }
    return { width: width, height: height };
  };

  useEffect(() => {
    const sankeyD3 = new SankeyD3(divContainerRef.current);
    sankeyD3.create({ size: getChartSize() });
    sankeyD3Ref.current = sankeyD3;
    return () => {
      const sankeyD3 = sankeyD3Ref.current;
      sankeyD3.clear();
    };
  }, []);

  const sankeyDataRef = useRef(sankeyData);
  const activeDimensionsRef = useRef(activeDimensions);

  useEffect(() => {
    const handleLinkClick = function (linkData) {
      sankeyControllerMethods.updateSelectedItems(linkData.houses);
    };

    const handleBoxSelection = function (selectedItems) {
      sankeyControllerMethods.updateSelectedItems(selectedItems);
    };

    const handleNodeClick = function (nodeData) {
      const sankeyD3 = sankeyD3Ref.current;
      sankeyD3.handleNodeClick(nodeData);
    };

    const controllerMethods = {
      handleLinkClick,
      handleBoxSelection,
      handleNodeClick,
    };

    if (
      sankeyDataRef.current !== sankeyData ||
      activeDimensionsRef.current !== activeDimensions
    ) {
      const sankeyD3 = sankeyD3Ref.current;

      sankeyD3.renderSankey(sankeyData, activeDimensions, controllerMethods);
      sankeyDataRef.current = sankeyData;
      activeDimensionsRef.current = activeDimensions;
    }
  }, [sankeyData, activeDimensions, sankeyControllerMethods]);

  useEffect(() => {
    const sankeyD3 = sankeyD3Ref.current;
    sankeyD3.highlightSelectedItems(selectedItems);
  }, [selectedItems]);

  useEffect(() => {
    if (selectionSource === "scatterplot") {
      const sankeyD3 = sankeyD3Ref.current;
      if (sankeyD3) {
        sankeyD3.clearSelectedBoxes();
      }
    }
  }, [selectionSource]);

  return (
    <div className="sankey-with-controls">
      <DimensionControls
        activeDimensions={activeDimensions}
        availableDimensions={availableDimensions}
        selectedCount={selectedItems.length}
        onDimensionChange={handleDimensionChange}
        onClearSelection={handleClearSelection}
      />
      <div ref={divContainerRef} className="sankeyDivContainer"></div>
    </div>
  );
}

export default SankeyWithControls;
