import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        ghostText: {
            setGhostText: (text: string | null) => ReturnType;
        };
    }
}

export const GhostTextExtension = Extension.create({
    name: 'ghostText',

    addCommands() {
        return {
            setGhostText: (text: string | null) => ({ tr, dispatch }) => {
                if (dispatch) {
                    dispatch(tr.setMeta('ghostText', text));
                }
                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('ghostText'),
                state: {
                    init() {
                        return null;
                    },
                    apply(tr, value) {
                        const meta = tr.getMeta('ghostText');
                        if (meta !== undefined) return meta;
                        return value;
                    },
                },
                props: {
                    decorations(state) {
                        const text = this.getState(state);
                        if (!text) return DecorationSet.empty;

                        const { to } = state.selection;
                        const widget = document.createElement('span');
                        widget.textContent = text;
                        widget.classList.add('text-muted-foreground', 'italic', 'opacity-60', 'pointer-events-none');
                        widget.style.color = '#9ca3af';
                        widget.style.fontStyle = 'italic';

                        return DecorationSet.create(state.doc, [
                            Decoration.widget(to, widget),
                        ]);
                    },
                },
            }),
        ];
    },
});
