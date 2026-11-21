import { randomBytes, scrypt as cryptoScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(cryptoScrypt);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [algorithm, salt, hash] = String(encoded || '').split('$');
  if (
    algorithm !== 'scrypt' ||
    !/^[a-f0-9]{32}$/.test(salt || '') ||
    !/^[a-f0-9]{128}$/.test(hash || '')
  )
    return false;
  const key = await scrypt(password, salt, 64);
  return timingSafeEqual(key, Buffer.from(hash, 'hex'));
}
