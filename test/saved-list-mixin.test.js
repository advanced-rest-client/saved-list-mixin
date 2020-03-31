import { fixture, assert, aTimeout } from '@open-wc/testing';
import * as sinon from 'sinon/pkg/sinon-esm.js';
import './test-element.js';
import { DataGenerator } from '@advanced-rest-client/arc-data-generator/arc-data-generator.js';
import '@advanced-rest-client/arc-models/url-indexer.js';

describe('SavedListMixin', function() {
  async function basicFixture() {
    return await fixture(`<test-element noauto></test-element>`);
  }

  before(async () => {
    await fixture(`<url-indexer></url-indexer>`);
  });

  describe('queryOptions computations', () => {
    it('Sets default query limit', async () => {
      const element = await basicFixture();
      assert.equal(element.pageLimit, 150);
    });

    it('Sets startkey property', async () => {
      const element = await basicFixture();
      const result = element._computeQueryOptions(1, 'test');
      assert.equal(result.startkey, 'test');
    });

    it('Sets skip property', async () => {
      const element = await basicFixture();
      const result = element._computeQueryOptions(1, 'test', 1);
      assert.equal(result.skip, 1);
    });

    it('Sets descending property', async () => {
      const element = await basicFixture();
      const result = element._computeQueryOptions(1, 'test', 1);
      assert.isTrue(result.descending);
    });

    it('Sets include_docs property', async () => {
      const element = await basicFixture();
      const result = element._computeQueryOptions(1, 'test', 1);
      assert.isTrue(result.include_docs);
    });
  });

  describe('_computeQueryOptions()', () => {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    it('Sets descending property', () => {
      const result = element._computeQueryOptions();
      assert.isTrue(result.descending);
    });

    it('Sets include_docs property', () => {
      const result = element._computeQueryOptions();
      assert.isTrue(result.include_docs);
    });

    it('Sets limit', () => {
      const result = element._computeQueryOptions(10);
      assert.equal(result.limit, 10);
    });

    it('Sets startkey property', () => {
      const result = element._computeQueryOptions(10, 'test');
      assert.equal(result.startkey, 'test');
    });

    it('Sets skip property', () => {
      const result = element._computeQueryOptions(10, 'test', 1);
      assert.equal(result.skip, 1);
    });
  });

  describe('#dataUnavailable', () => {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    it('Returns true if all undefined', () => {
      assert.isTrue(element.dataUnavailable);
    });

    it('Returns true if all false', () => {
      element.requests = undefined;
      element._querying = false;
      element.isSearch = false;
      assert.isTrue(element.dataUnavailable);
    });

    it('Returns false if has requests is true', () => {
      element.requests = [{}];
      element._querying = false;
      element.isSearch = false;
      assert.isFalse(element.dataUnavailable);
    });

    it('Returns false if querying is true', () => {
      element.requests = undefined;
      element._querying = true;
      element.isSearch = false;
      assert.isFalse(element.dataUnavailable);
    });

    it('Returns false if isSearch is true', () => {
      element.requests = undefined;
      element._querying = false;
      element.isSearch = true;
      assert.isFalse(element.dataUnavailable);
    });
  });

  describe('#searchListEmpty', () => {
    let element;
    before(async () => {
      element = await basicFixture();
    });

    it('Returns false if all undefined', () => {
      assert.isFalse(element.searchListEmpty);
    });

    it('Returns false if all false', () => {
      element.requests = undefined;
      element._querying = false;
      element.isSearch = false;
      assert.isFalse(element.searchListEmpty);
    });

    it('Returns false if has requests is true', () => {
      element.requests = [{}];
      element._querying = false;
      element.isSearch = false;
      assert.isFalse(element.searchListEmpty);
    });

    it('Returns false if querying is true', () => {
      element.requests = undefined;
      element._querying = true;
      element.isSearch = false;
      assert.isFalse(element.searchListEmpty);
    });

    it('Returns true if isSearch is true', () => {
      element.requests = undefined;
      element._querying = false;
      element.isSearch = true;
      assert.isTrue(element.searchListEmpty);
    });
  });

  describe('_dataImportHandler()', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('calls refresh() when called', () => {
      let called = false;
      element.refresh = () => called = true;
      element._dataImportHandler();
      assert.isTrue(called);
    });

    it('Calls refresh() when data-imported is handled', () => {
      let called = false;
      element.refresh = () => called = true;
      document.body.dispatchEvent(new CustomEvent('data-imported', {
        bubbles: true
      }));
      assert.isTrue(called);
    });
  });

  describe('_onDatabaseDestroy()', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('Calls refresh() when called with "saved" datastore', () => {
      let called = false;
      element.refresh = () => called = true;
      element._onDatabaseDestroy({
        detail: {
          datastore: ['saved']
        }
      });
      assert.isTrue(called);
    });

    it('Calls refresh() when called with "saved-requests" datastore (legacy api)', () => {
      let called = false;
      element.refresh = () => called = true;
      element._onDatabaseDestroy({
        detail: {
          datastore: ['saved-requests']
        }
      });
      assert.isTrue(called);
    });

    it('Calls refresh() when called with "all" datastore', () => {
      let called = false;
      element.refresh = () => called = true;
      element._onDatabaseDestroy({
        detail: {
          datastore: ['saved-requests']
        }
      });
      assert.isTrue(called);
    });

    it('Calls refresh() when datastore is a string', () => {
      let called = false;
      element.refresh = () => called = true;
      element._onDatabaseDestroy({
        detail: {
          datastore: 'saved-requests'
        }
      });
      assert.isTrue(called);
    });

    it('Calls refresh() when datastore-destroyed is handled', () => {
      let called = false;
      element.refresh = () => called = true;
      document.body.dispatchEvent(new CustomEvent('datastore-destroyed', {
        bubbles: true,
        detail: {
          datastore: ['saved']
        }
      }));
      assert.isTrue(called);
    });

    it('Do nothing when datastore not set', () => {
      let called = false;
      element.refresh = () => called = true;
      element._onDatabaseDestroy({
        detail: {}
      });
      assert.isFalse(called);
    });

    it('Do nothing when datastore is not an array', () => {
      let called = false;
      element.refresh = () => called = true;
      element._onDatabaseDestroy({
        detail: {
          datastore: true
        }
      });
      assert.isFalse(called);
    });

    it('Do nothing when datastore is history store', () => {
      let called = false;
      element.refresh = () => called = true;
      element._onDatabaseDestroy({
        detail: {
          datastore: 'history'
        }
      });
      assert.isFalse(called);
    });
  });

  describe('_processRequestsResponse()', function() {
    let element;
    let data;
    beforeEach(async () => {
      element = await basicFixture();
      data = [{
        _id: '1',
        name: 'b'
      }, {
        _id: '2',
        name: 'a'
      }];
    });

    it('Do nothing if no items', function() {
      const result = element._processRequestsResponse();
      assert.isUndefined(result);
    });

    it('Do nothing when empty items', function() {
      const result = element._processRequestsResponse([]);
      assert.isUndefined(result);
    });

    it('Returns a list of documents', function() {
      const result = element._processRequestsResponse(data);
      assert.typeOf(result, 'array');
      assert.lengthOf(result, 2);
    });

    it('Documents are sorted by name', function() {
      const result = element._processRequestsResponse(data);
      assert.equal(result[0]._id, '2');
      assert.equal(result[1]._id, '1');
    });

    it('Ignores empty items', function() {
      data.splice(1, 0, undefined);
      const result = element._processRequestsResponse(data);
      assert.lengthOf(result, 2);
    });

    it('Transforms PouchDB item.doc to doc', function() {
      data[0] = {
        doc: data[0]
      };
      const result = element._processRequestsResponse(data);
      assert.equal(result[0]._id, '2');
    });

    it('Ignores PouchDB _design items', function() {
      data[0]._id = '_design';
      const result = element._processRequestsResponse(data);
      assert.lengthOf(result, 1);
    });
  });

  describe('_sortSavedResults()', () => {
    let element;
    let data;
    beforeEach(async () => {
      element = await basicFixture();
      data = [{
        _id: '1',
        name: 'c'
      }, {
        _id: '2',
        name: 'a'
      }, {
        _id: '3',
        name: 'b'
      }];
    });

    it('Sorts the array', () => {
      data.sort(element._sortSavedResults);
      assert.equal(data[0]._id, '2');
      assert.equal(data[1]._id, '3');
      assert.equal(data[2]._id, '1');
    });

    it('Returns 0 when times equal', () => {
      const a = {
        name: 'a'
      };
      const b = {
        name: 'a'
      };
      const result = element._sortSavedResults(a, b);
      assert.equal(result, 0);
    });

    it('Returns -1 when A time is higher', () => {
      const a = {
        name: 'b'
      };
      const b = {
        name: 'a'
      };
      const result = element._sortSavedResults(a, b);
      assert.equal(result, 1);
    });

    it('Returns 1 when B time is higher', () => {
      const a = {
        name: 'a'
      };
      const b = {
        name: 'b'
      };
      const result = element._sortSavedResults(a, b);
      assert.equal(result, -1);
    });

    it('Returns -1 when A is missing name', () => {
      const a = {};
      const b = {
        name: 'b'
      };
      const result = element._sortSavedResults(a, b);
      assert.equal(result, -1);
    });

    it('Returns 1 when B is missing name', () => {
      const a = {
        name: 'b'
      };
      const b = {};
      const result = element._sortSavedResults(a, b);
      assert.equal(result, 1);
    });

    it('Returns 0 when A and B is missing name', () => {
      const a = {};
      const b = {};
      const result = element._sortSavedResults(a, b);
      assert.equal(result, 0);
    });
  });

  describe('_appendItems()', function() {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('Adds items to the list that doesn\'t exists', function() {
      const items = [{
        _id: 1
      }, {
        _id: 2
      }];
      assert.isUndefined(element.requests);
      element._appendItems(items);
      assert.typeOf(element.requests, 'array');
      assert.lengthOf(element.requests, 2);
    });

    it('Adds items to the list that already exists', function() {
      const requests = [{
        _id: 1
      }, {
        _id: 2
      }];
      element.requests = [{
        _id: 3
      }];
      element._appendItems(requests);
      assert.typeOf(element.requests, 'array');
      assert.lengthOf(element.requests, 3);
    });
  });

  describe('refresh()', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('Calles reset() function', () => {
      let called = false;
      element.reset = () => called = true;
      element.loadNext = () => {};
      element.refresh();
      assert.isTrue(called);
    });

    it('Calles loadNext() function', () => {
      let called = false;
      element.reset = () => {};
      element.loadNext = () => called = true;
      element.refresh();
      assert.isTrue(called);
    });
  });

  describe('reset()', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('Resets _queryStartKey', () => {
      element._queryStartKey = 'test';
      element.reset();
      assert.isUndefined(element._queryStartKey);
    });

    it('Resets _querySkip', () => {
      element._querySkip = 1;
      element.reset();
      assert.isUndefined(element._querySkip);
    });

    it('Resets requests', () => {
      element.requests = [{}];
      element.reset();
      assert.isUndefined(element.requests);
    });

    it('Resets isSearch', () => {
      element.isSearch = true;
      element.reset();
      assert.isFalse(element.isSearch);
    });

    it('Resets querying', () => {
      element._querying = true;
      element.reset();
      assert.isFalse(element.querying);
    });
  });

  describe('loadNext()', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('Eventually calls _loadPage()', async () => {
      let called = false;
      element._loadPage = () => called = true;
      element.loadNext();
      await aTimeout();
      assert.isTrue(called);
    });

    it('Sets __makingQuery flag', (done) => {
      element._loadPage = () => done();
      element.loadNext();
      assert.isTrue(element.__makingQuery);
    });

    it('Clears __makingQuery flag after callback', (done) => {
      element._loadPage = () => {
        assert.isFalse(element.__makingQuery);
        done();
      };
      element.loadNext();
    });

    it('Do nothing when __makingQuery flag is set', async () => {
      let called = false;
      element._loadPage = () => called = true;
      element.__makingQuery = true;
      element.loadNext();
      await aTimeout();
      assert.isFalse(called);
    });

    it('Do nothing when isSearch flag is set', async () => {
      let called = false;
      element._loadPage = () => called = true;
      element.isSearch = true;
      element.loadNext();
      await aTimeout();
      assert.isFalse(called);
    });
  });

  describe('_loadPage()', () => {
    before(async () => {
      await DataGenerator.insertSavedRequestData();
    });

    after(async () => {
      await DataGenerator.destroySavedRequestData();
    });

    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('does nothing when isSearch is set', async () => {
      element.isSearch = true;
      const p = element._loadPage();
      assert.isUndefined(element.querying);
      await p;
    });

    it('Returns a promise', () => {
      element.isSearch = true;
      const p = element._loadPage();
      assert.typeOf(p.then, 'function');
      return p;
    });

    // it('sets querying property', async () => {
    //   const p = element._loadPage();
    //   assert.isTrue(element.querying);
    //   await p;
    // });

    it('resets querying when ready', async () => {
      await element._loadPage();
      assert.isFalse(element.querying);
    });

    it('sets requests from the response', async () => {
      await element._loadPage();
      assert.typeOf(element.requests, 'array');
      assert.lengthOf(element.requests, 25);
    });

    it('sets _queryStartKey', async () => {
      await element._loadPage();
      assert.typeOf(element._queryStartKey, 'string');
    });

    it('sets _querySkip', async () => {
      await element._loadPage();
      assert.equal(element._querySkip, 1);
    });

    it('Calls _processRequestsResponse() for documents', async () => {
      const spy = sinon.spy(element, '_processRequestsResponse');
      await element._loadPage();
      assert.isTrue(spy.called);
    });

    it('Calls notifyResize when defined', async () => {
      element.notifyResize = () => {};
      const spy = sinon.spy(element, 'notifyResize');
      await element._loadPage();
      await aTimeout();
      assert.isTrue(spy.called);
    });
  });

  describe('_handleError()', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('Throws an error', () => {
      assert.throws(function() {
        element._handleError(new Error('test'));
      });
    });

    it('Resets "querying" flag', () => {
      element._querying = true;
      try {
        element._handleError(new Error('test'));
      } catch (_) {
        // ...
      }
      assert.isFalse(element.querying);
    });
  });

  describe('query()', () => {
    before(async () => {
      await DataGenerator.insertSavedRequestData();
    });

    after(async () => {
      await DataGenerator.destroySavedRequestData();
    });

    let element;
    /* eslint-disable-next-line */
    let indexer;
    beforeEach(async () => {
      indexer = await fixture(`<url-indexer></url-indexer>`);
      element = await basicFixture();
    });

    it('Does nothing when query is not set', async () => {
      const p = element.query();
      assert.isUndefined(element.querying);
      await p;
    });

    it('returns a promise when query is not set', async () => {
      const p = element.query();
      assert.typeOf(p.then, 'function');
      await p;
    });

    it('Returns promise when query is not set and isSearch', async () => {
      element.isSearch = true;
      const p = element.query();
      assert.typeOf(p.then, 'function');
      await p;
    });

    it('calls refresh() when query is not set and isSearch', async () => {
      element.isSearch = true;
      let called = false;
      element.refresh = () => called = true;
      const p = element.query();
      assert.isTrue(called);
      await p;
    });

    it('sets querying property', async () => {
      const p = element.query('test');
      assert.isTrue(element.querying);
      await p;
    });

    it('resets querying when ready', async () => {
      await element.query('test');
      assert.isFalse(element.querying);
    });

    it('calls model search with the passed term', async () => {
      const { requestModel } = element;
      const spy = sinon.spy(requestModel, 'query');
      element.detailedSearch = true;
      await element.query('test-query');
      assert.equal(spy.args[0][0], 'test-query');
    });

    it('searches saved store', async () => {
      const { requestModel } = element;
      const spy = sinon.spy(requestModel, 'query');
      element.detailedSearch = true;
      await element.query('test-query');
      assert.equal(spy.args[0][1], 'saved');
    });

    it('uses "detailedSearch" property', async () => {
      const { requestModel } = element;
      const spy = sinon.spy(requestModel, 'query');
      element.detailedSearch = true;
      await element.query('test');
      assert.isTrue(spy.args[0][2], 'detailed argument is set');
    });
  });

  describe('_prepareQuery()', () => {
    let element;
    beforeEach(async () => {
      element = await basicFixture();
    });

    it('Transforms query to string', () => {
      const result = element._prepareQuery(1);
      assert.typeOf(result, 'string');
      assert.equal(result, '1');
    });

    it('Transforms query to lower case', () => {
      const result = element._prepareQuery('CaR');
      assert.equal(result, 'car');
    });

    it('Removes first underscore', () => {
      const result = element._prepareQuery('_test');
      assert.equal(result, 'test');
    });
  });
});
