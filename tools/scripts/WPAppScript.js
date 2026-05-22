/**
 * WordPress REST API Data Fetcher for Google Sheets
 * Fetches data from WordPress REST API endpoints with flexible filtering and field selection
 */

var WP_BASE_URL = "https://emergencymode.newspackstaging.com/wp-json/wp/v2"; // FAKE URL, must be configured
var ALLOWED_ENDPOINTS = ["categories", "tags", "pages", "posts"];
var DEFAULT_FIELDS = ["id", "name", "slug", "description", "parent", "status", "count", "link"];

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
function fetchWPData(endpoint, options) {
  options = options || {};

  // Validate endpoint
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    throw new Error("Invalid endpoint. Must be one of: " + ALLOWED_ENDPOINTS.join(", "));
  }

  // Set defaults
  var fields = options.fields || DEFAULT_FIELDS;
  var perPage = Math.min(options.perPage || 100, 100);
  var flattenForSheets = options.flattenForSheets || false;

  // Build URL
  var url = WP_BASE_URL + "/" + endpoint;
  var params = ["per_page=" + perPage];

  // Handle filtering
  if (options.filter !== undefined && options.filter !== null && options.filter !== "") {
    var filterType = options.filterType || detectFilterType(options.filter);

    if (filterType === "id") {
      // Fetch specific item by ID
      url = url + "/" + options.filter;
    } else if (filterType === "slug") {
      params.push("slug=" + encodeURIComponent(options.filter));
    } else if (filterType === "name") {
      params.push("search=" + encodeURIComponent(options.filter));
    }
  }

  // Handle parent filtering for categories
  if (endpoint === "categories" && options.parent !== undefined && options.parent !== null) {
    params.push("parent=" + options.parent);
  }

  // Add params to URL
  if (params.length > 0 && !url.includes(options.filter + "")) {
    url += "?" + params.join("&");
  }

  try {
    // Fetch data
    var response = UrlFetchApp.fetch(url);
    var data = JSON.parse(response.getContentText());

    // Normalize to array
    var items = Array.isArray(data) ? data : [data];

    // Extract specified fields
    var filtered = items.map(function (item) {
      return extractFields(item, fields);
    });

    // Return in requested format
    if (flattenForSheets) {
      return flattenForSheetsOutput(filtered, fields);
    }

    return filtered;
  } catch (error) {
    Logger.log("Error fetching from " + url + ": " + error.message);
    throw new Error("Failed to fetch " + endpoint + ": " + error.message);
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
  var result = {};

  fields.forEach(function (field) {
    // Handle nested fields with dot notation
    if (field.includes(".")) {
      var parts = field.split(".");
      var value = item;
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        value = value && value[part] !== undefined ? value[part] : undefined;
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
  var output = [fields];

  // Data rows
  data.forEach(function (item) {
    var row = fields.map(function (field) {
      var value = item[field];
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
 * Default fields: id, name, slug, description, parent, status, count, link
 * @param {string} filter - Optional filter by id, slug, or name
 * @param {string} returnFields - Optional comma-separated field names (e.g. "id,name,count,parent")
 * @param {boolean} includeHeaders - Set to TRUE to include header row (default: FALSE)
 * @param {number} parentId - Optional parent category ID to filter by (0 for top-level categories)
 * @customfunction
 */
function getCategories(filter, returnFields, includeHeaders, parentId) {
  var options = {
    flattenForSheets: true,
  };
  if (filter) options.filter = filter;
  if (returnFields)
    options.fields = returnFields.split(",").map(function (f) {
      return f.trim();
    });
  if (parentId !== undefined && parentId !== null && parentId !== "") options.parent = parentId;

  var result = fetchWPData("categories", options);
  return includeHeaders ? result : result.slice(1);
}

/**
 * Get WordPress tags
 * Default fields: id, name, slug, description, parent, status, count, link
 * @param {string} filter - Optional filter by id, slug, or name
 * @param {string} returnFields - Optional comma-separated field names (e.g. "id,name,count")
 * @param {boolean} includeHeaders - Set to TRUE to include header row (default: FALSE)
 * @customfunction
 */
function getTags(filter, returnFields, includeHeaders) {
  var options = {
    flattenForSheets: true,
  };
  if (filter) options.filter = filter;
  if (returnFields)
    options.fields = returnFields.split(",").map(function (f) {
      return f.trim();
    });

  var result = fetchWPData("tags", options);
  return includeHeaders ? result : result.slice(1);
}

/**
 * Get WordPress pages
 * Default fields: id, name, slug, description, parent, status, count, link
 * @param {string} filter - Optional filter by id, slug, or name
 * @param {string} returnFields - Optional comma-separated field names (e.g. "id,title.rendered,link")
 * @param {boolean} includeHeaders - Set to TRUE to include header row (default: FALSE)
 * @customfunction
 */
function getPages(filter, returnFields, includeHeaders) {
  var options = {
    flattenForSheets: true,
  };
  if (filter) options.filter = filter;
  if (returnFields)
    options.fields = returnFields.split(",").map(function (f) {
      return f.trim();
    });

  var result = fetchWPData("pages", options);
  return includeHeaders ? result : result.slice(1);
}

/**
 * Get WordPress posts
 * Default fields: id, name, slug, description, parent, status, count, link
 * @param {string} filter - Optional filter by id, slug, or name
 * @param {string} returnFields - Optional comma-separated field names (e.g. "id,title.rendered,date,categories")
 * @param {boolean} includeHeaders - Set to TRUE to include header row (default: FALSE)
 * @customfunction
 */
function getPosts(filter, returnFields, includeHeaders) {
  var options = {
    flattenForSheets: true,
  };
  if (filter) options.filter = filter;
  if (returnFields)
    options.fields = returnFields.split(",").map(function (f) {
      return f.trim();
    });

  var result = fetchWPData("posts", options);
  return includeHeaders ? result : result.slice(1);
}

/**
 * Generic fetch function for custom usage
 * Default fields: id, name, slug, description, parent, status, count, link
 * @param {string} endpoint - Endpoint: "categories", "tags", "pages", or "posts"
 * @param {string} filter - Optional filter by id, slug, or name
 * @param {string} returnFields - Optional comma-separated field names
 * @param {boolean} includeHeaders - Set to TRUE to include header row (default: FALSE)
 * @customfunction
 */
function getWPData(endpoint, filter, returnFields, includeHeaders) {
  var options = {
    flattenForSheets: true,
  };
  if (filter) options.filter = filter;
  if (returnFields)
    options.fields = returnFields.split(",").map(function (f) {
      return f.trim();
    });

  var result = fetchWPData(endpoint, options);
  return includeHeaders ? result : result.slice(1);
}
