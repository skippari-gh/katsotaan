# Katsotaan

Yksinkertainen elokuva- ja sarjalista kahdelle tai useammalle käyttäjälle.

Tämä repository on tarkoitettu omaksi asennuspohjaksi. Se **ei sisällä alkuperäisen Katsotaan-palvelun käyttäjätietoja, katselulistoja, API-avaimia, salasanoja tai muita salaisuuksia**.

## Nopea käyttöönotto

1. Tee tästä reposta oma kopio (Fork).
2. Kopioi `.env.example` tiedostoksi `.env.local`.
3. Luo oma TMDB API Read Access Token ja lisää se omaan ympäristömuuttujaasi.
4. Luo oma tietokanta / backend ja käytä vain oman asennuksesi tunnuksia.
5. Käynnistä sovellus projektin varsinaisten asennusohjeiden mukaisesti.

## Turvallisuus

Älä koskaan commitoi `.env`- tai `.env.local`-tiedostoja. Jokainen asennus käyttää omaa tietokantaa ja omia tunnuksiaan. Jaettu lähdekoodi ei anna pääsyä alkuperäiseen Katsotaan-palveluun.

## Jaettavan version tavoite

Jaettavassa versiossa käyttöliittymä ja ominaisuudet voidaan pitää samoina kuin Katsotaan-palvelussa, mutta kaikki ympäristökohtaiset tiedot annetaan ympäristömuuttujina. Näin koodin käyttäjä voi tehdä oman erillisen instanssinsa ilman pääsyä muiden käyttäjien dataan.
