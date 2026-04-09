export interface ArticleInput {
  title: string;
  body: string;
  author: {
    name: string;
    url?: string;
  };
  url: string;
  publishedAt: string;
  keywords: string[];
}

export interface ArticleSchemaJsonLd {
  "@context": "https://schema.org";
  "@type": "BlogPosting";
  headline: string;
  author: {
    "@type": "Person";
    name: string;
    url?: string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
  };
  datePublished: string;
  url: string;
  keywords: string;
  articleBody: string;
  mainEntityOfPage: {
    "@type": "WebPage";
    "@id": string;
  };
}

export function generateArticleSchema(asset: ArticleInput): ArticleSchemaJsonLd {
  const schema: ArticleSchemaJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: asset.title.slice(0, 110),
    author: {
      "@type": "Person",
      name: asset.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "Velocity AEO",
    },
    datePublished: asset.publishedAt,
    url: asset.url,
    keywords: asset.keywords.join(", "),
    articleBody: asset.body.slice(0, 5000),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": asset.url,
    },
  };

  if (asset.author.url) {
    schema.author.url = asset.author.url;
  }

  return schema;
}
