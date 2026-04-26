'use strict';

/**
 * @typedef {Object} InventoryItem
 * @property {string} id
 * @property {string} refrigerator_id
 * @property {string} barcode
 * @property {string} name
 * @property {string|null} image_url
 * @property {string} category
 * @property {string} expiry_date - YYYY-MM-DD
 * @property {'active'|'consumed'|'discarded'} status
 * @property {string} created_at
 */

/**
 * @typedef {Object} ProductMaster
 * @property {string} barcode
 * @property {string} name
 * @property {string} image_url
 * @property {string} category
 */

/**
 * @typedef {Object} ProductSearchResult
 * @property {string} name
 * @property {string} image
 * @property {string|undefined} code
 * @property {string} categories
 */

/**
 * @typedef {Object} DashboardMembership
 * @property {string} role
 * @property {{ id: string, name: string }} refrigerators
 */

module.exports = {};
