import { Helmet } from "react-helmet-async";

const SITE_URL = "https://spotsvault.com";
const DEFAULT_OG = `${SITE_URL}/og-default.jpg`;
const SITE_NAME = "SpotsVault";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
}

export default function SEO({ title, description, path = "/", image, type = "website" }: SEOProps) {
  const url = `${SITE_URL}${path}`;
  const ogImage = image || DEFAULT_OG;
  const desc = (description || "").slice(0, 300);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
