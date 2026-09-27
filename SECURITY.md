# Security

## Periaate

Jokainen Katsotaan-asennus on erillinen. Julkinen lähdekoodi ei saa sisältää tuotantodataa tai tuotantoympäristön tunnuksia.

## Älä lisää repositoryyn

- oikeita API-tokeneita
- tietokannan salasanoja tai yhteysosoitteita
- auth-/session-salaisuuksia
- käyttäjien katselulistoja
- evästeitä tai sessiotunnisteita
- palveluntarjoajien deploy-tokeneita

Salaisuudet annetaan aina ympäristömuuttujina.

## Jos salaisuus päätyy vahingossa repoon

Pelkkä tiedoston poistaminen ei riitä. Mitätöi/kierrätä avain välittömästi palvelussa, josta se on luotu.
