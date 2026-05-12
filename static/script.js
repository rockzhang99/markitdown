/**
 * MarkItDown Desktop - Frontend Logic
 * Handles file upload, conversion, markdown rendering, and user actions.
 */
(function () {
    'use strict';

    // === Constants ===
    const ALLOWED_EXTENSIONS = new Set([
        '.pdf', '.docx', '.pptx', '.xlsx', '.xls',
        '.html', '.htm', '.csv', '.json', '.xml',
        '.jpg', '.jpeg', '.png',
        '.wav', '.mp3', '.m4a',
        '.zip', '.epub', '.ipynb', '.msg',
    ]);
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    // === State ===
    let selectedFile = null;
    let markdownResult = '';
    let originalFilename = '';
    let currentTab = 'preview';

    // === DOM References ===
    const $ = (sel) => document.querySelector(sel);
    const dropZone = $('#dropZone');
    const fileInput = $('#fileInput');
    const fileInfo = $('#fileInfo');
    const fileInfoName = $('.file-info__name');
    const fileInfoSize = $('.file-info__size');
    const fileInfoRemove = $('.file-info__remove');
    const convertBtn = $('#convertBtn');
    const loader = $('#loader');
    const errorEl = $('#error');
    const errorText = $('.error-message__text');
    const errorDismiss = $('.error-message__dismiss');
    const output = $('#output');
    const previewPane = $('#previewPane');
    const rawPane = $('#rawPane');
    const rawContent = $('#rawContent');
    const copyBtn = $('#copyBtn');
    const saveBtn = $('#saveBtn');
    const clearBtn = $('#clearBtn');
    const tabs = document.querySelectorAll('.tab');

    // === Initialization ===
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        // Drop zone events
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragenter', onDragEnter);
        dropZone.addEventListener('dragover', onDragOver);
        dropZone.addEventListener('dragleave', onDragLeave);
        dropZone.addEventListener('drop', onDrop);

        // File input
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });

        // File info remove
        fileInfoRemove.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile();
        });

        // Convert button
        convertBtn.addEventListener('click', convertFile);

        // Tabs
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Action buttons
        copyBtn.addEventListener('click', copyToClipboard);
        saveBtn.addEventListener('click', saveAsFile);
        clearBtn.addEventListener('click', clearResult);

        // Error dismiss
        errorDismiss.addEventListener('click', hideError);
    }

    // === Drag & Drop ===
    function onDragEnter(e) {
        e.preventDefault();
        dropZone.classList.add('drop-zone--active');
    }

    function onDragOver(e) {
        e.preventDefault();
        dropZone.classList.add('drop-zone--active');
    }

    function onDragLeave(e) {
        e.preventDefault();
        // Only remove if we're leaving the drop zone itself
        if (e.relatedTarget && dropZone.contains(e.relatedTarget)) return;
        dropZone.classList.remove('drop-zone--active');
    }

    function onDrop(e) {
        e.preventDefault();
        dropZone.classList.remove('drop-zone--active');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    }

    // === File Handling ===
    function handleFile(file) {
        hideError();
        const validation = validateFile(file);
        if (!validation.valid) {
            showError(validation.error);
            return;
        }

        selectedFile = file;
        originalFilename = file.name;
        showFileInfo(file);
        convertBtn.disabled = false;
    }

    function validateFile(file) {
        const ext = getExtension(file.name);
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return {
                valid: false,
                error: `Unsupported format: ${ext}. Supported formats: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`,
            };
        }
        if (file.size > MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `File too large (${formatSize(file.size)}). Maximum size is 50MB.`,
            };
        }
        return { valid: true };
    }

    function showFileInfo(file) {
        fileInfoName.textContent = file.name;
        fileInfoSize.textContent = formatSize(file.size);
        fileInfo.hidden = false;
    }

    function removeFile() {
        selectedFile = null;
        originalFilename = '';
        fileInput.value = '';
        fileInfo.hidden = true;
        convertBtn.disabled = true;
    }

    // === Conversion ===
    async function convertFile() {
        if (!selectedFile) return;

        hideError();
        showLoader();
        convertBtn.disabled = true;

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let message = 'Conversion failed';
                try {
                    const err = await response.json();
                    message = err.detail || message;
                } catch (_) { /* ignore parse error */ }
                throw new Error(message);
            }

            const data = await response.json();
            markdownResult = data.markdown || '';
            originalFilename = data.filename || originalFilename;
            showOutput();
        } catch (err) {
            showError(err.message || 'An unexpected error occurred.');
            convertBtn.disabled = false;
        } finally {
            hideLoader();
        }
    }

    // === Output Display ===
    function showOutput() {
        // Render both views
        previewPane.innerHTML = renderMarkdown(markdownResult);
        rawContent.textContent = markdownResult;

        // Show output section
        output.hidden = false;

        // Hide upload section
        dropZone.hidden = true;
        fileInfo.hidden = true;
        convertBtn.hidden = true;

        // Set to preview tab
        switchTab('preview');

        // Scroll to output
        output.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function switchTab(tab) {
        currentTab = tab;
        tabs.forEach((t) => {
            t.classList.toggle('tab--active', t.dataset.tab === tab);
        });
        previewPane.hidden = tab !== 'preview';
        rawPane.hidden = tab !== 'raw';
    }

    // === Actions ===
    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(markdownResult);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
            copyBtn.classList.add('btn--success');
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.classList.remove('btn--success');
            }, 2000);
        } catch (err) {
            showError('Failed to copy to clipboard.');
        }
    }

    function saveAsFile() {
        const baseName = originalFilename.replace(/\.[^.]+$/, '') || 'converted';
        const blob = new Blob([markdownResult], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = baseName + '.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function clearResult() {
        markdownResult = '';
        originalFilename = '';
        selectedFile = null;
        fileInput.value = '';

        output.hidden = true;
        previewPane.innerHTML = '';
        rawContent.textContent = '';

        dropZone.hidden = false;
        convertBtn.hidden = false;
        convertBtn.disabled = true;
        fileInfo.hidden = true;

        hideError();
    }

    // === UI Helpers ===
    function showLoader() {
        loader.hidden = false;
    }

    function hideLoader() {
        loader.hidden = true;
    }

    function showError(message) {
        errorText.textContent = message;
        errorEl.hidden = false;
    }

    function hideError() {
        errorEl.hidden = true;
    }

    // === Utilities ===
    function getExtension(filename) {
        const idx = filename.lastIndexOf('.');
        return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
    }

    // === Minimal Markdown Renderer ===
    function renderMarkdown(text) {
        if (!text) return '<p style="color: var(--color-text-muted);">No content.</p>';

        // Protect code blocks
        const codeBlocks = [];
        let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            const idx = codeBlocks.length;
            codeBlocks.push({ lang, code: escapeHtml(code.trimEnd()) });
            return `\x00CODEBLOCK${idx}\x00`;
        });

        // Protect inline code
        const inlineCodes = [];
        processed = processed.replace(/`([^`\n]+)`/g, (_, code) => {
            const idx = inlineCodes.length;
            inlineCodes.push(escapeHtml(code));
            return `\x00INLINE${idx}\x00`;
        });

        // Split into lines
        const lines = processed.split('\n');
        const html = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Code block placeholder
            const cbMatch = line.match(/^\x00CODEBLOCK(\d+)\x00$/);
            if (cbMatch) {
                const cb = codeBlocks[parseInt(cbMatch[1])];
                html.push(`<pre><code>${cb.code}</code></pre>`);
                i++;
                continue;
            }

            // Empty line
            if (line.trim() === '') {
                i++;
                continue;
            }

            // Headings
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                html.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
                i++;
                continue;
            }

            // Horizontal rule
            if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(line.trim())) {
                html.push('<hr>');
                i++;
                continue;
            }

            // Table
            if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+[-|:\s]+$/.test(lines[i + 1])) {
                const tableLines = [line];
                i++;
                while (i < lines.length && lines[i].includes('|')) {
                    tableLines.push(lines[i]);
                    i++;
                }
                html.push(renderTable(tableLines));
                continue;
            }

            // Blockquote
            if (line.match(/^>\s?/)) {
                const quoteLines = [];
                while (i < lines.length && lines[i].match(/^>\s?/)) {
                    quoteLines.push(lines[i].replace(/^>\s?/, ''));
                    i++;
                }
                html.push(`<blockquote><p>${inlineFormat(quoteLines.join(' '))}</p></blockquote>`);
                continue;
            }

            // Unordered list
            if (line.match(/^\s*[-*+]\s+/)) {
                const listItems = [];
                while (i < lines.length && lines[i].match(/^\s*[-*+]\s+/)) {
                    listItems.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
                    i++;
                }
                html.push('<ul>' + listItems.map((li) => `<li>${inlineFormat(li)}</li>`).join('') + '</ul>');
                continue;
            }

            // Ordered list
            if (line.match(/^\s*\d+\.\s+/)) {
                const listItems = [];
                while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
                    listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
                    i++;
                }
                html.push('<ol>' + listItems.map((li) => `<li>${inlineFormat(li)}</li>`).join('') + '</ol>');
                continue;
            }

            // Paragraph (collect consecutive non-empty lines)
            const paraLines = [];
            while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
                paraLines.push(lines[i]);
                i++;
            }
            if (paraLines.length > 0) {
                html.push(`<p>${inlineFormat(paraLines.join(' '))}</p>`);
            } else {
                i++;
            }
        }

        // Restore inline code
        let result = html.join('\n');
        result = result.replace(/\x00INLINE(\d+)\x00/g, (_, idx) => {
            return `<code>${inlineCodes[parseInt(idx)]}</code>`;
        });
        // Restore code blocks (in case they were inside other elements)
        result = result.replace(/\x00CODEBLOCK(\d+)\x00/g, (_, idx) => {
            const cb = codeBlocks[parseInt(idx)];
            return `<pre><code>${cb.code}</code></pre>`;
        });

        return result;
    }

    function isBlockStart(line) {
        return /^#{1,6}\s/.test(line) ||
            /^(-{3,}|_{3,}|\*{3,})\s*$/.test(line.trim()) ||
            /^>\s?/.test(line) ||
            /^\s*[-*+]\s+/.test(line) ||
            /^\s*\d+\.\s+/.test(line) ||
            /^\x00CODEBLOCK/.test(line);
    }

    function inlineFormat(text) {
        // Images
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
        // Links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        // Bold
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        // Italic
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
        // Strikethrough
        text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        return text;
    }

    function renderTable(lines) {
        if (lines.length < 2) return '';
        const parseRow = (line) =>
            line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

        const headers = parseRow(lines[0]);
        const rows = lines.slice(2).map(parseRow);

        let table = '<table><thead><tr>';
        headers.forEach((h) => { table += `<th>${inlineFormat(h)}</th>`; });
        table += '</tr></thead><tbody>';
        rows.forEach((row) => {
            table += '<tr>';
            row.forEach((cell) => { table += `<td>${inlineFormat(cell)}</td>`; });
            table += '</tr>';
        });
        table += '</tbody></table>';
        return table;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
})();
