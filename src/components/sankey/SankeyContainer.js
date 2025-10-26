import './Sankey.css'
import {useEffect, useRef} from 'react';

import SankeyD3 from './Sankey-d3';

function SankeyContainer({sankeyData, selectedItems, activeDimensions, sankeyControllerMethods, selectionSource}){

    // every time the component re-render
    useEffect(()=>{
        // console.log("SankeyContainer useEffect (called each time sankey re-renders)");
    }); // if no dependencies, useEffect is called at each re-render

    const divContainerRef=useRef(null);
    const sankeyD3Ref = useRef(null)

    const getChartSize = function(){
        // getting size from parent item
        let width;
        let height;
        if(divContainerRef.current!==undefined){
            width=divContainerRef.current.offsetWidth;
            height=divContainerRef.current.offsetHeight-4;
        }
        return {width:width,height:height};
    }

    // did mount called once the component did mount
    useEffect(()=>{
        console.log("SankeyContainer useEffect [] called once the component did mount");
        const sankeyD3 = new SankeyD3(divContainerRef.current);
        sankeyD3.create({size:getChartSize()});
        sankeyD3Ref.current = sankeyD3;
        return ()=>{
            // did unmout, the return function is called once the component did unmount (removed for the screen)
            console.log("SankeyContainer useEffect [] return function, called when the component did unmount...");
            const sankeyD3 = sankeyD3Ref.current;
            sankeyD3.clear()
        }
    },[]);// if empty array, useEffect is called after the component did mount (has been created)


    const sankeyDataRef = useRef(sankeyData);
    const activeDimensionsRef = useRef(activeDimensions);

    // did update, called each time dependencies change
    useEffect(()=>{
        console.log("SankeyContainer useEffect with dependency [sankeyData, activeDimensions, sankeyControllerMethods], called each time any dependency changes...");

        const handleLinkClick = function(linkData){
            console.log("handleLinkClick in container...", linkData.houses.length)
            sankeyControllerMethods.updateSelectedItems(linkData.houses)
        }

        const handleBoxSelection = function(selectedItems){
            console.log("handleBoxSelection in Sankey...", selectedItems.length)
            sankeyControllerMethods.updateSelectedItems(selectedItems)
        }

        const handleNodeClick = function(nodeData){
            console.log("handleNodeClick in container...", nodeData.name)
            const sankeyD3 = sankeyD3Ref.current
            sankeyD3.handleNodeClick(nodeData)
        }

        const controllerMethods={
            handleLinkClick,
            handleBoxSelection,
            handleNodeClick
        }

        if(sankeyDataRef.current !== sankeyData || activeDimensionsRef.current !== activeDimensions) {
            console.log("SankeyContainer useEffect with dependency when sankeyData or activeDimensions changes...");
            // get the current instance of sankeyD3 from the Ref object...
            const sankeyD3 = sankeyD3Ref.current
            // call renderSankey of SankeyD3...;
            sankeyD3.renderSankey(sankeyData, activeDimensions, controllerMethods);
            sankeyDataRef.current = sankeyData;
            activeDimensionsRef.current = activeDimensions;
        }
    },[sankeyData, activeDimensions, sankeyControllerMethods]);


    useEffect(()=>{
        console.log("SankeyContainer useEffect with dependency [selectedItems]," +
            "called each time selectedItems changes...");
        // get the current instance of sankeyD3 from the Ref object...
        const sankeyD3 = sankeyD3Ref.current
        // call highlightSelectedItems of SankeyD3...;
        sankeyD3.highlightSelectedItems(selectedItems)
    },[selectedItems])

    // Clear selected boxes when scatterplot makes a selection
    useEffect(()=>{
        if (selectionSource === 'scatterplot') {
            console.log("Scatterplot selection detected - clearing Sankey box selection");
            const sankeyD3 = sankeyD3Ref.current
            if (sankeyD3) {
                sankeyD3.clearSelectedBoxes()
            }
        }
    },[selectionSource])

    return(
        <div ref={divContainerRef} className="sankeyDivContainer col2">
        </div>
    )
}

export default SankeyContainer;
