import {
  CloudUploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
  UndoOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import type { MenuProps } from 'antd';
import {
  Button,
  Checkbox,
  Col,
  Descriptions,
  Dropdown,
  Empty,
  Input,
  List,
  Modal,
  message,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import * as Diff from 'diff';
import React, { useEffect, useMemo, useState } from 'react';
import { aiOptimizeDocument, aiWriteDocument } from '@/services/ai';
import {
  exportToPDF,
  exportToText,
  exportToWord,
} from '@/services/documentExport';
import { ossStorageService } from '@/services/ossStorage';
import type { PromptTemplate } from '@/services/prompt';
import { getPrompts } from '@/services/prompt';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface SavedDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  scenario?: string;
  url?: string;
  createdAt: Date;
  size?: number;
  pdfUrl?: string;
  wordUrl?: string;
  pdfPath?: string;
  wordPath?: string;
}

interface DocumentAssets {
  pdfUrl?: string;
  wordUrl?: string;
  pdfPath?: string;
  wordPath?: string;
}

const DOCUMENT_TYPE_OPTIONS = [
  { label: '通知', value: 'notice' },
  { label: '通报', value: 'bulletin' },
  { label: '请示', value: 'request' },
  { label: '报告', value: 'report' },
  { label: '函', value: 'letter' },
  { label: '会议纪要', value: 'meeting' },
] as const;

type DocumentTypeValue = (typeof DOCUMENT_TYPE_OPTIONS)[number]['value'];

const DOCUMENT_TYPE_LABEL_MAP = DOCUMENT_TYPE_OPTIONS.reduce<
  Record<DocumentTypeValue, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<DocumentTypeValue, string>);

const DEFAULT_DOCUMENT_TYPE = DOCUMENT_TYPE_OPTIONS[0].value;

const isDocumentTypeValue = (value: string): value is DocumentTypeValue =>
  DOCUMENT_TYPE_OPTIONS.some((option) => option.value === value);

const getDocumentTypeLabel = (value: string) =>
  isDocumentTypeValue(value) ? DOCUMENT_TYPE_LABEL_MAP[value] : value;

const SCENARIO_OPTIONS: Record<
  DocumentTypeValue,
  { label: string; value: string }[]
> = {
  notice: [
    { label: '日常通知', value: 'routine_notice' },
    { label: '紧急通知', value: 'urgent_notice' },
    { label: '转发通知', value: 'forward_notice' },
  ],
  bulletin: [
    { label: '表扬通报', value: 'commendation_bulletin' },
    { label: '批评通报', value: 'criticism_bulletin' },
    { label: '情况通报', value: 'situation_bulletin' },
  ],
  request: [
    { label: '事项请示', value: 'general_request' },
    { label: '资金请示', value: 'funding_request' },
    { label: '项目请示', value: 'project_request' },
  ],
  report: [
    { label: '年度工作报告', value: 'annual_report' },
    { label: '专项情况报告', value: 'special_report' },
    { label: '答复报告', value: 'reply_report' },
  ],
  letter: [
    { label: '商洽函', value: 'consultation_letter' },
    { label: '询问函', value: 'inquiry_letter' },
    { label: '答复函', value: 'reply_letter' },
    { label: '告知函', value: 'notification_letter' },
  ],
  meeting: [
    { label: '办公会议纪要', value: 'administrative_meeting' },
    { label: '专题会议纪要', value: 'thematic_meeting' },
    { label: '座谈会纪要', value: 'symposium_meeting' },
  ],
};

const getScenarioLabel = (typeValue: string, scenarioValue?: string) => {
  if (!scenarioValue) return '';
  if (isDocumentTypeValue(typeValue)) {
    const matched = SCENARIO_OPTIONS[typeValue].find(
      (item) => item.value === scenarioValue,
    );
    if (matched) {
      return matched.label;
    }
  }
  for (const options of Object.values(SCENARIO_OPTIONS)) {
    const matched = options.find((item) => item.value === scenarioValue);
    if (matched) {
      return matched.label;
    }
  }
  return scenarioValue;
};

interface OfficialDocumentData {
  serialNumber?: string;
  secrecyLevel?: string;
  secrecyPeriod?: string;
  urgency?: string;
  issuerMark?: string;
  documentNumber?: string;
  signer?: string;
  title?: string;
  addressees: string[];
  body: string[];
  attachments: string[];
  issuerName?: string;
  issueDate?: string;
  footnote?: string;
  carbonCopy: string[];
  distributionOrg?: string;
  distributionDate?: string;
}

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，、;；\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
};

const normalizeDirectStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter((item): item is string => Boolean(item));
  }
  const normalized = normalizeString(value);
  return normalized ? [normalized] : [];
};

const normalizeParagraphs = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
};

const normalizeAiRateValue = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    const percent = value > 1 ? value : value * 100;
    return Math.min(Math.max(percent, 0), 100);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const cleaned = trimmed.endsWith('%')
      ? trimmed.slice(0, -1).trim()
      : trimmed;
    const parsed = parseFloat(cleaned);
    if (Number.isNaN(parsed)) {
      return null;
    }
    const percent =
      trimmed.includes('%') || parsed > 1 ? parsed : parsed * 100;
    return Math.min(Math.max(percent, 0), 100);
  }

  return null;
};

const formatAiRateDisplay = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return '--';
  }
  const clamped = Math.min(Math.max(value, 0), 100);
  const rounded = Math.round(clamped * 10) / 10;
  return Number.isInteger(rounded)
    ? `${rounded.toFixed(0)}%`
    : `${rounded.toFixed(1)}%`;
};

const numberToChinese = (value: number): string => {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (value <= 10) {
    return ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][value];
  }
  if (value < 20) {
    return `十${digits[value - 10] !== '零' ? digits[value - 10] : ''}`;
  }
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${digits[tens]}十${ones === 0 ? '' : digits[ones]}`;
  }
  return `${value}`;
};

const toChineseOrdinal = (index: number): string => `${numberToChinese(index + 1)}、`;

const buildNotificationTitle = (
  issuingOrg?: string,
  subject?: string,
  docType?: string,
): string | undefined => {
  const normalizedOrg = normalizeString(issuingOrg);
  const normalizedSubject = normalizeString(subject);
  const normalizedDocType = normalizeString(docType) ?? '通知';

  if (!normalizedOrg && !normalizedSubject) {
    return normalizedDocType;
  }

  if (!normalizedOrg && normalizedSubject) {
    if (normalizedSubject.includes(normalizedDocType)) {
      return normalizedSubject;
    }
    if (normalizedSubject.startsWith('关于')) {
      return `${normalizedSubject}${normalizedDocType === '通知' ? '' : normalizedDocType}`;
    }
    return `关于${normalizedSubject}${normalizedDocType === '通知' ? '的通知' : normalizedDocType}`;
  }

  if (normalizedOrg && !normalizedSubject) {
    return `${normalizedOrg}${normalizedDocType}`;
  }

  if (!normalizedSubject) {
    return `${normalizedOrg}${normalizedDocType}`;
  }

  if (normalizedSubject.includes('通知')) {
    return normalizedSubject.startsWith(normalizedOrg ?? '')
      ? normalizedSubject
      : `${normalizedOrg}${normalizedSubject}`;
  }

  if (normalizedSubject.startsWith('关于')) {
    return `${normalizedOrg}${normalizedSubject}${normalizedDocType === '通知' ? '' : normalizedDocType
      }`;
  }

  return `${normalizedOrg}关于${normalizedSubject}${normalizedDocType === '通知' ? '的通知' : normalizedDocType
    }`;
};

const mapOfficialDocumentData = (
  raw: Record<string, unknown>,
): OfficialDocumentData => {
  if ('document' in raw && raw.document && typeof raw.document === 'object') {
    const doc = raw.document as Record<string, unknown>;
    const issuingAuthority = normalizeString(doc.issuingAuthority);
    const documentNumber = normalizeString(doc.documentNumber);
    const title = normalizeString(doc.title);
    const recipients = normalizeDirectStringArray(doc.mainRecipients);
    const issueDate = normalizeString(doc.date);
    const attachments = normalizeDirectStringArray(doc.attachments);

    const content = (doc.content ?? {}) as Record<string, unknown>;
    const preamble = normalizeString(content.preamble);
    const mainBody = Array.isArray(content.mainBody)
      ? (content.mainBody as Record<string, unknown>[])
      : [];
    const requirements = content.requirements as Record<string, unknown> | undefined;
    const conclusion = normalizeString(content.conclusion);

    const body: string[] = [];
    if (preamble) {
      body.push(preamble);
    }

    mainBody.forEach((section) => {
      const sectionTitle = normalizeString(section.sectionTitle);
      const details = normalizeDirectStringArray(section.details);
      if (!sectionTitle && details.length === 0) {
        return;
      }
      const lines: string[] = [];
      if (sectionTitle) {
        lines.push(sectionTitle);
      }
      details.forEach((detail) => {
        lines.push(detail);
      });
      body.push(lines.join('\n'));
    });

    if (requirements) {
      const requirementTitle = normalizeString(requirements.title) ?? '工作要求';
      const requirementDetails = normalizeDirectStringArray(requirements.details);
      if (requirementTitle || requirementDetails.length > 0) {
        const lines: string[] = [];
        lines.push(requirementTitle);
        requirementDetails.forEach((detail) => {
          lines.push(detail);
        });
        body.push(lines.join('\n'));
      }
    }

    if (conclusion) {
      body.push(conclusion);
    } else if (!body.some((paragraph) => paragraph.includes('特此通知'))) {
      body.push('特此通知');
    }

    const contact = (doc.contact ?? {}) as Record<string, unknown>;
    const contactSegments: string[] = [];
    const contactDepartment = normalizeString(contact.department);
    const contactPerson = normalizeString(contact.person);
    const contactPhone = normalizeString(contact.phone);
    const contactEmail = normalizeString(contact.email);

    if (contactDepartment) {
      contactSegments.push(contactDepartment);
    }
    if (contactPerson) {
      contactSegments.push(contactPerson);
    }
    if (contactPhone) {
      contactSegments.push(`电话：${contactPhone}`);
    }
    if (contactEmail) {
      contactSegments.push(`邮箱：${contactEmail}`);
    }

    const footnote =
      contactSegments.length > 0
        ? `联系人及方式：${contactSegments.join('，')}`
        : undefined;

    return {
      serialNumber: undefined,
      secrecyLevel: undefined,
      secrecyPeriod: undefined,
      urgency: undefined,
      issuerMark: issuingAuthority ? `${issuingAuthority}文件` : undefined,
      documentNumber,
      signer: undefined,
      title,
      addressees: recipients,
      body,
      attachments,
      issuerName: issuingAuthority,
      issueDate,
      footnote,
      carbonCopy: [],
      distributionOrg: undefined,
      distributionDate: undefined,
    };
  }

  if ('docType' in raw) {
    const {
      docType,
      noticeType,
      issuingOrg,
      recipients,
      subject,
      background,
      matters,
      deadline,
      contactPerson,
      isUrgent,
      isSecret,
    } = raw as Record<string, unknown>;

    const issuingOrgText = normalizeString(issuingOrg);
    const subjectText = normalizeString(subject);
    const backgroundText = normalizeString(background);
    const mattersArray = Array.isArray(matters) ? (matters as Record<string, unknown>[]) : [];
    const deadlineText = normalizeString(deadline);
    const contactText = normalizeString(contactPerson);
    const noticeTypeText = normalizeString(noticeType);

    const body: string[] = [];
    if (backgroundText) {
      body.push(backgroundText);
    }
    if (noticeTypeText) {
      body.push(`通知类别：${noticeTypeText}`);
    }

    mattersArray.forEach((item, index) => {
      const { title, content, requirements } = item as Record<string, unknown>;
      const matterTitle = normalizeString(title) ?? `事项${index + 1}`;
      const matterContent = normalizeString(content);
      const matterRequirements = normalizeString(requirements);

      const parts: string[] = [`${toChineseOrdinal(index)}${matterTitle}`];
      if (matterContent) {
        parts.push(matterContent);
      }
      if (matterRequirements) {
        parts.push(`工作要求：${matterRequirements}`);
      }

      body.push(parts.join('\n'));
    });

    if (deadlineText || mattersArray.length > 0) {
      let requirementText = '请各单位按照上述安排认真抓好落实';
      if (deadlineText) {
        requirementText += `，于${deadlineText}前完成相关工作`;
      }
      requirementText += '。';
      body.push(requirementText);
    }

    if (contactText) {
      body.push(`联系人及方式：${contactText}`);
    }

    body.push('特此通知');

    return {
      serialNumber: undefined,
      secrecyLevel: isSecret ? '秘密' : undefined,
      secrecyPeriod: undefined,
      urgency: isUrgent ? '特急' : undefined,
      issuerMark: issuingOrgText ? `${issuingOrgText}文件` : undefined,
      documentNumber: undefined,
      signer: undefined,
      title: buildNotificationTitle(issuingOrgText, subjectText, normalizeString(docType)),
      addressees: normalizeStringArray(recipients),
      body,
      attachments: [],
      issuerName: issuingOrgText,
      issueDate: undefined,
      footnote: undefined,
      carbonCopy: [],
      distributionOrg: undefined,
      distributionDate: undefined,
    };
  }

  const {
    正文,
    附件说明,
    抄送机关,
    份号,
    密级,
    保密期限,
    紧急程度,
    发文机关标志,
    发文字号,
    签发人,
    标题,
    主送机关,
    发文机关署名,
    成文日期,
    附注,
    印发机关,
    印发日期,
  } = raw as Record<string, unknown>;

  const body = normalizeParagraphs(正文);
  const attachments = normalizeStringArray(附件说明);
  const carbonCopy = normalizeStringArray(抄送机关);

  return {
    serialNumber: normalizeString(份号),
    secrecyLevel: normalizeString(密级),
    secrecyPeriod: normalizeString(保密期限),
    urgency: normalizeString(紧急程度),
    issuerMark: normalizeString(发文机关标志),
    documentNumber: normalizeString(发文字号),
    signer: normalizeString(签发人),
    title: normalizeString(标题),
    addressees: normalizeStringArray(主送机关),
    body,
    attachments,
    issuerName: normalizeString(发文机关署名),
    issueDate: normalizeString(成文日期),
    footnote: normalizeString(附注),
    carbonCopy,
    distributionOrg: normalizeString(印发机关),
    distributionDate: normalizeString(印发日期),
  };
};

const takeCountedKey = (value: string, counter: Map<string, number>) => {
  const current = counter.get(value) ?? 0;
  const next = current + 1;
  counter.set(value, next);
  return `${value}-${next}`;
};

const ensureParentheses = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^（.*）$/.test(trimmed)) {
    return trimmed;
  }
  const normalized = trimmed.replace(/[()]/g, '');
  return `（${normalized}）`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderMultilineHtml = (text: string) =>
  escapeHtml(text).replace(/\n/g, '<br />');

const INDENT = '　　';
const paragraphNoIndentPattern =
  /^(通知类别：|[一二三四五六七八九十]+、|（[一二三四五六七八九十]）|[0-9]+[.．、]|附件：|联系人及方式：|抄送：|发至：|特此通知)/;

const shouldIndentParagraph = (text: string) =>
  !paragraphNoIndentPattern.test(text);

const indentParagraph = (paragraph: string) => {
  if (!shouldIndentParagraph(paragraph)) {
    return paragraph;
  }
  return paragraph
    .split('\n')
    .map((line) => (line.length > 0 ? `${INDENT}${line}` : line))
    .join('\n');
};

const buildOfficialDocumentText = (data: OfficialDocumentData) => {
  const lines: string[] = [];

  if (data.issuerMark) {
    lines.push(data.issuerMark);
  }
  if (data.documentNumber) {
    if (lines.length > 0) lines.push('');
    lines.push(data.documentNumber);
  }
  if (data.title) {
    if (lines.length > 0) lines.push('');
    lines.push(data.title);
  }
  if (data.addressees.length > 0) {
    lines.push('');
    lines.push(`${data.addressees.join('、')}：`);
  }

  if (data.body.length > 0) {
    lines.push('');
    data.body.forEach((paragraph, index) => {
      if (index > 0) {
        lines.push('');
      }
      lines.push(indentParagraph(paragraph));
    });
  }

  if (data.attachments.length > 0) {
    lines.push('');
    data.attachments.forEach((item, index) => {
      if (item.startsWith('附件：')) {
        lines.push(item);
      } else {
        lines.push(`附件：${index + 1}．${item}`);
      }
    });
  }

  if (data.issuerName || data.issueDate) {
    lines.push('');
    if (data.issuerName) {
      lines.push(data.issuerName);
    }
    if (data.issueDate) {
      lines.push(data.issueDate);
    }
  }

  const footnote = ensureParentheses(data.footnote);
  if (footnote) {
    lines.push('');
    lines.push(footnote);
  }

  if (data.carbonCopy.length > 0 || data.distributionOrg || data.distributionDate) {
    lines.push('');
    if (data.carbonCopy.length > 0) {
      lines.push(`抄送：${data.carbonCopy.join('、')}`);
    }
    if (data.distributionOrg) {
      lines.push(data.distributionOrg);
    }
    if (data.distributionDate) {
      lines.push(data.distributionDate);
    }
  }

  return lines.join('\n');
};

const buildBodyParagraphHtml = (paragraph: string) => {
  const indentStyle = shouldIndentParagraph(paragraph) ? '2em' : '0';
  return `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.9;text-align:justify;text-indent:${indentStyle};">${renderMultilineHtml(
    paragraph,
  )}</p>`;
};

const buildOfficialDocumentHTML = (data: OfficialDocumentData) => {
  const metaItems: string[] = [];
  if (data.serialNumber) metaItems.push(`份号：${data.serialNumber}`);
  if (data.secrecyLevel) {
    metaItems.push(
      `密级：${data.secrecyLevel}${data.secrecyPeriod ? `★${data.secrecyPeriod}` : ''
      }`,
    );
  }
  if (data.urgency) metaItems.push(`紧急程度：${data.urgency}`);
  if (data.signer) metaItems.push(`签发人：${data.signer}`);

  const addresseesText =
    data.addressees.length > 0 ? data.addressees.join('、') : undefined;
  const attachments = data.attachments.map((item, index) =>
    item.startsWith('附件：') ? item : `附件：${index + 1}．${item}`,
  );
  const carbonCopyText =
    data.carbonCopy.length > 0 ? data.carbonCopy.join('、') : undefined;

  const htmlParts: string[] = [];
  htmlParts.push(
    '<div style="font-family:\'仿宋\',\'FangSong\',\'SimSun\',\'宋体\',\'Times New Roman\',serif;color:#000;">',
  );

  if (metaItems.length > 0) {
    htmlParts.push(
      `<div style="display:flex;justify-content:flex-end;flex-wrap:wrap;gap:6px 24px;font-size:12px;line-height:1.6;color:#444;">${metaItems
        .map((item) => `<div>${escapeHtml(item)}</div>`)
        .join('')}</div>`,
    );
  }

  if (data.issuerMark) {
    htmlParts.push(
      `<div style="text-align:center;font-size:28px;color:#c00000;letter-spacing:6px;font-weight:700;margin:20px 0 10px 0;padding-bottom:12px;border-bottom:4px double #c00000;">${escapeHtml(
        data.issuerMark,
      )}</div>`,
    );
  }

  if (data.documentNumber) {
    htmlParts.push(
      `<div style="text-align:center;font-size:16px;color:#000;margin:16px 0 24px;font-family:'仿宋','FangSong','SimSun',serif;">${escapeHtml(
        data.documentNumber,
      )}</div>`,
    );
  }

  if (data.title) {
    htmlParts.push(
      `<div style="text-align:center;font-size:24px;font-weight:700;line-height:1.6;color:#000;margin:32px 0 28px;letter-spacing:2px;">${escapeHtml(
        data.title,
      )}</div>`,
    );
  }

  if (addresseesText) {
    htmlParts.push(
      `<div style="font-size:16px;line-height:1.8;text-align:left;margin-bottom:16px;">主送机关：${escapeHtml(
        addresseesText,
      )}</div>`,
    );
  }

  if (data.body.length > 0) {
    data.body.forEach((paragraph) => {
      htmlParts.push(buildBodyParagraphHtml(paragraph));
    });
  }

  if (attachments.length > 0) {
    htmlParts.push('<div style="font-size:15px;line-height:1.9;margin-top:24px;">');
    attachments.forEach((item) => {
      htmlParts.push(`<div>${renderMultilineHtml(item)}</div>`);
    });
    htmlParts.push('</div>');
  }

  if (data.issuerName || data.issueDate) {
    htmlParts.push(
      '<div style="margin-top:48px;font-size:16px;line-height:1.8;text-align:right;">',
    );
    if (data.issuerName) {
      htmlParts.push(`<div>${escapeHtml(data.issuerName)}</div>`);
    }
    if (data.issueDate) {
      htmlParts.push(`<div>${escapeHtml(data.issueDate)}</div>`);
    }
    htmlParts.push('</div>');
  }

  const footnote = ensureParentheses(data.footnote);
  if (footnote) {
    htmlParts.push(
      `<div style="margin-top:24px;font-size:14px;line-height:1.7;color:#444;">${escapeHtml(
        footnote,
      )}</div>`,
    );
  }

  if (carbonCopyText || data.distributionOrg || data.distributionDate) {
    htmlParts.push(
      '<div style="margin-top:48px;border-top:1px solid #d9d9d9;padding-top:16px;font-size:13px;line-height:1.7;color:#555;">',
    );
    if (carbonCopyText) {
      htmlParts.push(`<div>抄送：${escapeHtml(carbonCopyText)}</div>`);
    }
    if (data.distributionOrg) {
      htmlParts.push(`<div>${escapeHtml(data.distributionOrg)}</div>`);
    }
    if (data.distributionDate) {
      htmlParts.push(`<div>${escapeHtml(data.distributionDate)}</div>`);
    }
    htmlParts.push('</div>');
  }

  htmlParts.push('</div>');
  return htmlParts.join('');
};

const renderMultiline = (text: string) => {
  const segments = text.split(/\n+/).filter((segment) => segment.length > 0);
  const segmentCounter = new Map<string, number>();
  return segments.map((segment, index) => (
    <React.Fragment key={takeCountedKey(segment, segmentCounter)}>
      {segment}
      {index < segments.length - 1 && <br />}
    </React.Fragment>
  ));
};

function OfficialDocumentPreview({ data }: { data: OfficialDocumentData }) {
  const metaItems: string[] = [];
  if (data.serialNumber) metaItems.push(`份号：${data.serialNumber}`);
  if (data.secrecyLevel) {
    metaItems.push(
      `密级：${data.secrecyLevel}${data.secrecyPeriod ? `★${data.secrecyPeriod}` : ''
      }`,
    );
  }
  if (data.urgency) metaItems.push(`紧急程度：${data.urgency}`);
  if (data.signer) metaItems.push(`签发人：${data.signer}`);

  const addresseesText =
    data.addressees.length > 0 ? data.addressees.join('、') : undefined;
  const attachments = data.attachments.map(
    (item, index) => (item.startsWith('附件：') ? item : `附件：${index + 1}．${item}`),
  );
  const carbonCopyText =
    data.carbonCopy.length > 0 ? data.carbonCopy.join('、') : undefined;

  const containerStyle: React.CSSProperties = {
    width: '21cm',
    margin: '0 auto',
    background: '#ffffff',
    padding: '48px 78px 32px 78px',
    border: '1px solid #d9d9d9',
    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
    fontFamily:
      '"仿宋", "FangSong", "SimSun", "宋体", "Times New Roman", serif',
    color: '#000',
    position: 'relative',
  };

  const metaRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: '6px 24px',
    fontSize: '12px',
    lineHeight: 1.6,
    color: '#444',
  };

  const bannerStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '28px',
    color: '#c00000',
    letterSpacing: '6px',
    fontWeight: 700,
    margin: '20px 0 10px 0',
    paddingBottom: '12px',
    borderBottom: '4px double #c00000',
  };

  const docNumberStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '16px',
    color: '#000',
    margin: '16px 0 24px',
    fontFamily: '"仿宋", "FangSong", "SimSun", serif',
  };

  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: 1.6,
    color: '#000',
    margin: '32px 0 28px',
    letterSpacing: '2px',
  };

  const addresseesStyle: React.CSSProperties = {
    fontSize: '16px',
    lineHeight: 1.8,
    textAlign: 'left',
    marginBottom: '16px',
  };

  const bodyParagraphStyle: React.CSSProperties = {
    margin: '0 0 16px 0',
    fontSize: '16px',
    lineHeight: 1.9,
    textIndent: '2em',
    textAlign: 'justify',
  };

  const attachmentStyle: React.CSSProperties = {
    fontSize: '15px',
    lineHeight: 1.9,
    marginTop: '24px',
  };

  const signatureStyle: React.CSSProperties = {
    marginTop: '48px',
    fontSize: '16px',
    lineHeight: 1.8,
    textAlign: 'right',
  };

  const footnoteStyle: React.CSSProperties = {
    marginTop: '24px',
    fontSize: '14px',
    lineHeight: 1.7,
    color: '#444',
  };

  const recordSectionStyle: React.CSSProperties = {
    marginTop: '48px',
    borderTop: '1px solid #d9d9d9',
    paddingTop: '16px',
    fontSize: '13px',
    lineHeight: 1.7,
    color: '#555',
  };

  const paragraphKeyCounter = new Map<string, number>();
  const attachmentKeyCounter = new Map<string, number>();

  return (
    <div style={containerStyle}>
      {metaItems.length > 0 && (
        <div style={metaRowStyle}>
          {metaItems.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      )}
      {data.issuerMark && <div style={bannerStyle}>{data.issuerMark}</div>}
      {data.documentNumber && (
        <div style={docNumberStyle}>{data.documentNumber}</div>
      )}
      {data.title && <div style={titleStyle}>{data.title}</div>}
      {addresseesText && (
        <div style={addresseesStyle}>主送机关：{addresseesText}</div>
      )}
      {data.body.length > 0 && (
        <div>
          {data.body.map((paragraph) => (
            <p
              style={bodyParagraphStyle}
              key={takeCountedKey(paragraph, paragraphKeyCounter)}
            >
              {renderMultiline(paragraph)}
            </p>
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <div style={attachmentStyle}>
          {attachments.map((item) => (
            <div key={takeCountedKey(item, attachmentKeyCounter)}>
              {renderMultiline(item)}
            </div>
          ))}
        </div>
      )}
      {(data.issuerName || data.issueDate) && (
        <div style={signatureStyle}>
          {data.issuerName && <div>{data.issuerName}</div>}
          {data.issueDate && <div>{data.issueDate}</div>}
        </div>
      )}
      {ensureParentheses(data.footnote) && (
        <div style={footnoteStyle}>{ensureParentheses(data.footnote)}</div>
      )}
      {(carbonCopyText || data.distributionOrg || data.distributionDate) && (
        <div style={recordSectionStyle}>
          {carbonCopyText && <div>抄送：{carbonCopyText}</div>}
          {data.distributionOrg && <div>{data.distributionOrg}</div>}
          {data.distributionDate && <div>{data.distributionDate}</div>}
        </div>
      )}
    </div>
  );
}

function OfficialDocumentMeta({ data }: { data: OfficialDocumentData }) {
  const secrecyPeriodText = ensureParentheses(data.secrecyPeriod);
  const footnoteText = ensureParentheses(data.footnote);

  const baseItems = [
    { label: '份号', value: data.serialNumber },
    {
      label: '密级',
      value: data.secrecyLevel
        ? `${data.secrecyLevel}${secrecyPeriodText ?? ''}`
        : undefined,
    },
    { label: '紧急程度', value: data.urgency },
    { label: '发文字号', value: data.documentNumber },
    { label: '发文机关标志', value: data.issuerMark },
    { label: '签发人', value: data.signer },
    { label: '成文日期', value: data.issueDate },
    { label: '发文机关署名', value: data.issuerName },
    { label: '印发机关', value: data.distributionOrg },
    { label: '印发日期', value: data.distributionDate },
  ].filter((item) => Boolean(item.value));

  const listItems = [
    { label: '主送机关', values: data.addressees },
    { label: '抄送机关', values: data.carbonCopy },
    { label: '附件', values: data.attachments },
  ].filter((item) => item.values.length > 0);

  const renderList = (items: string[]) => (
    <Space size={[4, 4]} wrap>
      {items.map((item) => (
        <Tag key={item} color="geekblue">
          {item}
        </Tag>
      ))}
    </Space>
  );

  return (
    <Descriptions
      column={{ xs: 1, sm: 1, md: 2 }}
      size="small"
      labelStyle={{ minWidth: 88, color: '#666', fontWeight: 500 }}
      contentStyle={{ color: '#262626' }}
    >
      {data.title && (
        <Descriptions.Item label="标题" span={2}>
          {data.title}
        </Descriptions.Item>
      )}
      {baseItems.map((item) => (
        <Descriptions.Item label={item.label} key={item.label}>
          {item.value}
        </Descriptions.Item>
      ))}
      {listItems.map((item) => (
        <Descriptions.Item label={item.label} span={2} key={item.label}>
          {renderList(item.values)}
        </Descriptions.Item>
      ))}
      {footnoteText && (
        <Descriptions.Item label="附注" span={2}>
          {footnoteText}
        </Descriptions.Item>
      )}
    </Descriptions>
  );
}

const DocumentWriter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [generateAiRate, setGenerateAiRate] = useState<number | null>(null);
  const [optimizeAiRate, setOptimizeAiRate] = useState<number | null>(null);
  const [documentType, setDocumentType] =
    useState<DocumentTypeValue>(DEFAULT_DOCUMENT_TYPE);
  const [scenario, setScenario] = useState<string>('');
  const [titleInput, setTitleInput] = useState('');
  const [lengthOption, setLengthOption] = useState<'short' | 'medium' | 'long'>(
    'medium',
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(true);

  // Prompt 模板相关状态
  const [availablePrompts, setAvailablePrompts] = useState<PromptTemplate[]>(
    [],
  );
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [promptVariableValues, setPromptVariableValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [officialDocumentData, setOfficialDocumentData] =
    useState<OfficialDocumentData | null>(null);
  const [promptPreviewVisible, setPromptPreviewVisible] = useState(false);
  const [previewingPrompt, setPreviewingPrompt] =
    useState<PromptTemplate | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(false);

  // 导出相关状态
  const [exporting, setExporting] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [documentAssets, setDocumentAssets] = useState<DocumentAssets>({});

  // 优化相关状态
  const [optimizeModalVisible, setOptimizeModalVisible] = useState(false);
  const [optimizeInstruction, setOptimizeInstruction] = useState('');
  const [selectedOptimizeTypes, setSelectedOptimizeTypes] = useState<string[]>([
    'all',
  ]);
  const [optimizeHistory, setOptimizeHistory] = useState<
    Array<{
      id: string;
      instruction: string;
      types: string[];
      originalContent: string;
      optimizedContent: string;
      timestamp: Date;
      aiRate: number | null;
    }>
  >([]);

  // 进度条相关状态
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateProgressVisible, setGenerateProgressVisible] = useState(false);
  const [generateProgressText, setGenerateProgressText] = useState('');
  const [optimizeProgress, setOptimizeProgress] = useState(0);
  const [optimizeProgressVisible, setOptimizeProgressVisible] = useState(false);
  const [optimizeProgressText, setOptimizeProgressText] = useState('');

  const selectedPrompts = useMemo(
    () =>
      availablePrompts.filter((prompt) =>
        selectedPromptIds.includes(prompt.id),
      ),
    [availablePrompts, selectedPromptIds],
  );
  const selectedPromptsWithVariables = useMemo(
    () =>
      selectedPrompts.filter(
        (prompt) => prompt.variables && prompt.variables.length > 0,
      ),
    [selectedPrompts],
  );

  useEffect(() => {
    setPromptVariableValues((prev) => {
      const next: Record<string, Record<string, string>> = {};

      selectedPromptsWithVariables.forEach((prompt) => {
        const prevValues = prev[prompt.id] || {};
        const values: Record<string, string> = {};

        prompt.variables?.forEach((variable) => {
          values[variable] = prevValues[variable] ?? '';
        });

        next[prompt.id] = values;
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) {
        return next;
      }

      for (const key of nextKeys) {
        const prevValues = prev[key] || {};
        const nextValues = next[key] || {};

        const prevVarKeys = Object.keys(prevValues);
        const nextVarKeys = Object.keys(nextValues);

        if (prevVarKeys.length !== nextVarKeys.length) {
          return next;
        }

        for (const varKey of nextVarKeys) {
          if (prevValues[varKey] !== nextValues[varKey]) {
            return next;
          }
        }
      }

      return prev;
    });
  }, [selectedPromptsWithVariables]);

  useEffect(() => {
    if (!content.trim()) {
      setPdfPreviewUrl(null);
      setDocumentAssets({});
      setGenerateAiRate(null);
      setOptimizeAiRate(null);
    }
  }, [content]);

  const resolveAssetUrl = (rawUrl: string) => {
    if (!rawUrl) {
      return rawUrl;
    }
    if (/^https?:\/\//i.test(rawUrl)) {
      return rawUrl;
    }
    if (rawUrl.startsWith('//')) {
      return `${window.location.protocol}${rawUrl}`;
    }
    const sanitized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    return `${window.location.origin}${sanitized}`;
  };

  const handlePromptVariableInputChange = (
    promptId: string,
    variable: string,
    value: string,
  ) => {
    setPromptVariableValues((prev) => {
      const previousValues = prev[promptId] || {};
      if (previousValues[variable] === value) {
        return prev;
      }

      return {
        ...prev,
        [promptId]: {
          ...previousValues,
          [variable]: value,
        },
      };
    });
  };

  const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const fillPromptTemplateContent = (template: PromptTemplate) => {
    if (!template.variables || template.variables.length === 0) {
      return template.content;
    }

    const values = promptVariableValues[template.id] || {};
    let filledContent = template.content;

    template.variables.forEach((variable) => {
      const replacement = values[variable]?.trim() ?? '';
      const regex = new RegExp(`\\{\\s*${escapeRegExp(variable)}\\s*\\}`, 'g');
      filledContent = filledContent.replace(regex, replacement);
    });

    return filledContent;
  };

  // 加载 Prompt 模板
  useEffect(() => {
    loadPrompts();
  }, [documentType]);

  const loadPrompts = async () => {
    setPromptsLoading(true);
    try {
      const response = await getPrompts({
        category: documentType,
        isActive: true,
        pageSize: 100,
      });
      const prompts = response.data || [];
      setAvailablePrompts(prompts);
      setSelectedPromptIds((prev) =>
        prev.filter((id) => prompts.some((prompt) => prompt.id === id)),
      );
    } catch (error) {
      console.error('加载 Prompt 模板失败:', error);
    } finally {
      setPromptsLoading(false);
    }
  };

  const formatContentToHTML = (text: string) => {
    if (!text) return '<p><br></p>';

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const applyInlineFormatting = (value: string) => {
      let result = escapeHtml(value);
      result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');
      result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
      result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
      result = result.replace(/\*(\S(?:.*?\S)?)\*/g, '<em>$1</em>');
      result = result.replace(/_(\S(?:.*?\S)?)_/g, '<em>$1</em>');
      return result;
    };

    const lines = text.split('\n');

    let html = '';
    let inList = false;
    let listType: 'ol' | 'ul' | '' = '';
    let isFirstContentLine = true;

    const closeListIfNeeded = () => {
      if (inList) {
        html += `</${listType}>`;
        inList = false;
        listType = '';
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        closeListIfNeeded();
        continue;
      }

      const markContentProcessed = () => {
        if (isFirstContentLine) {
          isFirstContentLine = false;
        }
      };

      // 处理 Markdown 标题
      if (trimmed.startsWith('#')) {
        closeListIfNeeded();

        const level = (trimmed.match(/^#+/) || [''])[0].length;
        const content = applyInlineFormatting(trimmed.replace(/^#+\s*/, ''));

        if (level === 1) {
          html += `<h1 style="text-align: center; font-size: 22px; font-weight: bold; margin: 32px 0 24px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif; letter-spacing: 1px;">${content}</h1>`;
        } else if (level === 2) {
          html += `<h2 style="font-size: 20px; font-weight: bold; margin: 24px 0 16px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif; padding-left: 0;">${content}</h2>`;
        } else {
          html += `<h3 style="font-size: 18px; font-weight: bold; margin: 20px 0 12px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif; padding-left: 0;">${content}</h3>`;
        }

        markContentProcessed();
        continue;
      }

      // 处理首行以 Markdown 粗体包裹的标题
      if (isFirstContentLine) {
        const boldTitleMatch = trimmed.match(/^(\*\*|__)(.+?)(\*\*|__)$/);
        if (boldTitleMatch) {
          closeListIfNeeded();
          const content = applyInlineFormatting(boldTitleMatch[2]);
          html += `<h1 style="text-align: center; font-size: 22px; font-weight: bold; margin: 32px 0 24px 0; color: #000; font-family: '黑体', 'SimHei', sans-serif; letter-spacing: 1px;">${content}</h1>`;
          markContentProcessed();
          continue;
        }
      }

      // 处理有序列表（1. 或 一、）
      if (/^(\d+[.)]|[\u4e00-\u9fa5][、．])/.test(trimmed)) {
        if (!inList || listType !== 'ol') {
          closeListIfNeeded();
          html +=
            '<ol style="margin: 12px 0; padding-left: 2em; line-height: 1.8;">';
          inList = true;
          listType = 'ol';
        }
        const content = applyInlineFormatting(
          trimmed.replace(/^(\d+[.)]|[\u4e00-\u9fa5][、．])\s*/, ''),
        );
        html += `<li style="margin: 8px 0; font-size: 16px; color: #000;">${content}</li>`;
        markContentProcessed();
        continue;
      }

      // 处理无序列表（- 或 •）
      if (/^[-*•·]\s/.test(trimmed)) {
        if (!inList || listType !== 'ul') {
          closeListIfNeeded();
          html +=
            '<ul style="margin: 12px 0; padding-left: 2em; line-height: 1.8; list-style-type: disc;">';
          inList = true;
          listType = 'ul';
        }
        const content = applyInlineFormatting(
          trimmed.replace(/^[-*•·]\s*/, ''),
        );
        html += `<li style="margin: 8px 0; font-size: 16px; color: #000;">${content}</li>`;
        markContentProcessed();
        continue;
      }

      // 关闭列表
      closeListIfNeeded();

      const formattedText = applyInlineFormatting(trimmed);

      // 处理普通段落
      if (trimmed.match(/^(特此|此致|附件|抄送|印发|日期|时间|年月日)/)) {
        html += `<p style="text-align: right; line-height: 1.8; margin: 8px 0 4px 0; font-size: 16px; color: #000; padding-right: 2em;">${formattedText}</p>`;
      } else if (trimmed.match(/^[\u4e00-\u9fa5]+[：:]\s*$/)) {
        html += `<p style="font-weight: bold; font-size: 17px; margin: 12px 0 4px 0; color: #000; padding-left: 0; text-indent: 0;">${formattedText}</p>`;
      } else {
        html += `<p style="text-indent: 2em; line-height: 1.8; margin: 0; font-size: 16px; color: #000; text-align: justify;">${formattedText}</p>`;
      }

      markContentProcessed();
    }

    closeListIfNeeded();

    return html;
  };

  // 模拟进度条
  const simulateProgress = (
    setProgress: (value: number) => void,
    setText: (value: string) => void,
    stages: { progress: number; text: string; duration: number }[],
  ) => {
    return new Promise<void>((resolve) => {
      let currentStage = 0;

      const advanceStage = () => {
        if (currentStage >= stages.length) {
          resolve();
          return;
        }

        const stage = stages[currentStage];
        setProgress(stage.progress);
        setText(stage.text);

        currentStage++;
        setTimeout(advanceStage, stage.duration);
      };

      advanceStage();
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      message.warning('请输入文档主题或描述');
      return;
    }

    const previousGenerateAiRate = generateAiRate;
    setGenerateAiRate(null);

    setLoading(true);
    setGenerateProgressVisible(true);
    setGenerateProgress(0);

    try {
      // 启动进度条动画（总计约25秒，前期时间更长）
      const progressPromise = simulateProgress(
        setGenerateProgress,
        setGenerateProgressText,
        [
          { progress: 5, text: '正在初始化 AI 模型...', duration: 2000 },
          { progress: 12, text: '正在分析需求和上下文...', duration: 2500 },
          { progress: 20, text: '正在理解文档要求...', duration: 2800 },
          { progress: 30, text: '正在构建文档框架...', duration: 3000 },
          { progress: 42, text: '正在构思核心内容...', duration: 3200 },
          { progress: 55, text: '正在生成文档正文...', duration: 3500 },
          { progress: 68, text: '正在优化语言表达...', duration: 2800 },
          { progress: 80, text: '正在完善细节内容...', duration: 2200 },
          { progress: 88, text: '正在检查格式规范...', duration: 1800 },
          { progress: 95, text: '正在最后润色调整...', duration: 1500 },
        ],
      );

      // 合并选中的 Prompt 模板
      const promptsContent = selectedPrompts
        .map(
          (p) => `\n[模板: ${p.name}]\n${fillPromptTemplateContent(p)}`,
        )
        .join('\n\n');

      const filesContent = uploadedFiles
        .map((f) => `\n[附加素材: ${f.name}]`)
        .join('');

      const documentTypeLabel = getDocumentTypeLabel(documentType);
      const scenarioLabel =
        scenario && scenario.length > 0
          ? getScenarioLabel(documentType, scenario)
          : '未指定';
      const lengthMap = {
        short: '500字',
        medium: '1000字',
        long: '2000字',
      };

      const displayLength = lengthMap[lengthOption];

      const finalPrompt = `${promptsContent ? `${promptsContent}\n\n` : ''}${prompt}\n类型: ${documentTypeLabel}\n场景: ${scenarioLabel}\n字数要求：正文长度务必控制在${displayLength}左右，请尽量完成至该长度要求。\n${filesContent}`;

      console.log(finalPrompt);

      const response = await aiWriteDocument({
        title: titleInput || prompt.split('\n')[0] || '未命名文档',
        requirement: prompt,
        prompt: finalPrompt,
        documentType,
        tone: 'formal',
        language: 'zh-CN',
      });

      // 等待进度条完成
      await progressPromise;

      // 显示完成状态
      setGenerateProgress(100);
      setGenerateProgressText('生成完成！');

      const generatedContent = response.data?.content || '';
      const pdfPathFromResponse =
        response.data?.pdfPath || response.data?.pdfUrl || null;
      const wordPathFromResponse =
        response.data?.docxPath || response.data?.wordUrl || null;
      const resolvedPdfUrl = pdfPathFromResponse
        ? resolveAssetUrl(pdfPathFromResponse)
        : null;
      const resolvedWordUrl = wordPathFromResponse
        ? resolveAssetUrl(wordPathFromResponse)
        : undefined;
      const aiRateValue = normalizeAiRateValue(
        response.data?.aiRate ?? response.data?.ai_rate,
      );
      setGenerateAiRate(aiRateValue);
      setOptimizeAiRate(null);

      setDocumentAssets({
        pdfUrl: resolvedPdfUrl ?? undefined,
        wordUrl: resolvedWordUrl,
        pdfPath: pdfPathFromResponse ?? undefined,
        wordPath: wordPathFromResponse ?? undefined,
      });
      setPdfPreviewUrl(resolvedPdfUrl);

      let mappedData: OfficialDocumentData | null = null;
      let normalizedText = generatedContent;
      let normalizedHtml = formatContentToHTML(generatedContent);

      const trimmed = generatedContent.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            mappedData = mapOfficialDocumentData(parsed as Record<string, unknown>);
            normalizedText = buildOfficialDocumentText(mappedData);
            normalizedHtml = buildOfficialDocumentHTML(mappedData);
          }
        } catch (parseError) {
          console.warn(
            'Failed to parse generated content as official document JSON:',
            parseError,
          );
        }
      }

      setOfficialDocumentData(mappedData);
      setContent(normalizedText);
      setHtmlContent(normalizedHtml);

      // 延迟隐藏进度条
      setTimeout(() => {
        setGenerateProgressVisible(false);
        message.success('文档生成成功');
      }, 800);
    } catch (error) {
      setGenerateAiRate(previousGenerateAiRate);
      setGenerateProgressVisible(false);
      message.error('生成失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 打开优化对话框
  const handleOpenOptimizeModal = () => {
    if (!content.trim()) {
      message.warning('请先生成文档内容');
      return;
    }
    setOptimizeModalVisible(true);
  };

  // 执行优化
  const handleOptimize = async () => {
    if (!content.trim()) {
      message.warning('请先生成文档内容');
      return;
    }

    const previousOptimizeAiRate = optimizeAiRate;
    setOptimizeAiRate(null);

    setLoading(true);
    setOptimizeModalVisible(false);
    setOptimizeProgressVisible(true);
    setOptimizeProgress(0);

    try {
      // 启动进度条动画（总计约25秒，前期时间更长）
      const progressPromise = simulateProgress(
        setOptimizeProgress,
        setOptimizeProgressText,
        [
          { progress: 6, text: '正在读取原文...', duration: 2000 },
          { progress: 15, text: '正在深度分析文档...', duration: 2500 },
          { progress: 25, text: '正在理解优化需求...', duration: 2800 },
          { progress: 36, text: '正在识别优化点...', duration: 3000 },
          { progress: 48, text: '正在智能改写内容...', duration: 3500 },
          { progress: 62, text: '正在优化表达方式...', duration: 3200 },
          { progress: 75, text: '正在润色语言风格...', duration: 2800 },
          { progress: 85, text: '正在检查语法逻辑...', duration: 2200 },
          { progress: 92, text: '正在完善细节...', duration: 1800 },
          { progress: 96, text: '正在最终调整...', duration: 1500 },
        ],
      );

      const originalContent = content;
      const response = await aiOptimizeDocument({
        content,
        optimizationType: selectedOptimizeTypes.includes('all')
          ? 'all'
          : (selectedOptimizeTypes[0] as any),
        customInstruction: optimizeInstruction,
        context: {
          documentType,
          documentTypeLabel: getDocumentTypeLabel(documentType),
          scenario,
          scenarioLabel:
            scenario && scenario.length > 0
              ? getScenarioLabel(documentType, scenario)
              : undefined,
        },
      });

      // 等待进度条完成
      await progressPromise;

      // 显示完成状态
      setOptimizeProgress(100);
      setOptimizeProgressText('优化完成！');

      const optimizedContent = response.data?.content || '';
      const aiRateValue = normalizeAiRateValue(
        response.data?.aiRate ?? response.data?.ai_rate,
      );
      setOptimizeAiRate(aiRateValue);
      setContent(optimizedContent);
      setHtmlContent(formatContentToHTML(optimizedContent));

      // ⭐ 修改这部分:优化后也自动获取并显示PDF(与 handleGenerate 的逻辑一致)
      const pdfPathFromResponse =
        response.data?.pdfPath ||
        response.data?.pdfUrl ||
        null;
      const wordPathFromResponse =
        response.data?.docxPath ||
        response.data?.wordPath ||
        response.data?.wordUrl ||
        null;
      const resolvedPdfUrl = pdfPathFromResponse
        ? resolveAssetUrl(pdfPathFromResponse)
        : null;
      const resolvedWordUrl = wordPathFromResponse
        ? resolveAssetUrl(wordPathFromResponse)
        : undefined;

      setDocumentAssets({
        pdfUrl: resolvedPdfUrl ?? undefined,
        wordUrl: resolvedWordUrl,
        pdfPath: pdfPathFromResponse ?? undefined,
        wordPath: wordPathFromResponse ?? undefined,
      });
      setPdfPreviewUrl(resolvedPdfUrl);

      // 保存到优化历史
      const historyItem = {
        id: Date.now().toString(),
        instruction: optimizeInstruction || '智能优化',
        types: [...selectedOptimizeTypes],
        originalContent,
        optimizedContent,
        timestamp: new Date(),
        aiRate: aiRateValue,
      };
      setOptimizeHistory([historyItem, ...optimizeHistory.slice(0, 9)]); // 只保留最近10条

      // 延迟隐藏进度条
      setTimeout(() => {
        setOptimizeProgressVisible(false);
        message.success('文档优化成功');
      }, 800);

      setOptimizeInstruction(''); // 清空输入
    } catch (error) {
      setOptimizeAiRate(previousOptimizeAiRate);
      setOptimizeProgressVisible(false);
      message.error('优化失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 撤销优化（恢复到上一个版本）
  const handleUndoOptimize = () => {
    if (optimizeHistory.length === 0) {
      message.warning('没有可撤销的优化记录');
      return;
    }

    const [lastHistory, ...restHistory] = optimizeHistory;
    setContent(lastHistory.originalContent);
    setHtmlContent(formatContentToHTML(lastHistory.originalContent));
    setOptimizeHistory(restHistory);
    setOptimizeAiRate(restHistory[0]?.aiRate ?? null);
    message.success('已撤销优化');
  };

  // 渲染差异对比内容
  const renderDiffContent = (oldText: string, newText: string) => {
    // 使用按字符对比，获得最精确的差异
    const changes = Diff.diffChars(oldText, newText);

    return (
      <div
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          lineHeight: '2',
          padding: '16px',
          background: '#fff',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          maxHeight: '400px',
          overflow: 'auto',
          fontSize: '14px',
        }}
      >
        {changes.map((part, index) => {
          // 生成唯一的 key：结合索引、类型和内容片段
          const keyPrefix = part.added ? 'add' : part.removed ? 'del' : 'keep';
          const uniqueKey = `${keyPrefix}-${index}-${part.value.substring(0, 20).replace(/\s/g, '_')}`;

          // 如果是新增的内容
          if (part.added) {
            return (
              <span
                key={uniqueKey}
                style={{
                  backgroundColor: '#d4edda',
                  color: '#155724',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  fontWeight: '500',
                }}
              >
                {part.value}
              </span>
            );
          }

          // 如果是删除的内容
          if (part.removed) {
            return (
              <span
                key={uniqueKey}
                style={{
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  textDecoration: 'line-through',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  fontWeight: '500',
                }}
              >
                {part.value}
              </span>
            );
          }

          // 未改变的内容
          return <span key={uniqueKey}>{part.value}</span>;
        })}
      </div>
    );
  };

  // 查看优化对比
  const handleCompareOptimize = (historyItem: (typeof optimizeHistory)[0]) => {
    const optimizeTypeLabels: Record<string, string> = {
      all: '全面优化',
      grammar: '语法',
      style: '风格',
      clarity: '清晰度',
      logic: '逻辑',
      format: '格式',
      tone: '语气',
    };

    Modal.info({
      title: '优化对比',
      width: 1000,
      icon: null,
      content: (
        <div>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 字数统计卡片 - 放在最前面 */}
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                color: '#fff',
              }}
            >
              <Row gutter={24} align="middle">
                <Col span={8} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      opacity: 0.9,
                      marginBottom: '4px',
                    }}
                  >
                    优化前
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                    {historyItem.originalContent.length}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>字</div>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', opacity: 0.9 }}>→</div>
                  <div
                    style={{
                      fontSize: '14px',
                      marginTop: '4px',
                      fontWeight: 'bold',
                    }}
                  >
                    {historyItem.optimizedContent.length -
                      historyItem.originalContent.length >
                      0
                      ? '增加'
                      : historyItem.optimizedContent.length -
                        historyItem.originalContent.length <
                        0
                        ? '减少'
                        : '不变'}{' '}
                    {Math.abs(
                      historyItem.optimizedContent.length -
                      historyItem.originalContent.length,
                    )}
                    {' 字'}
                  </div>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      opacity: 0.9,
                      marginBottom: '4px',
                    }}
                  >
                    优化后
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                    {historyItem.optimizedContent.length}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>字</div>
                </Col>
              </Row>
            </div>

            <div>
              <strong>优化指令：</strong>
              <span style={{ marginLeft: '8px', color: '#666' }}>
                {historyItem.instruction || '全面优化'}
              </span>
            </div>

            <div>
              <strong>优化类型：</strong>
              <Space style={{ marginLeft: '8px' }}>
                {historyItem.types.map((t) => (
                  <Tag key={t} color="blue">
                    {optimizeTypeLabels[t] || t}
                  </Tag>
                ))}
              </Space>
            </div>

            {historyItem.aiRate !== null &&
              historyItem.aiRate !== undefined && (
                <div>
                  <strong>AI率：</strong>
                  <Tag color="purple" style={{ marginLeft: '8px' }}>
                    {formatAiRateDisplay(historyItem.aiRate)}
                  </Tag>
                </div>
              )}

            <div>
              <strong>差异高亮：</strong>
              <div style={{ marginTop: '8px' }}>
                <Space size="small" style={{ marginBottom: '8px' }}>
                  <Tag color="success">新增内容</Tag>
                  <Tag color="error">删除内容</Tag>
                </Space>
                {renderDiffContent(
                  historyItem.originalContent,
                  historyItem.optimizedContent,
                )}
              </div>
            </div>

            {/* 并排对比视图 */}
            <div>
              <strong>详细对比：</strong>
              <Row gutter={16} style={{ marginTop: '8px' }}>
                <Col span={12}>
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#f5f5f5',
                      borderRadius: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    <strong style={{ color: '#999' }}>优化前</strong>
                  </div>
                  <div
                    style={{
                      maxHeight: '300px',
                      overflow: 'auto',
                      background: '#fafafa',
                      padding: '12px',
                      borderRadius: '4px',
                      border: '1px solid #d9d9d9',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.8',
                    }}
                  >
                    {historyItem.originalContent}
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      padding: '8px 12px',
                      background: '#e6f7ff',
                      borderRadius: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    <strong style={{ color: '#1890ff' }}>优化后</strong>
                  </div>
                  <div
                    style={{
                      maxHeight: '300px',
                      overflow: 'auto',
                      background: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '4px',
                      border: '1px solid #91d5ff',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.8',
                    }}
                  >
                    {historyItem.optimizedContent}
                  </div>
                </Col>
              </Row>
            </div>

            <div
              style={{
                padding: '8px 12px',
                background: '#f0f0f0',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#666',
                textAlign: 'center',
              }}
            >
              <span>
                优化时间：
                {new Date(historyItem.timestamp).toLocaleString('zh-CN')}
              </span>
            </div>
          </Space>
        </div>
      ),
      okText: '关闭',
    });
  };

  const handleCopy = () => {
    if (!content.trim()) {
      message.warning('暂无可复制内容');
      return;
    }
    if (!navigator.clipboard) {
      message.error('当前环境暂不支持快速复制');
      return;
    }
    navigator.clipboard
      .writeText(content)
      .then(() => message.success('已复制到剪贴板'))
      .catch(() => message.error('复制失败，请重试'));
  };

  const handleSaveToCloud = () => {
    if (!content.trim()) {
      message.warning('请先生成文档内容');
      return;
    }
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!titleInput.trim()) {
      message.warning('请输入文档标题');
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    try {
      const textContent = content;
      const blob = new Blob([textContent], { type: 'text/plain' });
      const file = new File([blob], `${titleInput}.txt`, {
        type: 'text/plain',
      });
      const result = await ossStorageService.uploadFile(file, {
        folder: 'documents',
        onProgress: (percent) => setUploadProgress(percent),
      });
      const newDoc: SavedDocument = {
        id: Date.now().toString(),
        title: titleInput,
        content: textContent,
        type: documentType,
        scenario,
        url: result.url,
        createdAt: new Date(),
        size: result.size,
        pdfUrl: documentAssets.pdfUrl,
        wordUrl: documentAssets.wordUrl,
        pdfPath: documentAssets.pdfPath,
        wordPath: documentAssets.wordPath,
      };
      setSavedDocs([newDoc, ...savedDocs]);
      message.success('文档已保存到云端');
      setShowSaveModal(false);
      setTitleInput('');
    } catch (error: any) {
      message.error(error.message || '保存失败');
      console.error(error);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = (doc: SavedDocument) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('下载成功');
  };

  const handleDelete = (docId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个文档吗？',
      onOk: () => {
        setSavedDocs(savedDocs.filter((d) => d.id !== docId));
        message.success('文档已删除');
      },
    });
  };

  const handleLoadDocument = (doc: SavedDocument) => {
    setOfficialDocumentData(null);
    setGenerateAiRate(null);
    setOptimizeAiRate(null);
    const nextAssets: DocumentAssets = {};
    const pdfSource = doc.pdfPath || doc.pdfUrl;
    if (pdfSource) {
      nextAssets.pdfPath = doc.pdfPath;
      nextAssets.pdfUrl = resolveAssetUrl(pdfSource);
    }
    const wordSource = doc.wordPath || doc.wordUrl;
    if (wordSource) {
      nextAssets.wordPath = doc.wordPath;
      nextAssets.wordUrl = resolveAssetUrl(wordSource);
    }
    setDocumentAssets(nextAssets);
    setPdfPreviewUrl(nextAssets.pdfUrl ?? null);
    setContent(doc.content);
    setHtmlContent(formatContentToHTML(doc.content));
    const matchedType = isDocumentTypeValue(doc.type)
      ? doc.type
      : DEFAULT_DOCUMENT_TYPE;
    setDocumentType(matchedType);
    const availableScenarios = SCENARIO_OPTIONS[matchedType] ?? [];
    const matchedScenario = availableScenarios.some(
      (item) => item.value === doc.scenario,
    )
      ? doc.scenario ?? ''
      : '';
    setScenario(matchedScenario || '');
    message.success('文档已加载');
  };

  // 导出为 PDF
  const handleExportPDF = async () => {
    if (!content.trim()) {
      message.warning('请先生成文档内容');
      return;
    }

    const existingPdfUrl =
      documentAssets.pdfUrl ||
      (documentAssets.pdfPath
        ? resolveAssetUrl(documentAssets.pdfPath)
        : undefined);
    if (existingPdfUrl) {
      const targetUrl = resolveAssetUrl(existingPdfUrl);
      window.open(targetUrl, '_blank');
      message.success('PDF 导出成功');
      return;
    }

    const exportTitle = titleInput || '未命名文档';

    setExporting(true);
    try {
      const response = await exportToPDF(content, exportTitle, {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: {
          top: 2.54,
          right: 3.18,
          bottom: 2.54,
          left: 3.18,
        },
        fontFamily: 'SimSun',
        fontSize: 16,
        lineHeight: 1.75,
      });

      if (response.success && response.data) {
        message.success('PDF 导出成功');
        // 触发下载
        const resolvedUrl = resolveAssetUrl(response.data.url);
        setDocumentAssets((prev) => ({
          ...prev,
          pdfUrl: resolvedUrl,
          pdfPath: response.data.url ?? prev.pdfPath,
        }));
        window.open(resolvedUrl, '_blank');
      } else {
        message.error(response.errorMessage || 'PDF 导出失败');
      }
    } catch (error) {
      message.error('PDF 导出失败，请重试');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleGeneratePdfPreview = async () => {
    if (!content.trim()) {
      message.warning('请先生成文档内容');
      return;
    }

    const existingPdfUrl =
      documentAssets.pdfUrl ||
      (documentAssets.pdfPath
        ? resolveAssetUrl(documentAssets.pdfPath)
        : undefined);
    if (existingPdfUrl) {
      const resolvedUrl = resolveAssetUrl(existingPdfUrl);
      setPdfPreviewUrl(resolvedUrl);
      message.success('PDF 预览已准备好');
      return;
    }

    const previewTitle = titleInput || '未命名文档';

    setPdfPreviewLoading(true);
    try {
      const response = await exportToPDF(content, previewTitle, {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: {
          top: 2.54,
          right: 3.18,
          bottom: 2.54,
          left: 3.18,
        },
        fontFamily: 'SimSun',
        fontSize: 16,
        lineHeight: 1.75,
      });

      if (response.success && response.data?.url) {
        const resolvedUrl = resolveAssetUrl(response.data.url);
        setPdfPreviewUrl(resolvedUrl);
        setDocumentAssets((prev) => ({
          ...prev,
          pdfUrl: resolvedUrl,
          pdfPath: response.data?.url ?? prev.pdfPath,
        }));
        message.success('PDF 预览生成成功');
      } else {
        message.error(response.errorMessage || 'PDF 预览生成失败');
      }
    } catch (error) {
      message.error('PDF 预览生成失败，请重试');
      console.error(error);
    } finally {
      setPdfPreviewLoading(false);
    }
  };

  // 导出为 Word
  const handleExportWord = async () => {
    if (!content.trim()) {
      message.warning('请先生成文档内容');
      return;
    }

    const existingWordUrl =
      documentAssets.wordUrl ||
      (documentAssets.wordPath
        ? resolveAssetUrl(documentAssets.wordPath)
        : undefined);
    if (existingWordUrl) {
      const targetUrl = resolveAssetUrl(existingWordUrl);
      window.open(targetUrl, '_blank');
      message.success('Word 文档导出成功');
      return;
    }

    const exportTitle = titleInput || '未命名文档';

    setExporting(true);
    try {
      const response = await exportToWord(content, exportTitle, {
        fontFamily: 'SimSun',
        fontSize: 16,
        lineHeight: 1.75,
      });

      if (response.success && response.data) {
        message.success('Word 文档导出成功');
        // 触发下载
        const resolvedUrl = resolveAssetUrl(response.data.url);
        setDocumentAssets((prev) => ({
          ...prev,
          wordUrl: resolvedUrl,
          wordPath: response.data.url ?? prev.wordPath,
        }));
        window.open(resolvedUrl, '_blank');
      } else {
        message.error(response.errorMessage || 'Word 导出失败');
      }
    } catch (error) {
      message.error('Word 导出失败，请重试');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  // 导出为 TXT
  const handleExportText = async () => {
    if (!content.trim()) {
      message.warning('请先生成文档内容');
      return;
    }

    const exportTitle = titleInput || '未命名文档';

    setExporting(true);
    try {
      const response = await exportToText(content, exportTitle);

      if (response.success && response.data) {
        message.success('文本文件导出成功');
        // 触发下载
        window.open(response.data.url, '_blank');
      } else {
        message.error(response.errorMessage || '文本导出失败');
      }
    } catch (error) {
      message.error('文本导出失败，请重试');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  // 导出菜单项
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'pdf',
      label: '导出为 PDF',
      icon: <FilePdfOutlined />,
      onClick: handleExportPDF,
    },
    {
      key: 'word',
      label: '导出为 Word',
      icon: <FileWordOutlined />,
      onClick: handleExportWord,
    },
    {
      key: 'txt',
      label: '导出为 TXT',
      icon: <FileTextOutlined />,
      onClick: handleExportText,
    },
  ];

  const renderPdfPreviewSection = () => {

    const previewUrl =
      pdfPreviewUrl ||
      (documentAssets.pdfUrl
        ? resolveAssetUrl(documentAssets.pdfUrl)
        : documentAssets.pdfPath
          ? resolveAssetUrl(documentAssets.pdfPath)
          : null);
    const wordDownloadUrl =
      documentAssets.wordUrl
        ? resolveAssetUrl(documentAssets.wordUrl)
        : documentAssets.wordPath
          ? resolveAssetUrl(documentAssets.wordPath)
          : undefined;

    return (
      <div
        style={{
          background: '#ffffff',
          padding: '24px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            PDF 预览
          </Title>
          <Space size="small">
            {wordDownloadUrl && (
              <Button
                size="small"
                icon={<FileWordOutlined />}
                onClick={() => window.open(wordDownloadUrl, '_blank')}
              >
                下载 Word
              </Button>
            )}
            {previewUrl && (
              <Button
                size="small"
                icon={<ExportOutlined />}
                onClick={() => window.open(previewUrl, '_blank')}
              >
                新窗口打开
              </Button>
            )}
            <Button
              size="small"
              type="primary"
              icon={<FilePdfOutlined />}
              loading={pdfPreviewLoading}
              onClick={handleGeneratePdfPreview}
            >
              {previewUrl ? '刷新预览' : '生成预览'}
            </Button>
          </Space>
        </div>
        <div
          style={{
            position: 'relative',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            minHeight: '640px',
            height: '72vh',
            maxHeight: '960px',
            background: '#f8f9fb',
            overflow: 'hidden',
          }}
        >
          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={`${previewUrl}#toolbar=0`}
              title="PDF Preview"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#fff',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8c8c8c',
                fontSize: '14px',
                textAlign: 'center',
                padding: '24px',
              }}
            >
              生成 PDF 预览以查看版式效果
            </div>
          )}
          {pdfPreviewLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Spin tip="正在生成 PDF..." />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PageContainer
      header={{
        title: 'AI 公文生成器',
        subTitle: '智能写作，高效办公',
      }}
    >
      <div style={{ position: 'relative' }}>
        <Row gutter={[16, 16]}>
          {/* 左侧：文档编辑器 */}
          <Col xs={24} lg={settingsPanelOpen ? 16 : 24}>
            <Space
              direction="vertical"
              size="large"
              style={{ width: '100%' }}
            >
              <ProCard bordered>
                <Spin spinning={loading}>
                  <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                    size="middle"
                  >
                    {(generateAiRate !== null || optimizeAiRate !== null) && (
                      <div
                        style={{
                          background:
                            'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)',
                          border: '1px solid rgba(173,198,255,0.6)',
                          borderRadius: '8px',
                          padding: '16px 20px',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${generateAiRate !== null && optimizeAiRate !== null
                              ? 2
                              : 1
                              }, minmax(0, 1fr))`,
                            gap: '16px',
                          }}
                        >
                          {generateAiRate !== null && (
                            <div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#1d39c4',
                                  letterSpacing: '0.5px',
                                  marginBottom: '4px',
                                  fontWeight: 500,
                                }}
                              >
                                生成 AI率
                              </div>
                              <div
                                style={{
                                  fontSize: '28px',
                                  fontWeight: 700,
                                  color: '#2f54eb',
                                  lineHeight: 1.1,
                                }}
                              >
                                {formatAiRateDisplay(generateAiRate)}
                              </div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#597ef7',
                                  marginTop: '4px',
                                }}
                              >
                                本次生成内容的 AI 占比
                              </div>
                            </div>
                          )}
                          {optimizeAiRate !== null && (
                            <div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#531dab',
                                  letterSpacing: '0.5px',
                                  marginBottom: '4px',
                                  fontWeight: 500,
                                }}
                              >
                                优化 AI率
                              </div>
                              <div
                                style={{
                                  fontSize: '28px',
                                  fontWeight: 700,
                                  color: '#722ed1',
                                  lineHeight: 1.1,
                                }}
                              >
                                {formatAiRateDisplay(optimizeAiRate)}
                              </div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: '#9254de',
                                  marginTop: '4px',
                                }}
                              >
                                最近优化后内容的 AI 占比
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* 操作区 */}
                    <div
                      style={{
                        background: '#f3f4f6',
                        padding: '12px 16px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Space size="small" wrap>
                        <Dropdown
                          menu={{ items: exportMenuItems }}
                          placement="bottomRight"
                          disabled={!content || exporting}
                        >
                          <Button
                            size="small"
                            icon={<ExportOutlined />}
                            loading={exporting}
                            disabled={!content}
                          >
                            导出
                          </Button>
                        </Dropdown>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CloudUploadOutlined />}
                          onClick={handleSaveToCloud}
                          disabled={!content}
                        >
                          保存
                        </Button>
                      </Space>
                    </div>

                    {/* 公文预览 */}
                    <div
                      style={{
                        background: '#f4f5f7',
                        padding: '32px 24px',
                        borderRadius: '6px',
                        minHeight: '640px',
                      }}
                    >
                      {officialDocumentData ? (
                        <Space
                          direction="vertical"
                          size="large"
                          style={{ width: '100%' }}
                        >
                          <OfficialDocumentMeta data={officialDocumentData} />
                          <div
                            style={{
                              background: '#ffffff',
                              padding: '24px',
                              borderRadius: '6px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              overflowX: 'auto',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <OfficialDocumentPreview data={officialDocumentData} />
                            </div>
                          </div>
                          {renderPdfPreviewSection()}
                        </Space>
                      ) : content ? (
                        <Space
                          direction="vertical"
                          size="large"
                          style={{ width: '100%' }}
                        >
                          <div
                            style={{
                              background: '#ffffff',
                              padding: '24px',
                              borderRadius: '6px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              overflowX: 'auto',
                            }}
                          >
                            <div
                              style={{
                                maxWidth: '21cm',
                                width: '100%',
                                margin: '0 auto',
                                background: '#ffffff',
                                padding: '32px 48px',
                                border: '1px solid #d9d9d9',
                                boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                                fontFamily:
                                  '"仿宋", "FangSong", "SimSun", "宋体", "Times New Roman", serif',
                                color: '#000',
                                lineHeight: 1.8,
                              }}
                              // biome-ignore lint/security/noDangerouslySetInnerHtml: 公文预览需要渲染富文本内容
                              dangerouslySetInnerHTML={{
                                __html:
                                  htmlContent ||
                                  '<p style="text-align:center;color:#999;">暂无内容</p>',
                              }}
                            />
                          </div>
                          {renderPdfPreviewSection()}
                        </Space>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '240px',
                            background: '#fafafa',
                            borderRadius: '6px',
                            border: '1px dashed #d9d9d9',
                            color: '#8c8c8c',
                            fontSize: '14px',
                            textAlign: 'center',
                            padding: '24px',
                          }}
                        >
                          生成文档后可在此查看公文预览和制式要素
                        </div>
                      )}
                    </div>
                  </Space>
                </Spin>
              </ProCard>
            </Space>
          </Col>

          {/* 右侧：设置面板 */}
          {settingsPanelOpen && (
            <Col xs={24} lg={8}>
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="middle"
              >
                {/* 文档设置 */}
                <ProCard title="文档设置" bordered>
                  <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                    size="middle"
                  >
                    <div>
                      <Title level={5}>公文类型</Title>
                      <Select<DocumentTypeValue>
                        value={documentType}
                        onChange={(val) => {
                          const matchedType =
                            DOCUMENT_TYPE_OPTIONS.find(
                              (option) => option.value === val,
                            )?.value ?? DEFAULT_DOCUMENT_TYPE;
                          setDocumentType(matchedType);
                          setScenario('');
                        }}
                        style={{ width: '100%' }}
                        options={DOCUMENT_TYPE_OPTIONS}
                      />
                    </div>

                    <div>
                      <Title level={5}>写作场景</Title>
                      <Select
                        value={scenario || undefined}
                        onChange={(value) => setScenario(value ?? '')}
                        style={{ width: '100%' }}
                        placeholder="选择场景"
                        options={SCENARIO_OPTIONS[documentType] || []}
                        allowClear
                      />
                    </div>

                    <div>
                      <Title level={5}>公文标题</Title>
                      <Input
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        placeholder="请输入公文标题"
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <Title level={5}>字数</Title>
                      <Select
                        value={lengthOption}
                        onChange={setLengthOption}
                        style={{ width: '100%' }}
                        options={[
                          { label: '短 (500字左右)', value: 'short' },
                          { label: '中 (1000字左右)', value: 'medium' },
                          { label: '长 (2000字以上)', value: 'long' },
                        ]}
                      />
                    </div>

                    <div>
                      <Title level={5}>写作素材（可选）</Title>
                      <Upload
                        beforeUpload={(file) => {
                          setUploadedFiles([...uploadedFiles, file]);
                          return false;
                        }}
                        multiple
                        fileList={uploadedFiles.map((f, idx) => ({
                          uid: `${f.name}-${idx}`,
                          name: f.name,
                          status: 'done' as const,
                        }))}
                        onRemove={(file) => {
                          const idx = uploadedFiles.findIndex(
                            (f, i) => `${f.name}-${i}` === file.uid,
                          );
                          if (idx > -1) {
                            const newFiles = [...uploadedFiles];
                            newFiles.splice(idx, 1);
                            setUploadedFiles(newFiles);
                          }
                        }}
                      >
                        <Button icon={<UploadOutlined />} block size="small">
                          添加文件
                        </Button>
                      </Upload>
                    </div>

                    <div>
                      <Title level={5}>Prompt 模板（可选）</Title>
                      <Spin spinning={promptsLoading}>
                        {availablePrompts.length > 0 ? (
                          <Checkbox.Group
                            value={selectedPromptIds}
                            onChange={(values) =>
                              setSelectedPromptIds(values as string[])
                            }
                            style={{ width: '100%' }}
                          >
                            <Space
                              direction="vertical"
                              style={{ width: '100%' }}
                              size="small"
                            >
                              {availablePrompts.map((prompt) => (
                                <div
                                  key={prompt.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '8px',
                                    background: '#f5f5f5',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <Checkbox value={prompt.id}>
                                    <Space direction="vertical" size={0}>
                                      <span style={{ fontWeight: 500 }}>
                                        {prompt.name}
                                      </span>
                                      {prompt.description && (
                                        <span
                                          style={{
                                            fontSize: '12px',
                                            color: '#666',
                                          }}
                                        >
                                          {prompt.description}
                                        </span>
                                      )}
                                    </Space>
                                  </Checkbox>
                                  <Tooltip title="预览">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<EyeOutlined />}
                                      style={{ marginLeft: 'auto' }}
                                      onClick={() => {
                                        setPreviewingPrompt(prompt);
                                        setPromptPreviewVisible(true);
                                      }}
                                    />
                                  </Tooltip>
                                </div>
                              ))}
                            </Space>
                          </Checkbox.Group>
                        ) : (
                          <Empty
                            description="暂无可用的 Prompt 模板"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          >
                            <Button
                              type="link"
                              onClick={() =>
                                window.open('/AI/prompt-manager', '_blank')
                              }
                            >
                              去创建
                            </Button>
                          </Empty>
                        )}
                      </Spin>
                      {selectedPromptsWithVariables.length > 0 && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: '#f0f5ff',
                            border: '1px solid #adc6ff',
                            borderRadius: '6px',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: '8px',
                              color: '#1d39c4',
                            }}
                          >
                            模板变量
                          </div>
                          <Space
                            direction="vertical"
                            style={{ width: '100%' }}
                            size="middle"
                          >
                            {selectedPromptsWithVariables.map((prompt) => (
                              <div key={prompt.id}>
                                <div
                                  style={{
                                    fontWeight: 500,
                                    marginBottom: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <span>{prompt.name}</span>
                                  <Tag color="blue">
                                    {prompt.variables?.length} 个变量
                                  </Tag>
                                </div>
                                <Space
                                  direction="vertical"
                                  style={{ width: '100%' }}
                                  size="small"
                                >
                                  {prompt.variables?.map((variable) => (
                                    <div key={variable}>
                                      <div
                                        style={{
                                          fontSize: '12px',
                                          color: '#555',
                                          marginBottom: '4px',
                                        }}
                                      >
                                        {`{${variable}}`}
                                      </div>
                                      <TextArea
                                        autoSize={{ minRows: 1, maxRows: 4 }}
                                        value={
                                          promptVariableValues[prompt.id]?.[
                                          variable
                                          ] ?? ''
                                        }
                                        onChange={(e) =>
                                          handlePromptVariableInputChange(
                                            prompt.id,
                                            variable,
                                            e.target.value,
                                          )
                                        }
                                        placeholder={`请输入 ${variable}`}
                                      />
                                    </div>
                                  ))}
                                </Space>
                              </div>
                            ))}
                          </Space>
                        </div>
                      )}
                      {selectedPromptIds.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <Tag color="blue">
                            已选择 {selectedPromptIds.length} 个模板
                          </Tag>
                        </div>
                      )}
                    </div>

                    <div>
                      <Title level={5}>文档描述</Title>
                      <TextArea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="请输入文档主题或详细描述..."
                        rows={5}
                        maxLength={2000}
                        showCount
                      />
                      <Text
                        type="secondary"
                        style={{
                          display: 'block',
                          marginTop: '8px',
                          fontSize: '13px',
                        }}
                      >
                        描述写作背景、重点和格式要求，生成后可在左侧查看制式预览并进一步优化。
                      </Text>
                    </div>

                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={handleGenerate}
                      loading={loading}
                      block
                      size="large"
                    >
                      生成文档
                    </Button>

                    {/* AI 智能优化按钮 */}
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '16px',
                        background:
                          'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                        borderRadius: '8px',
                        border: '2px solid #667eea',
                      }}
                    >
                      <Space
                        direction="vertical"
                        style={{ width: '100%' }}
                        size="small"
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#667eea',
                            fontWeight: 500,
                          }}
                        >
                          ✨ AI 智能优化
                        </div>
                        <Button
                          type="primary"
                          icon={<ReloadOutlined />}
                          onClick={handleOpenOptimizeModal}
                          disabled={!content}
                          loading={loading}
                          block
                          size="large"
                          style={{
                            background:
                              'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            height: '44px',
                            fontWeight: 500,
                          }}
                        >
                          智能优化文档
                        </Button>
                        {optimizeHistory.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: '4px',
                            }}
                          >
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              已优化 {optimizeHistory.length} 次
                            </span>
                            <Button
                              type="link"
                              size="small"
                              onClick={handleUndoOptimize}
                              icon={<UndoOutlined />}
                              style={{ padding: 0, height: 'auto' }}
                            >
                              撤销
                            </Button>
                          </div>
                        )}
                      </Space>
                    </div>
                  </Space>
                </ProCard>

                {/* 优化历史记录 */}
                {optimizeHistory.length > 0 && (
                  <ProCard title="优化历史" bordered>
                    <List
                      dataSource={optimizeHistory}
                      locale={{ emptyText: '暂无优化记录' }}
                      renderItem={(item, index) => (
                        <List.Item
                          actions={[
                            <Button
                              key="compare"
                              type="link"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => handleCompareOptimize(item)}
                            >
                              对比
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <ReloadOutlined
                                style={{ fontSize: 18, color: '#667eea' }}
                              />
                            }
                            title={
                              <Space>
                                <span>{item.instruction}</span>
                                {index === 0 && <Tag color="green">最新</Tag>}
                              </Space>
                            }
                            description={
                              <Space direction="vertical" size={0}>
                                <span style={{ fontSize: '12px' }}>
                                  类型: {item.types.join(', ')}
                                </span>
                                {item.aiRate !== null &&
                                  item.aiRate !== undefined && (
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        color: '#722ed1',
                                      }}
                                    >
                                      AI率：{formatAiRateDisplay(item.aiRate)}
                                    </span>
                                  )}
                                <span
                                  style={{ fontSize: '12px', color: '#999' }}
                                >
                                  {item.timestamp.toLocaleString('zh-CN')}
                                </span>
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </ProCard>
                )}

                {/* 已保存文档列表 */}
                <ProCard title="已保存的文档" bordered>
                  <List
                    dataSource={savedDocs}
                    locale={{ emptyText: '暂无保存的文档' }}
                    renderItem={(doc) => {
                      const typeLabel = getDocumentTypeLabel(doc.type);
                      const scenarioLabel = getScenarioLabel(
                        doc.type,
                        doc.scenario,
                      );
                      return (
                        <List.Item
                          actions={[
                            <Button
                              key="load"
                              type="link"
                              size="small"
                              onClick={() => handleLoadDocument(doc)}
                            >
                              加载
                            </Button>,
                            <Button
                              key="download"
                              type="link"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => handleDownload(doc)}
                            />,
                            <Button
                              key="delete"
                              type="link"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDelete(doc.id)}
                            />,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <FileTextOutlined
                                style={{ fontSize: 20, color: '#1890ff' }}
                              />
                            }
                            title={doc.title}
                            description={
                              <Space direction="vertical" size={0}>
                                <span style={{ fontSize: '12px' }}>
                                  类型: {typeLabel}
                                </span>
                                {scenarioLabel && (
                                  <span style={{ fontSize: '12px' }}>
                                    场景: {scenarioLabel}
                                  </span>
                                )}
                                <span style={{ fontSize: '12px' }}>
                                  {doc.createdAt.toLocaleDateString('zh-CN')}
                                </span>
                              </Space>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                </ProCard>
              </Space>
            </Col>
          )}
        </Row>

        {/* 侧边收起按钮 */}
        <div
          style={{
            position: 'fixed',
            right: settingsPanelOpen ? 'calc(33.33% - 24px)' : '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 999,
            transition: 'right 0.3s ease',
          }}
        >
          <Tooltip
            title={settingsPanelOpen ? '收起面板' : '展开面板'}
            placement="left"
          >
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={settingsPanelOpen ? <RightOutlined /> : <LeftOutlined />}
              onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                width: '48px',
                height: '48px',
              }}
            />
          </Tooltip>
        </div>
      </div>

      <Modal
        title="保存文档到云端"
        open={showSaveModal}
        onOk={handleConfirmSave}
        onCancel={() => {
          setShowSaveModal(false);
          setTitleInput('');
        }}
        confirmLoading={loading}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5}>文档标题</Title>
            <Input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="请输入文档标题"
              maxLength={100}
            />
          </div>
          {uploadProgress > 0 && (
            <Progress percent={uploadProgress} status="active" />
          )}
        </Space>
      </Modal>

      {/* AI 优化对话框 */}
      <Modal
        title={
          <Space>
            <ReloadOutlined style={{ color: '#667eea' }} />
            <span>AI 智能优化</span>
          </Space>
        }
        open={optimizeModalVisible}
        onOk={handleOptimize}
        onCancel={() => setOptimizeModalVisible(false)}
        confirmLoading={loading}
        width={700}
        okText="开始优化"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div
            style={{
              padding: '12px',
              background:
                'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
              borderRadius: '8px',
              border: '1px solid #667eea30',
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ fontWeight: 500, color: '#667eea' }}>
                💡 优化提示
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                • 选择优化类型，或输入自定义优化要求
                <br />• 支持多维度优化：语法、风格、逻辑、格式、语气等
                <br />• 可以随时撤销优化，查看历史对比
              </div>
            </Space>
          </div>

          <div>
            <Title level={5}>优化类型</Title>
            <Checkbox.Group
              value={selectedOptimizeTypes}
              onChange={setSelectedOptimizeTypes}
              style={{ width: '100%' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Checkbox value="all">
                    <Space>
                      <span>智能优化（全面）</span>
                      <Tag color="blue">推荐</Tag>
                    </Space>
                  </Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="grammar">语法纠正</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="style">文风优化</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="logic">逻辑梳理</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="clarity">表达清晰化</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="format">格式规范</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="tone">语气调整</Checkbox>
                </Col>
              </Row>
            </Checkbox.Group>
          </div>

          <div>
            <Title level={5}>自定义优化要求（可选）</Title>
            <TextArea
              value={optimizeInstruction}
              onChange={(e) => setOptimizeInstruction(e.target.value)}
              placeholder="例如：&#10;- 使用更正式的表达方式&#10;- 增强说服力&#10;- 突出重点内容&#10;- 简化冗长句子&#10;- 增加具体数据支撑"
              rows={6}
              maxLength={500}
              showCount
              style={{ fontFamily: 'inherit' }}
            />
          </div>

          {optimizeHistory.length > 0 && (
            <div
              style={{
                padding: '8px 12px',
                background: '#f0f0f0',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#666',
              }}
            >
              <Space>
                <ReloadOutlined />
                <span>
                  已有 {optimizeHistory.length} 条优化记录，优化后可撤销或对比
                </span>
              </Space>
            </div>
          )}
        </Space>
      </Modal>

      {/* Prompt 预览对话框 */}
      <Modal
        title="Prompt 模板预览"
        open={promptPreviewVisible}
        onCancel={() => setPromptPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPromptPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {previewingPrompt && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <strong>模板名称：</strong>
              {previewingPrompt.name}
            </div>
            {previewingPrompt.description && (
              <div>
                <strong>描述：</strong>
                {previewingPrompt.description}
              </div>
            )}
            {previewingPrompt.variables &&
              previewingPrompt.variables.length > 0 && (
                <div>
                  <strong>变量：</strong>
                  {previewingPrompt.variables.map((v) => (
                    <Tag key={v} color="blue">
                      {`{${v}}`}
                    </Tag>
                  ))}
                </div>
              )}
            <div>
              <strong>Prompt 内容：</strong>
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  maxHeight: '400px',
                  overflow: 'auto',
                }}
              >
                {previewingPrompt.content}
              </div>
            </div>
          </Space>
        )}
      </Modal>

      {/* 生成进度条 Modal */}
      <Modal
        title={null}
        open={generateProgressVisible}
        footer={null}
        closable={false}
        width={500}
        centered
      >
        <div style={{ padding: '20px 0' }}>
          <div
            style={{
              textAlign: 'center',
              marginBottom: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1890ff',
            }}
          >
            🤖 AI 正在生成文档
          </div>
          <Progress
            percent={generateProgress}
            status={generateProgress === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            strokeWidth={12}
          />
          <div
            style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '14px',
              color: '#666',
              minHeight: '20px',
            }}
          >
            {generateProgressText}
          </div>
        </div>
      </Modal>

      {/* 优化进度条 Modal */}
      <Modal
        title={null}
        open={optimizeProgressVisible}
        footer={null}
        closable={false}
        width={500}
        centered
      >
        <div style={{ padding: '20px 0' }}>
          <div
            style={{
              textAlign: 'center',
              marginBottom: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#722ed1',
            }}
          >
            ✨ AI 正在优化文档
          </div>
          <Progress
            percent={optimizeProgress}
            status={optimizeProgress === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#722ed1',
              '100%': '#f759ab',
            }}
            strokeWidth={12}
          />
          <div
            style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '14px',
              color: '#666',
              minHeight: '20px',
            }}
          >
            {optimizeProgressText}
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default DocumentWriter;
