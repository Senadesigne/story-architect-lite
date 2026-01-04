import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MagicIcon } from '@/components/planner/MagicIcon';
import { usePlannerAIStore } from '@/stores/plannerAIStore';
import { Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ProjectField = 'story_idea';

interface Phase0FormProps {
    onFieldChange: (field: ProjectField, value: string) => void;
    renderSaveIndicator: (field: ProjectField) => React.ReactNode;
    formData: {
        story_idea: string;
    };
}

export function Phase0Form({ onFieldChange, renderSaveIndicator, formData }: Phase0FormProps) {
    const { projectId } = useParams<{ projectId: string }>();

    // Planner AI Store
    const {
        openModal,
        targetField,
        pendingApplication,
        setPendingApplication,
    } = usePlannerAIStore();

    const handleMagicClick = () => {
        if (!projectId) return;
        openModal('planner_story_idea', 'story_idea', projectId);
    };

    const handleAcceptAI = (field: ProjectField) => {
        if (pendingApplication) {
            onFieldChange(field, pendingApplication);
            setPendingApplication(null);
        }
    };

    const handleDiscardAI = () => {
        setPendingApplication(null);
    };

    const renderAIProposal = (field: ProjectField) => {
        if (targetField === field && pendingApplication) {
            return (
                <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-md animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-primary flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Proposal
                        </div>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleDiscardAI}
                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                title="Discard"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleAcceptAI(field)}
                                className="h-6 px-2 text-xs gap-1"
                                title="Accept"
                            >
                                <Check className="w-3 h-3" /> Accept
                            </Button>
                        </div>
                    </div>
                    <div className="text-sm text-muted-foreground italic bg-background/50 p-2 rounded border border-border/50 max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {pendingApplication}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Phase 0: Story Idea</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="story_idea">Brain Dump</Label>
                            <MagicIcon
                                onClick={handleMagicClick}
                                tooltip="AI Idea Assistant"
                                disabled={!projectId}
                            />
                        </div>
                        <div className="min-h-[1.5rem] flex items-center">
                            {renderSaveIndicator('story_idea')}
                        </div>
                    </div>
                    {renderAIProposal('story_idea')}
                    <Textarea
                        id="story_idea"
                        placeholder="Dump all your raw ideas, fragments, scenes, and dialogues here. Chaos is welcome."
                        value={formData.story_idea}
                        onChange={(e) => onFieldChange('story_idea', e.target.value)}
                        className="min-h-[300px]"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
