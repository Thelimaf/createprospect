import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CampaignSearchFormProps {
  campaignId: string;
}

export function CampaignSearchForm({ campaignId }: CampaignSearchFormProps) {
  const [query, setQuery] = useState('');
  const [criterionInput, setCriterionInput] = useState('');
  const [criteria, setCriteria] = useState<string[]>([]);
  const [count, setCount] = useState([10]);
  const [loading, setLoading] = useState(false);

  const addCriterion = () => {
    if (criterionInput.trim() && !criteria.includes(criterionInput.trim())) {
      setCriteria([...criteria, criterionInput.trim()]);
      setCriterionInput('');
    }
  };

  const removeCriterion = (criterion: string) => {
    setCriteria(criteria.filter(c => c !== criterion));
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-search', {
        body: {
          query,
          entityType: 'person',
          criteria: criteria.map(c => ({ description: c })),
          enrichments: [],
          count: count[0],
          campaignId,
        },
      });

      if (error) throw error;

      toast.success('Search started!', {
        description: 'Results will appear in 30-60 seconds.',
      });

      setQuery('');
      setCriteria([]);
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.message || 'Failed to create search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Search className="h-5 w-5 text-primary" />
          Search Prospects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Query */}
        <div className="space-y-2">
          <Label htmlFor="query" className="text-foreground">Search Query</Label>
          <Input
            id="query"
            placeholder="e.g., CTOs at Series A startups in San Francisco"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Use natural language to describe who you're looking for.
          </p>
        </div>

        {/* Criteria */}
        <div className="space-y-2">
          <Label className="text-foreground">
            Filter Criteria <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Has a LinkedIn profile"
              value={criterionInput}
              onChange={(e) => setCriterionInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCriterion())}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addCriterion}
              disabled={!criterionInput.trim()}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {criteria.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {criteria.map((criterion) => (
                <Badge
                  key={criterion}
                  variant="secondary"
                  className="flex items-center gap-1 bg-secondary text-secondary-foreground"
                >
                  {criterion}
                  <button
                    onClick={() => removeCriterion(criterion)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Result Count */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-foreground">Max Results</Label>
            <span className="text-sm font-medium text-primary">{count[0]}</span>
          </div>
          <Slider
            value={count}
            onValueChange={setCount}
            min={5}
            max={50}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Choose how many prospects to find (5-50).
          </p>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Search...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Search Prospects
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
