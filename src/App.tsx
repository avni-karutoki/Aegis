import React, { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { SimulationProvider } from './context/SimulationContext';
import { BackendProvider } from './context/BackendContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/landing/HeroSection';
import { LiveStatusStrip } from './components/landing/LiveStatusStrip';
import { ProblemSection } from './components/landing/ProblemSection';
import { HowItWorksSection } from './components/landing/HowItWorksSection';
import { NetworkShowcaseSection } from './components/landing/NetworkShowcaseSection';
import { TrustIntelligenceSection } from './components/landing/TrustIntelligenceSection';
import { ThreatIntelligenceSection } from './components/landing/ThreatIntelligenceSection';
import { TechnologySection } from './components/landing/TechnologySection';
import { FooterSection } from './components/landing/FooterSection';
import { DashboardView } from './components/dashboard/DashboardView';

export function App() {
  const [activeView, setActiveView] = useState<'landing' | 'dashboard'>('landing');

  const openDashboard = () => {
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToLanding = () => {
    setActiveView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToNetwork = () => {
    document.getElementById('network')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <BackendProvider>
        <SimulationProvider>
        <AnimatePresence mode="wait">
          {activeView === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <DashboardView onBackToShowcase={backToLanding} />
            </motion.div>
          ) : (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-screen bg-[#050A07] text-[#F4F7F4]"
            >
              <Navbar
                activeView={activeView}
                onOpenDashboard={openDashboard}
                onBackToLanding={backToLanding}
              />
              <main>
                <HeroSection
                  onExploreNetwork={scrollToNetwork}
                  onOpenDashboard={openDashboard}
                />
                <LiveStatusStrip />
                <ProblemSection />
                <HowItWorksSection />
                <NetworkShowcaseSection />
                <TrustIntelligenceSection />
                <ThreatIntelligenceSection />
                <TechnologySection />
              </main>
              <FooterSection onOpenDashboard={openDashboard} />
            </motion.div>
          )}
        </AnimatePresence>
        </SimulationProvider>
      </BackendProvider>
    </MotionConfig>
  );
}

export default App;
