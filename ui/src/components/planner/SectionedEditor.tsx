import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { MagicIcon } from '@/components/planner/MagicIcon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Section {
    id: string; // Temporary ID for React keys
    title: string;
    content: string;
}

interface SectionedEditorProps {
    title: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    onMagicClick: () => void;
    magicTooltip: string;
    renderSaveIndicator: () => React.ReactNode;
}

export function SectionedEditor({
    title,
    value,
    onChange,
    options,
    onMagicClick,
    magicTooltip,
    renderSaveIndicator
}: SectionedEditorProps) {

    const parse = (text: string): Section[] => {
        if (!text) return [];
        const parts = text.split(/(?=^### )/gm); // Split by line starting with ### 
        return parts.map((part, index) => {
            const lines = part.split('\n');
            let title = 'Uvod';
            let content = part;

            if (lines[0].startsWith('### ')) {
                title = lines[0].replace('### ', '').trim();
                // FIX: Removed .trim() here to allow trailing spaces while typing
                content = lines.slice(1).join('\n');
            } else {
                // FIX: Removed .trim() here too
                content = part;
            }

            // Filter out empty "Uvod" if it's just whitespace
            if (title === 'Uvod' && !content.trim()) return null;

            return {
                id: `${title}-${index}`, // Stable-ish key
                title,
                content
            };
        }).filter(Boolean) as Section[];
    };

    const derivedSections = parse(value);

    const updateParent = (newSections: Section[]) => {
        const newValue = newSections.map(s => {
            if (s.title === 'Uvod') return s.content;
            return `### ${s.title}\n${s.content}`;
        }).join('\n\n');
        onChange(newValue);
    };

    const handleAddSection = (sectionTitle: string) => {
        const newSection = { id: crypto.randomUUID(), title: sectionTitle, content: '' };
        updateParent([...derivedSections, newSection]);
    };

    const handleDeleteSection = (index: number) => {
        if (!confirm('Jeste li sigurni da želite obrisati ovu sekciju?')) return;
        const newSections = [...derivedSections];
        newSections.splice(index, 1);
        updateParent(newSections);
    };

    const handleContentChange = (index: number, newContent: string) => {
        const newSections = [...derivedSections];
        newSections[index].content = newContent;
        updateParent(newSections);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Label className="text-base font-medium">{title}</Label>
                    <MagicIcon
                        onClick={onMagicClick}
                        tooltip={magicTooltip}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1">
                                <Plus className="h-3.5 w-3.5" />
                                Dodaj
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {options.map((item) => (
                                <DropdownMenuItem
                                    key={item}
                                    onClick={() => handleAddSection(item)}
                                >
                                    {item}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {renderSaveIndicator()}
            </div>

            {derivedSections.length === 0 && (
                <div className="text-sm text-muted-foreground italic border border-dashed rounded-md p-4 text-center">
                    Nema dodanih sekcija. Kliknite "Dodaj" za početak.
                </div>
            )}

            <div className="space-y-4">
                {derivedSections.map((section, index) => (
                    <Card key={section.id}>
                        <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteSection(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-3">
                            <Textarea
                                value={section.content}
                                onChange={(e) => handleContentChange(index, e.target.value)}
                                className="min-h-[100px] border-0 focus-visible:ring-0 resize-none p-0 shadow-none"
                                placeholder={`Unesite detalje za ${section.title}...`}
                            />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
