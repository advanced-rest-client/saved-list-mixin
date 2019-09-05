import { LitElement, html } from 'lit-element';
import { SavedListMixin } from '../saved-list-mixin.js';
/**
 * @customElement
 * @demo demo/index.html
 * @appliesMixin SavedListMixin
 */
class TestElement extends SavedListMixin(LitElement) {
  render() {
    return html`${this.modelTemplate}`;
  }
}
window.customElements.define('test-element', TestElement);
