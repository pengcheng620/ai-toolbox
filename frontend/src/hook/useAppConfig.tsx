import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// Use a more specific type if you know the shape of your config
interface AppConfig {
  [key: string]: any;
}

interface ConfigContextType {
  config: AppConfig | null;
  isLoading: boolean;
  error: Error | null;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface AppConfigProviderProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
}

export const AppConfigProvider = ({ children, loadingComponent = null }: AppConfigProviderProps) => {
  const [contextValue, setContextValue] = useState<ConfigContextType>({
    config: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // In a real app, the base URL should come from an environment variable
        // For Plasmo, this might be configured in the build process
        const apiBaseUrl = process.env.PLASMO_PUBLIC_API_BASE_URL || 'http://localhost:8077';
        const response = await fetch(`${apiBaseUrl}/api/v1/config/public`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.statusText}`);
        }
        
        const data: AppConfig = await response.json();
        setContextValue({ config: data, isLoading: false, error: null });

      } catch (e) {
        const err = e instanceof Error ? e : new Error('An unknown error occurred');
        console.error("Failed to load application configuration:", err);
        setContextValue({ config: null, isLoading: false, error: err });
      }
    };

    fetchConfig();
    // Empty dependency array ensures this effect runs only once on mount
  }, []);

  if (contextValue.isLoading) {
    return <>{loadingComponent || <div>Loading configuration...</div>}</>;
  }
  
  if (contextValue.error) {
    return <div>Error loading configuration. Please try again later.</div>;
  }

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useAppConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useAppCofig must be used within an AppConfigProvider');
  }
  return context;
};
