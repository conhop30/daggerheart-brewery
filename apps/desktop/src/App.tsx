import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { SessionJumpRequest } from './pages/CampaignsPage';
import AppShell, { type View } from './components/AppShell';
import FloatingMusicPlayer from './components/FloatingMusicPlayer';
import JournalBubble from './components/JournalBubble';
import { GameSetsProvider } from './context/GameSetsContext';
import { MusicProvider } from './context/MusicContext';
import { RollLogProvider } from './context/RollLogContext';

// Lazy per page — App.tsx used to statically import all 8 pages, so
// everything shipped in one bundle and loaded up front even for pages the
// user might never open in a given run. Each page's chunk now only
// downloads the first time its view is visited.
const HomePage = lazy(() => import('./pages/HomePage'));
const ClassesPage = lazy(() => import('./pages/ClassesPage'));
const AdversariesEnvironmentsPage = lazy(() => import('./pages/AdversariesEnvironmentsPage'));
const DomainsPage = lazy(() => import('./pages/DomainsPage'));
const HeritagePage = lazy(() => import('./pages/HeritagePage'));
const EquipmentPage = lazy(() => import('./pages/EquipmentPage'));
const OptionalMechanicsPage = lazy(() => import('./pages/OptionalMechanicsPage'));
const CampaignFramesPage = lazy(() => import('./pages/CampaignFramesPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function PageLoading() {
  return <p className="app-shell__page-loading">Loading&hellip;</p>;
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [jumpToSession, setJumpToSession] = useState<SessionJumpRequest | null>(null);
  const [jumpToCampaign, setJumpToCampaign] = useState<string | null>(null);
  const [jumpToFrame, setJumpToFrame] = useState<string | null>(null);
  // Bumped whenever a Campaign Frame is saved or deleted. The Campaigns page
  // stays mounted while that happens on another page, so this is how an open
  // Campaign learns the frame it names has changed or gone.
  const [framesRevision, setFramesRevision] = useState(0);
  const handleFramesChanged = useCallback(() => setFramesRevision((n) => n + 1), []);
  const handleFrameJumpHandled = useCallback(() => setJumpToFrame(null), []);

  // Every view the user has opened this run stays mounted (hidden via CSS)
  // instead of unmounting on nav away — a page's own useApiList calls only
  // fire once per run instead of refiring on every revisit.
  const [visited, setVisited] = useState<Set<View>>(() => new Set<View>(['home']));
  useEffect(() => {
    setVisited((prev) => (prev.has(view) ? prev : new Set(prev).add(view)));
  }, [view]);

  function page(pageView: View, node: ReactNode) {
    if (!visited.has(pageView)) return null;
    return (
      <div key={pageView} className="app-shell__page" style={view === pageView ? undefined : { display: 'none' }}>
        <Suspense fallback={<PageLoading />}>{node}</Suspense>
      </div>
    );
  }

  return (
    <GameSetsProvider>
      <MusicProvider>
        <RollLogProvider>
          <AppShell view={view} onNavigate={setView}>
            {page('classes', <ClassesPage />)}
            {page('adversaries-environments', <AdversariesEnvironmentsPage />)}
            {page('domains', <DomainsPage />)}
            {page('heritage', <HeritagePage />)}
            {page('equipment', <EquipmentPage />)}
            {page('optional-mechanics', <OptionalMechanicsPage />)}
            {page(
              'campaign-frames',
              <CampaignFramesPage
                jumpToFrame={jumpToFrame}
                onJumpHandled={handleFrameJumpHandled}
                onFramesChanged={handleFramesChanged}
              />
            )}
            {page(
              'campaigns',
              <CampaignsPage
                jumpToSession={jumpToSession}
                onJumpHandled={() => setJumpToSession(null)}
                jumpToCampaign={jumpToCampaign}
                onCampaignJumpHandled={() => setJumpToCampaign(null)}
                framesRevision={framesRevision}
                onOpenFrame={(frameId) => {
                  setJumpToFrame(frameId);
                  setView('campaign-frames');
                }}
              />
            )}
            {page('settings', <SettingsPage />)}
            {page('home', <HomePage onNavigate={setView} />)}
          </AppShell>
          <FloatingMusicPlayer
            onOpenSession={(campaignId, sessionId) => {
              setJumpToSession({ campaignId, sessionId });
              setView('campaigns');
            }}
          />
          <JournalBubble
            onOpenCampaign={(campaignId) => {
              setJumpToCampaign(campaignId);
              setView('campaigns');
            }}
          />
        </RollLogProvider>
      </MusicProvider>
    </GameSetsProvider>
  );
}
