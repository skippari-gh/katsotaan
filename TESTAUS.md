# Paketin tarkistus 27.9.2026

Tarkistettu tämän jaettavan version omassa ympäristössä, ilman aiemman palvelun
tietokantaa tai salaisuuksia:

- Riippuvuuksien puhdas asennus `npm ci` onnistui lukitustiedostosta.
- TypeScript-tarkistus ja Next.js-tuotantokoonti läpäistiin.
- Ohjattu käyttöönotto testattiin päätteessä: salasana ja token pysyivät piilossa,
  salasanasta tallennettiin vain suolattu tiiviste ja olemassa olevan asetustiedoston
  korvaaminen estettiin.
- Kalenterin, aikarajauksen ja genrejen nykyiset tarkistukset läpäistiin.
- Tietokannan erillisyys, pysyvyys, transaktioiden peruminen ja viiteavaimet tarkistettiin.
- Salasanan tarkistus sekä muokattujen, vanhentuneiden ja eri asennuksen istuntojen
  torjunta tarkistettiin.
- 45 integraatiotarkistusta läpäistiin: tyhjä alkutila, kirjautuminen, käyttöoikeudet,
  elokuva- ja sarjahaku, lisäys, yhteiset tilat, kaksi arviota, valitsija, muistiinpanon
  ristiriita, FI-saatavuus, genre ja kesto, suositus ja sen poistaminen, katselupäivä,
  toinen laite, uudelleenkäynnistys, poistaminen ja kirjautumisyritysten rajoitus.
- Integraatiotesti käyttää samaa käynnistysskriptiä kuin `npm start` sekä synteettisiä
  TMDB-vastauksia. Oikeaa API-tokenia tai ulkoista TMDB-yhteyttä ei käytetty.
- Lähdekoodista tarkistettiin aiempien käyttäjien tunnisteet, palvelukohtaiset
  tunnisteet ja salaisuuksien tavalliset muodot. Lopullinen ZIP tarkistettiin erikseen.
- Alkuperäisen palvelun lähdekoodia, julkaisuasetuksia tai tietokantaa ei muutettu.

Docker-ajoa ja puhelimeen asentamista ei testattu tämän lähdekoodiviennin yhteydessä.
