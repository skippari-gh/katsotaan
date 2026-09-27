# Katsotaan

Kahden ihmisen yhteinen, yksityinen elokuvien ja sarjojen katselulista.
Tämä lähdekoodipaketti käynnistää **oman täysin erillisen palvelun tyhjällä tietokannalla**.
Se ei sisällä minkään aiemman asennuksen tietoja, tunnuksia, osoitetta tai yhteyttä siihen.

## Aloita tästä

Tarvitset [Node.js 24 LTS:n](https://nodejs.org/en/download), verkkoyhteyden ja oman
[TMDB API Read Access Tokenin](https://www.themoviedb.org/settings/api) elokuvahakua varten.
Asennus ei tarvitse Sites-, Cloudflare-, Supabase- tai muita alustatunnuksia.

1. Pura ZIP ja avaa pääte purettuun `katsotaan-source`-kansioon.
2. Suorita:

   ```sh
   npm ci
   npm run setup
   npm run build
   npm start
   ```

3. Avaa [http://localhost:3000](http://localhost:3000).
4. Kirjaudu itse valitsemallasi yhteisellä salasanalla ja valitse tämän laitteen katsoja.

`npm run setup` kysyy palvelun osoitteen, kaksi näyttönimeä, yhteisen salasanan ja
oman TMDB-tokenin. Salasana ja token eivät näy kirjoitettaessa. Tokenin voi ohittaa
ja lisätä myöhemmin. Ohjelma luo `.env`-tiedoston, satunnaisen istuntoavaimen ja
suolatun salasanatiivisteen. Valmista oletussalasanaa ei ole.
Ilman asetuksia palvelu pysyy lukittuna.

Salaisuuksien paikat ja selitykset ovat `.env.example`-tiedostossa. **Älä jaa `.env`-tiedostoa.**
Älä käytä `NEXT_PUBLIC_`-alkuista muuttujaa millekään salaisuudelle: ne ovat selaimelle
näkyviä asetuksia. Katsojien nimet ovat tarkoituksella julkisia näyttönimiä palvelun käyttöliittymässä.

## Sama lista molempien puhelimiin

Molempien täytyy käyttää **samaa käynnissä olevaa omaa asennusta ja samaa osoitetta**.
Kaksi erillistä asennusta tarkoittaa kahta erillistä listaa. `localhost` toimii vain
siinä tietokoneessa, jossa palvelu on käynnissä.

Etäkäyttöä varten asenna sovellus omalle Node.js 24 -palvelimelle, jossa on pysyvä
levy, ja liitä siihen HTTPS-osoite. Aseta `.env`-tiedoston `APP_URL` täsmälleen
selaimessa käytettävään osoitteeseen, esimerkiksi `https://katsotaan.example.com`.
Käytä palvelimen tai hostingin HTTPS-välitystä porttiin 3000 ja pidä Node-prosessi
käynnissä prosessinhallinnalla. Älä julkaise projektihakemistoa staattisena tiedostopalvelimena.
Tietokanta tarvitsee pysyvän levyn: tämä versio ei sovellu sellaisenaan staattiseen
hostingiin tai palveluun, joka tyhjentää paikallisen levyn jokaisella käynnistyksellä.

Anna toiselle katsojalle uuden palvelun osoite ja yhteinen salasana erikseen.
Kirjautuminen muistetaan laitteella enintään 30 päivää. Asetuksista voi kirjautua ulos.
Katsojan valinta erottaa nimet ja arviot; se ei ole erillinen käyttöoikeus.
Kumpikin salasanan tietävä saa muokata koko yhteistä listaa.

## Mukana olevat ominaisuudet

- TMDB-elokuva- ja sarjahaku, suomenkieliset tiedot ja Suomen katseluvaihtoehdot.
- Yhteiset Katsottavat / Katson nyt / Katsotut ja synkronointi palvelimen kautta.
- Kaksi nimettävää katsojaa sekä molempien yhteinen valinta, kortit ja suodatus.
- Molempien omat 1–5 tähden arviot, yhteinen muistiinpano ja suositukset arvioista.
- Suoratoistopalvelut, vuokraus ja ostaminen lähteen saatavuustietojen mukaan.
- Genrejen monivalinta TAI-logiikalla, kestorajaus elokuville ja omasta listasta haku.
- Katselupäivä ja katsottujen elokuvien kalenteri.
- Tumma mobiilikäyttöliittymä ja kotinäytölle lisääminen HTTPS-osoitteesta.

TMDB-token lähetetään vain palvelimelta TMDB:lle. Julisteet ladataan selaimeen
TMDB:n kuvapalvelusta. Saatavuus tulee TMDB:n Watch Providers / JustWatch -tiedoista,
ei verkkosivujen keräämisestä. Saatavuuden kattavuus riippuu lähteen FI-tiedoista.
Ilman omaa tokenia käyttöliittymän ja kirjautumisen voi avata, mutta haku ei toimi.

## Tiedot ja varmuuskopiointi

SQLite luodaan automaattisesti hakemistoon `data/` (muutettavissa: `DATA_DIR`).
ZIPissä ei ole tietokantaa eikä esimerkkikatselulistaa. Tiedot säilyvät palvelimen
uudelleenkäynnistyksissä, kun hakemisto säilytetään. Älä sijoita sitä `public/`-kansioon.
Selaimen paikallinen tallennus sisältää vain tämän laitteen katsojavalinnan;
kirjautuminen säilytetään HttpOnly-evästeessä.

Varmuuskopioi pysäytetystä asennuksesta koko `data/`-hakemisto ja `.env` turvalliseen,
yksityiseen paikkaan. SQLite voi käyttää myös `-wal`- ja `-shm`-tiedostoja, joten älä
kopioi vain yhtä tiedostoa käynnissä olevasta sovelluksesta. Käynnistä sitten palvelu uudelleen.
Varmuuskopio sisältää oman asennuksesi yksityiset tiedot; sitä ei jaeta lähdekoodina.

## Asetusten muuttaminen

- TMDB-token tai APP_URL: muokkaa `.env` ja käynnistä palvelu uudelleen.
- Näyttönimet: muokkaa `.env`, suorita `npm run build` ja käynnistä uudelleen.
  Profiilien pysyvät tunnisteet ovat `person1` ja `person2`; nimen vaihto ei poista arvioita.
- Salasanan uusiminen: siirrä vanha `.env` yksityiseen paikkaan, suorita `npm run setup`
  ja anna uudelleen osoite, näyttönimet ja oma TMDB-token. Säilytä sama `DATA_DIR`.
  Käynnistä uudelleen; listat säilyvät ja vanhat kirjautumiset mitätöityvät.
- Liian monta kirjautumisyritystä: odota minuutti. Rajoitus on yhteinen asennukselle.
- Kirjautumisen 403-virhe: tarkista, että APP_URL vastaa osoiterivin protokollaa,
  verkkotunnusta ja porttia. Etäkäytössä tarvitaan HTTPS.

## Docker (vaihtoehtoinen)

Kun `.env` on luotu, Docker Compose voi ajaa sovelluksen pysyvällä tietolevyllä:

```sh
docker compose up -d --build
```

Oletusportti on sidottu vain palvelimen localhostiin. Etäkäyttöön liitä siihen
HTTPS-välityspalvelin ja oikea APP_URL. Älä suorita `docker compose down -v`, jos
haluat säilyttää tietolevyn. Dockerin tietokanta on nimetyssä volumessa, ei paikallisessa
`data/`-kansiossa. Salaisuuksia ei kopioida Docker-kuvaan; `.env` luetaan käynnistettäessä.
Näyttönimet annetaan julkisina build-asetuksina. Docker-vaihtoehtoa ei ole ajettu
tämän paketin tarkistuksessa; Node-asennus on testattu.

## Kehitys ja tarkistukset

```sh
npm run dev
npm run check
npm test
npm run build
npm run test:integration
```

Integraatiotesti käynnistää oman paikallisen testipalvelimen, generoi väliaikaiset
salaisuudet ja käyttää erillistä tyhjää testitietokantaa. TMDB-vastaukset ovat
synteettisiä testitietoja. Testi ei tarvitse oikeita tunnuksia eikä lue omaa `.env`-tiedostoasi.
Node 24:n SQLite-moduuli voi tulostaa kokeellisuudesta kertovan ilmoituksen.

## Lähdekoodin jakaminen

Tämän alkuperäisen ZIPin voi välittää sellaisenaan. Kun olet asentanut oman kopion,
älä pakkaa koko asennuskansiota jakoon: siihen syntyy omia asetuksia ja tietokanta.
Jaa silloin vain lähdekooditiedostot ja `.env.example`. `.gitignore` ja `.dockerignore`
rajaavat tavalliset salaisuus- ja tietohakemistot pois, mutta itse tekemäsi ZIP ei
automaattisesti noudata niitä.

Tekniikka: Next.js App Router, React, TypeScript, Tailwind, Radix UI, Node.js SQLite.
Kolmansien osapuolten oikeudet ja datalähteet: `THIRD_PARTY_NOTICES.md`.

Sovelluksen oma lähdekoodi jaetaan MIT-lisenssillä (`LICENSE`). Kolmansien osapuolten
lisenssit ja datalähteiden ehdot säilyvät ennallaan.
