import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { LandingPage } from './LandingPage.jsx';
import { AntigravityShell } from '../quickcommerce/AntigravityShell.jsx';
import { HomeScreen } from '../quickcommerce/screens/HomeScreen.jsx';
import { SplashScreen } from '../quickcommerce/screens/SplashScreen.jsx';
import { OnboardingScreen } from '../quickcommerce/screens/OnboardingScreen.jsx';

export function ResponsiveCustomerLanding() {
  const isMobile = useIsMobile(768);

  const [hasOnboarded, setHasOnboarded] = useState(() => {
    try {
      return localStorage.getItem('sevo_onboarded_v2') === 'true';
    } catch {
      return false;
    }
  });

  const [hasSeenSplash, setHasSeenSplash] = useState(() => {
    try {
      return sessionStorage.getItem('sevo_splash_shown') === 'true';
    } catch {
      return false;
    }
  });

  // When viewing on desktop (>= 768px), render the full desktop LandingPage
  if (!isMobile) {
    return <LandingPage />;
  }

  // First time on mobile: show Splash Screen once per session
  if (!hasSeenSplash && !hasOnboarded) {
    return (
      <AntigravityShell>
        <SplashScreen
          onComplete={() => {
            try {
              sessionStorage.setItem('sevo_splash_shown', 'true');
            } catch {}
            setHasSeenSplash(true);
          }}
        />
      </AntigravityShell>
    );
  }

  // If not yet onboarded: show Onboarding Screen (Screen 2)
  if (!hasOnboarded) {
    return (
      <AntigravityShell>
        <OnboardingScreen
          onComplete={() => {
            try {
              localStorage.setItem('sevo_onboarded_v2', 'true');
            } catch {}
            setHasOnboarded(true);
          }}
        />
      </AntigravityShell>
    );
  }

  // Mobile Customer Home Screen (Screen 4 with 16-screen ecosystem)
  return (
    <AntigravityShell>
      <HomeScreen />
    </AntigravityShell>
  );
}

export default ResponsiveCustomerLanding;
