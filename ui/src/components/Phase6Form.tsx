import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MagicIcon } from '@/components/planner/MagicIcon';
import { AIAssistantModal } from '@/components/planner/AIAssistantModal';
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
    isOpen,
    closeModal,
    openModal,
    context,
    messages,
    isLoading,
    lastResponse,
  } = usePlannerAIStore();

  // Handler za otvaranje modala za POV
  const handlePOVMagicClick = () => {
    if (!projectId) return;
    openModal('planner_pov', 'point_of_view', projectId);
  };

  // Handler za Keep All akciju (zamjenjuje sadržaj polja)
  const handleKeepAll = (value: string | object) => {
    // Za POV, očekujemo string (vrijednost radio buttona ili tekstualni opis)
    if (typeof value === 'string') {
      // Ako je vrijednost jedna od poznatih POV opcija, koristi je direktno
      if (['first_person', 'third_person_limited', 'third_person_omniscient'].includes(value)) {
        onFieldChange('point_of_view', value);
      } else {
        // Ako je tekstualni opis, možemo ga spremiti kao bilješku ili ignorirati
        // Za sada ćemo ignorirati tekstualne opise jer POV je radio button
        console.log('POV text description received:', value);
      }
    }
  };


  // Dobivanje prikaznog imena konteksta
  const getContextDisplayName = (): string => {
    if (!context) return 'Point of View';
    return context.replace('planner_', '').charAt(0).toUpperCase() + context.replace('planner_', '').slice(1);
  };

  return (
    <>
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
                    <div className="flex items-center gap-2">
                      <span>Odabir Pripovjedača (Point of View - POV)</span>
                      <MagicIcon
                        onClick={(e) => {
                          if (e) e.stopPropagation();
                          handlePOVMagicClick();
                        }}
                        tooltip="AI Asistent za Point of View"
                        disabled={!projectId}
                      />
                    </div>
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

      {/* AI Assistant Modal */}
      {projectId && (
        <AIAssistantModal
          isOpen={isOpen}
          onClose={closeModal}
          context={getContextDisplayName()}
          onKeepAll={handleKeepAll}
          messages={messages}
          isLoading={isLoading}
          lastResponse={lastResponse || undefined}
        />
      )}
    </>
  );
}