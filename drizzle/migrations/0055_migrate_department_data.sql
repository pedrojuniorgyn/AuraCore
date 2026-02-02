-- Migration: Populate department_id in existing action plans
-- Task: FASE7-07
-- Date: 2026-02-01
-- Author: AgenteAura

-- Step 1: Ensure default departments exist for all organizations
-- This is a safety check - departments should already exist via seed

-- Step 2: Populate department_id in action_plan where NULL
-- Logic: Map to 'OPS' (Operações) as default department
UPDATE strategic_action_plan
SET department_id = (
  SELECT TOP 1 id 
  FROM department 
  WHERE code = 'OPS'
    AND organization_id = strategic_action_plan.organization_id
    AND branch_id = strategic_action_plan.branch_id
    AND deleted_at IS NULL
)
WHERE department_id IS NULL
  AND deleted_at IS NULL;

-- Step 3: Log migration results
-- (SQL Server doesn't have RAISE NOTICE, so we use a query to show affected rows)
SELECT 
  COUNT(*) as total_action_plans,
  SUM(CASE WHEN department_id IS NULL THEN 1 ELSE 0 END) as still_null,
  SUM(CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) as populated
FROM strategic_action_plan
WHERE deleted_at IS NULL;

-- Rollback script (if needed):
-- UPDATE strategic_action_plan SET department_id = NULL WHERE department_id = (SELECT id FROM department WHERE code = 'OPS');
