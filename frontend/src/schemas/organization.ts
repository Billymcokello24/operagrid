/**
 * Organization Schema
 * Defines the organization structured data for OperaGrid
 */

export interface OrganizationSchema {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  logo: string;
  description: string;
  foundingDate?: string;
  founders?: Array<{
    '@type': string;
    name: string;
  }>;
  address?: {
    '@type': string;
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  contactPoint?: Array<{
    '@type': string;
    telephone: string;
    contactType: string;
    email?: string;
    availableLanguage?: string[];
  }>;
  sameAs?: string[];
}

/**
 * Generate Organization schema for OperaGrid
 */
export function generateOrganizationSchema(): OrganizationSchema {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://operagrid.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OperaGrid',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: 'All-in-one workspace platform for team collaboration, project management, and productivity.',
    foundingDate: '2023',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Tech Street',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      postalCode: '94105',
      addressCountry: 'US',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+1-555-123-4567',
        contactType: 'customer support',
        email: 'support@operagrid.com',
        availableLanguage: ['English'],
      },
      {
        '@type': 'ContactPoint',
        telephone: '+1-555-123-4568',
        email: 'sales@operagrid.com',
        contactType: 'sales',
        availableLanguage: ['English'],
      },
    ],
    sameAs: [
      'https://twitter.com/operagrid',
      'https://www.facebook.com/operagrid',
      'https://www.linkedin.com/company/operagrid',
      'https://github.com/operagrid',
    ],
  };
}
