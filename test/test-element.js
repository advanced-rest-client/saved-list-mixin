import {PolymerElement} from '../../../@polymer/polymer/polymer-element.js';
import {SavedListMixin} from '../saved-list-mixin.js';
import {html} from '../../../@polymer/polymer/lib/utils/html-tag.js';
/**
 * @customElement
 * @polymer
 * @demo demo/index.html
 * @appliesMixin SavedListMixin
 */
class TestElement extends SavedListMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
    :host {
      display: block;
    }
    </style>
`;
  }

  static get is() {
    return 'test-element';
  }
}
window.customElements.define(TestElement.is, TestElement);
