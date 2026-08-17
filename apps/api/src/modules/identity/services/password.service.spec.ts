import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwordService = new PasswordService();

  it('hashes a password successfully', async () => {
    const hash = await passwordService.hash('SecurePass123!');

    expect(hash).toEqual(expect.any(String));
    expect(hash).not.toBe('SecurePass123!');
  });

  it('verifies a correct password', async () => {
    const hash = await passwordService.hash('SecurePass123!');

    await expect(
      passwordService.verify(hash, 'SecurePass123!'),
    ).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await passwordService.hash('SecurePass123!');

    await expect(
      passwordService.verify(hash, 'WrongPassword!'),
    ).resolves.toBe(false);
  });
});
