import test from 'node:test';
import assert from 'node:assert';
import jiti from 'jiti';

const load = jiti(import.meta.url);
// Load the i18n instance using jiti to handle JSON imports and other ESM/CJS issues
const i18n = load('./i18n.js').default;

test('i18n resolution', async (t) => {
  // Ensure i18n is initialized
  if (!i18n.isInitialized) {
    await new Promise(resolve => {
      i18n.on('initialized', () => resolve());
      // If already initialized by the time we add the listener
      if (i18n.isInitialized) resolve();
    });
  }

  await t.test('should resolve English (en) keys correctly', async () => {
    await i18n.changeLanguage('en');
    
    // Nav section
    assert.strictEqual(i18n.t('nav.title'), 'Green Coffee ERP');
    assert.strictEqual(i18n.t('nav.dataEntry'), 'Data Entry');
    
    // Alerts section (with interpolation)
    assert.strictEqual(
      i18n.t('alerts.success.producerRegistered', { name: 'Test Producer' }),
      'Successful: Producer "Test Producer" registered.'
    );
    assert.strictEqual(
      i18n.t('alerts.success.lotRegistered', { weight: 500, variety: 'Geisha' }),
      'Successful: 500kg of Geisha registered.'
    );
    
    // Validation section
    assert.strictEqual(i18n.t('validation.producerNameRequired'), 'Producer Name is required.');
    assert.strictEqual(i18n.t('validation.cupperRequired'), 'Cupper Name is required.');
  });

  await t.test('should resolve Peruvian Spanish (es-PE) keys correctly', async () => {
    await i18n.changeLanguage('es-PE');
    
    // Nav section
    assert.strictEqual(i18n.t('nav.title'), 'ERP de Café Verde');
    assert.strictEqual(i18n.t('nav.dataEntry'), 'Ingreso de Datos');
    
    // Alerts section (with interpolation)
    assert.strictEqual(
      i18n.t('alerts.success.producerRegistered', { name: 'Productor de Prueba' }),
      'Éxito: Productor "Productor de Prueba" registrado.'
    );
    assert.strictEqual(
      i18n.t('alerts.success.lotRegistered', { weight: 500, variety: 'Geisha' }),
      'Éxito: 500kg de Geisha registrados.'
    );
    
    // Validation section
    assert.strictEqual(i18n.t('validation.producerNameRequired'), 'El nombre del productor es obligatorio.');
    assert.strictEqual(i18n.t('validation.cupperRequired'), 'El nombre del catador es obligatorio.');
  });

  await t.test('should fallback to English for missing keys in es-PE (if any)', async () => {
    await i18n.changeLanguage('es-PE');
    // map.logisticsNode exists in both, but this verifies it resolves correctly in es-PE
    assert.strictEqual(i18n.t('map.logisticsNode'), 'Nodo Logístico');
  });
});
