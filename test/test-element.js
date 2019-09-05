import { LitElement } from 'lit-element';
import { SavedListMixin } from '../saved-list-mixin.js';
/**
 * @customElement
 * @demo demo/index.html
 * @appliesMixin SavedListMixin
 */
class TestElement extends SavedListMixin(LitElement) {
}
window.customElements.define('test-element', TestElement);
