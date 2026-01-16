import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FolderOpen, 
  Search, 
  Users, 
  Plus, 
  ArrowRight,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
  totalCampaigns: number;
  totalSearches: number;
  totalProspects: number;
}

interface Campaign {
  id: string;
  name: string;
  goal: string;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalCampaigns: 0, totalSearches: 0, totalProspects: 0 });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load campaigns count
      const { count: campaignCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Load searches count
      const { count: searchCount } = await supabase
        .from('searches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Load total prospects
      const { data: searches } = await supabase
        .from('searches')
        .select('result_count')
        .eq('user_id', user!.id);
      
      const totalProspects = searches?.reduce((acc, s) => acc + (s.result_count || 0), 0) || 0;

      setStats({
        totalCampaigns: campaignCount || 0,
        totalSearches: searchCount || 0,
        totalProspects,
      });

      // Load recent campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name, goal, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentCampaigns(campaigns || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Campaigns', value: stats.totalCampaigns, icon: FolderOpen, color: 'text-primary' },
    { title: 'Total Searches', value: stats.totalSearches, icon: Search, color: 'text-accent' },
    { title: 'Prospects Found', value: stats.totalProspects, icon: Users, color: 'text-purple-500' },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}!
            </h2>
            <p className="text-muted-foreground">Here's what's happening with your campaigns.</p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {loading ? (
                    <div className="h-9 w-16 animate-pulse rounded bg-secondary" />
                  ) : (
                    stat.value.toLocaleString()
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Campaigns */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Recent Campaigns</CardTitle>
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/campaigns">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
                      <div className="h-3 w-32 animate-pulse rounded bg-secondary/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentCampaigns.length === 0 ? (
              <div className="py-8 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">No campaigns yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first campaign to start discovering prospects.
                </p>
                <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link to="/campaigns/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/campaigns/${campaign.id}`}
                    className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{campaign.name}</h4>
                      <p className="text-sm text-muted-foreground truncate">{campaign.goal}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(campaign.created_at), 'MMM d')}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
