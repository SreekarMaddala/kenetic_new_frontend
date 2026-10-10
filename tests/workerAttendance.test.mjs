import test from 'node:test';
import assert from 'node:assert/strict';
import { copiedTeam, previousDay, saveWorkerBatch } from '../src/lib/workerAttendance.ts';

test('yesterday handles month and year boundaries', () => {
  assert.equal(previousDay('2026-01-01'), '2025-12-31');
  assert.equal(previousDay('2024-03-01'), '2024-02-29');
});

test('copy selects only yesterday confirmed team and skips today allocations', () => {
  const previous = [
    { workerId: 'one', allocationDate: '2026-10-03', allocatedProjectId: 'site' },
    { workerId: 'two', allocationDate: '2026-10-03', allocatedProjectId: 'site' },
    { workerId: 'three', allocationDate: '2026-10-01', allocatedProjectId: 'site' },
    { workerId: 'four', allocationDate: '2026-10-03', allocatedProjectId: 'other' },
    { workerId: 'five', allocationDate: '2026-10-03', allocatedProjectId: 'site' },
  ];
  const current = [
    { workerId: 'one', allocationDate: '2026-10-03' },
    { workerId: 'two', allocationDate: '2026-10-04' },
    { workerId: 'three', allocationDate: '2026-10-01' },
    { workerId: 'four', allocationDate: '2026-10-03' },
  ];
  assert.deepEqual(copiedTeam(previous, current, 'site', '2026-10-04'), ['one']);
});

test('batch reports individual failures, preserves other successes and limits concurrency', async () => {
  let active = 0;
  let peak = 0;
  const result = await saveWorkerBatch([1,2,3,4,5,6,7], async item => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--;
    if (item === 3) throw new Error('Allocation changed');
  });
  assert.deepEqual(result.succeeded, [1,2,4,5,6,7]);
  assert.deepEqual(result.failed, [{ item: 3, message: 'Allocation changed' }]);
  assert.ok(peak <= 4);
});
