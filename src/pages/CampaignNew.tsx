import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ArrowRight, Check, Briefcase, Smile, Heart } from 'lucide-react';
import { toast } from 'sonner';

type Step = 1 | 2 | 3;

const tones = [
  { 
    value: 'professional', 
    label: 'Professional', 
    description: 'Business-appropriate, concise and direct',
    icon: Briefcase 
  },
  { 
    value: 'casual', 
    label: 'Casual', 
    description: 'Friendly and conversational',
    icon: Smile 
  },
  { 
    value: 'friendly', 
    label: 'Friendly', 
    description: 'Warm, personable and enthusiastic',
    icon: Heart 
  },
];

export default function CampaignNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('professional');

  const canProceed = () => {
    switch (step) {
      case 1: return name.trim().length > 0;
      case 2: return goal.trim().length > 0;
      case 3: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: name.trim(),
          goal: goal.trim(),
          context: context.trim() || null,
          tone,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Campaign created!');
      navigate(`/campaigns/${data.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Create Campaign">
      <div className="mx-auto max-w-2xl">
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  s < step
                    ? 'bg-primary text-primary-foreground'
                    : s === step
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`mx-2 h-0.5 w-12 transition-colors ${
                    s < step ? 'bg-primary' : 'bg-secondary'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="border-border bg-card">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-foreground">Name your campaign</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Give your campaign a memorable name to identify it later.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Campaign Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Q1 Sales Outreach"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-foreground">Define your goal</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Describe what you're trying to achieve and provide context about your company.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="goal" className="text-foreground">Campaign Goal</Label>
                  <Textarea
                    id="goal"
                    placeholder="e.g., Find CTOs at Series A startups who might need our DevOps automation platform"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    rows={3}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="context" className="text-foreground">
                    About You / Your Company{' '}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="context"
                    placeholder="e.g., We're a DevOps automation platform that helps engineering teams deploy 10x faster..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={3}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps AI generate more personalized outreach messages.
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="text-foreground">Choose your tone</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Select the tone for AI-generated outreach messages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={tone} onValueChange={setTone} className="space-y-3">
                  {tones.map((t) => (
                    <div key={t.value}>
                      <RadioGroupItem
                        value={t.value}
                        id={t.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={t.value}
                        className="flex cursor-pointer items-center gap-4 rounded-lg border border-border p-4 transition-all hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <t.icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{t.label}</p>
                          <p className="text-sm text-muted-foreground">{t.description}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border p-6">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    Create Campaign
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
