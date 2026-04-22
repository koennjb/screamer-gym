import { useEffect, useRef } from 'react';
import Head from 'next/head';

export default function DocsPage() {
  const elementRef = useRef<HTMLDivElement>(null);

  console.log("Testing from docs page");

  useEffect(() => {
    // Load Stoplight Elements
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@stoplight/elements/web-components.min.js';
    script.async = true;
    document.body.appendChild(script);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/@stoplight/elements/styles.min.css';
    document.head.appendChild(link);

    return () => {
      document.body.removeChild(script);
      document.head.removeChild(link);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Screamer API Documentation</title>
      </Head>
      <div className="min-h-screen">
        <div
          ref={elementRef}
          // @ts-ignore
          dangerouslySetInnerHTML={{
            __html: `
              <elements-api
                apiDescriptionUrl="/openapi.yaml"
                router="hash"
                layout="sidebar"
              />
            `,
          }}
        />
      </div>
    </>
  );
}
