import { sanitizeHtml } from '../../utils/contentUtils';
import { MediaPicker } from '../../components/UIPrimitives';
import { MediaItem, uploadMediaBatch } from '../../lib/firebase';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link2,
  Minus,
  Eraser,
  Code,
  Eye,
  CheckCircle2,
  Sparkles,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Table2,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Video,
  AlertCircle,
  Columns3,
  Type,
  Heading2,
  GripVertical,
} from 'lucide-react';
import { PageBlock, PageBlockType } from '../../types';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  blocks?: PageBlock[];
  onBlocksChange?: (blocks: PageBlock[]) => void;
  placeholder?: string;
  minHeight?: string;
  id?: string;
}

export function cleanPastedHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    const bannedTags = ['script', 'style', 'meta', 'link', 'xml', 'object', 'embed'];
    bannedTags.forEach((tag) => {
      const elements = doc.querySelectorAll(tag);
      elements.forEach((el) => el.remove());
    });

    const removeComments = (node: Node) => {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.COMMENT_NODE) {
          node.removeChild(child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          removeComments(child);
        }
      }
    };
    removeComments(doc.body);

    const allElements = doc.body.querySelectorAll('*');
    allElements.forEach((element) => {
      const el = element as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      if (tagName.startsWith('o:') || tagName.startsWith('w:')) {
        const span = doc.createElement('span');
        span.innerHTML = el.innerHTML;
        el.replaceWith(span);
        return;
      }

      const allowedAttrs = ['href', 'target', 'title', 'src', 'alt', 'colspan', 'rowspan', 'class'];
      const currentAttrs = Array.from(el.attributes);
      currentAttrs.forEach((attr) => {
        if (!allowedAttrs.includes(attr.name.toLowerCase())) {
          el.removeAttribute(attr.name);
        }
      });

      if (tagName === 'a') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }

      if (tagName === 'span') {
        const style = el.getAttribute('style') || '';
        if (style.includes('font-weight: bold') || style.includes('font-weight: 700') || style.includes('font-weight:bold')) {
          const strong = doc.createElement('strong');
          strong.innerHTML = el.innerHTML;
          el.replaceWith(strong);
        } else if (style.includes('font-style: italic') || style.includes('font-style:italic')) {
          const em = doc.createElement('em');
          em.innerHTML = el.innerHTML;
          el.replaceWith(em);
        }
      }
    });

    let clean = doc.body.innerHTML.trim();
    clean = clean.replace(/(<p[^>]*>(&nbsp;|\s)*<\/p>\s*){3,}/gi, '<p><br></p>');
    return sanitizeHtml(clean);
  } catch {
    return rawHtml;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatInitialContent(val: string): string {
  if (!val || val.trim().length === 0) {
    return '<p><br></p>';
  }
  if (/<[a-z][\s\S]*>/i.test(val)) {
    return val;
  }
  return val
    .split(/\r\n\r\n|\n\n/)
    .map((para) => {
      const line = para.trim();
      return line ? `<p>${escapeHtml(line).replace(/\r\n|\n/g, '<br/>')}</p>` : '<p><br></p>';
    })
    .join('');
}

const GUTENBERG_BLOCK_TYPES: { type: PageBlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Đoạn văn', icon: <Type size={14} /> },
  { type: 'heading', label: 'Tiêu đề (H2/H3/H4)', icon: <Heading2 size={14} /> },
  { type: 'image', label: 'Hình ảnh (Giữ tỷ lệ gốc)', icon: <ImageIcon size={14} /> },
  { type: 'gallery', label: 'Thư viện ảnh', icon: <Columns3 size={14} /> },
  { type: 'quote', label: 'Trích dẫn', icon: <Quote size={14} /> },
  { type: 'list', label: 'Danh sách', icon: <List size={14} /> },
  { type: 'callout', label: 'Khối nổi bật (Callout)', icon: <AlertCircle size={14} /> },
  { type: 'video', label: 'Video / YouTube', icon: <Video size={14} /> },
  { type: 'divider', label: 'Đường phân cách', icon: <Minus size={14} /> },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  blocks = [],
  onBlocksChange,
  placeholder = 'Nhập nội dung trực tiếp, kéo thả ảnh từ máy tính hoặc bấm (+) để chèn khối kiểu WordPress Gutenberg...',
  minHeight = '320px',
  id = 'rich-text-editor',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [blockMediaTarget, setBlockMediaTarget] = useState<string | null>(null);
  const mediaSelection = useRef<Range | null>(null);
  const [isCodeView, setIsCodeView] = useState(false);
  const [codeValue, setCodeValue] = useState(value || '');
  const [showPasteToast, setShowPasteToast] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isUploadingDrop, setIsUploadingDrop] = useState(false);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [dragBlockIdx, setDragBlockIdx] = useState<number | null>(null);
  const [dragOverBlockIdx, setDragOverBlockIdx] = useState<number | null>(null);
  const isInternalChangeRef = useRef(false);

  // History stack for Undo/Redo across HTML + Gutenberg blocks
  const historyRef = useRef<{ html: string; blocks: PageBlock[] }[]>([]);
  const historyIdxRef = useRef<number>(-1);

  const pushHistory = useCallback((html: string, nextBlocks: PageBlock[]) => {
    const snap = { html, blocks: JSON.parse(JSON.stringify(nextBlocks || [])) };
    const list = historyRef.current.slice(0, historyIdxRef.current + 1);
    list.push(snap);
    if (list.length > 40) list.shift();
    historyRef.current = list;
    historyIdxRef.current = list.length - 1;
  }, []);

  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    setCodeValue(value || '');
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      const targetHtml = formatInitialContent(value);
      if (currentHtml !== targetHtml && (!currentHtml || currentHtml === '<p><br></p>')) {
        editorRef.current.innerHTML = sanitizeHtml(targetHtml);
      }
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current && (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<p><br></p>')) {
      const initHtml = sanitizeHtml(formatInitialContent(value));
      editorRef.current.innerHTML = initHtml;
      pushHistory(initHtml, blocks);
    }
  }, []);

  const triggerChange = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      isInternalChangeRef.current = true;
      setCodeValue(html);
      onChange(html);
      pushHistory(html, blocks);
    }
  }, [onChange, blocks, pushHistory]);

  const applyFormat = (command: string, arg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, arg);
      triggerChange();
    }
  };

  const handleUndo = () => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current -= 1;
      const snap = historyRef.current[historyIdxRef.current];
      if (snap && editorRef.current) {
        editorRef.current.innerHTML = snap.html;
        setCodeValue(snap.html);
        isInternalChangeRef.current = true;
        onChange(snap.html);
        onBlocksChange?.(snap.blocks);
      }
    } else {
      applyFormat('undo');
    }
  };

  const handleRedo = () => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current += 1;
      const snap = historyRef.current[historyIdxRef.current];
      if (snap && editorRef.current) {
        editorRef.current.innerHTML = snap.html;
        setCodeValue(snap.html);
        isInternalChangeRef.current = true;
        onChange(snap.html);
        onBlocksChange?.(snap.blocks);
      }
    } else {
      applyFormat('redo');
    }
  };

  const handleHeadingChange = (tag: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      if (tag === 'p') {
        document.execCommand('formatBlock', false, '<p>');
      } else {
        document.execCommand('formatBlock', false, `<${tag}>`);
      }
      triggerChange();
    }
  };

  const handleInsertLink = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    const url = prompt('Nhập địa chỉ liên kết (URL):', 'https://');
    if (url && url !== 'https://') {
      const safeUrl = url.trim();
      if (!/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(safeUrl)) return;
      if (selectedText.length > 0) {
        applyFormat('createLink', safeUrl);
      } else {
        const linkHtml = `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeUrl)}</a>`;
        applyFormat('insertHTML', linkHtml);
      }
    }
  };

  const rememberMediaSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      mediaSelection.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const insertMediaAtCursor = (item: MediaItem) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    const range = mediaSelection.current;
    if (range && editor.contains(range.commonAncestorContainer)) {
      selection?.addRange(range);
    } else {
      const end = document.createRange();
      end.selectNodeContents(editor);
      end.collapse(false);
      selection?.addRange(end);
    }
    const caption = escapeHtml(item.caption || 'Nhập chú thích ảnh');
    const credit = escapeHtml(item.credit || 'Sky First Network');
    const figure = `<figure class="article-media"><img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || item.name)}"/><figcaption><span class="media-caption">${caption}</span><br><span class="media-credit">ẢNH/NGUỒN: ${credit}</span></figcaption></figure><p><br></p>`;
    applyFormat('insertHTML', figure);
    rememberMediaSelection();
  };

  const handleInsertImage = () => {
    rememberMediaSelection();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []) as File[];
      if (!files.length) return;
      try {
        setIsUploadingDrop(true);
        const results = await uploadMediaBatch(files);
        for (const result of results) {
          if (result.item) insertMediaAtCursor(result.item);
          else alert(result.file.name + ': ' + result.error);
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Không thể tải ảnh.');
      } finally {
        setIsUploadingDrop(false);
      }
    };
    input.click();
  };

  // Kéo thả ảnh trực tiếp từ máy tính vào vùng soạn thảo (Mục 7)
  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    const files = (Array.from(e.dataTransfer?.files || []) as File[]).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    rememberMediaSelection();
    try {
      setIsUploadingDrop(true);
      const results = await uploadMediaBatch(files);
      for (const result of results) {
        if (result.item) insertMediaAtCursor(result.item);
      }
    } catch {
      // ignore
    } finally {
      setIsUploadingDrop(false);
    }
  };

  const handleInsertTable = () => {
    applyFormat(
      'insertHTML',
      '<table><thead><tr><th>Tiêu đề cột 1</th><th>Tiêu đề cột 2</th></tr></thead><tbody><tr><td>Nội dung dòng 1</td><td>Nội dung dòng 1</td></tr></tbody></table><p><br></p>'
    );
  };

  const handleInsertCalloutInline = () => {
    applyFormat(
      'insertHTML',
      '<blockquote><strong>Điểm nhấn quan trọng:</strong> Nhập nội dung thông báo hoặc điểm nổi bật tại đây...</blockquote><p><br></p>'
    );
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = (Array.from(e.clipboardData?.files || []) as File[]).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      e.preventDefault();
      rememberMediaSelection();
      setIsUploadingDrop(true);
      uploadMediaBatch(files)
        .then((results) => {
          for (const r of results) {
            if (r.item) insertMediaAtCursor(r.item);
          }
        })
        .finally(() => setIsUploadingDrop(false));
      return;
    }

    e.preventDefault();
    const clipboardData = e.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');

    let contentToInsert = '';

    if (htmlData && htmlData.trim().length > 0) {
      contentToInsert = cleanPastedHtml(htmlData);
    } else if (textData && textData.trim().length > 0) {
      contentToInsert = textData
        .split(/\r\n\r\n|\n\n/)
        .map((para) => {
          const trimmed = para.trim();
          return trimmed ? `<p>${escapeHtml(trimmed).replace(/\r\n|\n/g, '<br/>')}</p>` : '<p><br></p>';
        })
        .join('');
    }

    if (contentToInsert) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        if (editorRef.current) {
          editorRef.current.innerHTML += contentToInsert;
          triggerChange();
        }
      } else {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentToInsert;

        const fragment = document.createDocumentFragment();
        let node: Node | null;
        let lastNode: Node | null = null;
        while ((node = tempDiv.firstChild)) {
          lastNode = fragment.appendChild(node);
        }

        range.insertNode(fragment);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        triggerChange();
      }

      setShowPasteToast(true);
      setTimeout(() => setShowPasteToast(false), 3000);
    }
  };

  const handleToggleCodeView = () => {
    if (!isCodeView) {
      if (editorRef.current) {
        setCodeValue(editorRef.current.innerHTML);
      }
      setIsCodeView(true);
    } else {
      setIsCodeView(false);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = sanitizeHtml(codeValue);
          triggerChange();
        }
      }, 50);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCodeValue(val);
    isInternalChangeRef.current = true;
    onChange(val);
  };

  // Gutenberg Block operations
  const addBlock = (type: PageBlockType, afterIndex?: number) => {
    if (!onBlocksChange) {
      // Fallback: insert directly into HTML at cursor if parent doesn't pass blocks array
      if (type === 'heading') handleHeadingChange('h2');
      else if (type === 'quote') applyFormat('formatBlock', '<blockquote>');
      else if (type === 'list') applyFormat('insertUnorderedList');
      else if (type === 'divider') applyFormat('insertHorizontalRule');
      else if (type === 'callout') handleInsertCalloutInline();
      else if (type === 'image') handleInsertImage();
      setBlockMenuOpen(false);
      return;
    }
    const newBlock: PageBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      headingLevel: type === 'heading' ? 'h2' : undefined,
      listType: type === 'list' ? 'ul' : undefined,
      calloutTone: type === 'callout' ? 'info' : undefined,
      imageFit: 'original',
      title: type === 'heading' ? 'Tiêu đề phần mới' : type === 'callout' ? 'Điểm nổi bật' : '',
      body: type === 'text' ? 'Nhập nội dung đoạn văn...' : type === 'list' ? 'Mục danh sách 1\nMục danh sách 2' : '',
      items: type === 'gallery' ? [{ title: 'Ảnh 1', imageUrl: '' }] : undefined,
    };
    const next = [...blocks];
    if (afterIndex !== undefined && afterIndex >= 0 && afterIndex < next.length) {
      next.splice(afterIndex + 1, 0, newBlock);
    } else {
      next.push(newBlock);
    }
    onBlocksChange(next);
    pushHistory(codeValue, next);
    setBlockMenuOpen(false);
  };

  const updateBlock = (id: string, patch: Partial<PageBlock>) => {
    if (!onBlocksChange) return;
    const next = blocks.map((b) => (b.id === id ? { ...b, ...patch } : b));
    onBlocksChange(next);
  };

  const duplicateBlock = (idx: number) => {
    if (!onBlocksChange) return;
    const src = blocks[idx];
    if (!src) return;
    const copy: PageBlock = {
      ...JSON.parse(JSON.stringify(src)),
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onBlocksChange(next);
    pushHistory(codeValue, next);
  };

  const moveBlock = (from: number, to: number) => {
    if (!onBlocksChange || from === to || to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [picked] = next.splice(from, 1);
    next.splice(to, 0, picked);
    onBlocksChange(next);
    pushHistory(codeValue, next);
  };

  const removeBlock = (id: string) => {
    if (!onBlocksChange) return;
    const next = blocks.filter((b) => b.id !== id);
    onBlocksChange(next);
    pushHistory(codeValue, next);
  };

  return (
    <div id={id} className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all focus-within:border-[#0284C7] focus-within:ring-2 focus-within:ring-sky-100">
        {/* 1. Rich Text & Gutenberg Format Toolbar */}
        <div className="bg-slate-50/90 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-1.5 select-none">
          <div className="flex flex-wrap items-center gap-1">
            {/* Nút (+) Thêm Khối kiểu WordPress Gutenberg */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setBlockMenuOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white px-2.5 py-1.5 text-xs font-extrabold shadow-2xs transition"
                title="Thêm khối nội dung kiểu WordPress Gutenberg"
              >
                <Plus size={14} />
                <span>Thêm khối</span>
              </button>
              {blockMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Chèn khối nội dung
                  </div>
                  {GUTENBERG_BLOCK_TYPES.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addBlock(item.type)}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-[#0284C7] transition"
                    >
                      <span className="text-[#0284C7]">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <select
              title="Định dạng tiêu đề hoặc đoạn văn"
              onChange={(e) => handleHeadingChange(e.target.value)}
              disabled={isCodeView}
              className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-hidden focus:border-[#0284C7] cursor-pointer disabled:opacity-50"
              defaultValue="p"
            >
              <option value="p">Đoạn văn (Normal)</option>
              <option value="h2">Tiêu đề lớn (H2)</option>
              <option value="h3">Tiêu đề vừa (H3)</option>
              <option value="h4">Tiêu đề nhỏ (H4)</option>
            </select>

            <button type="button" onClick={() => applyFormat('bold')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg" title="In đậm">
              <Bold size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('italic')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg" title="In nghiêng">
              <Italic size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('underline')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg" title="Gạch chân">
              <Underline size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('strikeThrough')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg" title="Gạch ngang">
              <Strikethrough size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('insertUnorderedList')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg" title="Danh sách chấm">
              <List size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('insertOrderedList')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg" title="Danh sách số">
              <ListOrdered size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('formatBlock', '<blockquote>')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg" title="Trích dẫn">
              <Quote size={15} />
            </button>
            <button type="button" onClick={handleInsertLink} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg" title="Chèn liên kết">
              <Link2 size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('insertHorizontalRule')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg" title="Đường phân cách">
              <Minus size={15} />
            </button>
            <button type="button" onClick={handleUndo} disabled={isCodeView} className="p-1.5 text-slate-600 hover:bg-white rounded-lg" title="Hoàn tác (Undo)">
              <Undo2 size={15} />
            </button>
            <button type="button" onClick={handleRedo} disabled={isCodeView} className="p-1.5 text-slate-600 hover:bg-white rounded-lg" title="Làm lại (Redo)">
              <Redo2 size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('justifyLeft')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:bg-white rounded-lg" title="Căn trái">
              <AlignLeft size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('justifyCenter')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:bg-white rounded-lg" title="Căn giữa">
              <AlignCenter size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('justifyRight')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:bg-white rounded-lg" title="Căn phải">
              <AlignRight size={15} />
            </button>
            <button type="button" onClick={handleInsertImage} disabled={isCodeView} className="px-2 py-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg inline-flex items-center gap-1" title="Tải ảnh lên ngay tại con trỏ">
              <ImageIcon size={14} /> Chèn ảnh
            </button>
            <button
              type="button"
              onMouseDown={rememberMediaSelection}
              onClick={() => {
                setBlockMediaTarget(null);
                setMediaPickerOpen(true);
              }}
              disabled={isCodeView}
              className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-white border border-slate-200 rounded-lg"
              title="Chọn ảnh từ thư viện Media tại vị trí con trỏ"
            >
              Thư viện Media
            </button>
            <button type="button" onClick={handleInsertTable} disabled={isCodeView} className="p-1.5 text-slate-600 hover:bg-white rounded-lg" title="Chèn bảng">
              <Table2 size={15} />
            </button>
            <button type="button" onClick={() => applyFormat('removeFormat')} disabled={isCodeView} className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-white rounded-lg" title="Xóa định dạng">
              <Eraser size={15} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-[#0284C7] border border-sky-200">
              <Sparkles size={12} className="text-sky-600" />
              <span className="hidden sm:inline">Kéo thả ảnh trực tiếp · Giữ định dạng Word/Docs</span>
              <span className="sm:hidden">Gutenberg</span>
            </span>

            <button
              type="button"
              onClick={handleToggleCodeView}
              className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${
                isCodeView ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title={isCodeView ? 'Quay về chế độ soạn thảo trực quan' : 'Xem mã HTML'}
            >
              {isCodeView ? <Eye size={14} /> : <Code size={14} />}
              <span className="text-[11px] hidden md:inline">{isCodeView ? 'Trực quan' : 'Mã HTML'}</span>
            </button>
          </div>
        </div>

        {mediaPickerOpen && (
          <MediaPicker
            onClose={() => {
              setMediaPickerOpen(false);
              setBlockMediaTarget(null);
            }}
            onSelect={(item) => {
              setMediaPickerOpen(false);
              if (blockMediaTarget) {
                updateBlock(blockMediaTarget, { imageUrl: item.url, alt: item.alt || item.name, caption: item.caption || '' });
                setBlockMediaTarget(null);
              } else {
                insertMediaAtCursor(item);
              }
            }}
          />
        )}

        {showPasteToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center justify-between text-xs font-bold text-emerald-800">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Đã giữ nguyên định dạng văn bản từ clipboard!</span>
            </div>
          </div>
        )}

        {isUploadingDrop && (
          <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 text-xs font-bold text-sky-800">
            Đang tải ảnh lên R2 Media và chèn đúng tỷ lệ gốc tại vị trí con trỏ...
          </div>
        )}

        {/* 2. Vùng viết trực tiếp (Hỗ trợ kéo thả ảnh trực tiếp từ máy tính) */}
        {isCodeView ? (
          <textarea
            value={codeValue}
            onChange={handleCodeChange}
            placeholder="Mã HTML của nội dung bài viết..."
            style={{ minHeight }}
            className="w-full p-4 font-mono text-xs bg-slate-900 text-slate-100 focus:outline-hidden resize-y leading-relaxed"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={triggerChange}
            onPaste={handlePaste}
            onKeyUp={rememberMediaSelection}
            onMouseUp={rememberMediaSelection}
            onDragOver={(e) => {
              if (e.dataTransfer?.types?.includes('Files')) {
                e.preventDefault();
                setIsDraggingFiles(true);
              }
            }}
            onDragLeave={() => setIsDraggingFiles(false)}
            onDrop={handleDropFiles}
            data-placeholder={placeholder}
            style={{ minHeight }}
            className={`formatted-content prose prose-slate max-w-none p-5 sm:p-7 text-sm sm:text-base text-slate-800 focus:outline-hidden overflow-y-auto leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none transition-colors ${
              isDraggingFiles ? 'bg-sky-50/70 ring-2 ring-inset ring-sky-400' : ''
            }`}
          />
        )}
      </div>

      {/* 3. Danh sách Khối cấu trúc kiểu WordPress Gutenberg (Kéo thả, Nhân bản, Di chuyển, Chỉnh sửa từng khối) */}
      {onBlocksChange && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Khối nội dung mở rộng (WordPress Gutenberg Blocks · {blocks.length} khối)
              </h4>
              <p className="text-[11px] text-slate-500">
                Kéo thả để sắp xếp thứ tự, nhân bản, đổi kiểu hiển thị ảnh (Original / Contain / Cover) hoặc thêm khối mới.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GUTENBERG_BLOCK_TYPES.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => addBlock(b.type)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:text-[#0284C7] px-2.5 py-1.5 text-xs font-bold text-slate-700 transition"
                >
                  {b.icon}
                  <span>+ {b.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {blocks.length > 0 && (
            <div className="space-y-3 pt-1">
              {blocks.map((blk, idx) => (
                <div
                  key={blk.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    setDragBlockIdx(idx);
                  }}
                  onDragOver={(e) => {
                    if (dragBlockIdx !== null) {
                      e.preventDefault();
                      setDragOverBlockIdx(idx);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragBlockIdx !== null) moveBlock(dragBlockIdx, idx);
                    setDragBlockIdx(null);
                    setDragOverBlockIdx(null);
                  }}
                  onDragEnd={() => {
                    setDragBlockIdx(null);
                    setDragOverBlockIdx(null);
                  }}
                  className={`rounded-2xl border bg-white p-4 shadow-2xs space-y-3 transition ${
                    dragOverBlockIdx === idx ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="cursor-grab inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                        <GripVertical size={13} /> Khối #{idx + 1}: {blk.type.toUpperCase()}
                      </span>
                      <select
                        value={blk.type}
                        onChange={(e) => updateBlock(blk.id, { type: e.target.value as PageBlockType })}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold"
                      >
                        {GUTENBERG_BLOCK_TYPES.map((t) => (
                          <option key={t.type} value={t.type}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30"
                        title="Di chuyển lên"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, idx + 1)}
                        disabled={idx === blocks.length - 1}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30"
                        title="Di chuyển xuống"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateBlock(idx)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-sky-700"
                        title="Nhân bản khối"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('text', idx)}
                        className="p-1.5 rounded-lg border border-slate-200 text-sky-700"
                        title="Chèn khối mới bên dưới"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(blk.id)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600"
                        title="Xóa khối"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {blk.type === 'heading' && (
                    <div className="grid sm:grid-cols-4 gap-2.5">
                      <select
                        value={blk.headingLevel || 'h2'}
                        onChange={(e) => updateBlock(blk.id, { headingLevel: e.target.value as any })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                      >
                        <option value="h2">Tiêu đề H2</option>
                        <option value="h3">Tiêu đề H3</option>
                        <option value="h4">Tiêu đề H4</option>
                      </select>
                      <input
                        value={blk.title || ''}
                        onChange={(e) => updateBlock(blk.id, { title: e.target.value })}
                        placeholder="Nhập nội dung tiêu đề..."
                        className="sm:col-span-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
                      />
                    </div>
                  )}

                  {(blk.type === 'text' || blk.type === 'quote' || blk.type === 'list' || blk.type === 'callout') && (
                    <div className="space-y-2">
                      {(blk.type === 'quote' || blk.type === 'callout') && (
                        <input
                          value={blk.title || ''}
                          onChange={(e) => updateBlock(blk.id, { title: e.target.value })}
                          placeholder={blk.type === 'quote' ? 'Tác giả / Nguồn trích dẫn' : 'Tiêu đề khối nổi bật'}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                        />
                      )}
                      <textarea
                        rows={3}
                        value={blk.body || ''}
                        onChange={(e) => updateBlock(blk.id, { body: e.target.value })}
                        placeholder={blk.type === 'list' ? 'Mỗi dòng là một mục danh sách...' : 'Nhập nội dung khối...'}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm"
                      />
                    </div>
                  )}

                  {blk.type === 'image' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={blk.imageUrl || ''}
                          onChange={(e) => updateBlock(blk.id, { imageUrl: e.target.value })}
                          placeholder="URL ảnh hoặc chọn từ Thư viện Media..."
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setBlockMediaTarget(blk.id);
                            setMediaPickerOpen(true);
                          }}
                          className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700"
                        >
                          Chọn từ Media
                        </button>
                        <select
                          value={blk.imageFit || 'original'}
                          onChange={(e) => updateBlock(blk.id, { imageFit: e.target.value as any })}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                        >
                          <option value="original">Original (Giữ nguyên tỷ lệ gốc)</option>
                          <option value="contain">Contain (Vừa khung, không cắt)</option>
                          <option value="cover">Cover (Phủ khung)</option>
                        </select>
                      </div>
                      {blk.imageUrl && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                          <img src={blk.imageUrl} alt={blk.alt || ''} className="max-h-56 w-auto mx-auto object-contain rounded-lg" />
                        </div>
                      )}
                      <div className="grid sm:grid-cols-3 gap-2">
                        <input
                          value={blk.alt || ''}
                          onChange={(e) => updateBlock(blk.id, { alt: e.target.value })}
                          placeholder="Văn bản thay thế (ALT)"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <input
                          value={blk.caption || ''}
                          onChange={(e) => updateBlock(blk.id, { caption: e.target.value })}
                          placeholder="Chú thích ảnh"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                        <input
                          value={blk.credit || ''}
                          onChange={(e) => updateBlock(blk.id, { credit: e.target.value })}
                          placeholder="Nguồn / Tác giả ảnh"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {blk.type === 'video' && (
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      <input
                        value={blk.title || ''}
                        onChange={(e) => updateBlock(blk.id, { title: e.target.value })}
                        placeholder="Tiêu đề video"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                      />
                      <input
                        value={blk.videoUrl || ''}
                        onChange={(e) => updateBlock(blk.id, { videoUrl: e.target.value })}
                        placeholder="URL YouTube hoặc file MP4"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      />
                    </div>
                  )}

                  {blk.type === 'gallery' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          value={blk.title || ''}
                          onChange={(e) => updateBlock(blk.id, { title: e.target.value })}
                          placeholder="Tiêu đề thư viện ảnh"
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => updateBlock(blk.id, { items: [...(blk.items || []), { title: '', imageUrl: '' }] })}
                          className="text-xs font-bold text-sky-700"
                        >
                          + Thêm ảnh vào khối
                        </button>
                      </div>
                      {(blk.items || []).map((it, iIdx) => (
                        <div key={iIdx} className="grid sm:grid-cols-12 gap-2 items-center">
                          <input
                            value={it.imageUrl || ''}
                            onChange={(e) => {
                              const nextItems = [...(blk.items || [])];
                              nextItems[iIdx] = { ...it, imageUrl: e.target.value };
                              updateBlock(blk.id, { items: nextItems });
                            }}
                            placeholder="URL ảnh"
                            className="sm:col-span-6 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                          />
                          <input
                            value={it.title || ''}
                            onChange={(e) => {
                              const nextItems = [...(blk.items || [])];
                              nextItems[iIdx] = { ...it, title: e.target.value };
                              updateBlock(blk.id, { items: nextItems });
                            }}
                            placeholder="Chú thích ảnh"
                            className="sm:col-span-5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateBlock(blk.id, { items: (blk.items || []).filter((_, j) => j !== iIdx) })
                            }
                            className="sm:col-span-1 text-rose-600 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
