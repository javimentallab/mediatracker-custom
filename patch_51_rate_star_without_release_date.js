// patch_51_rate_star_without_release_date.js
//
// "No puedo puntuar algunos juegos: no me sale la estrellita en la caratula,
//  en el apartado sin puntuar de inicio."
//
// Sintoma: en Inicio -> "Sin puntuar" (y en cualquier rejilla de caratulas),
// unos pocos items no muestran la estrella sobre el poster, asi que no hay
// forma de puntuarlos desde la tarjeta. Afecta sobre todo a juegos indie y a
// algun libro.
//
// Causa: la tarjeta condiciona la estrella a `Wo(item)`, que en el bundle es
//
//     Wo = e => { var t = e.releaseDate; return t && Je(t) <= new Date }
//
// es decir "tiene fecha de estreno Y ya ha pasado". Un item con releaseDate
// null devuelve el propio null (falsy), asi que la estrella no se pinta nunca.
// No es que la puntuacion falle: es que el disparador no existe.
//
// El resto del bundle no tiene este problema porque usa el idioma mas
// permisivo `Wo(x) || !No(y)` (con No = e => Boolean(e.releaseDate)), o sea
// "ya estrenado, O directamente sin fecha". Aparece 5 veces: en la vista de
// temporada, en la lista de episodios y en la ficha. La tarjeta del poster es
// la unica que se quedo con el `Wo()` a secas, y de ahi la incoherencia de
// poder puntuar un item desde su ficha pero no desde su caratula.
// Ver [[feedback_mediatoc_list_query_parity]] (ficha != tarjeta).
//
// El arreglo es alinear la tarjeta con ese idioma que ya usa el propio bundle.
//
// Lo que NO cambia, a proposito:
//   - Un item con fecha de estreno FUTURA sigue sin estrella. Eso es
//     deliberado en el upstream (no puntuas algo que aun no ha salido) y
//     `!No(t)` no lo toca: ese item si tiene releaseDate.
//   - `m` (el flag de la izquierda del &&) se respeta tal cual; solo se
//     sustituye la parte de la fecha.
//
// Comprobado contra /storage/data.db en el momento de escribir esto: de 3032
// items en "Sin puntuar", exactamente 8 tenian releaseDate null (5 juegos y
// 3 libros), que son justo los que se quedaban sin estrella.
//
// Debe ejecutarse ANTES de patch_10 (bundle_rename bumpea el hash).

;(() => {
const fs = require('fs');
const child = require('child_process');

const PUB = process.env.MT_PUBLIC || '/app/public';
const MARKER = '/*mt-fork:rate-star-no-release-date*/';

const bundlePath = child
  .execSync("ls " + PUB + "/main_*.js | grep -v '\\.LICENSE\\|\\.map'")
  .toString().trim();
let js = fs.readFileSync(bundlePath, 'utf8');

if (js.includes(MARKER)) {
  console.log('rate star without release date: already patched');
  return;
}

// Ancla: la estrella de puntuar dentro de la tarjeta del poster. Se incluye el
// createElement(Yo, ...) entero para no confundirla con ninguna otra insignia
// de la esquina inferior izquierda.
const OLD = 'm&&Wo(t)&&r.createElement("div",{className:"absolute pointer-events-auto bottom-1 left-1"},'
          + 'r.createElement(Yo,{mediaItem:t,season:n,episode:a}))';
const NEW = 'm&&(Wo(t)||!No(t))&&' + MARKER
          + 'r.createElement("div",{className:"absolute pointer-events-auto bottom-1 left-1"},'
          + 'r.createElement(Yo,{mediaItem:t,season:n,episode:a}))';

const hits = js.split(OLD).length - 1;
if (hits !== 1) {
  throw new Error('rate star without release date: expected 1 hit for the poster-card anchor, found '
    + hits + ' (did the card layout change upstream?)');
}

// `No` tiene que estar en el mismo ambito que `Wo` para poder llamarla ahi.
// Ambas son de nivel de modulo y se declaran una sola vez; si eso dejara de
// ser cierto, el bundle reventaria en runtime con "No is not defined", asi que
// se comprueba aqui, donde el fallo es barato y visible.
for (const [name, def] of [
  ['Wo', 'Wo=function(e){var t=e.releaseDate;return t&&Je(t)<=new Date}'],
  ['No', 'No=function(e){return Boolean(e.releaseDate)}'],
]) {
  const n = js.split(def).length - 1;
  if (n !== 1) {
    throw new Error('rate star without release date: expected exactly 1 definition of ' + name
      + ', found ' + n + ' (scope assumption broken, aborting instead of emitting a broken bundle)');
  }
}

js = js.split(OLD).join(NEW);
fs.writeFileSync(bundlePath, js);
console.log('rate star without release date: poster card now rates items with no releaseDate ('
  + bundlePath + ')');

})();
