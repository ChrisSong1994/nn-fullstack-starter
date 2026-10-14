'use client';

/**
 * 系统控制台 · 日志查看器。
 *
 * 左侧是日志文件列表（按日期倒序），右侧是文件内容 + 过滤条 + 分页。
 * 数据全部走 `/api/admin/logs/*`，取数方式是本仓库统一的 `apiFetch` + `useState`/`useEffect`
 * （`let active` 防竞态 + `version` 计数器强制重拉），**没有轮询/SSE** —— 想看最新的
 * 就点「刷新」。日志是排查工具而不是实时监控面板，要自动刷新再加。
 *
 * 过滤在服务端做（`readContent` 会流式扫一遍整个文件），所以关键字是回车/点搜索才提交，
 * 避免「每敲一个字符就请求一次」。一页默认 200 行，是为了别让单次响应太大。
 */
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Input,
  InputNumber,
  List,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
  type TableColumnsType,
} from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import {
  LOG_LEVELS,
  type ClearLogResult,
  type LogContentResult,
  type LogFileList,
  type LogFileMeta,
  type LogStats,
  type ParsedLogLine,
} from '@nnfs/shared';

import { apiFetch } from '@/lib/api-client';
import { useApiErrorMessage } from '@/lib/use-api-error';

/** 级别 → antd Tag 颜色。未知级别走 default。 */
const LEVEL_COLOR: Record<string, string> = {
  error: 'red',
  warn: 'gold',
  info: 'blue',
  http: 'purple',
  debug: 'default',
};

/** 清空方式。`range` 会保留最近若干行，留个现场。 */
type ClearMode = 'all' | 'range';

/** 当前选中文件的一次查询结果。`filename` 是给渲染层判断「这份数据还属不属于选中的文件」用的。 */
interface ContentState {
  filename: string;
  content: LogContentResult;
  stats: LogStats;
}

interface Query {
  page: number;
  pageSize: number;
  level?: string;
  search?: string;
  requestId?: string;
}

export function LogsViewer({ canClear }: { canClear: boolean }) {
  const t = useTranslations('logs');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const describeError = useApiErrorMessage();
  const { message } = App.useApp();
  // 选中项的底色用主题 token，别写死颜色 —— 深浅色主题都要能看。
  const { token } = theme.useToken();

  const [files, setFiles] = useState<LogFileMeta[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [selected, setSelected] = useState<string>();
  const [result, setResult] = useState<ContentState>();
  /** 过滤条的「草稿」值，点搜索/回车才写进 `query`。 */
  const [searchDraft, setSearchDraft] = useState('');
  const [requestIdDraft, setRequestIdDraft] = useState('');
  const [query, setQuery] = useState<Query>({ page: 1, pageSize: 200 });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  /** 清空之后 +1，触发下面两个 effect 重新拉数据。 */
  const [version, setVersion] = useState(0);

  // 文件列表。首次拿到后默认选中最新那个；原来选中的文件没了（比如删了 gz 归档）就退回最新的。
  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const list = await apiFetch<LogFileList>('/api/admin/logs/files');
        if (!active) return;
        setFiles(list.files);
        setSelected((prev) =>
          list.files.some((file) => file.name === prev) ? prev : list.files[0]?.name,
        );
      } catch (error) {
        if (active) message.error(describeError(error));
      } finally {
        if (active) setFilesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [describeError, message, version]);

  /**
   * 拉当前文件的内容 + 统计。
   *
   * 两个请求并行：`stats` 给出「总行数 / 过滤后行数」。只看当前页是看不出被过滤掉多少的，
   * 而排查时「我是不是把关键日志筛掉了」是个很常见的疑问。
   *
   * 没选中文件（日志目录还是空的，或者文件刚被删掉）时直接不发请求 —— 清空结果这种事
   * 别在 effect 体内同步 setState（`react-hooks/set-state-in-effect`），改成渲染时按
   * `selected` 兜底。
   */
  useEffect(() => {
    if (!selected) return;

    let active = true;

    void (async () => {
      const search = new URLSearchParams({
        filename: selected,
        page: String(query.page),
        pageSize: String(query.pageSize),
      });
      const statsQuery = new URLSearchParams({ filename: selected });
      if (query.level) {
        search.set('level', query.level);
        statsQuery.set('level', query.level);
      }
      if (query.search) {
        search.set('search', query.search);
        statsQuery.set('search', query.search);
      }
      if (query.requestId) {
        search.set('requestId', query.requestId);
        statsQuery.set('requestId', query.requestId);
      }

      try {
        const [page, fileStats] = await Promise.all([
          apiFetch<LogContentResult>(`/api/admin/logs/content?${search.toString()}`),
          apiFetch<LogStats>(`/api/admin/logs/stats?${statsQuery.toString()}`),
        ]);
        if (!active) return;
        setResult({ filename: selected, content: page, stats: fileStats });
      } catch (error) {
        if (active) message.error(describeError(error));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [describeError, message, query, selected, version]);

  // 结果只在「和当前选中文件对得上」时才算数 —— 切文件时上一个请求可能还在路上。
  const current = result?.filename === selected ? result : undefined;
  const content = current?.content;
  const stats = current?.stats;

  /** 改过滤条件并回到第一页。事件回调里同步置 loading 是允许的。 */
  const applyQuery = (patch: Partial<Query>) => {
    setLoading(true);
    setQuery((prev) => ({ ...prev, page: 1, ...patch }));
  };

  const reload = () => {
    setFilesLoading(true);
    setLoading(true);
    setVersion((prev) => prev + 1);
  };

  const pickFile = (name: string) => {
    setLoading(true);
    setSelected(name);
    // 换文件时重置分页，但保留过滤条件 —— 连着看两天的同一类日志是常见用法。
    setQuery((prev) => ({ ...prev, page: 1 }));
  };

  const handleClear = async (mode: ClearMode, keepLines?: number) => {
    if (!selected) return;
    setClearing(true);
    try {
      const cleared = await apiFetch<ClearLogResult>('/api/admin/logs/clear', {
        method: 'POST',
        body: JSON.stringify({ filename: selected, mode, keepLines }),
      });
      message.success(
        mode === 'range'
          ? t('clearRangeSuccess', { count: cleared.keptLines ?? 0 })
          : t('clearSuccess'),
      );
      setClearOpen(false);
      // gz 归档是「删掉」而不是「清空」，列表会少一项 —— reload 里会顺手把选中项兜回来。
      reload();
    } catch (error) {
      message.error(describeError(error));
    } finally {
      setClearing(false);
    }
  };

  const columns = useMemo<TableColumnsType<ParsedLogLine>>(
    () => [
      {
        title: t('columnLine'),
        dataIndex: 'line',
        key: 'line',
        width: 72,
        align: 'right',
        render: (value: number) => (
          <Typography.Text type="secondary" className="text-xs tabular-nums">
            {format.number(value)}
          </Typography.Text>
        ),
      },
      {
        title: t('columnMessage'),
        key: 'message',
        // 一行日志的信息都挤在一个单元格里，保持「一行就是一条日志」的观感。
        render: (_value, line) => (
          <Flex gap={8} align="flex-start">
            {line.timestamp ? (
              <Typography.Text type="secondary" className="shrink-0 text-xs">
                {line.timestamp}
              </Typography.Text>
            ) : null}
            {line.level ? (
              <Tag color={LEVEL_COLOR[line.level] ?? 'default'} className="mr-0! shrink-0">
                {line.level}
              </Tag>
            ) : null}
            {line.context ? <Tag className="mr-0! shrink-0">{line.context}</Tag> : null}
            <Typography.Text
              className="font-mono text-xs break-all whitespace-pre-wrap"
              type={line.level === 'error' ? 'danger' : undefined}
            >
              {line.message}
            </Typography.Text>
            {line.requestId ? (
              <Tooltip title={t('requestIdTooltip', { requestId: line.requestId })}>
                <Tag className="mr-0! shrink-0 font-mono" color="cyan">
                  {line.requestId.slice(0, 12)}…
                </Tag>
              </Tooltip>
            ) : null}
          </Flex>
        ),
      },
    ],
    [format, t],
  );

  const downloadUrl = selected
    ? `/api/admin/logs/download?filename=${encodeURIComponent(selected)}`
    : undefined;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={7} xl={6}>
        <Card
          size="small"
          title={t('filesTitle')}
          extra={
            <Tooltip title={t('refreshHint')}>
              <Button size="small" onClick={reload} loading={filesLoading}>
                {t('refresh')}
              </Button>
            </Tooltip>
          }
        >
          <List<LogFileMeta>
            size="small"
            // 加载中交给 List 自己转圈；用 files.length 判断会在首屏闪一下「暂无日志文件」。
            loading={filesLoading}
            dataSource={files}
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('filesEmpty')} />
              ),
            }}
            // 按天滚动 × 最多保留 30 天，量不大，用不上虚拟滚动；真多了再换 List 的 pagination。
            style={{ maxHeight: '60vh', overflowY: 'auto' }}
            renderItem={(file) => (
              <List.Item
                className="cursor-pointer rounded px-2!"
                style={file.name === selected ? { background: token.colorPrimaryBg } : undefined}
                onClick={() => pickFile(file.name)}
              >
                <Flex vertical gap={2} className="w-full">
                  <Flex align="center" justify="space-between" gap={8}>
                    <Typography.Text strong>{file.date}</Typography.Text>
                    <Tag color={file.type === 'error' ? 'red' : 'blue'} className="mr-0!">
                      {t(`type.${file.type}`)}
                    </Tag>
                  </Flex>
                  <Typography.Text type="secondary" className="text-xs">
                    {formatBytes(file.size)}
                    {file.compressed ? ` · ${t('compressed')}` : ''}
                    {file.part === undefined ? '' : ` · ${t('part', { part: file.part })}`}
                  </Typography.Text>
                </Flex>
              </List.Item>
            )}
          />
        </Card>
      </Col>

      <Col xs={24} lg={17} xl={18}>
        <Space orientation="vertical" size="middle" className="w-full">
          <Flex wrap gap={8} align="center" justify="space-between">
            <Space wrap>
              <Select
                allowClear
                placeholder={t('levelPlaceholder')}
                className="w-32"
                value={query.level}
                options={LOG_LEVELS.map((level) => ({ label: level, value: level }))}
                onChange={(value?: string) => applyQuery({ level: value || undefined })}
              />
              <Input.Search
                allowClear
                placeholder={t('keywordPlaceholder')}
                className="w-64"
                value={searchDraft}
                // 点「清除」不会触发 onSearch，得在这里顺手把条件撤掉，否则框空了结果还是筛过的。
                onChange={(event) => {
                  setSearchDraft(event.target.value);
                  if (!event.target.value) applyQuery({ search: undefined });
                }}
                onSearch={(value) => applyQuery({ search: value || undefined })}
              />
              <Input
                allowClear
                placeholder={t('requestIdPlaceholder')}
                className="w-56"
                value={requestIdDraft}
                onChange={(event) => {
                  setRequestIdDraft(event.target.value);
                  if (!event.target.value) applyQuery({ requestId: undefined });
                }}
                onPressEnter={() => applyQuery({ requestId: requestIdDraft || undefined })}
              />
              <Button onClick={() => applyQuery({ requestId: requestIdDraft || undefined })}>
                {tCommon('search')}
              </Button>
              <Button
                onClick={() => {
                  // 草稿也要一起清，否则输入框里还留着已失效的条件。
                  setSearchDraft('');
                  setRequestIdDraft('');
                  applyQuery({ level: undefined, search: undefined, requestId: undefined });
                }}
              >
                {tCommon('reset')}
              </Button>
            </Space>

            <Space>
              <Button href={downloadUrl} download disabled={!selected}>
                {t('download')}
              </Button>
              {canClear ? (
                <Button danger disabled={!selected} onClick={() => setClearOpen(true)}>
                  {t('clear')}
                </Button>
              ) : null}
            </Space>
          </Flex>

          <Flex wrap gap={16} align="baseline">
            {stats ? (
              <Typography.Text type="secondary">
                {t('lineSummary', { total: stats.total, filtered: stats.filtered })}
              </Typography.Text>
            ) : null}
            <Typography.Text type="secondary" className="text-xs">
              {t('securityHint')}
            </Typography.Text>
          </Flex>

          <Table<ParsedLogLine>
            rowKey="line"
            size="small"
            // 没有选中文件时那个 effect 根本不会跑，loading 会一直停在 true，所以按 selected 兜一下。
            loading={selected !== undefined && loading}
            columns={columns}
            dataSource={content?.lines ?? []}
            locale={{
              emptyText: (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('linesEmpty')} />
              ),
            }}
            scroll={{ y: '58vh' }}
            expandable={{
              // 结构化字段不够用时才需要看原文，所以默认收起。
              expandedRowRender: (line) => <LineDetail line={line} />,
            }}
            pagination={{
              current: content?.page ?? 1,
              pageSize: content?.pageSize ?? query.pageSize,
              total: content?.filteredLines ?? 0,
              showSizeChanger: true,
              pageSizeOptions: [100, 200, 500],
              showTotal: (total) => t('totalCount', { total }),
              onChange: (page, pageSize) => {
                setLoading(true);
                setQuery((prev) => ({ ...prev, page, pageSize }));
              },
            }}
          />
        </Space>
      </Col>

      <ClearLogModal
        open={clearOpen}
        filename={selected}
        confirmLoading={clearing}
        onCancel={() => setClearOpen(false)}
        onSubmit={handleClear}
      />
    </Row>
  );
}

/** 展开后的详情：堆栈 + JSON 行里其余的字段 + 原始文本。 */
function LineDetail({ line }: { line: ParsedLogLine }) {
  const t = useTranslations('logs');
  const entries = Object.entries(line.meta ?? {});

  return (
    <Space orientation="vertical" size="small" className="w-full">
      {line.stack ? (
        <div>
          <Typography.Text strong>{t('stack')}</Typography.Text>
          <pre className="mt-1 max-h-64 overflow-auto rounded bg-black/5 p-2 text-xs dark:bg-white/10">
            {line.stack}
          </pre>
        </div>
      ) : null}

      {entries.length > 0 ? (
        <Descriptions
          size="small"
          column={1}
          bordered
          items={entries.map(([key, value]) => ({
            key,
            label: key,
            children: (
              <Typography.Text className="font-mono text-xs break-all">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </Typography.Text>
            ),
          }))}
        />
      ) : null}

      <div>
        <Typography.Text strong>{t('raw')}</Typography.Text>
        <pre className="mt-1 max-h-64 overflow-auto rounded bg-black/5 p-2 text-xs break-all whitespace-pre-wrap dark:bg-white/10">
          {line.raw}
        </pre>
      </div>
    </Space>
  );
}

/**
 * 清空确认。两种模式：
 *  - `all`：整个文件清空（gz 归档则是删除文件）；
 *  - `range`：保留最近 N 行 —— 用来「清掉噪音但留住刚才那段」。
 */
function ClearLogModal({
  open,
  filename,
  confirmLoading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  filename?: string;
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (mode: ClearMode, keepLines?: number) => Promise<void>;
}) {
  const t = useTranslations('logs');
  const tCommon = useTranslations('common');
  const [mode, setMode] = useState<ClearMode>('all');
  const [keepLines, setKeepLines] = useState<number>(500);

  return (
    <Modal
      open={open}
      title={t('clearTitle', { filename: filename ?? '' })}
      okText={tCommon('confirm')}
      cancelText={tCommon('cancel')}
      okButtonProps={{ danger: true }}
      confirmLoading={confirmLoading}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => onSubmit(mode, mode === 'range' ? keepLines : undefined)}
    >
      <Space orientation="vertical" size="middle" className="w-full">
        <Typography.Text type="warning">{t('clearHint')}</Typography.Text>
        <Radio.Group value={mode} onChange={(event) => setMode(event.target.value as ClearMode)}>
          <Space orientation="vertical">
            <Radio value="all">{t('clearModeAll')}</Radio>
            <Radio value="range">{t('clearModeRange')}</Radio>
          </Space>
        </Radio.Group>
        {mode === 'range' ? (
          <Space>
            <Typography.Text>{t('keepLines')}</Typography.Text>
            <InputNumber
              min={1}
              max={100000}
              value={keepLines}
              onChange={(value) => setKeepLines(value ?? 1)}
            />
          </Space>
        ) : null}
      </Space>
    </Modal>
  );
}

/** 字节数 → 人类可读。日志动辄几十 MB，显示原始字节数没法一眼比较。 */
function formatBytes(size: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
