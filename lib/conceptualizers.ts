export type Conceptualizer = {
  id: string;
  name: string;
  city: string;
  voice: string;
  portfolio: string;
  thumbnail: string;
  rateRange: string;
};

export const CONCEPTUALIZERS: Conceptualizer[] = [
  {
    id: "mara-okafor",
    name: "Mara Okafor",
    city: "Brooklyn, NY",
    voice:
      "Victorian séance, gaslit interiors, lace and tarnished brass. Loves chamber pieces with one unreliable narrator. Heavy negative space, candle-throw shadows.",
    portfolio:
      "Designed 'The Medium of Hyde Park' (Public Theater workshop, 2024), 'A Pale Inheritance' (Williamstown, 2023). Recurring motifs: mourning veils, decaying wallpaper, hand-tinted spirit photographs, oil-lamp halos. Palette: bone, oxblood, soot.",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
    rateRange: "$2,400–$4,800",
  },
  {
    id: "ren-takahashi",
    name: "Ren Takahashi",
    city: "Oakland, CA",
    voice:
      "Near-future climate fiction. Wet concrete, sodium-vapor amber, plant life reclaiming machinery. Loves choral plays with ensemble movement.",
    portfolio:
      "Conceptual design for 'After the Tide' (Berkeley Rep, 2024), 'Saltwater Mass' (immersive, Headlands, 2023). Recurring motifs: kelp on rebar, broken neon kanji, condensation on glass, drone silhouettes against bruised skies.",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
    rateRange: "$3,000–$5,500",
  },
  {
    id: "iris-delamare",
    name: "Iris Delamare",
    city: "Montréal, QC",
    voice:
      "Baroque excess, queer history, drag-inflected court drama. Saturated jewel tones, decadent textiles, mirrors used as portals.",
    portfolio:
      "Designed 'The Boy King of Versailles' (Centaur, 2024), 'Pageant of the Inverts' (Buddies in Bad Times, 2023). Recurring motifs: powdered wigs, cracked gilt frames, beauty-mark constellations, tongues of velvet curtain.",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
    rateRange: "$2,800–$5,000",
  },
  {
    id: "samir-bose",
    name: "Samir Bose",
    city: "Chicago, IL",
    voice:
      "Working-class realism, kitchen-sink, brutalist municipal interiors. Fluorescent buzz, vinyl flooring, Formica. Loves two-handers and family tragedies.",
    portfolio:
      "Design lead on 'The Last Shift at Holcomb Steel' (Steppenwolf, 2023), 'A County Fair' (Goodman, 2024). Recurring motifs: chipped enamel mugs, water-stained ceiling tiles, lottery tickets, hands holding cold coffee.",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
    rateRange: "$1,800–$3,600",
  },
  {
    id: "noor-haddad",
    name: "Noor Haddad",
    city: "Berlin / Beirut",
    voice:
      "Memory plays, displacement, archival textures. Sepia super-8 grain, family photographs, handwritten Arabic and German overlapping. Loves nonlinear time.",
    portfolio:
      "Conceptual design for 'Letters to Aleppo' (Schaubühne, 2024), 'The House on Bliss Street' (Lebanese American University, 2023). Recurring motifs: cassette tapes, pomegranate, embroidered handkerchiefs, dust in shafts of light.",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
    rateRange: "$2,200–$4,200",
  },
  {
    id: "jules-petrov",
    name: "Jules Petrov",
    city: "Austin, TX",
    voice:
      "Southern gothic, swamp witchery, country-noir. Spanish moss, rusted pickup, hymnal pages curling at the edges. Loves monologue plays with a body in the room.",
    portfolio:
      "Designed 'Cottonmouth Choir' (Alley Theatre, 2023), 'The Devil in Bee County' (Rude Mechs, 2024). Recurring motifs: cicada husks, mason jars of dark liquid, taxidermy birds, sweat on porcelain.",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
    rateRange: "$2,000–$3,800",
  },
  {
    id: "anika-vos",
    name: "Anika Vos",
    city: "Amsterdam, NL",
    voice:
      "Clinical minimalism, scientific theater, white-cube spaces with one disturbing object. Loves plays about ethics, surveillance, and the body.",
    portfolio:
      "Design lead on 'The Trolley' (Toneelgroep, 2024), 'Specimen' (Holland Festival, 2023). Recurring motifs: latex gloves, fluorescent ring lights, plexiglass partitions, single drops of blood on tile.",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
    rateRange: "$3,200–$6,000",
  },
];

export const DEMO_SCENE = `(MARGARET sits at a small round table, a single candle between her and MR. WHITLOCK. The wallpaper behind her peels in long mourning strips. From offstage, a music box winds down.)

MARGARET: You asked me here to speak with your wife. I will tell you now what I told the Pinkerton man — I do not speak with the dead. I let them speak through me, if they wish. Often they do not wish.

MR. WHITLOCK: Then why charge a fee, madam?

MARGARET: (smiling) Because grief, sir, has a market price like everything else in this century.

(The candle gutters. A second chair, empty until now, scrapes one inch toward the table on its own.)`;
