import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        ghostText: {
            insertGhostText: (text: string) => ReturnType;
            acceptGhostText: () => ReturnType;
            rejectGhostText: () => ReturnType;
        };
    }
}

export const GhostTextExtension = Mark.create({
    name: 'ghost',

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'text-muted-foreground italic opacity-60',
                style: 'color: #9ca3af; font-style: italic;',
            },
        };
    },
    
    // Postavke koje sprečavaju probleme s brisanjem
    inclusive: true,  // Omogućava tipkanje unutar marka
    excludes: '',    // Ne isključuje druge markove
    exitable: true,  // Može se izaći iz marka

    addAttributes() {
        return {
            class: {
                default: 'text-muted-foreground italic opacity-60',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-ghost]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-ghost': '' }), 0];
    },

    addCommands() {
        return {
            insertGhostText:
                (text: string) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: 'text',
                            text,
                            marks: [{ type: 'ghost' }],
                        });
                    },
            acceptGhostText:
                () =>
                    ({ tr, dispatch }) => {
                        if (dispatch) {
                            const { doc } = tr;
                            doc.descendants((node, pos) => {
                                if (node.isText && node.marks.find((m) => m.type.name === 'ghost')) {
                                    tr.removeMark(pos, pos + node.nodeSize, this.type);
                                }
                            });
                        }
                        return true;
                    },
            rejectGhostText:
                () =>
                    ({ tr, dispatch, state }) => {
                        if (dispatch) {
                            const { doc } = tr;
                            // Iterate backwards to avoid position shifting issues when deleting
                            let rangesToDelete: { from: number; to: number }[] = [];

                            doc.descendants((node, pos) => {
                                if (node.isText && node.marks.find((m) => m.type.name === 'ghost')) {
                                    rangesToDelete.push({ from: pos, to: pos + node.nodeSize });
                                }
                            });

                            // Sort reverse to delete from end
                            rangesToDelete.sort((a, b) => b.from - a.from);

                            rangesToDelete.forEach(({ from, to }) => {
                                // Prvo ukloni mark, zatim obriši tekst
                                tr.removeMark(from, to, state.schema.marks.ghost);
                                tr.delete(from, to);
                            });
                        }
                        return true;
                    },
        };
    },
});
