/* ============================================================
   Marcas de ingredientes comunes en Chile
   Valores APROXIMADOS por 100 g (o 100 ml), según etiquetas típicas.
   Pueden cambiar con la receta del fabricante: si quieres el valor
   exacto, escanea el envase (queda en "Mis alimentos" y aparece
   como marca la próxima vez).
   grupo: [nombre, palabras clave, alimentos base de foods.js, marcas]
   marca: [nombre, kcal, proteína, carbohidratos, grasa]
   ============================================================ */
const MARCAS = [
  ['Vienesa', ['vienesa', 'salchicha'], ['Vienesa'], [
    ['San Jorge', 247, 11, 4, 21], ['PF', 236, 11, 5, 19], ['Llanquihue', 262, 11, 3, 23], ['Winter', 228, 12, 4, 18],
    ['Super Cerdo', 245, 12, 3, 21], ['La Crianza (pollo)', 205, 12, 5, 15], ['Sopraval (pavo)', 190, 13, 4, 14], ['Receta del Abuelo', 280, 12, 2, 25],
  ]],
  ['Mayonesa', ['mayonesa', 'mayo'], ['Mayonesa', 'Mayonesa light'], [
    ["Hellmann's", 690, 1, 1.5, 76], ["Hellmann's light", 300, 0.6, 8, 29], ['JB', 650, 1, 3, 70], ['JB light', 300, 0.5, 9, 28],
    ['Kraft', 680, 1, 2, 75], ['Traverso', 640, 1, 3, 70], ['Marca propia supermercado', 640, 1, 3, 70],
  ]],
  ['Ketchup', ['ketchup'], ['Ketchup'], [
    ['Heinz', 112, 1.2, 26, 0.1], ["Hellmann's", 110, 1, 25, 0.3], ['JB', 105, 1, 24, 0.2], ['Traverso', 110, 1, 25, 0.2], ['Kraft', 110, 1, 26, 0.1],
  ]],
  ['Mostaza', ['mostaza'], ['Mostaza'], [
    ['JB', 90, 4, 7, 4.5], ["Hellmann's", 95, 4, 8, 4.5], ['Traverso', 85, 4, 6, 4.5], ['Heinz', 70, 4, 5, 4],
  ]],
  ['Pan de completo', ['completo', 'hot dog'], ['Pan de completo (hot dog)'], [
    ['Ideal', 275, 8.5, 50, 4], ['Castaño', 270, 8, 52, 3], ['Fuchs', 270, 8, 51, 3.5], ['Panadería del supermercado', 275, 8.5, 52, 3],
  ]],
  ['Pan de molde', ['molde'], ['Pan blanco de molde', 'Pan integral de molde'], [
    ['Ideal blanco', 255, 8, 48, 3], ['Ideal integral', 240, 10, 41, 3.5], ['Castaño blanco', 260, 8, 49, 3], ['Fuchs integral', 245, 10, 42, 3.5], ['Multicereal / semillas', 250, 11, 40, 5],
  ]],
  ['Jamón', ['jamon'], ['Jamón de pavo', 'Jamón de cerdo'], [
    ['San Jorge (pierna)', 110, 17, 2, 4], ['PF (pierna)', 105, 17, 2, 3.5], ['Llanquihue', 120, 17, 2, 5], ['Sopraval (pavo)', 100, 18, 2, 2.5], ['Receta del Abuelo', 115, 18, 1.5, 4],
  ]],
  ['Queso laminado', ['gauda', 'mantecoso', 'queso laminado'], ['Queso mantecoso / gauda'], [
    ['Colun gauda', 350, 25, 0.5, 28], ['Soprole gauda', 345, 25, 0.5, 27], ['Quillayes', 355, 24, 0.5, 29], ['Santa Rosa', 350, 24, 1, 28], ['Colun light', 265, 30, 1, 15],
  ]],
  ['Quesillo', ['quesillo'], ['Quesillo'], [
    ['Colun', 115, 13, 3, 5.5], ['Soprole', 110, 12, 3, 5.5], ['Quillayes', 115, 12, 3, 6],
  ]],
  ['Leche', ['leche'], ['Leche entera', 'Leche semidescremada', 'Leche descremada'], [
    ['Colun entera', 62, 3.1, 4.8, 3.3], ['Colun semidescremada', 47, 3.1, 4.8, 1.5], ['Colun descremada', 34, 3.2, 4.9, 0.1],
    ['Soprole entera', 61, 3.1, 4.7, 3.2], ['Soprole descremada', 35, 3.2, 5, 0.1], ['Loncoleche entera', 62, 3.1, 4.8, 3.3], ['Surlat entera', 60, 3, 4.7, 3.2],
  ]],
  ['Atún', ['atun'], ['Atún al agua', 'Atún en aceite'], [
    ["Van Camp's en agua", 105, 24, 0, 1], ["Van Camp's en aceite", 190, 25, 0, 10], ['San José en agua', 105, 24, 0, 1], ['Robinson Crusoe en agua', 105, 24, 0, 1],
  ]],
  ['Salsa de tomate', ['pomarola', 'salsa de tomate'], ['Salsa de tomate / pomarola'], [
    ['Pomarola Carozzi', 40, 1.5, 7, 0.5], ['Malloa', 35, 1.4, 6.5, 0.3], ['Lucchetti', 38, 1.5, 7, 0.4],
  ]],
  ['Hamburguesa', ['hamburguesa'], ['Hamburguesa de vacuno', 'Hamburguesa de pollo'], [
    ['PF vacuno', 250, 15, 3, 20], ['San Jorge vacuno', 245, 15, 3, 19], ['Winter vacuno', 240, 15, 3, 19], ['Sadia pollo', 210, 13, 6, 15], ['Super Pollo', 200, 14, 5, 14],
  ]],
  ['Longaniza', ['longaniza'], ['Longaniza'], [
    ['Llanquihue', 310, 14, 2, 28], ['San Jorge', 300, 14, 2, 27], ['Winter', 300, 14, 2, 27],
  ]],
  ['Mantequilla / margarina', ['mantequilla', 'margarina'], ['Mantequilla / margarina'], [
    ['Colun mantequilla', 730, 0.6, 0.7, 81], ['Soprole mantequilla', 730, 0.6, 0.7, 81], ['Margarina común', 540, 0, 0.5, 60], ['Margarina light', 350, 0, 1, 38],
  ]],
  ['Manjar', ['manjar'], ['Manjar'], [
    ['Colun', 320, 7, 55, 7.5], ['Nestlé', 320, 7, 55, 7.5], ['Soprole', 320, 6.5, 56, 7.5],
  ]],
];

// grupo de marcas de un alimento (por su nombre base o por palabras clave)
function grupoMarcas(food) {
  if (!food) return null;
  const n = String(food.n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return MARCAS.find((g) => g[2].includes(food.n)) || (food.cat !== 'Mis alimentos' && food.cat !== 'Mis preparaciones' ? MARCAS.find((g) => g[1].some((k) => n.startsWith(k))) : null) || null;
}
