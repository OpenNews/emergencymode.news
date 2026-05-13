/**
 * WordPress REST API Data Fetcher for Google Sheets
 * Fetches data from WordPress REST API endpoints with flexible filtering and field selection
 */

const WP_BASE_URL = "https://emergencymode.newspackstaging.com/wp-json/wp/v2";
const ALLOWED_ENDPOINTS = ["categories", "tags", "pages", "posts"];
const DEFAULT_FIELDS = ["id", "slug", "description", "status", "count", "link"];

/**
 * Main function to fetch WordPress REST API data
 * 
 * @param {string} endpoint - The endpoint to fetch from: 'categories', 'tags', 'pages', or 'posts'
 * @param {Object} options - Optional configuration object
 * @param {string|number} options.filter - Filter by id, slug, or name
 * @param {string} options.filterType - Type of filter: 'id', 'slug', or 'name' (default: auto-detect)
 * @param {Array<string>} options.fields - Array of field names to return (default: DEFAULT_FIELDS)
 * @param {number} options.perPage - Number of results per page (default: 100, max: 100)
 * @param {boolean} options.flattenForSheets - Return 2D array for direct Sheets output (default: false)
 * @returns {Array} Array of objects or 2D array if flattenForSheets is true
 */
function fetchWPData(endpoint, options = {}) {
  // Validate endpoint
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    throw new Error(`Invalid endpoint. Must be one of: ${ALLOWED_ENDPOINTS.join(", ")}`);
  }
  
  // Set defaults
  const fields = options.fields || DEFAULT_FIELDS;
  const perPage = Math.min(options.perPage || 100, 100);
  const flattenForSheets = options.flattenForSheets || false;
  
  // Build URL
  let url = `${WP_BASE_URL}/${endpoint}`;
  const params = [`per_page=${perPage}`];
  
  // Handle filtering
  if (options.filter !== undefined && options.filter !== null && options.filter !== "") {
    const filterType = options.filterType || detectFilterType(options.filter);
    
    if (filterType === "id") {
      // Fetch specific item by ID
      url = `${url}/${options.filter}`;
    } else if (filterType === "slug") {
      params.push(`slug=${encodeURIComponent(options.filter)}`);
    } else if (filterType === "name") {
      params.push(`search=${encodeURIComponent(options.filter)}`);
    }
  }
  
  // Add params to URL
  if (params.length > 0 && !url.includes(options.filter + "")) {
    url += "?" + params.join("&");
  }
  
  try {
    // Fetch data
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    // Normalize to array
    const items = Array.isArray(data) ? data : [data];
    
    // Extract specified fields
    const filtered = items.map(item => extractFields(item, fields));
    
    // Return in requested format
    if (flattenForSheets) {
      return flattenForSheetsOutput(filtered, fields);
    }
    
    return filtered;
    
  } catch (error) {
    Logger.log(`Error fetching from ${url}: ${error.message}`);
    throw new Error(`Failed to fetch ${endpoint}: ${error.message}`);
  }
}

/**
 * Auto-detect filter type based on value
 */
function detectFilterType(value) {
  if (typeof value === "number" || /^\d+$/.test(value)) {
    return "id";
  }
  if (/^[a-z0-9-]+$/.test(value)) {
    return "slug";
  }
  return "name";
}

/**
 * Extract specified fields from an object, handling nested properties
 */
function extractFields(item, fields) {
  const result = {};
  
  fields.forEach(field => {
    // Handle nested fields with dot notation
    if (field.includes(".")) {
      const parts = field.split(".");
      let value = item;
      for (const part of parts) {
        value = value?.[part];
      }
      result[field] = value !== undefined ? value : null;
    } else {
      result[field] = item[field] !== undefined ? item[field] : null;
    }
  });
  
  return result;
}

/**
 * Flatten data to 2D array format for Google Sheets
 */
function flattenForSheetsOutput(data, fields) {
  if (!data || data.length === 0) {
    return [fields, []]; // Return headers and empty row
  }
  
  // Header row
  const output = [fields];
  
  // Data rows
  data.forEach(item => {
    const row = fields.map(field => {
      const value = item[field];
      // Convert objects/arrays to JSON strings for Sheets
      if (value && typeof value === "object") {
        return JSON.stringify(value);
      }
      return value !== null && value !== undefined ? value : "";
    });
    output.push(row);
  });
  
  return output;
}

// ============================================================================
// Convenience wrapper functions for easy Sheets formula usage
// ============================================================================

/**
 * Get WordPress categories
 * Usage in Sheets: =getCategories() or =getCategories(A1) where A1 contains slug/id
 */
function getCategories(filter = null, returnFields = null) {
  const options = {
    flattenForSheets: true
  };
  if (filter) options.filter = filter;
  if (returnFields) options.fields = returnFields.split(",").map(f => f.trim());
  
  return fetchWPData("categories", options);
}

/**
 * Get WordPress tags
 * Usage in Sheets: =getTags() or =getTags(A1)
 */
function getTags(filter = null, returnFields = null) {
  const options = {
    flattenForSheets: true
  };
  if (filter) options.filter = filter;
  if (returnFields) options.fields = returnFields.split(",").map(f => f.trim());
  
  return fetchWPData("tags", options);
}

/**
 * Get WordPress pages
 * Usage in Sheets: =getPages() or =getPages(A1)
 */
function getPages(filter = null, returnFields = null) {
  const options = {
    flattenForSheets: true
  };
  if (filter) options.filter = filter;
  if (returnFields) options.fields = returnFields.split(",").map(f => f.trim());
  
  return fetchWPData("pages", options);
}

/**
 * Get WordPress posts
 * Usage in Sheets: =getPosts() or =getPosts(A1)
 */
function getPosts(filter = null, returnFields = null) {
  const options = {
    flattenForSheets: true
  };
  if (filter) options.filter = filter;
  if (returnFields) options.fields = returnFields.split(",").map(f => f.trim());
  
  return fetchWPData("posts", options);
}

/**
 * Generic fetch function for custom usage
 * Usage: =getWPData("posts", "", "id,title.rendered,date")
 */
function getWPData(endpoint, filter = null, returnFields = null) {
  const options = {
    flattenForSheets: true
  };
  if (filter) options.filter = filter;
  if (returnFields) options.fields = returnFields.split(",").map(f => f.trim());
  
  return fetchWPData(endpoint, options);
}