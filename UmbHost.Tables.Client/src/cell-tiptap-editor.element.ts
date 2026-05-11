import { LitElement, html, css } from '@umbraco-cms/backoffice/external/lit';
import { customElement, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';

// Type import only — provided by Umbraco at runtime, not bundled
import type { UmbInputTiptapElement } from '@umbraco-cms/backoffice/tiptap';

@customElement('umbhost-table-cell-tiptap-editor')
export class UmbHostTableCellTiptapEditor extends UmbElementMixin(LitElement) {
  @property({ attribute: false }) public value: string = '';
  @property({ type: Object, attribute: false }) public config?: UmbPropertyEditorConfigCollection;
  @property({ type: Boolean }) public readonly: boolean = false;

  private _buildTiptapConfig(): UmbPropertyEditorConfigCollection {
    return new UmbPropertyEditorConfigCollection([
      { alias: 'extensions',   value: this.config?.getValueByAlias<string[]>('extensions') },
      { alias: 'toolbar',      value: this.config?.getValueByAlias<Array<Array<Array<string>>>>('toolbar') },
      { alias: 'statusbar',    value: this.config?.getValueByAlias<Array<Array<string>>>('statusbar') },
      { alias: 'stylesheets',  value: this.config?.getValueByAlias<string[]>('stylesheets') },
      { alias: 'maxImageSize', value: this.config?.getValueByAlias<number>('maxImageSize') ?? 500 },
      { alias: 'overlaySize',  value: 'medium' },
    ]);
  }

  private _handleChange(e: Event) {
    const tiptap = e.target as UmbInputTiptapElement;
    this.value = tiptap.value;
    this.dispatchEvent(
      new CustomEvent('rte-value-change', {
        detail: this.value,
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <umb-input-tiptap
        .value=${this.value}
        .configuration=${this._buildTiptapConfig()}
        ?readonly=${this.readonly}
        @change=${this._handleChange}>
      </umb-input-tiptap>
    `;
  }

  static override styles = css`
    :host { display: block; }

    umb-input-tiptap {
      --uui-input-border-color: transparent;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'umbhost-table-cell-tiptap-editor': UmbHostTableCellTiptapEditor;
  }
}
