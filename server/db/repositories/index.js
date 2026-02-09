export { BaseRepository } from './BaseRepository.js';
export { ProductRepository } from './ProductRepository.js';
export { OrderRepository } from './OrderRepository.js';
export { CustomerRepository } from './CustomerRepository.js';
export { PageRepository } from './PageRepository.js';

// Convenience exports for common usage
export const repositories = {
  product: new (await import('./ProductRepository.js')).ProductRepository(),
  order: new (await import('./OrderRepository.js')).OrderRepository(),
  customer: new (await import('./CustomerRepository.js')).CustomerRepository(),
  page: new (await import('./PageRepository.js')).PageRepository(),
};
