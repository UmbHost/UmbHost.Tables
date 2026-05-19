import { LitElement, html, css, nothing, customElement, property, query, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import type { UUIPopoverContainerElement } from '@umbraco-cms/backoffice/external/uui';
// Side-effect import ensures umb-input-tiptap and umb-tiptap-toolbar are registered in the
// custom elements registry even when no other TipTap RTE property editor exists on the page.
import '@umbraco-cms/backoffice/tiptap';
import type { UmbInputTiptapElement, UmbTiptapRteContext, Editor } from '@umbraco-cms/backoffice/tiptap';

// The token is not publicly exported from @umbraco-cms/backoffice/tiptap, so we re-declare it
// using the same contextAlias. The context system matches by string alias, not object identity.
const UMB_TIPTAP_RTE_CONTEXT = new UmbContextToken<UmbTiptapRteContext>('UmbTiptapRteContext');

let _nextToolbarId = 0;

// Placed as a light-DOM child of umb-input-tiptap so context requests bubble up through it
// and reach its UmbTiptapRteContext provider. Polls for the editor instance (which umb-input-tiptap
// sets asynchronously in firstUpdated) and fires tiptap-editor-ready once it's available.
@customElement('umbhost-tiptap-editor-bridge')
class UmbHostTiptapEditorBridge extends UmbElementMixin(LitElement) {
  override connectedCallback() {
    super.connectedCallback();
    this.consumeContext(UMB_TIPTAP_RTE_CONTEXT, (ctx) => { if (ctx) this.#pollForEditor(ctx); });
  }

  #pollForEditor(ctx: UmbTiptapRteContext, attempt = 0) {
    if (!this.isConnected || attempt > 100) return;
    const editor = ctx.getEditor();
    if (editor) {
      this.dispatchEvent(new CustomEvent('tiptap-editor-ready', { detail: editor, bubbles: true, composed: true }));
    } else {
      requestAnimationFrame(() => this.#pollForEditor(ctx, attempt + 1));
    }
  }

  override render() { return nothing; }
}

@customElement('umbhost-table-cell-tiptap-editor')
export class UmbHostTableCellTiptapEditor extends UmbElementMixin(LitElement) {
  @property({ attribute: false }) public value: string = '';
  @property({ type: Object, attribute: false }) public config?: UmbPropertyEditorConfigCollection;
  @property({ type: Boolean }) public readonly: boolean = false;
  @property({ attribute: false }) public clickOrigin?: { x: number; y: number };

  @state() private _editor?: Editor;

  @query('uui-popover-container')
  private _popoverContainer?: UUIPopoverContainerElement;

  // Each instance needs a unique id so multiple open cells don't share popover targets.
  readonly #popoverId = `umbhost-toolbar-${_nextToolbarId++}`;

  private _configCache?: UmbPropertyEditorConfigCollection;

  private _buildConfigWithoutToolbar(): UmbPropertyEditorConfigCollection {
    return this._configCache ??= new UmbPropertyEditorConfigCollection([
      { alias: 'extensions',   value: this.config?.getValueByAlias<string[]>('extensions') },
      { alias: 'toolbar',      value: [[[]]] },
      { alias: 'statusbar',    value: this.config?.getValueByAlias<Array<Array<string>>>('statusbar') },
      { alias: 'stylesheets',  value: this.config?.getValueByAlias<string[]>('stylesheets') },
      { alias: 'maxImageSize', value: this.config?.getValueByAlias<number>('maxImageSize') ?? 500 },
      { alias: 'overlaySize',  value: 'medium' },
    ]);
  }

  private get _toolbarValue(): Array<Array<Array<string>>> {
    return this.config?.getValueByAlias<Array<Array<Array<string>>>>('toolbar') ?? [[[]]];
  }

  private _handleChange(e: Event) {
    const tiptap = e.target as UmbInputTiptapElement;
    this.value = tiptap.value;
    this.dispatchEvent(new CustomEvent('rte-value-change', { detail: this.value, bubbles: true, composed: true }));
  }

  private _onEditorReady(e: CustomEvent) {
    if (!this._editor) {
      this._editor = e.detail as Editor;
      const origin = this.clickOrigin;
      // Notify parent first so it removes rte-loading (TipTap becomes visible at final position).
      // Then focus after one RAF so posAtCoords uses accurate post-layout coordinates.
      this.dispatchEvent(new CustomEvent('rte-editor-ready', { bubbles: true, composed: true }));
      requestAnimationFrame(() => {
        if (!this._editor) return;
        if (origin) {
          const pos = this._editor.view.posAtCoords({ left: origin.x, top: origin.y });
          this._editor.commands.focus(pos ? pos.pos : 'start');
        } else {
          this._editor.commands.focus();
        }
        this.updateComplete.then(() => this._popoverContainer?.showPopover());
      });
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    try { this._popoverContainer?.hidePopover(); } catch { /* already closed */ }
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('config')) this._configCache = undefined;
  }

  override render() {
    const hasToolbar = !this.readonly && this._toolbarValue.flat(2).length > 0;
    return html`
      ${hasToolbar ? html`
        <span class="toolbar-anchor" popovertarget=${this.#popoverId}></span>
        <uui-popover-container id=${this.#popoverId} placement="top-start" popover="manual">
          ${this._editor ? html`
            <umb-tiptap-toolbar
              .toolbar=${this._toolbarValue}
              .editor=${this._editor}
              .configuration=${this.config}>
            </umb-tiptap-toolbar>
          ` : nothing}
        </uui-popover-container>
      ` : nothing}
      <umb-input-tiptap
        .value=${this.value}
        .configuration=${this._buildConfigWithoutToolbar()}
        ?readonly=${this.readonly}
        @change=${this._handleChange}
        @tiptap-editor-ready=${this._onEditorReady}>
        <umbhost-tiptap-editor-bridge></umbhost-tiptap-editor-bridge>
      </umb-input-tiptap>
    `;
  }

  static override styles = css`
    :host { display: block; height: 100%; }

    .toolbar-anchor {
      display: block;
      width: 100%;
      height: 0;
      pointer-events: none;
    }

    umb-input-tiptap {
      --uui-input-border-color: transparent;
      --umb-rte-min-height: 69px;
      display: block;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'umbhost-table-cell-tiptap-editor': UmbHostTableCellTiptapEditor;
    'umbhost-tiptap-editor-bridge': UmbHostTiptapEditorBridge;
  }
}
