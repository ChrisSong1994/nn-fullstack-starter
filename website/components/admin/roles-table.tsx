'use client';

/**
 * 后台角色与权限表格。
 *
 * 权限点选项直接取 `@nnfs/shared` 的权限目录（同构层），所以不需要额外请求
 * `/api/admin/permissions` —— 那份目录就是 seed 写进数据库的来源，两边不会漂移。
 */
import {
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  ROLES,
  createRoleSchema,
  groupPermissionCatalog,
  updateRoleSchema,
  type PermissionCode,
  type RoleListItem,
} from '@nnfs/shared';

import { apiFetch } from '@/lib/api-client';
import { useApiErrorMessage } from '@/lib/use-api-error';

const PERMISSION_GROUPS = groupPermissionCatalog();

interface RolesTableProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/** 弹窗的表单值。编辑时 name 只读展示，所以这里始终带着它。 */
interface RoleFormValues {
  name: string;
  displayName: string;
  description?: string;
  permissions: PermissionCode[];
}

export function RolesTable({ canCreate, canUpdate, canDelete }: RolesTableProps) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const describeError = useApiErrorMessage();
  const { message } = App.useApp();

  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RoleListItem | 'create' | null>(null);
  const [saving, setSaving] = useState(false);
  /** 增删改之后 +1，用来触发下面那个 effect 重新拉数据。 */
  const [version, setVersion] = useState(0);

  /**
   * 拉角色列表。
   *
   * 写成 effect 内部的 async IIFE（而不是 useCallback 包一层在 effect 里同步调用）：
   * react-hooks/set-state-in-effect 只认「await 之后再 setState」这种形态。
   */
  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const list = await apiFetch<RoleListItem[]>('/api/admin/roles');
        if (active) setRoles(list);
      } catch (error) {
        if (active) message.error(describeError(error));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [describeError, message, version]);

  /** 增删改成功后重新拉列表。事件回调里同步置 loading 是允许的。 */
  const reload = () => {
    setLoading(true);
    setVersion((prev) => prev + 1);
  };

  const handleDelete = async (role: RoleListItem) => {
    try {
      await apiFetch<void>(`/api/admin/roles/${role.name}`, { method: 'DELETE' });
      message.success(t('deleteRoleSuccess'));
      reload();
    } catch (error) {
      message.error(describeError(error));
    }
  };

  const handleSubmit = async (values: RoleFormValues) => {
    const isCreate = editing === 'create';
    // 用共享 schema 再校验一遍：前端规则和后端规则的措辞完全一致。
    const parsed = isCreate
      ? createRoleSchema.safeParse(values)
      : updateRoleSchema.safeParse({
          displayName: values.displayName,
          description: values.description,
          permissions: values.permissions,
        });
    if (!parsed.success) {
      message.error(parsed.error.issues[0]?.message ?? tCommon('submit'));
      return;
    }

    setSaving(true);
    try {
      if (isCreate) {
        await apiFetch<RoleListItem>('/api/admin/roles', {
          method: 'POST',
          body: JSON.stringify(parsed.data),
        });
      } else if (editing) {
        await apiFetch<RoleListItem>(`/api/admin/roles/${editing.name}`, {
          method: 'PATCH',
          body: JSON.stringify(parsed.data),
        });
      }
      setEditing(null);
      reload();
    } catch (error) {
      message.error(describeError(error));
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumnsType<RoleListItem> = [
    {
      title: t('columnDisplayName'),
      dataIndex: 'displayName',
      key: 'displayName',
      render: (value: string, role) => (
        <Space size="small">
          <Typography.Text strong>{value}</Typography.Text>
          <Tag color={role.isSystem ? 'gold' : 'default'}>
            {role.isSystem ? t('systemRole') : t('customRole')}
          </Tag>
        </Space>
      ),
    },
    {
      title: t('columnRoleName'),
      dataIndex: 'name',
      key: 'name',
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: t('columnPermissions'),
      dataIndex: 'permissions',
      key: 'permissions',
      render: (value: PermissionCode[], role) => {
        if (role.name === ROLES.SUPER_ADMIN) return <Tag color="purple">{t('columnPermissions')} · ALL</Tag>;
        if (value.length === 0) return <Typography.Text type="secondary">—</Typography.Text>;
        return (
          <Tooltip title={value.join(', ')}>
            <Typography.Text>{value.length}</Typography.Text>
          </Tooltip>
        );
      },
    },
    { title: t('columnUserCount'), dataIndex: 'userCount', key: 'userCount', width: 100 },
    {
      title: tCommon('actions'),
      key: 'actions',
      render: (_value, role) => (
        <Space>
          {canUpdate ? (
            <Button size="small" onClick={() => setEditing(role)}>
              {t('editRole')}
            </Button>
          ) : null}
          {canDelete ? (
            <Popconfirm
              title={t('deleteRoleConfirm', { name: role.displayName })}
              okText={tCommon('confirm')}
              cancelText={tCommon('cancel')}
              onConfirm={() => handleDelete(role)}
              disabled={role.isSystem || role.userCount > 0}
            >
              <Button
                size="small"
                danger
                disabled={role.isSystem || role.userCount > 0}
                title={role.isSystem ? t('systemRoleReadonly') : undefined}
              >
                {t('deleteRole')}
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size="middle" className="w-full">
      {canCreate ? (
        <Button type="primary" onClick={() => setEditing('create')}>
          {t('createRole')}
        </Button>
      ) : null}

      <Table<RoleListItem>
        rowKey="name"
        loading={loading}
        columns={columns}
        dataSource={roles}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />

      <RoleFormModal
        target={editing}
        confirmLoading={saving}
        onCancel={() => setEditing(null)}
        onSubmit={handleSubmit}
      />
    </Space>
  );
}

function RoleFormModal({
  target,
  confirmLoading,
  onCancel,
  onSubmit,
}: {
  target: RoleListItem | 'create' | null;
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: RoleFormValues) => Promise<void>;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [form] = Form.useForm<RoleFormValues>();

  const isCreate = target === 'create';
  const role = target && target !== 'create' ? target : null;
  // 超级管理员的权限固定是「全部权限」，后端也会拒绝修改。
  const permissionsDisabled = role?.name === ROLES.SUPER_ADMIN;

  return (
    <Modal
      open={Boolean(target)}
      title={isCreate ? t('createRole') : t('editRole')}
      okText={tCommon('save')}
      cancelText={tCommon('cancel')}
      confirmLoading={confirmLoading}
      width={640}
      destroyOnHidden
      onCancel={onCancel}
      onOk={async () => {
        await onSubmit(await form.validateFields());
      }}
    >
      <Form
        form={form}
        layout="vertical"
        key={isCreate ? 'create' : (role?.name ?? 'empty')}
        initialValues={
          isCreate
            ? { permissions: [] }
            : {
                name: role?.name,
                displayName: role?.displayName,
                description: role?.description ?? undefined,
                permissions: role?.permissions ?? [],
              }
        }
      >
        <Form.Item
          name="name"
          label={t('columnRoleName')}
          rules={[{ required: true, message: t('roleNamePlaceholder') }]}
        >
          <Input placeholder={t('roleNamePlaceholder')} disabled={!isCreate} />
        </Form.Item>

        <Form.Item
          name="displayName"
          label={t('columnDisplayName')}
          rules={[{ required: true, message: t('roleDisplayNamePlaceholder') }]}
        >
          <Input placeholder={t('roleDisplayNamePlaceholder')} />
        </Form.Item>

        <Form.Item name="description" label={t('roleDescription')}>
          <Input.TextArea rows={2} maxLength={200} />
        </Form.Item>

        <Form.Item name="permissions" label={t('rolePermissions')}>
          <Checkbox.Group disabled={permissionsDisabled} className="w-full">
            <Space orientation="vertical" size="small" className="w-full">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.group}>
                  <Typography.Text type="secondary">{group.group}</Typography.Text>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    {group.permissions.map((permission) => (
                      <Checkbox key={permission.code} value={permission.code}>
                        <Tooltip title={permission.description}>
                          <span>{permission.code}</span>
                        </Tooltip>
                      </Checkbox>
                    ))}
                  </div>
                </div>
              ))}
            </Space>
          </Checkbox.Group>
        </Form.Item>

        {permissionsDisabled ? (
          <Typography.Text type="secondary">{t('systemRoleReadonly')}</Typography.Text>
        ) : null}
      </Form>
    </Modal>
  );
}
