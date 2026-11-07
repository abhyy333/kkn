import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatInternationalPhone,
  getWhatsAppDigits,
  getWhatsAppUrl,
  maskPhoneNumber,
} from './phone';

test('formatInternationalPhone formats Indonesian numbers to +62 format', () => {
  assert.equal(formatInternationalPhone('0882-9692-4050'), '+62 882-9692-4050');
  assert.equal(formatInternationalPhone('089526172337'), '+62 895-2617-2337');
  assert.equal(formatInternationalPhone('+6287753911334'), '+62 877-5391-1334');
  assert.equal(formatInternationalPhone('6285902540287'), '+62 859-0254-0287');
});

test('getWhatsAppDigits returns digits starting with 62 without symbols', () => {
  assert.equal(getWhatsAppDigits('0882-9692-4050'), '6288296924050');
  assert.equal(getWhatsAppDigits('+62 895-2617-2337'), '6289526172337');
  assert.equal(getWhatsAppDigits('0852-3831-0942'), '6285238310942');
});

test('getWhatsAppUrl generates correct wa.me link with optional prefilled message', () => {
  assert.equal(getWhatsAppUrl('0882-9692-4050'), 'https://wa.me/6288296924050');
  assert.equal(
    getWhatsAppUrl('+62 877-5391-1334', 'Halo Tsaniatul (Bendahara KKN)'),
    'https://wa.me/6287753911334?text=Halo%20Tsaniatul%20(Bendahara%20KKN)'
  );
});

test('maskPhoneNumber masks sensitive digits for unauthenticated visitors', () => {
  assert.equal(maskPhoneNumber('0882-9692-4050'), '+62 882-••••-••••');
  assert.equal(maskPhoneNumber('+62 895-2617-2337'), '+62 895-••••-••••');
});
