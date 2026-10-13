'use client';

/**
 * 后台用户管理表格。
 *
 * 数据全部来自 `/api/admin/users`（服务端已经按权限点分页过滤），前端只负责展示和
 * 把操作发回去。按钮的显隐按权限点控制，但**真正拦截的是后端** —— 拿到 403
 * 一样会提示「没有权限」。
 */
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { RoleListItem, UserListItem, UserPage } from '@nnfs/shared';

import { apiFetch } from '@/lib/api-client';
import { useApiErrorMessage } from '@/lib/use-api-error';

interface UsersTableProps {
  /** 由服务端按当前用户权限点算好，决定「分配角色 / 封禁 / 删除」按钮是否出现。 */
  canAssign: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface Query {
  page: number;
  pageSize: number;
  keyword?: string;
  role?: string;
  status?: 'active' | 'banned';
}

export function UsersTable({ canAssign, canUpdate, canDelete }: UsersTableProps) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const describeError = useApiErrorMessage();
  const { message } = App.useApp();

  const [query, setQuery] = useState<Query>({ page: 1, pageSize: 10 });
  const [keyword, setKeyword] = useState('');
  const [data, setData] = useState<UserPage>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [assigning, setAssigning] = useState<UserListItem | null>(null);
  const [saving, setSaving] = useState(false);
  /** 增删改之后 +1，用来触发下面那个 effect 重新拉数据。 */
  const [version, setVersion] = useState(0);

  /**
   * 首屏 / 筛选变化 / 增删改之后拉列表。
   *
   * 写成 effect 内部的 async IIFE（而不是 useCallback 包一层在 effect 里同步调用）：
   * react-hooks/set-state-in-effect 只认「await 之后再 setState」这种形态，
   * 直接调用一个含 setState 的函数会被判成同步 setState。顺带用 active 防止
   * 请求回来时组件已经卸载 / 依赖已经变了。
   */
  useEffect(() => {
    let active = true;

    void (async () => {
      const search = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
      });
      if (query.keyword) search.set('keyword', query.keyword);
      if (query.role) search.set('role', query.role);
      if (query.status) search.set('status', query.status);

      try {
        const page = await apiFetch<UserPage>(`/api/admin/users?${search.toString()}`);
        if (active) setData(page);
      } catch (error) {
        if (active) message.error(describeError(error));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [describeError, message, query, version]);

  /** 改筛选条件并回到第一页。事件回调里同步置 loading 是允许的。 */
  const applyQuery = (patch: Partial<Query>) => {
    setLoading(true);
    setQuery((prev) => ({ ...prev, page: 1, ...patch }));
  };

  /** 增删改成功后重新拉列表。 */
  const reload = () => {
    setLoading(true);
    setVersion((prev) => prev + 1);
  };

  // 角色下拉的选项。没有 role:read 权限的用户拿不到，退化成空列表即可。
  useEffect(() => {
    if (!canAssign) return;
    void (async () => {
      try {
        setRoles(await apiFetch<RoleListItem[]>('/api/admin/roles'));
      } catch {
        setRoles([]);
      }
    })();
  }, [canAssign]);

  const handleBan = async (user: UserListItem) => {
    try {
      await apiFetch<UserListItem>(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(
          user.banned ? { banned: false } : { banned: true, banReason: '违反使用条款' },
        ),
      });
      message.success(t('banSuccess'));
      reload();
    } catch (error) {
      message.error(describeError(error));
    }
  };

  const handleDelete = async (user: UserListItem) => {
    try {
      await apiFetch<void>(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      message.success(t('deleteUserSuccess'));
      reload();
    } catch (error) {
      message.error(describeError(error));
    }
  };

  const columns: TableColumnsType<UserListItem> = [
    { title: t('columnEmail'), dataIndex: 'email', key: 'email' },
    { title: t('columnName'), dataIndex: 'name', key: 'name' },
    {
      title: t('columnRoles'),
      key: 'roles',
      dataIndex: 'roles',
      render: (value: string[]) => (
        <Space wrap>
          {value.length > 0 ? (
            value.map((role) => (
              <Tag key={role} color="blue">
                {role}
              </Tag>
            ))
          ) : (
            <Typography.Text type="secondary">—</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: t('columnStatus'),
      key: 'status',
      render: (_value, user) =>
        user.banned ? (
          <Tag color="red">{t('statusBanned')}</Tag>
        ) : (
          <Tag color="green">{t('statusActive')}</Tag>
        ),
    },
    {
      title: t('columnCreatedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) =>
        format.dateTime(new Date(value), { dateStyle: 'medium', timeStyle: 'short' }),
    },
    {
      title: tCommon('actions'),
      key: 'actions',
      render: (_value, user) => (
        <Space>
          {canAssign ? (
            <Button size="small" onClick={() => setAssigning(user)}>
              {t('assignRoles')}
            </Button>
          ) : null}
          {canUpdate ? (
            <Button size="small" onClick={() => handleBan(user)}>
              {user.banned ? t('unban') : t('ban')}
            </Button>
          ) : null}
          {canDelete ? (
            <Popconfirm
              title={t('deleteUserConfirm', { email: user.email })}
              okText={tCommon('confirm')}
              cancelText={tCommon('cancel')}
              onConfirm={() => handleDelete(user)}
            >
              <Button size="small" danger>
                {t('deleteUser')}
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size="middle" className="w-full">
      <Space wrap>
        <Input.Search
          allowClear
          placeholder={t('keywordPlaceholder')}
          className="w-64"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(value) => applyQuery({ keyword: value || undefined })}
        />
        <Select
          allowClear
          placeholder={t('filterRole')}
          className="w-40"
          options={roles.map((role) => ({ label: role.displayName, value: role.name }))}
          onChange={(value?: string) => applyQuery({ role: value || undefined })}
        />
        <Select
          allowClear
          placeholder={t('filterStatus')}
          className="w-36"
          options={[
            { label: t('statusActive'), value: 'active' },
            { label: t('statusBanned'), value: 'banned' },
          ]}
          onChange={(value?: 'active' | 'banned') => applyQuery({ status: value || undefined })}
        />
        <Button onClick={() => applyQuery({})}>{tCommon('search')}</Button>
      </Space>

      <Table<UserListItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data.items}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: data.page,
          pageSize: data.pageSize,
          total: data.total,
          showSizeChanger: true,
          showTotal: (total) => t('totalCount', { total }),
          onChange: (page, pageSize) => applyQuery({ page, pageSize }),
        }}
      />

      <AssignRolesModal
        user={assigning}
        roles={roles}
        confirmLoading={saving}
        onCancel={() => setAssigning(null)}
        onSubmit={async (roleNames) => {
          if (!assigning) return;
          setSaving(true);
          try {
            await apiFetch<UserListItem>(`/api/admin/users/${assigning.id}/roles`, {
              method: 'PATCH',
              body: JSON.stringify({ roles: roleNames }),
            });
            message.success(t('assignRolesSuccess'));
            setAssigning(null);
            reload();
          } catch (error) {
            message.error(describeError(error));
          } finally {
            setSaving(false);
          }
        }}
      />
    </Space>
  );
}

function AssignRolesModal({
  user,
  roles,
  confirmLoading,
  onCancel,
  onSubmit,
}: {
  user: UserListItem | null;
  roles: RoleListItem[];
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (roleNames: string[]) => Promise<void>;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [form] = Form.useForm<{ roles: string[] }>();

  return (
    <Modal
      open={Boolean(user)}
      title={user ? t('assignRolesTitle', { email: user.email }) : ''}
      okText={tCommon('save')}
      cancelText={tCommon('cancel')}
      confirmLoading={confirmLoading}
      // 每次打开都重新挂载表单：key 跟着用户走，initialValues 就会重新生效。
      destroyOnHidden
      onCancel={onCancel}
      onOk={async () => {
        const values = await form.validateFields();
        await onSubmit(values.roles ?? []);
      }}
    >
      <Form
        form={form}
        layout="vertical"
        key={user?.id ?? 'empty'}
        initialValues={{ roles: user?.roles ?? [] }}
      >
        <Form.Item name="roles" label={t('columnRoles')}>
          <Select
            mode="multiple"
            options={roles.map((role) => ({ label: role.displayName, value: role.name }))}
            placeholder={t('assignRoles')}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
