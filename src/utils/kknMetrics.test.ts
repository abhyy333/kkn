import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProgramMetrics, calculateTaskMetrics, WorkProgramItem, TaskSummaryItem } from './kknMetrics';

test('calculateProgramMetrics calculates averages and status counts', () => {
  const mockPrograms: WorkProgramItem[] = [
    { id: '1', title: 'UMKM', status: 'completed', progressPercent: 100, budgetPlanned: 1000000, budgetUsed: 950000 },
    { id: '2', title: 'Stunting', status: 'in_progress', progressPercent: 60, budgetPlanned: 1500000, budgetUsed: 800000 },
    { id: '3', title: 'Literasi', status: 'planning', progressPercent: 20, budgetPlanned: 500000, budgetUsed: 50000 },
  ];

  const metrics = calculateProgramMetrics(mockPrograms);

  assert.equal(metrics.total, 3);
  assert.equal(metrics.completed, 1);
  assert.equal(metrics.inProgress, 1);
  assert.equal(metrics.planning, 1);
  assert.equal(metrics.averageProgress, 60); // (100+60+20)/3 = 60
  assert.equal(metrics.totalBudgetPlanned, 3000000);
  assert.equal(metrics.totalBudgetUsed, 1800000);
});

test('calculateTaskMetrics handles completion rate and urgent flags', () => {
  const mockTasks: TaskSummaryItem[] = [
    { id: 't1', status: 'done', priority: 'medium', dueDate: '2026-07-10' },
    { id: 't2', status: 'done', priority: 'high', dueDate: '2026-07-12' },
    { id: 't3', status: 'in_progress', priority: 'urgent', dueDate: '2026-07-01' },
    { id: 't4', status: 'todo', priority: 'low', dueDate: '2026-07-25' },
  ];

  const metrics = calculateTaskMetrics(mockTasks, '2026-07-15');

  assert.equal(metrics.total, 4);
  assert.equal(metrics.done, 2);
  assert.equal(metrics.inProgress, 1);
  assert.equal(metrics.todo, 1);
  assert.equal(metrics.urgent, 1);
  assert.equal(metrics.overdue, 1); // t3 is not done and due July 1st (< July 15th)
  assert.equal(metrics.completionRate, 50);
});
