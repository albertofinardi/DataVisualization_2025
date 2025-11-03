import "./Sankey.css";
import { useEffect, useRef } from "react";

import SankeyD3 from "./Sankey-d3";

function SankeyContainer({
  sankeyData,
  selectedItems,
  activeDimensions,
  sankeyControllerMethods,
  selectionSource,
}) {
  const divContainerRef = useRef(null);
  const sankeyD3Ref = useRef(null);

  const getChartSize = function () {
    // getting size from parent item
    let width;
    let height;
    if (divContainerRef.current !== undefined) {
      width = divContainerRef.current.offsetWidth;
      height = divContainerRef.current.offsetHeight - 4;
    }
    return { width: width, height: height };
  };

  useEffect(() => {
    console.debug(
      "SankeyContainer useEffect [] called once the component did mount"
    );
    const sankeyD3 = new SankeyD3(divContainerRef.current);
    sankeyD3.create({ size: getChartSize() });
    sankeyD3Ref.current = sankeyD3;
    return () => {
      console.debug(
        "SankeyContainer useEffect [] return function, called when the component did unmount..."
      );
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
      // Update Sankey diagram with new data or dimensions
      const sankeyD3 = sankeyD3Ref.current;
      sankeyD3.renderSankey(sankeyData, activeDimensions, controllerMethods);
      sankeyDataRef.current = sankeyData;
      activeDimensionsRef.current = activeDimensions;
    }
  }, [sankeyData, activeDimensions, sankeyControllerMethods]);

  useEffect(() => {
    // Update on selected items change
    const sankeyD3 = sankeyD3Ref.current;
    sankeyD3.highlightSelectedItems(selectedItems);
  }, [selectedItems]);

  useEffect(() => {
    if (selectionSource === "scatterplot") {
      console.debug(
        "Scatterplot selection detected - clearing Sankey box selection"
      );
      const sankeyD3 = sankeyD3Ref.current;
      if (sankeyD3) {
        sankeyD3.clearSelectedBoxes();
      }
    }
  }, [selectionSource]);

  return <div ref={divContainerRef} className="sankeyDivContainer"></div>;
}

export default SankeyContainer;
