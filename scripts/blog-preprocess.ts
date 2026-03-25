/**
 * Normalizes compressed editorial markdown from blog/*.md before marked → Tiptap.
 * Used only by import-blog-posts.ts.
 */

const WOOD_TABLE_MD = `

## Wood comparison (2026)

| Wood type | Appearance | Janka hardness | Cost | Best application |
| --- | --- | --- | --- | --- |
| White Oak | Neutral, open grain | ~1,360 lbf | Mid–high | Dining tables, kitchen cabinets |
| Black Walnut | Rich chocolate brown | ~1,010 lbf | Premium | Executive desks, accent furniture |
| Hard Maple | Light, creamy, smooth | ~1,450 lbf | Mid-range | Butcher blocks, minimalist frames |
| Cherry | Reddish-brown, ages darker | ~950 lbf | Mid–high | Traditional dressers, bedroom sets |
| Pine | Light, rustic knots | ~380–420 lbf | Budget | Shelving, children's furniture |
| Teak | Golden-brown, oily | ~1,155 lbf | High | Outdoor furniture, bathrooms |
| MDF | Smooth, uniform | N/A | Low | Painted cabinets, lacquer finishes |
| Plywood | Layered edge look | High stability | Mid-range | Modern shelving, cabinet boxes |

`;

const ADA_TABLE_MD = `

## ADA accessibility reference

| Area | Requirement |
| --- | --- |
| Table height | 28–34 inches |
| Knee clearance (under table) | 27 in (H) × 30 in (W) × 19 in (D) |
| Aisle width | 36 inches minimum |
| Accessible seating | 5% of total tables |
| Service counter height | 36 inches maximum |

`;

const MASS_VS_CUSTOM_MD = `

## Mass-produced vs custom DEXO designs

| Feature | Mass-produced furniture | Custom DEXO designs |
| --- | --- | --- |
| Spatial fit | Fixed sizes (~3-inch increments) | Millimeter precision |
| Material quality | Low-density particleboard | Marine plywood, solid hardwoods |
| Lifespan | 3–7 years | 15–25+ years |
| Sustainability | High inventory waste | Made-to-order, zero inventory |

`;

/** Longer phrases first. */
const SECTION_HEADINGS: string[] = [
  "ADA Accessibility Metrics for Restaurants and Cafés",
  "The Step-by-Step Custom Design Process",
  "Why Custom Outperforms Mass-Produced in 2026",
  "The Evolution of the Consumer as Designer",
  "Material Selection for High-Traffic Zones",
  "The 2026 Commercial Standard",
  "Comprehensive Wood Comparison Table 2026",
  "Branding Through Intentional Design",
  "Material Foundations for Beginners",
  "Insights for Specific Projects",
  "The Core Truth: Hardwood vs. Softwood",
  "The Generative Design Paradigm",
  "Text-to-3D and Image Analysis",
  "AI as a Manufacturing Orchestrator",
  "The AI-First Search Economy",
  "The Digital Manufacturing Handover",
  "Sustainability and Circular Design Principles",
  "Ergonomics and Workspace Zoning",
  "Lighting and Acoustic Considerations",
  "Storage and Vertical Space Strategies",
  "Color Psychology in Commercial Spaces",
  "Durability Standards for Retail Fixtures",
].sort((a, b) => b.length - a.length);

const STEP_LABELS = [
  "Ideation and Inspiration:",
  "3D Modeling:",
  "AI Refinement:",
  "Manufacturing Handover:",
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Insert ## before known section titles when glued to prior text. */
function injectSectionHeadings(t: string): string {
  let out = t;
  for (const h of SECTION_HEADINGS) {
    const esc = escapeRe(h);
    out = out.replace(new RegExp(`([a-z.])(${esc})`, "g"), "$1\n\n## $2\n\n");
    out = out.replace(new RegExp(`^(?!## )(${esc})\\b`, "gm"), "## $1\n\n");
  }
  return out;
}

export function preprocessBlogMarkdown(raw: string): string {
  let t = raw.trim();

  t = t.replace(
    /Wood TypeAppearanceJanka HardnessCostBest Application[\s\S]+?cabinet boxes(?=Insights for Specific Projects)/,
    WOOD_TABLE_MD.trim()
  );

  t = t.replace(
    /FeatureADA Requirement[\s\S]+?maximum(?=Material Selection for High-Traffic Zones)/,
    ADA_TABLE_MD.trim()
  );

  t = t.replace(
    /Feature\s*\|\s*Mass-Produced Furniture\s*\|\s*Custom DEXO Designs[\s\S]*?Made-to-order, zero inventory/,
    MASS_VS_CUSTOM_MD.trim()
  );

  t = t.replace(/Key Takeaways([A-Z])/g, "## Key Takeaways\n\n$1");
  t = t.replace(/(Start designing your own custom furniture at dexo\.com\.?)/gi, "\n\n$1\n");

  t = t.replace(/\\text\{([^}]*)\}/g, "$1");
  t = t.replace(/\$([^$]+)\$/g, (_, inner: string) => inner.replace(/\\/g, "").trim());

  t = t.replace(/([.!?])([A-Z][a-z]{2,})/g, "$1\n\n$2");

  t = injectSectionHeadings(t);

  for (const L of STEP_LABELS) {
    const label = L.slice(0, -1);
    t = t.replace(new RegExp(`\\.(${escapeRe(L)})`, "g"), `.\n\n### ${label}\n\n`);
  }

  t = t.replace(/2026(Choosing the right material)/g, "2026\n\n$1");
  t = t.replace(/([a-z])(In 2026\b)/g, "$1\n\n$2");
  t = t.replace(/maximum(Material Selection for High-Traffic Zones)/g, "maximum\n\n$1");
  t = t.replace(/boxes(Insights for Specific Projects)/g, "boxes\n\n$1");
  t = t.replace(/Projects(The "Workhorse")/g, "Projects\n\n$1");
  t = t.replace(/([a-z])(Touching furniture)/gi, "$1\n\n$2");
  t = t.replace(/settings\.(Branding Through Intentional Design)/g, "settings.\n\n$1");

  return t.trim();
}
