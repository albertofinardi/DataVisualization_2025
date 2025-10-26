/**
 * Sankey Data Utilities
 *
 * This file contains all data transformation and formatting functions
 * for the Sankey diagram visualization.
 */

/**
 * Format dimension names for display
 * @param {string} dimension - The dimension key
 * @returns {string} - Formatted dimension name
 */
export function formatDimensionLabel(dimension) {
  const labels = {
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    stories: "Stories",
    parking: "Parking",
    mainroad: "Main Road",
    guestroom: "Guest Room",
    basement: "Basement",
    hotwaterheating: "Hot Water",
    airconditioning: "Air Conditioning",
    prefarea: "Preferred Area",
    furnishingstatus: "Furnishing",
  };
  return labels[dimension] || dimension;
}

/**
 * Format individual values for display within nodes
 * @param {any} value - The value to format
 * @param {string} dimension - The dimension context
 * @returns {string} - Formatted value
 */
export function formatValue(value, dimension) {
  return String(value);
}

/**
 * Generate Sankey diagram data structure from raw data
 * Converts housing data into nodes and links for visualization
 *
 * @param {Array} data - Array of data items (houses)
 * @param {Array} dimensions - Array of dimension keys to visualize
 * @returns {Object} - Object containing { nodes, links }
 */
export function generateSankeyData(data, dimensions) {
  const nodes = [];
  const links = [];
  const nodeMap = new Map();

  if (!data || data.length === 0 || !dimensions || dimensions.length === 0) {
    return { nodes, links };
  }

  // Create nodes for each dimension value
  dimensions.forEach((dim, dimIndex) => {
    const uniqueValues = [...new Set(data.map((d) => d[dim]))].sort();
    uniqueValues.forEach((value) => {
      const nodeId = `${dim}-${value}`;
      const housesWithValue = data.filter((house) => house[dim] === value);
      nodes.push({
        id: nodeId,
        name: formatValue(value, dim),
        dimension: dim,
        value: value,
        dimIndex: dimIndex,
        houses: housesWithValue,
        count: housesWithValue.length,
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
    data.forEach((house) => {
      const sourceId = `${sourceDim}-${house[sourceDim]}`;
      const targetId = `${targetDim}-${house[targetDim]}`;
      const key = `${sourceId}->${targetId}`;

      if (!transitions.has(key)) {
        transitions.set(key, {
          count: 0,
          houses: [],
        });
      }
      const transition = transitions.get(key);
      transition.count++;
      transition.houses.push(house);
    });

    // Create links
    transitions.forEach((transitionData, key) => {
      const [sourceId, targetId] = key.split("->");
      links.push({
        source: nodeMap.get(sourceId),
        target: nodeMap.get(targetId),
        value: transitionData.count,
        houses: transitionData.houses,
      });
    });
  }

  return { nodes, links };
}

// Format dimension names for display
export const formatDimensionName = (dim) => {
  const names = {
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    stories: "Stories",
    parking: "Parking",
    mainroad: "Main Road",
    guestroom: "Guest Room",
    basement: "Basement",
    hotwaterheating: "Hot Water",
    airconditioning: "Air Conditioning",
    prefarea: "Preferred Area",
    furnishingstatus: "Furnishing",
  };
  return names[dim] || dim;
};
