import { createRoot, type Root } from 'react-dom/client';
import { StatusMap } from './StatusMap';
import type { Period } from './components/TopBar';

import xyflowCss from '@xyflow/react/dist/style.css?inline';
import tokensCss from './styles/tokens.css?inline';
import embedBaseCss from './styles/embed.css?inline';
import topologyCss from './sections/Map/Topology.css?inline';

// `:root` doesn't match inside a shadow tree — rewrite the tokens to `:host` so
// the CSS custom properties (--green, --blue, etc.) are defined within the shadow root.
const STYLES = [xyflowCss, tokensCss.replace(/:root/g, ':host'), embedBaseCss, topologyCss].join('\n');
const PERIODS = ['10м', '1ч', '6ч', '24ч'];

class StatusMapElement extends HTMLElement {
  private root: Root | null = null;

  static get observedAttributes() {
    return ['api', 'period'];
  }

  connectedCallback() {
    if (this.root) return;

    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLES;
    shadow.appendChild(style);

    const mount = document.createElement('div');
    shadow.appendChild(mount);

    this.root = createRoot(mount);
    this.render();
  }

  disconnectedCallback() {
    this.root?.unmount();
    this.root = null;
  }

  attributeChangedCallback() {
    this.render();
  }

  private render() {
    if (!this.root) return;
    const api = this.getAttribute('api') || '';
    const periodAttr = this.getAttribute('period') || '1ч';
    const period = (PERIODS.includes(periodAttr) ? periodAttr : '1ч') as Period;
    this.root.render(<StatusMap api={api} period={period} />);
  }
}

if (!customElements.get('status-map')) {
  customElements.define('status-map', StatusMapElement);
}
