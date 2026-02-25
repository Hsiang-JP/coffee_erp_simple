import { execute } from '../dbSetup';

/**
 * Fetches all producers.
 */
export async function getProducers() {
  return await execute('SELECT * FROM producers ORDER BY name ASC');
}

/**
 * Creates a new producer.
 * @param {Object} producerData 
 */
export async function createProducer(producerData) {
  const { name, relationship } = producerData;
  return await execute(
    'INSERT INTO producers (id, name, relationship) VALUES (?, ?, ?)', 
    [`prod-${Date.now()}`, name, relationship]
  );
}
