import './Scatterplot.css'
import {useEffect, useRef} from 'react';

import ScatterplotD3 from './Scatterplot-d3';

// TODO: import action methods from reducers

function ScatterplotContainer({scatterplotData, xAttribute, yAttribute, selectedItems, scatterplotControllerMethods}){

    // every time the component re-render
    useEffect(()=>{
        // console.log("ScatterplotContainer useEffect (called each time scatterplot re-renders)");
    }); // if no dependencies, useEffect is called at each re-render

    const divContainerRef=useRef(null);
    const scatterplotD3Ref = useRef(null)

    const getChartSize = function(){
        // getting size from parent item
        let width;
        let height;
        if(divContainerRef.current!==undefined && divContainerRef.current!==null){
            width=divContainerRef.current.offsetWidth;
            height=divContainerRef.current.offsetHeight;
        }
        return {width:width,height:height};
    }

    // did mount called once the component did mount
    useEffect(()=>{
        console.log("ScatterplotContainer useEffect [] called once the component did mount");

        const scatterplotD3 = new ScatterplotD3(divContainerRef.current);
        const size = getChartSize();
        console.log("Scatterplot initial size:", size);
        scatterplotD3.create({size: size});
        scatterplotD3Ref.current = scatterplotD3;

        // Render initial data if available
        if (scatterplotData && scatterplotData.length > 0) {
            console.log("Rendering initial scatterplot data...");
            const handleOnClick = function(itemData){
                console.log("handleOnClick ...")
                scatterplotControllerMethods.updateSelectedItems([itemData])
            }
            const handleOnMouseEnter = function(){
            }
            const handleOnMouseLeave = function(){
            }
            const handleBrushSelection = function(selectedItems){
                console.log("handleBrushSelection ...", selectedItems.length)
                scatterplotControllerMethods.updateSelectedItems(selectedItems)
            }

            const controllerMethods={
                handleOnClick,
                handleOnMouseEnter,
                handleOnMouseLeave,
                handleBrushSelection
            }
            scatterplotD3.renderScatterplot(scatterplotData, xAttribute, yAttribute, controllerMethods);
            scatterplotDataRef.current = scatterplotData;
        }

        return ()=>{
            // did unmout, the return function is called once the component did unmount (removed for the screen)
            console.log("ScatterplotContainer useEffect [] return function, called when the component did unmount...");
            const scatterplotD3 = scatterplotD3Ref.current;
            if (scatterplotD3) {
                scatterplotD3.clear()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);// if empty array, useEffect is called after the component did mount (has been created)


    const scatterplotDataRef = useRef(scatterplotData);
    // did update, called each time dependencies change, dispatch remain stable over component cycles
    useEffect(()=>{
        console.log("ScatterplotContainer useEffect with dependency [scatterplotData, xAttribute, yAttribute, scatterplotControllerMethods], called each time any dependancy changes...");

        const handleOnClick = function(itemData){
            console.log("handleOnClick ...")
            scatterplotControllerMethods.updateSelectedItems([itemData])
        }
        const handleOnMouseEnter = function(itemData){
        }
        const handleOnMouseLeave = function(){
        }
        const handleBrushSelection = function(selectedItems){
            console.log("handleBrushSelection ...", selectedItems.length)
            scatterplotControllerMethods.updateSelectedItems(selectedItems)
        }

        const controllerMethods={
            handleOnClick,
            handleOnMouseEnter,
            handleOnMouseLeave,
            handleBrushSelection
        }

        if(scatterplotDataRef.current !== scatterplotData) {
            console.log("ScatterplotContainer useEffect with dependency when scatterplotData changes...");
            // get the current instance of scatterplotD3 from the Ref object...
            const scatterplotD3 = scatterplotD3Ref.current
            // call renderScatterplot of ScatterplotD3 only if initialized
            if (scatterplotD3) {
                scatterplotD3.renderScatterplot(scatterplotData, xAttribute, yAttribute, controllerMethods);
                scatterplotDataRef.current = scatterplotData;
            }
        }
    },[scatterplotData, xAttribute, yAttribute, scatterplotControllerMethods]);// if dependencies, useEffect is called after each data update, in our case only scatterplotData changes.


    useEffect(()=>{
        console.log("ScatterplotContainer useEffect with dependency [selectedItems]," +
            "called each time selectedItems changes...");
        // get the current instance of scatterplotD3 from the Ref object...
        const scatterplotD3 = scatterplotD3Ref.current
        // call highlightSelectedItems only if scatterplotD3 is initialized
        if (scatterplotD3) {
            scatterplotD3.highlightSelectedItems(selectedItems)
        }
    },[selectedItems])
    return(
        <div ref={divContainerRef} className="scatterplotDivContainer">
        </div>
    )
}

export default ScatterplotContainer;