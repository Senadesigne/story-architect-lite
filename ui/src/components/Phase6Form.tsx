import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MagicIcon } from '@/components/planner/MagicIcon';

import { usePlannerAIStore } from '@/stores/plannerAIStore';

interface Phase6FormProps {
  onFieldChange: (field: 'point_of_view', value: string) => void;
  renderSaveIndicator: (field: string) => React.ReactNode;
  formData: {
    point_of_view: string;
  };
}

export function Phase6Form({ onFieldChange, renderSaveIndicator, formData }: Phase6FormProps) {
  const { projectId } = useParams<{ projectId: string }>();

  // Planner AI Store
  const {
    openModal,
  } = usePlannerAIStore();

  // Handler za otvaranje modala za POV
  const handlePOVMagicClick = () => {
    if (!projectId) return;
    openModal('planner_pov', 'point_of_view', projectId);
  };


  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Phase 6: Final Preparations</CardTitle>
            <CardDescription>
              Choose the perspective from which your story will be told
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="pov">
                <AccordionTrigger>
                  <div className="flex items-center justify-between w-full">
                    <span>Point of View (POV)</span>
                    {renderSaveIndicator('point_of_view')}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose the perspective from which your story will be told. This decision affects how readers experience your story.
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <MagicIcon
                      onClick={(e) => {
                        if (e) e.stopPropagation();
                        handlePOVMagicClick();
                      }}
                      tooltip="AI Assistant for Point of View"
                      disabled={!projectId}
                    />
                    <span className="text-sm text-muted-foreground">
                      Use AI to help you choose a POV.
                    </span>
                  </div>

                  <RadioGroup
                    value={formData.point_of_view}
                    onValueChange={(value) => onFieldChange('point_of_view', value)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="first_person" id="first_person" />
                        <Label htmlFor="first_person">First Person ("I")</Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        The story is told from the main character's perspective using "I". The reader experiences everything through their eyes and thoughts.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="third_person_limited" id="third_person_limited" />
                        <Label htmlFor="third_person_limited">Third Person Limited ("He/She")</Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        The story is told from one character's perspective using "He/She". The reader only knows what that character knows and feels.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="third_person_omniscient" id="third_person_omniscient" />
                        <Label htmlFor="third_person_omniscient">Third Person Omniscient ("He/She")</Label>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        The narrator knows everything - thoughts, feelings, and motivations of all characters. Can switch between different perspectives.
                      </p>
                    </div>
                  </RadioGroup>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>

    </>
  );
}