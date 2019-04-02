/**
@license
Copyright 2018 The Advanced REST client authors <arc@mulesoft.com>
Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations under
the License.
*/
import {dedupingMixin} from '../../@polymer/polymer/lib/utils/mixin.js';
import {afterNextRender} from '../../@polymer/polymer/lib/utils/render-status.js';
/**
 * A mixin to be applied to a list that renders saved requests.
 * It contains methods to query for saved list and to search saved requests.
 * @polymer
 * @mixinFunction
 * @memberof ArcComponents
 */
export const SavedListMixin = dedupingMixin((base) => {
  /**
   * @polymer
   * @mixinClass
   */
  class SavedListMixin extends base {
    static get properties() {
      return {
        /**
         * The list of request to render.
         * @type {Array<Object>}
         */
        requests: Array,
        /**
         * True when the element is querying the database for the data.
         */
        querying: {
          type: Boolean,
          readOnly: true,
          notify: true
        },
        /**
         * Single page query limit.
         */
        pageLimit: {
          type: Number,
          value: 150
        },
        _queryStartKey: String,
        _querySkip: Number,
        /**
         * Computed value.
         * Database query options for pagination.
         * Use `pageLimit` to set pagination limit.
         */
        queryOptions: {
          type: Object,
          computed: '_computeQueryOptions(pageLimit, _queryStartKey, _querySkip)'
        },
        /**
         * Computed value. True if query ended and there's no results.
         */
        dataUnavailable: {
          type: Boolean,
          computed: '_computeDataUnavailable(hasRequests, querying, isSearch)'
        },
        /**
         * When set this component is in sSavedListMixinearch mode.
         * This means that the list won't be loaded automatically and
         * some operations not related to search are disabled.
         */
        isSearch: {
          type: Boolean,
          value: false
        },
        /**
         * Computed value. True when the query has been performed and no items
         * has been returned. It is different from `listHidden` where less
         * conditions has to be checked. It is set to true when it doesn't
         * have items, is not loading and is search.
         */
        searchListEmpty: {
          type: Boolean,
          computed: '_computeSearchListEmpty(hasRequests, loading, isSearch)'
        },
        /**
         * When set it won't query for data automatically when attached to the DOM.
         */
        noAuto: Boolean
      };
    }

    constructor() {
      super();
      this._dataImportHandler = this._dataImportHandler.bind(this);
      this._onDatabaseDestroy = this._onDatabaseDestroy.bind(this);
    }

    connectedCallback() {
      if (!this.type) {
        this.type = 'saved';
      }
      super.connectedCallback();
      window.addEventListener('data-imported', this._dataImportHandler);
      window.addEventListener('datastore-destroyed', this._onDatabaseDestroy);
      if (!this.noAuto && !this.querying && !this.requests) {
        this.loadNext();
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      window.removeEventListener('data-imported', this._dataImportHandler);
      window.removeEventListener('datastore-destroyed', this._onDatabaseDestroy);
    }

    /**
     * Computes pagination options.
     * This resets pagination status.
     * @param {Number} limit Items per page limit.
     * @param {String} startKey Query start key
     * @param {Number} skip Number of records to skip.
     * @return {Object} Pagination options for PouchDB.
     */
    _computeQueryOptions(limit, startKey, skip) {
      const result = {
        limit,
        descending: true,
        // jscs:disable
        include_docs: true
        // jscs:enable
      };
      if (startKey) {
        result.startkey = startKey;
      }
      if (skip) {
        result.skip = skip;
      }
      return result;
    }

    /**
     * Computes value for the `dataUnavailable` proeprty
     * @param {Boolean} hasRequests [description]
     * @param {Booelan} loading [description]
     * @param {Boolean} isSearch [description]
     * @return {Boolean}
     */
    _computeDataUnavailable(hasRequests, loading, isSearch) {
      return !isSearch && !loading && !hasRequests;
    }

    /**
     * Computes value for the `searchListEmpty` property
     * @param {Boolean} hasRequests [description]
     * @param {Booelan} loading [description]
     * @param {Boolean} isSearch [description]
     * @return {Boolean}
     */
    _computeSearchListEmpty(hasRequests, loading, isSearch) {
      return !!isSearch && !loading && !hasRequests;
    }

    /**
     * Refreshes the data from the datastore.
     * It resets the query options, clears requests and makes a query to the datastore.
     */
    refresh() {
      this.reset();
      this.loadNext();
    }
    /**
     * Resets the state of the variables.
     */
    reset() {
      if (this._queryStartKey) {
        this._queryStartKey = undefined;
      }
      if (this._querySkip) {
        this._querySkip = undefined;
      }
      if (this.isSearch) {
        this.isSearch = false;
      }
      if (this.querying) {
        this._setQuerying(false);
      }
      if (this.requests) {
        this.set('requests', undefined);
      }
    }

    /**
     * Handler for `data-imported` cutom event.
     * Refreshes data state.
     */
    _dataImportHandler() {
      this.refresh();
    }
    /**
     * Handler for the `datastore-destroyed` custom event.
     * If one of destroyed databases is saved store then it refreshes the sate.
     * @param {CustomEvent} e
     */
    _onDatabaseDestroy(e) {
      let datastore = e.detail.datastore;
      if (!datastore || !datastore.length) {
        return;
      }
      if (typeof datastore === 'string') {
        datastore = [datastore];
      }
      if (datastore.indexOf('saved-requests') === -1 &&
        datastore.indexOf('saved') === -1 &&
        datastore[0] !== 'all') {
        return;
      }
      this.refresh();
    }
    /**
     * Loads next page of results. It runs the task in a debouncer set to
     * next render frame so it's safe to call it more than once at the time.
     */
    loadNext() {
      if (this.isSearch) {
        return;
      }
      if (this.__makingQuery) {
        return;
      }
      this.__makingQuery = true;
      afterNextRender(this, () => {
        this.__makingQuery = false;
        this._loadPage();
      });
    }
    /**
     * Appends array items to the `requests` property.
     * It should be used instead of direct manipulation of the `items` array.
     * @param {Array<Object>} requests List of requests to appenmd
     */
    _appendItems(requests) {
      if (!requests || !requests.length) {
        return;
      }
      const existing = this.requests;
      if (!existing) {
        this.set('requests', requests);
        return;
      }
      requests.forEach((item) => this.push('requests', item));
    }
    /**
     * Loads next page of results from the datastore.
     * Pagination used here has been described in PouchDB pagination strategies
     * document.
     * @return {Promise}
     */
    _loadPage() {
      if (this.isSearch) {
        return Promise.resolve();
      }
      const e = this._dispatchListEvent();
      if (!e.defaultPrevented) {
        let msg = 'Request model not found.';
        console.warn(msg);
        return Promise.reject(new Error(msg));
      }
      this._setQuerying(true);
      return e.detail.result
      .then((response) => {
        this._setQuerying(false);
        if (response && response.rows.length > 0) {
          // Set up pagination.
          this._queryStartKey = response.rows[response.rows.length - 1].key;
          if (!this._querySkip) {
            this._querySkip = 1;
          }
          const res = this._processRequestsResponse(response.rows);
          if (!res) {
            return;
          }
          this._appendItems(res);
          afterNextRender(this, () => {
            if (this.notifyResize) {
              this.notifyResize();
            }
          });
        }
      })
      .catch((error) => {
        this._setQuerying(false);
        this._handleError(error);
      });
    }
    /**
     * Dispatches `request-list` custom event and returns the event.
     * @return {CustomEvent}
     */
    _dispatchListEvent() {
      const e = new CustomEvent('request-list', {
        cancelable: true,
        composed: true,
        bubbles: true,
        detail: {
          queryOptions: this.queryOptions,
          type: 'saved'
        }
      });
      this.dispatchEvent(e);
      return e;
    }

    _handleError(cause) {
      if (this.querying) {
        this._setQuerying(false);
      }
      console.warn('[Saved list error]', cause);
      throw cause;
    }

    /**
     * Prepares data to display in the view.
     *
     * @param {Object} items List of documents returned by the model.
     * @return {Array} List of request to be passed to the list view.
     */
    _processRequestsResponse(items) {
      if (!items || !items.length) {
        return;
      }
      const list = [];
      items.forEach((item) => {
        if (!item) {
          return;
        }
        if (item.doc) {
          item = item.doc;
        }
        if (item._id.indexOf('_design') !== 0) {
          list[list.length] = item;
        }
      });
      list.sort(this._sortSavedResults);
      return list;
    }
    /**
     * Sorts the query results by `updated` property.
     * @param {Object} a
     * @param {Object} b
     * @return {Number}
     */
    _sortSavedResults(a, b) {
      if (!a.name && !b.name) {
        return 0;
      }
      if (!a.name) {
        return -1;
      }
      if (!b.name) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    }

    /**
     * Dispatches `request-query` custom event to `request-model`
     * to perform a query.
     *
     * @param {String} query The query to performs. Pass empty stirng
     * (or nothing) to reset query state.
     * @return {Promise} Resolved promise when the query ends.
     */
    query(query) {
      if (!query) {
        if (this.isSearch) {
          this.refresh();
        }
        return Promise.resolve();
      }
      this.isSearch = true;
      this._setQuerying(true);
      this.set('requests', undefined);
      query = this._prepareQuery(query);
      const e = this._dispatchQueryEvent(query);
      if (!e.defaultPrevented) {
        const msg = 'Model not found.';
        console.warn(msg);
        return Promise.reject(new Error(msg));
      }
      return e.detail.result
      .then((result) => {
        result = this._processRequestsResponse(result);
        if (result) {
          this._appendItems(result);
        }
        this._setQuerying(false);
      })
      .catch((error) => {
        this._setQuerying(false);
        this._handleError(error);
      });
    }
    /**
     * Dispatches `request-query` custom event.
     * This event is handled by `request-mode` element to query the
     * datastore for user search term.
     * @param {String} q Query passed to event detail.
     * @return {CustomEvent}
     */
    _dispatchQueryEvent(q) {
      const e = new CustomEvent('request-query', {
        cancelable: true,
        bubbles: true,
        composed: true,
        detail: {
          q,
          type: 'saved'
        }
      });
      this.dispatchEvent(e);
      return e;
    }
    /**
     * Prepares a query string to search the data store.
     * @param {String} query User search term
     * @return {String} Processed query
     */
    _prepareQuery(query) {
      query = String(query);
      query = query.toLowerCase();
      if (query[0] === '_') {
        query = query.substr(1);
      }
      return query;
    }
  }
  return SavedListMixin;
});