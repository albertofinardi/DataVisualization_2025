import * as d3 from 'd3'
import { generateSankeyData, formatDimensionLabel } from './sankeyDataUtils'

class SankeyD3 {
    margin = {top: 20, right: 90, bottom: 30, left: 90};
    size;
    height;
    width;
    matSvg;

    // Sankey specific properties
    nodeWidth = 15;
    nodePadding = 10;
    transitionDuration = 800;

    // Store the current graph data
    currentNodes = [];
    currentLinks = [];
    currentSelectedItems = [];
    selectedBoxes = new Set(); // Track which boxes (nodes) are selected by clicking
    controllerMethods;

    constructor(el){
        this.el=el;
    };

    create = function (config) {
        this.size = {width: config.size.width, height: config.size.height};

        // get the effect size of the view by subtracting the margin
        this.width = this.size.width - this.margin.left - this.margin.right;
        this.height = this.size.height - this.margin.top - this.margin.bottom;

        console.log("create SVG width=" + (this.width + this.margin.left + this.margin.right ) + " height=" + (this.height+ this.margin.top + this.margin.bottom));

        // initialize the svg and keep it in a class property to reuse it in renderSankey()
        this.matSvg=d3.select(this.el).append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("class","matSvgG")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        // Create groups for links and nodes (links first so they're behind nodes)
        this.matSvg.append("g").attr("class", "links-group");
        this.matSvg.append("g").attr("class", "nodes-group");
        this.matSvg.append("g").attr("class", "overlays-group");
    }


    // Custom Sankey layout algorithm
    computeSankeyLayout(nodes, links, visData) {
        if (nodes.length === 0) return;

        // Group nodes by dimension
        const nodesByDimension = d3.group(nodes, d => d.dimIndex);
        const numDimensions = nodesByDimension.size;

        // Calculate x positions for each dimension column
        const xSpacing = this.width / (numDimensions - 1 || 1);

        // Assign x positions
        nodes.forEach(node => {
            node.x0 = node.dimIndex * xSpacing;
            node.x1 = node.x0 + this.nodeWidth;
        });

        // Calculate y positions for nodes in each column
        nodesByDimension.forEach((columnNodes, dimIndex) => {
            // Calculate total value for this column
            const totalValue = d3.sum(columnNodes, d => d.count);

            // Calculate available height for nodes (accounting for padding)
            const totalPadding = (columnNodes.length - 1) * this.nodePadding;
            const availableHeight = this.height - totalPadding;

            // Scale for node heights
            const scale = availableHeight / totalValue;

            // Sort nodes by count (descending) for better visual flow
            columnNodes.sort((a, b) => b.count - a.count);

            // Assign y positions
            let currentY = 0;
            columnNodes.forEach(node => {
                node.y0 = currentY;
                node.height = node.count * scale;
                node.y1 = node.y0 + node.height;
                currentY = node.y1 + this.nodePadding;
            });
        });

        // Assign node references to links
        links.forEach(link => {
            link.sourceNode = nodes[link.source];
            link.targetNode = nodes[link.target];
        });

        // Calculate link y positions at source and target
        // This will also compute sourceWidth and targetWidth to fit exactly within nodes
        this.computeLinkPositions(nodes, links);
    }

    // Compute vertical positions for links at their source and target nodes
    computeLinkPositions(nodes, links) {
        // Group links by source and target
        const linksBySource = d3.group(links, d => d.source);
        const linksByTarget = d3.group(links, d => d.target);

        // Calculate source y positions with proper scaling to fit node height
        linksBySource.forEach((nodeLinks, nodeIndex) => {
            const node = nodes[nodeIndex];
            nodeLinks.sort((a, b) => b.value - a.value);

            // Calculate total value of outgoing links
            const totalValue = d3.sum(nodeLinks, l => l.value);
            // Scale to fit exactly within node height
            const scale = node.height / totalValue;

            let y = node.y0;
            nodeLinks.forEach(link => {
                link.y0 = y;
                link.sourceWidth = link.value * scale;
                y += link.sourceWidth;
            });
        });

        // Calculate target y positions with proper scaling to fit node height
        linksByTarget.forEach((nodeLinks, nodeIndex) => {
            const node = nodes[nodeIndex];
            nodeLinks.sort((a, b) => b.value - a.value);

            // Calculate total value of incoming links
            const totalValue = d3.sum(nodeLinks, l => l.value);
            // Scale to fit exactly within node height
            const scale = node.height / totalValue;

            let y = node.y0;
            nodeLinks.forEach(link => {
                link.y1 = y;
                link.targetWidth = link.value * scale;
                y += link.targetWidth;
            });
        });

    }

    // Generate SVG path for a link as a ribbon (filled shape) - d3-sankey style
    linkRibbon(d) {
        // Validate that all required properties exist
        if (!d.sourceNode || !d.targetNode || d.y0 === undefined || d.y1 === undefined || !d.sourceWidth || !d.targetWidth) {
            console.warn("Invalid link data:", d);
            return "";
        }

        const x0 = d.sourceNode.x1;
        const x1 = d.targetNode.x0;
        const xi = d3.interpolateNumber(x0, x1);
        const x2 = xi(0.5);
        const x3 = xi(0.5);

        // Use sourceWidth at source and targetWidth at target for proper fit
        const y00 = d.y0;
        const y10 = d.y0 + d.sourceWidth;
        const y01 = d.y1;
        const y11 = d.y1 + d.targetWidth;

        // Check for NaN values
        if (isNaN(x0) || isNaN(x1) || isNaN(y00) || isNaN(y01) || isNaN(y10) || isNaN(y11)) {
            console.warn("NaN detected in link coordinates:", {x0, x1, y00, y01, y10, y11});
            return "";
        }

        return `M${x0},${y00}C${x2},${y00} ${x3},${y01} ${x1},${y01}L${x1},${y11}C${x3},${y11} ${x2},${y10} ${x0},${y10}Z`;
    }

    renderSankey = function (visData, activeDimensions, controllerMethods){
        console.log("render sankey with data and dimensions ...", activeDimensions);

        if (!visData || visData.length === 0 || !activeDimensions || activeDimensions.length === 0) {
            console.log("No data or dimensions to render");
            return;
        }

        // Store controller methods for brush
        this.controllerMethods = controllerMethods;

        // Generate sankey data structure
        const { nodes, links } = generateSankeyData(visData, activeDimensions);

        // Compute layout
        this.computeSankeyLayout(nodes, links, visData);

        // Clean up selected boxes - remove any that no longer exist in the new nodes
        const newNodeIds = new Set(nodes.map(n => n.id));
        const removedBoxes = [];
        this.selectedBoxes.forEach(boxId => {
            if (!newNodeIds.has(boxId)) {
                removedBoxes.push(boxId);
            }
        });
        removedBoxes.forEach(boxId => this.selectedBoxes.delete(boxId));

        if (removedBoxes.length > 0) {
            console.log("Removed selected boxes that no longer exist:", removedBoxes);
            // Trigger selection update since some boxes were removed
            this.handleSelectionUpdate();
        }

        // Store for later use
        this.currentNodes = nodes;
        this.currentLinks = links;

        // Render links as filled flow areas (ribbons) like d3-sankey
        const linksGroup = this.matSvg.select(".links-group");

        linksGroup.selectAll(".sankey-link")
            .data(links, (d, i) => `${d.sourceNode.id}-${d.targetNode.id}`)
            .join(
                enter => {
                    enter.append("path")
                        .attr("class", "sankey-link")
                        .attr("d", d => this.linkRibbon(d))
                        .on("click", (event, d) => {
                            // Clear all existing selections and select source and target nodes
                            this.selectedBoxes.clear();
                            this.selectedBoxes.add(d.sourceNode.id);
                            this.selectedBoxes.add(d.targetNode.id);
                            this.handleSelectionUpdate();
                        });
                },
                update => {
                    update
                        .on("click", (event, d) => {
                            // Clear all existing selections and select source and target nodes
                            this.selectedBoxes.clear();
                            this.selectedBoxes.add(d.sourceNode.id);
                            this.selectedBoxes.add(d.targetNode.id);
                            this.handleSelectionUpdate();
                        })
                        .attr("d", d => this.linkRibbon(d));
                },
                exit => {
                    exit.remove();
                }
            );

        // Render nodes
        const nodesGroup = this.matSvg.select(".nodes-group");
        nodesGroup.selectAll(".sankey-node")
            .data(nodes, d => d.id)
            .join(
                enter => {
                    const nodeG = enter.append("g")
                        .attr("class", "sankey-node node-default");

                    // Node rectangle - styling via CSS classes
                    nodeG.append("rect")
                        .attr("x", d => d.x0)
                        .attr("y", d => d.y0)
                        .attr("width", d => d.x1 - d.x0)
                        .attr("height", d => d.height);

                    // Node label - position based on dimension index
                    nodeG.append("text")
                        .attr("x", d => d.dimIndex === 0 ? d.x0 - 6 : d.x1 + 6)
                        .attr("y", d => (d.y0 + d.y1) / 2)
                        .attr("dy", "0.35em")
                        .attr("text-anchor", d => d.dimIndex === 0 ? "end" : "start")
                        .attr("font-size", "11px")
                        .attr("fill", "#333")
                        .text(d => `${d.name} (${d.count})`);

                    // Click interaction for box selection
                    nodeG
                        .style("cursor", "pointer")
                        .on("click", (event, d) => {
                            console.log("Node clicked:", d.name, "houses:", d.count);
                            controllerMethods.handleNodeClick(d);
                        });

                    return nodeG;
                },
                update => {
                    // Update node positions and dimensions immediately without transition
                    update.select("rect")
                        .attr("x", d => d.x0)
                        .attr("y", d => d.y0)
                        .attr("width", d => d.x1 - d.x0)
                        .attr("height", d => d.height);

                    update.select("text")
                        .attr("x", d => d.dimIndex === 0 ? d.x0 - 6 : d.x1 + 6)
                        .attr("y", d => (d.y0 + d.y1) / 2)
                        .attr("text-anchor", d => d.dimIndex === 0 ? "end" : "start")
                        .text(d => `${d.name} (${d.count})`);

                    return update;
                },
                exit => {
                    exit.remove();
                }
            );

        // Render dimension labels at the bottom of each column
        this.renderDimensionLabels(activeDimensions);

        // Apply initial highlighting
        this.updateNodeHighlighting();

        // Redraw overlay paths for selected items with new node positions
        this.highlightSelectedItems(this.currentSelectedItems);
    }

    renderDimensionLabels(dimensions) {
        // Group nodes by dimension to get x positions
        const nodesByDimension = d3.group(this.currentNodes, d => d.dimIndex);

        // Create or update dimension labels
        const labelsGroup = this.matSvg.selectAll(".dimension-label-group")
            .data(dimensions, (d, i) => d);

        labelsGroup.join(
            enter => {
                const labelG = enter.append("g")
                    .attr("class", "dimension-label-group");

                labelG.append("text")
                    .attr("class", "dimension-label-text")
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .attr("font-weight", "600")
                    .attr("fill", "#555")
                    .attr("y", this.height + 25);

                return labelG;
            },
            update => update,
            exit => exit.remove()
        );

        // Update positions and text for all labels
        this.matSvg.selectAll(".dimension-label-group")
            .each((dimension, i, nodes) => {
                const dimensionNodes = nodesByDimension.get(i);
                if (dimensionNodes && dimensionNodes.length > 0) {
                    // Get x position from the first node in this dimension
                    const x = (dimensionNodes[0].x0 + dimensionNodes[0].x1) / 2;

                    d3.select(nodes[i]).select("text")
                        .attr("x", x)
                        .text(formatDimensionLabel(dimension));
                }
            });
    }


    updateNodeHighlighting(){
        // Update node appearances based on selected items and selected boxes
        if (!this.currentNodes || this.currentNodes.length === 0) {
            console.log("updateNodeHighlighting: no nodes");
            return;
        }

        const selectedIndices = new Set(this.currentSelectedItems.map(item => item.index));
        console.log("updateNodeHighlighting: selectedIndices size:", selectedIndices.size, "selectedBoxes size:", this.selectedBoxes.size);

        this.matSvg.selectAll(".sankey-node")
            .each((d, i, nodes) => {
                const node = d3.select(nodes[i]);

                // Check how many selected houses pass through this node
                let matchingCount = 0;
                if (selectedIndices.size > 0) {
                    matchingCount = d.houses.filter(house => selectedIndices.has(house.index)).length;
                }

                // Check if this box is selected by clicking
                const isBoxSelected = this.selectedBoxes.has(d.id);

                // Determine visual state and apply appropriate CSS class
                // Three states:
                // 1. node-default - default state, no selection
                // 2. node-data-flow - data selected from scatterplot flows through this node
                // 3. node-selected - box is selected by clicking

                // Remove all state classes
                node.classed("node-default", false)
                    .classed("node-data-flow", false)
                    .classed("node-selected", false);

                if (isBoxSelected) {
                    // State 3: Box is selected by clicking
                    node.classed("node-selected", true);
                    console.log("Node", d.name, "is SELECTED");
                } else if (selectedIndices.size > 0 && matchingCount > 0) {
                    // State 2: Selected data flows through this node
                    node.classed("node-data-flow", true);
                    console.log("Node", d.name, "has data flowing through");
                } else {
                    // State 1: Default state
                    node.classed("node-default", true);
                }

                // Update label to show matching count if data flows through
                const textElement = node.select("text");
                if (selectedIndices.size > 0 && matchingCount > 0) {
                    // Show count of matching items in parentheses after total count
                    textElement.text(`${d.name} (${matchingCount}/${d.count})`);
                } else {
                    // Show only total count
                    textElement.text(`${d.name} (${d.count})`);
                }
            });
    }

    // Update selection based on current selected boxes
    handleSelectionUpdate() {
        // Apply cascading filters with OR/AND logic
        let filteredHouses = null;

        if (this.selectedBoxes.size === 0) {
            // No boxes selected - empty selection
            filteredHouses = [];
        } else {
            // Group selected nodes by dimension
            const selectedNodes = this.currentNodes.filter(node => this.selectedBoxes.has(node.id));
            const nodesByDimension = new Map();

            selectedNodes.forEach(node => {
                if (!nodesByDimension.has(node.dimension)) {
                    nodesByDimension.set(node.dimension, []);
                }
                nodesByDimension.get(node.dimension).push(node);
            });

            console.log("Selected boxes by dimension:",
                Array.from(nodesByDimension.entries()).map(([dim, nodes]) =>
                    `${dim}: [${nodes.map(n => n.name).join(', ')}]`
                ).join('; ')
            );

            // For each dimension, collect all houses (OR logic within dimension)
            const housesPerDimension = [];
            nodesByDimension.forEach((nodes, dimension) => {
                const dimensionHouses = new Set();
                nodes.forEach(node => {
                    node.houses.forEach(house => dimensionHouses.add(house));
                });
                housesPerDimension.push(dimensionHouses);
            });

            // Intersect across dimensions (AND logic between dimensions)
            if (housesPerDimension.length === 1) {
                // Only one dimension selected - just return those houses
                filteredHouses = Array.from(housesPerDimension[0]);
            } else {
                // Multiple dimensions - intersect
                filteredHouses = housesPerDimension[0];
                for (let i = 1; i < housesPerDimension.length; i++) {
                    const dimensionIndices = new Set(
                        Array.from(housesPerDimension[i]).map(h => h.index)
                    );
                    filteredHouses = new Set(
                        Array.from(filteredHouses).filter(house => dimensionIndices.has(house.index))
                    );
                }
                filteredHouses = Array.from(filteredHouses);
            }
        }

        console.log("Filter result:", filteredHouses.length, "houses from", this.selectedBoxes.size, "selected boxes");

        // Update selection through controller
        if (this.controllerMethods && this.controllerMethods.handleBoxSelection) {
            this.controllerMethods.handleBoxSelection(filteredHouses);
        }

        // Update highlighting
        this.updateNodeHighlighting();
    }

    // Handle node click for box selection with cascading filters
    // Logic: OR within same dimension, AND across different dimensions
    handleNodeClick(nodeData) {
        console.log("Handling node click:", nodeData.id);

        // Toggle selection: if already selected, deselect; otherwise add to selection
        if (this.selectedBoxes.has(nodeData.id)) {
            this.selectedBoxes.delete(nodeData.id);
        } else {
            this.selectedBoxes.add(nodeData.id);
        }

        // Update selection using the helper method
        this.handleSelectionUpdate();
    }

    // Clear selected boxes (called when scatterplot selection changes)
    clearSelectedBoxes() {
        this.selectedBoxes.clear();
        this.updateNodeHighlighting();
    }

    highlightSelectedItems(selectedItems){
        console.log("Highlighting selected items in Sankey:", selectedItems.length);

        // Store selected items
        this.currentSelectedItems = selectedItems || [];

        // Update node highlighting
        this.updateNodeHighlighting();

        // Highlight flows for selected items
        this.highlightFlowsForSelection(selectedItems);
    }

    // Highlight flows that contain selected items
    highlightFlowsForSelection(selectedItems) {
        if (!selectedItems || selectedItems.length === 0) {
            // Reset all flows to default style
            this.matSvg.selectAll(".sankey-link")
                .classed("link-selected", false)
                .classed("link-dimmed", false);
            return;
        }

        // Create a set of selected item indices for quick lookup
        const selectedIndices = new Set(selectedItems.map(item => item.index));

        // Update each link
        this.matSvg.selectAll(".sankey-link")
            .each(function(linkData) {
                // Check if this link contains any selected items
                const hasSelectedItems = linkData.houses.some(house => selectedIndices.has(house.index));

                d3.select(this)
                    .classed("link-selected", hasSelectedItems)
                    .classed("link-dimmed", !hasSelectedItems);
            });
    }

    clear = function(){
        d3.select(this.el).selectAll("*").remove();
    }
}

export default SankeyD3;
