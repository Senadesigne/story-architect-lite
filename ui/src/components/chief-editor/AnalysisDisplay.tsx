
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from "@/components/ui/scroll-area"

interface AnalysisDisplayProps {
    content: string;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ content }) => {
    return (
        <ScrollArea className="h-[60vh] w-full rounded-md border p-6 bg-background">
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                </ReactMarkdown>
            </div>
        </ScrollArea>
    );
};
