PRAGMA foreign_keys = ON;

-- Distinguish a login/system identity from actual SFN membership.
ALTER TABLE people ADD COLUMN is_member INTEGER NOT NULL DEFAULT 1 CHECK(is_member IN (0,1));

-- The bootstrap Super Admin is a system administrator, not automatically an SFN member.
UPDATE people
SET is_member = 0,
    member_code = CASE WHEN member_code = 'SFN-000001' THEN 'SYS-ADMIN-0001' ELSE member_code END,
    updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT a.person_id
  FROM accounts a
  JOIN account_scopes s ON s.account_id = a.id AND s.active = 1
  JOIN roles r ON r.id = s.role_id AND r.code = 'SUPER_ADMIN'
)
AND NOT EXISTS (SELECT 1 FROM org_memberships m WHERE m.person_id = people.id);

-- Practical default permissions. Organizational position NEVER implies these permissions.
INSERT OR IGNORE INTO role_permissions(role_id, permission_id)
SELECT 'role_scope_admin', id FROM permissions
WHERE code IN (
  'member.view','member.edit','account.manage','goal.manage','task.manage',
  'activity.manage','certificate.manage','achievement.manage','card.manage'
);

INSERT OR IGNORE INTO role_permissions(role_id, permission_id)
SELECT 'role_network_admin', id FROM permissions
WHERE code IN (
  'member.view','member.edit','org.manage','account.manage','role.manage',
  'goal.manage','task.manage','activity.manage','certificate.manage',
  'achievement.manage','card.manage','audit.view'
);

INSERT OR IGNORE INTO role_permissions(role_id, permission_id)
SELECT 'role_super_admin', id FROM permissions;

INSERT OR IGNORE INTO schema_version(version) VALUES(3);
