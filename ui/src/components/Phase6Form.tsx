import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Project } from '@/lib/types';

interface Phase6FormProps {
  project: Project;
  onFieldChange: (field: 'point_of_view', value: string) => void;
  renderSaveIndicator: (field: string) => React.ReactNode;
  formData: {
    point_of_view: string;
  };
}

export function Phase6Form({ project, onFieldChange, renderSaveIndicator, formData }: Phase6FormProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Faza 6: Završne Pripreme</CardTitle>
          <CardDescription>
            Odaberite perspektivu iz koje će se vaša priča pripovijedati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="pov-selection">
              <AccordionTrigger className="text-left">
                <div className="flex items-center justify-between w-full">
                  <span>Odabir Pripovjedača (Point of View - POV)</span>
                  {renderSaveIndicator('point_of_view')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Odaberite perspektivu iz koje će se vaša priča pripovijedati. Ova odluka utjecat će na način kako čitatelji doživljavaju vašu priču.
                </p>
                
                <RadioGroup 
                  value={formData.point_of_view} 
                  onValueChange={(value) => onFieldChange('point_of_view', value)}
                  className="space-y-4"
                >
                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="first_person" id="first_person" className="mt-1" />
                    <div className="space-y-2">
                      <Label htmlFor="first_person" className="text-sm font-medium cursor-pointer">
                        Prvo lice ("Ja")
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Priča se pripovijedaju iz perspektive glavnog lika koristeći "ja" oblik. 
                        Čitatelj doživljava sve kroz oči i misli glavnog lika.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="third_person_limited" id="third_person_limited" className="mt-1" />
                    <div className="space-y-2">
                      <Label htmlFor="third_person_limited" className="text-sm font-medium cursor-pointer">
                        Treće lice ograničeno ("On/Ona")
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Priča se pripovijedaju iz perspektive jednog lika koristeći "on/ona" oblik. 
                        Čitatelj zna samo ono što taj lik zna i osjeća.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="third_person_omniscient" id="third_person_omniscient" className="mt-1" />
                    <div className="space-y-2">
                      <Label htmlFor="third_person_omniscient" className="text-sm font-medium cursor-pointer">
                        Treće lice sveznajuće ("On/Ona")
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Pripovjedač zna sve - misli, osjećaje i motivacije svih likova. 
                        Može se prebacivati između različitih perspektiva.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}