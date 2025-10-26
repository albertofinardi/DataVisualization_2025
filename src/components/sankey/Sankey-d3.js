import * as d3 from 'd3'

class SankeyD3 {
    margin = {top: 50, right: 150, bottom: 50, left: 150};
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

    // Data transformation: convert housing data to nodes and links
    generateSankeyData(data, dimensions) {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();

        if (!data || data.length === 0 || !dimensions || dimensions.length === 0) {
            return { nodes, links };
        }

        // Create nodes for each dimension value
        dimensions.forEach((dim, dimIndex) => {
            const uniqueValues = [...new Set(data.map(d => d[dim]))].sort();
            uniqueValues.forEach(value => {
                const nodeId = `${dim}-${value}`;
                const housesWithValue = data.filter(house => house[dim] === value);
                nodes.push({
                    id: nodeId,
                    name: this.formatValue(value, dim),
                    dimension: dim,
                    value: value,
                    dimIndex: dimIndex,
                    houses: housesWithValue,
                    count: housesWithValue.length
                });
                nodeMap.set(nodeId, nodes.length - 1);
            });
        });

        // Create links between consecutive dimensions
        for (let i = 0; i < dimensions.length - 1; i++) {
            const sourceDim = dimensions[i];
            const targetDim = dimensions[i + 1];

            // Count transitions and store houses
            const transitions = new Map();
            data.forEach(house => {
                const sourceId = `${sourceDim}-${house[sourceDim]}`;
                const targetId = `${targetDim}-${house[targetDim]}`;
                const key = `${sourceId}->${targetId}`;

                if (!transitions.has(key)) {
                    transitions.set(key, {
                        count: 0,
                        houses: []
                    });
                }
                const transition = transitions.get(key);
                transition.count++;
                transition.houses.push(house);
            });

            // Create links
            transitions.forEach((transitionData, key) => {
                const [sourceId, targetId] = key.split('->');
                links.push({
                    source: nodeMap.get(sourceId),
                    target: nodeMap.get(targetId),
                    value: transitionData.count,
                    houses: transitionData.houses
                });
            });
        }

        return { nodes, links };
    }

    // Format values for display
    formatValue(value, dimension) {
        // For numeric dimensions, add labels
        if (dimension === 'bedrooms') return `${value} bed`;
        if (dimension === 'bathrooms') return `${value} bath`;
        if (dimension === 'stories') return `${value} story`;
        if (dimension === 'parking') return `${value} park`;

        // For categorical, use as-is
        return String(value);
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

        // Assign nodes to links and compute widths based on a global scale
        const totalDataCount = visData.length;
        const heightScale = this.height / totalDataCount; // pixels per house

        links.forEach(link => {
            link.sourceNode = nodes[link.source];
            link.targetNode = nodes[link.target];
            // Width is directly proportional to the number of houses
            link.width = link.value * heightScale;
        });

        // Calculate link y positions at source and target
        this.computeLinkPositions(nodes, links);
    }

    // Compute vertical positions for links at their source and target nodes
    computeLinkPositions(nodes, links) {
        // Group links by source and target
        const linksBySource = d3.group(links, d => d.source);
        const linksByTarget = d3.group(links, d => d.target);

        // Calculate source y positions
        linksBySource.forEach((nodeLinks, nodeIndex) => {
            const node = nodes[nodeIndex];
            nodeLinks.sort((a, b) => b.value - a.value);

            let y = node.y0;
            nodeLinks.forEach(link => {
                link.y0 = y;
                y += link.width;
            });
        });

        // Calculate target y positions
        linksByTarget.forEach((nodeLinks, nodeIndex) => {
            const node = nodes[nodeIndex];
            nodeLinks.sort((a, b) => b.value - a.value);

            let y = node.y0;
            nodeLinks.forEach(link => {
                link.y1 = y;
                y += link.width;
            });
        });
    }

    // Generate SVG path for a link (cubic Bezier curve)
    linkPath(d) {
        const x0 = d.sourceNode.x1;
        const x1 = d.targetNode.x0;
        const xi = d3.interpolateNumber(x0, x1);
        const x2 = xi(0.5);
        const x3 = xi(0.5);
        const y0 = d.y0 + d.width / 2;
        const y1 = d.y1 + d.width / 2;

        return `M${x0},${y0}C${x2},${y0} ${x3},${y1} ${x1},${y1}`;
    }

    // Generate SVG path for a link as a ribbon (filled shape)
    linkRibbon(d) {
        // Validate that all required properties exist
        if (!d.sourceNode || !d.targetNode || d.y0 === undefined || d.y1 === undefined || !d.width) {
            console.warn("Invalid link data:", d);
            return "";
        }

        const x0 = d.sourceNode.x1;
        const x1 = d.targetNode.x0;
        const xi = d3.interpolateNumber(x0, x1);
        const x2 = xi(0.5);
        const x3 = xi(0.5);
        const y00 = d.y0;
        const y10 = d.y0 + d.width;
        const y01 = d.y1;
        const y11 = d.y1 + d.width;

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
        const { nodes, links } = this.generateSankeyData(visData, activeDimensions);

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

        // Render links (ribbons)
        const linksGroup = this.matSvg.select(".links-group");
        linksGroup.selectAll(".sankey-link")
            .data(links, (d, i) => `${d.sourceNode.id}-${d.targetNode.id}`)
            .join(
                enter => {
                    const linkG = enter.append("path")
                        .attr("class", "sankey-link")
                        .attr("d", d => this.linkRibbon(d))
                        .attr("fill", "#aaa")
                        .attr("fill-opacity", 0.5)
                        .attr("stroke", "none")
                        .on("mouseenter", (event, d) => {
                            d3.select(event.target)
                                .attr("fill-opacity", 0.8);
                        })
                        .on("mouseleave", (event, d) => {
                            d3.select(event.target)
                                .attr("fill-opacity", 0.5);
                        });
                    return linkG;
                },
                update => {
                    update
                        .attr("d", d => this.linkRibbon(d))
                        .attr("fill-opacity", 0.5);
                    return update;
                },
                exit => {
                    exit.transition()
                        .duration(this.transitionDuration)
                        .attr("fill-opacity", 0)
                        .remove();
                }
            );

        // Render nodes
        const nodesGroup = this.matSvg.select(".nodes-group");
        nodesGroup.selectAll(".sankey-node")
            .data(nodes, d => d.id)
            .join(
                enter => {
                    const nodeG = enter.append("g")
                        .attr("class", "sankey-node");

                    // Node rectangle - default light gray
                    nodeG.append("rect")
                        .attr("x", d => d.x0)
                        .attr("y", d => d.y0)
                        .attr("width", d => d.x1 - d.x0)
                        .attr("height", d => d.height)
                        .attr("fill", "#d3d3d3")
                        .attr("stroke", "#999")
                        .attr("stroke-width", 1);

                    // Node label
                    nodeG.append("text")
                        .attr("x", d => d.x0 - 6)
                        .attr("y", d => (d.y0 + d.y1) / 2)
                        .attr("dy", "0.35em")
                        .attr("text-anchor", "end")
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
                        .attr("x", d => d.x0 - 6)
                        .attr("y", d => (d.y0 + d.y1) / 2)
                        .text(d => `${d.name} (${d.count})`);

                    return update;
                },
                exit => {
                    exit.transition()
                        .duration(this.transitionDuration)
                        .style("opacity", 0)
                        .remove();
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
                    .attr("y", this.height + 35);

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
                        .text(this.formatDimensionLabel(dimension));
                }
            });
    }

    formatDimensionLabel(dimension) {
        const labels = {
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
        return labels[dimension] || dimension;
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

                // Determine visual state - three states:
                // 1. Light gray (#d3d3d3) - default state, no selection
                // 2. Gray (#808080) - data selected from scatterplot flows through this node
                // 3. Orange/Red (#ff6b6b) - box is selected by clicking
                let fillColor, strokeColor, strokeWidth;

                if (isBoxSelected) {
                    // State 3: Box is selected by clicking - bright orange/red fill
                    fillColor = "#ff6b6b";
                    strokeColor = "#d63031";
                    strokeWidth = 3;
                    console.log("Node", d.name, "is SELECTED - applying orange/red");
                } else if (selectedIndices.size > 0 && matchingCount > 0) {
                    // State 2: Selected data flows through this node - gray
                    fillColor = "#808080";
                    strokeColor = "#333";
                    strokeWidth = 1;
                    console.log("Node", d.name, "has data flowing through - applying gray");
                } else {
                    // State 1: Default state - light gray
                    fillColor = "#d3d3d3";
                    strokeColor = "#999";
                    strokeWidth = 1;
                }

                // Update rectangle appearance with transition
                node.select("rect")
                    .transition()
                    .duration(300)
                    .attr("fill", fillColor)
                    .attr("stroke", strokeColor)
                    .attr("stroke-width", strokeWidth);

                // Remove any old selection indicator (dashed outline)
                node.select(".selection-indicator").remove();

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

        // Clear previous overlays
        const overlaysGroup = this.matSvg.select(".overlays-group");
        overlaysGroup.selectAll(".overlay-path").remove();

        if (!selectedItems || selectedItems.length === 0) {
            return;
        }

        // Limit number of overlay paths for performance
        const maxOverlays = 50;
        const itemsToShow = selectedItems.slice(0, maxOverlays);

        // Draw overlay path for each selected house
        itemsToShow.forEach(house => {
            const path = this.computeHousePath(house);
            if (path && path.length > 1) {
                // Create line generator
                const lineGenerator = d3.line()
                    .x(d => d.x)
                    .y(d => d.y)
                    .curve(d3.curveMonotoneX);

                overlaysGroup.append("path")
                    .attr("class", "overlay-path")
                    .attr("d", lineGenerator(path))
                    .attr("stroke", "#00b894")
                    .attr("stroke-width", 2)
                    .attr("fill", "none")
                    .attr("opacity", 0)
                    .transition()
                    .duration(300)
                    .attr("opacity", 1);
            }
        });
    }

    // Compute the path of a house through the current dimensions
    computeHousePath(house) {
        if (!this.currentNodes || this.currentNodes.length === 0) {
            return null;
        }

        const path = [];

        // Find the nodes this house passes through
        this.currentNodes.forEach(node => {
            if (house[node.dimension] === node.value) {
                // House passes through this node
                path.push({
                    x: (node.x0 + node.x1) / 2,
                    y: (node.y0 + node.y1) / 2,
                    dimIndex: node.dimIndex
                });
            }
        });

        // Sort by dimension index
        path.sort((a, b) => a.dimIndex - b.dimIndex);

        return path;
    }

    clear = function(){
        d3.select(this.el).selectAll("*").remove();
    }
}

export default SankeyD3;
