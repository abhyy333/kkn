import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFinanceSummary, formatRupiah, Transaction } from './finance';

test('formatRupiah formats positive and negative amounts correctly', () => {
  const formatted1 = formatRupiah(5000000);
  assert.ok(formatted1.includes('5.000.000'), `Expected 5.000.000 in ${formatted1}`);

  const formattedNegative = formatRupiah(-250000);
  assert.ok(formattedNegative.includes('250.000'), `Expected 250.000 in ${formattedNegative}`);
  assert.ok(formattedNegative.startsWith('-'), `Expected leading minus sign`);
});

test('calculateFinanceSummary totals income, expense and balance accurately', () => {
  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-07-01',
      type: 'income',
      category: 'Iuran Anggota',
      amount: 4000000,
      description: 'Iuran mandiri 10 anggota @ 400k',
      recordedBy: 'Bendahara',
    },
    {
      id: 'tx-2',
      date: '2026-07-03',
      type: 'income',
      category: 'Sponsorship',
      amount: 1500000,
      description: 'Sponsor Bank Daerah',
      recordedBy: 'Bendahara',
    },
    {
      id: 'tx-3',
      date: '2026-07-05',
      type: 'expense',
      category: 'Konsumsi',
      amount: 350000,
      description: 'Konsumsi Rapat Koordinasi dengan Pemdes',
      recordedBy: 'Divisi Acara',
    },
    {
      id: 'tx-4',
      date: '2026-07-07',
      type: 'expense',
      category: 'Publikasi & Cetak',
      amount: 450000,
      description: 'Cetak Banner Posko & Umbul-umbul',
      recordedBy: 'Divisi Publikasi',
    },
  ];

  const summary = calculateFinanceSummary(mockTransactions);

  assert.equal(summary.totalIncome, 5500000);
  assert.equal(summary.totalExpense, 800000);
  assert.equal(summary.balance, 4700000);
  assert.equal(summary.byCategory['Konsumsi'], 350000);
  assert.equal(summary.byCategory['Publikasi & Cetak'], 450000);
  assert.equal(summary.burnRatePercent, 15);
});
