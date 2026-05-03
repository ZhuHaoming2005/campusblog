import * as migration_20260324_145932 from './20260324_145932';
import * as migration_20260423_101813_verification_fields from './20260423_101813_verification_fields';
import * as migration_20260424_075645_media_owner from './20260424_075645_media_owner';
import * as migration_20260503_134555 from './20260503_134555';

export const migrations = [
  {
    up: migration_20260324_145932.up,
    down: migration_20260324_145932.down,
    name: '20260324_145932',
  },
  {
    up: migration_20260423_101813_verification_fields.up,
    down: migration_20260423_101813_verification_fields.down,
    name: '20260423_101813_verification_fields',
  },
  {
    up: migration_20260424_075645_media_owner.up,
    down: migration_20260424_075645_media_owner.down,
    name: '20260424_075645_media_owner',
  },
  {
    up: migration_20260503_134555.up,
    down: migration_20260503_134555.down,
    name: '20260503_134555'
  },
];
