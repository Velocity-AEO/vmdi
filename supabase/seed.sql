-- ============================================================
-- VMDI Seed Data
-- ============================================================

-- Tenant: VAEO
insert into tenants (tenant_id, name, slug, primary_domain, time_zone)
values (
  '00000000-0000-0000-0000-000000000001',
  'VAEO',
  'vaeo',
  'vaeo.com',
  'America/New_York'
);

-- Author: Vincent Goodrich
insert into authors (author_id, tenant_id, name, bio, expertise_tags, social_links)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Vincent Goodrich',
  'Founder of VAEO. Specializes in technical SEO, content strategy, and digital infrastructure.',
  array['technical-seo', 'content-strategy', 'digital-marketing'],
  '{"linkedin": "https://linkedin.com/in/vincentgoodrich"}'::jsonb
);

-- Keywords: 3 technical SEO keywords
insert into keywords (keyword_id, tenant_id, keyword_primary, keywords_secondary, intent, cluster)
values
  (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000001',
    'technical SEO audit',
    array['site audit checklist', 'crawl budget optimization', 'technical seo checklist 2026'],
    'informational',
    'technical-seo'
  ),
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'structured data implementation',
    array['schema markup guide', 'json-ld best practices', 'rich snippets optimization'],
    'informational',
    'structured-data'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000001',
    'core web vitals optimization',
    array['LCP optimization', 'CLS fixes', 'INP improvement strategies'],
    'informational',
    'page-experience'
  );

-- Asset: Draft article
insert into assets (
  asset_id, tenant_id, author_id, keyword_id,
  type, status, title, body, excerpt,
  keyword_primary, keywords_secondary, slug,
  legal_owner, license_type, uniqueness_score, schema_json
)
values (
  '00000000-0000-0000-0000-000000001000',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  'article',
  'draft',
  'The Complete Technical SEO Audit Checklist for 2026',
  'Placeholder body content for the technical SEO audit article.',
  'A comprehensive guide to running a technical SEO audit that covers crawlability, indexation, and Core Web Vitals.',
  'technical SEO audit',
  array['site audit checklist', 'crawl budget optimization'],
  'technical-seo-audit-checklist-2026',
  'VAEO',
  'proprietary',
  0.92,
  '{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "The Complete Technical SEO Audit Checklist for 2026",
    "author": {
      "@type": "Person",
      "name": "Vincent Goodrich"
    }
  }'::jsonb
);
