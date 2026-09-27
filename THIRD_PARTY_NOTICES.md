# Kolmansien osapuolten komponentit ja tiedot

Npm-riippuvuudet asennetaan niiden omilla lisensseillä. Pakettiin ei ole kopioitu
node_modules-hakemistoa. Niiden lisenssit toimitetaan asennettujen pakettien mukana.

- Next.js, React, Tailwind CSS, Radix UI, shadcn/ui, Lucide, Sonner, Zod ja muut
  package.json-tiedostossa mainitut paketit säilyttävät alkuperäiset lisenssinsä.
- Vendoroidun shadcn-tyylitiedoston lisenssi on `vendor/`-hakemistossa.
- `components/ui/` sisältää shadcn/ui-pohjaisia komponentteja (MIT):
  https://github.com/shadcn-ui/ui/blob/main/LICENSE.md
- TMDB-logo, elokuvatiedot ja julisteet kuuluvat oikeudenhaltijoilleen.
  This product uses the TMDB API but is not endorsed or certified by TMDB.
- Suomen katseluvaihtoehdot: JustWatch, TMDB Watch Providers -rajapinnan kautta.
  Säilytä käyttöliittymän lähdemaininnat ja noudata oman API-käyttösi ehtoja.

Tämä paketti ei sisällä elokuvajulisteiden tai tietokantojen kopiota.
