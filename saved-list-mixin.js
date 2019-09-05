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
import { html } from 'lit-html';
import '@advanced-rest-client/arc-models/request-model.js';
import '@advanced-rest-client/arc-models/url-indexer.js';
/**
 * A mixin to be applied to a list that renders saved requests.
 * It contains methods to query for saved list and to search saved requests.
 *
 * @mixinClass
 * @memberof ArcComponents
 * @param {Class} base
 * @return {Class}
 */
export const SavedListMixin = (base) => class extends base {
  static get properties() {
    return {
      /**
       * The list of request to render.
       * @type {Array<Object>}
       */
      requests: { type: Array },
      /**
       * True when the element is querying the database for the data.
       */
      _querying: { type: Boolean },
      /**
       * Single page query limit.
       *
       * @default 150
       */
      pageLimit: { type: Number },

      _queryStartKey: String,
      _querySkip: Number,
      /**
       * When set this component is in search mode.
       * This means that the list won't be loaded automatically and
       * some operations not related to search are disabled.
       */
      isSearch: { type: Boolean },
      /**
       * When set it won't query for data automatically when attached to the DOM.
       */
      noAuto: { type: Boolean }
    };
  }

  get querying() {
    return this._querying;
  }

  get _querying() {
    return this.__querying;
  }

  set _querying(value) {
    const old = this.__querying;
    /* istanbul ignore if */
    if (old === value) {
      return;
    }
    this.__querying = value;
    if (this.requestUpdate) {
      this.requestUpdate('_querying', old);
    }
    this.dispatchEvent(new CustomEvent('querying-changed', {
      detail: {
        value
      }
    }));
  }
  /**
   * True when there's no requests after refresing the state.
   * @return {Boolean}
   */
  get dataUnavailable() {
    const { requests, querying, isSearch } = this;
    return !isSearch && !querying && !(requests && requests.length);
  }
  /**
   * Computed value. True when the query has been performed and no items
   * has been returned. It is different from `listHidden` where less
   * conditions has to be checked. It is set to true when it doesn't
   * have items, is not loading and is search.
   *
   * @return {Boolean}
   */
  get searchListEmpty() {
    const { requests, querying, isSearch } = this;
    return !!isSearch && !querying && !(requests && requests.length);
  }

  get modelTemplate() {
    return html`
      <request-model></request-model>
      <url-indexer></url-indexer>
    `;
  }

  get requestModel() {
    if (!this.__model) {
      this.__model = this.shadowRoot.querySelector('request-model');
    }
    return this.__model;
  }

  constructor() {
    super();
    this._dataImportHandler = this._dataImportHandler.bind(this);
    this._onDatabaseDestroy = this._onDatabaseDestroy.bind(this);

    this.pageLimit = 150;
  }

  connectedCallback() {
    if (!this.type) {
      this.type = 'saved';
    }
    if (super.connectedCallback) {
      super.connectedCallback();
    }
    window.addEventListener('data-imported', this._dataImportHandler);
    window.addEventListener('datastore-destroyed', this._onDatabaseDestroy);
    if (!this.noAuto && !this.querying && !this.requests) {
      this.loadNext();
    }
  }

  disconnectedCallback() {
    if (super.disconnectedCallback) {
      super.disconnectedCallback();
    }
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
      include_docs: true
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
      this._querying = false;
    }
    if (this.requests) {
      this.requests = undefined;
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
    setTimeout(() => {
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
    let items = this.requests || [];
    items = [...items, ...requests]
    this.requests = items;
  }
  /**
   * Loads next page of results from the datastore.
   * Pagination used here has been described in PouchDB pagination strategies
   * document.
   * @return {Promise}
   */
  async _loadPage() {
    if (this.isSearch) {
      return;
    }

    const model = this.requestModel;
    this._querying = true;
    try {
      const queryOptions = this._computeQueryOptions(this.pageLimit, this._queryStartKey, this._querySkip);
      const response = await model.list('saved', queryOptions);
      this._querying = false;
      this._processPageResponse(response);
    } catch (cause) {
      this._handleError(cause);
    }
  }

  _processPageResponse(response) {
    const rows = response && response.rows;
    if (!rows || !rows.length) {
      return;
    }
    // Sets up pagination.
    this._queryStartKey = response.rows[response.rows.length - 1].key;
    if (!this._querySkip) {
      this._querySkip = 1;
    }
    const items = this._processRequestsResponse(response.rows);
    if (!items) {
      return;
    }
    this._appendItems(items);
    setTimeout(() => {
      if (this.notifyResize) {
        this.notifyResize();
      }
    });
  }

  _handleError(cause) {
    if (this.querying) {
      this._querying = false;
    }
    this.dispatchEvent(new CustomEvent('send-analytics', {
      bubbles: true,
      composed: true,
      detail: {
        type: 'exception',
        description: '[saved-list-consumer]: ' + cause.message,
        fatal: false
      }
    }));
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
  async query(query) {
    if (!query) {
      if (this.isSearch) {
        this.refresh();
      }
      return;
    }
    this.isSearch = true;
    this._querying = true;
    this.requests = undefined;
    const model = this.requestModel;
    try {
      query = this._prepareQuery(query);
      let result = await model.query(query, 'saved');
      result = this._processRequestsResponse(result);
      if (result) {
        this._appendItems(result);
      }
      this._querying = false;
    } catch (cause) {
      this._handleError(cause);
    }
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
