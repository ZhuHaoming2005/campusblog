import * as migration_20260324_145932 from './20260324_145932';
import * as migration_20260423_101813_verification_fields from './20260423_101813_verification_fields';

export const migrations = [
  {
    up: migration_20260324_145932.up,
    down: migration_20260324_145932.down,
    name: '20260324_145932',
  },
  {
    up: migration_20260423_101813_verification_fields.up,
    down: migration_20260423_101813_verification_fields.down,
    name: '20260423_101813_verification_fields'
  },
];
