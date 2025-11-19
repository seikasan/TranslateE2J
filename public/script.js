document.addEventListener('DOMContentLoaded', () => {
  const englishTextarea = document.getElementById('english-text');
  const japaneseResultTextarea = document.getElementById('japanese-result');
  const japaneseResultPreview = document.getElementById('japanese-result-preview');
  const translateButton = document.getElementById('translate-button');
  const loader = document.getElementById('loader');

  // --- Textarea Auto-Resize ---
  const adjustTextareaHeight = (textarea) => {
    textarea.style.height = 'auto'; // 一旦高さをリセット
    textarea.style.height = `${textarea.scrollHeight}px`; // 内容に合わせる
  };

  englishTextarea.addEventListener('input', () => {
    adjustTextareaHeight(englishTextarea);
  });

  // 初期読み込み時にも高さを調整
  adjustTextareaHeight(englishTextarea);
  adjustTextareaHeight(japaneseResultTextarea);


  // --- Scroll Synchronization ---
  let isSyncingScroll = false;

  const syncScroll = (source, target) => {
    if (isSyncingScroll) return;
    isSyncingScroll = true;

    const sourceScrollTop = source.scrollTop;
    const sourceScrollHeight = source.scrollHeight;
    const sourceClientHeight = source.clientHeight;

    const targetScrollHeight = target.scrollHeight;
    const targetClientHeight = target.clientHeight;

    // Avoid division by zero
    if (sourceScrollHeight - sourceClientHeight > 0) {
      const scrollPercentage = sourceScrollTop / (sourceScrollHeight - sourceClientHeight);
      target.scrollTop = scrollPercentage * (targetScrollHeight - targetClientHeight);
    }

    setTimeout(() => { isSyncingScroll = false; }, 100); // 短い遅延で再同期を防ぐ
  };

  englishTextarea.addEventListener('scroll', () => syncScroll(englishTextarea, japaneseResultTextarea));
  japaneseResultTextarea.addEventListener('scroll', () => syncScroll(japaneseResultTextarea, englishTextarea));


  // --- Translate Logic ---
  translateButton.addEventListener('click', async () => {
    const englishText = englishTextarea.value.trim();
    const modelSelect = document.getElementById('model-select');
    const selectedModel = modelSelect.value;

    if (!englishText) {
      japaneseResultTextarea.value = '翻訳するテキストを入力してください。';
      adjustTextareaHeight(japaneseResultTextarea);
      return;
    }

    translateButton.disabled = true;
    loader.style.display = 'block';
    japaneseResultTextarea.classList.add('skeleton'); // Add skeleton class
    japaneseResultTextarea.value = '翻訳中...';
    adjustTextareaHeight(japaneseResultTextarea);

    try {
      const response = await fetch('/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: englishText, model: selectedModel }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `サーバーエラーが発生しました (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Remove skeleton before streaming starts
      japaneseResultTextarea.classList.remove('skeleton');
      japaneseResultTextarea.value = '';
      adjustTextareaHeight(japaneseResultTextarea); // 空にした後も高さをリセット

      let fullJapaneseText = ''; // 履歴用に全テキストを保持

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        japaneseResultTextarea.value += chunk;
        fullJapaneseText += chunk;

        if (isMarkdownMode) {
          japaneseResultPreview.innerHTML = marked.parse(japaneseResultTextarea.value);
        }

        adjustTextareaHeight(japaneseResultTextarea); // チャンクを受け取るたびに高さを調整
      }

      // 翻訳完了後に履歴に保存
      saveHistory(englishText, fullJapaneseText);


    } catch (error) {
      console.error('翻訳リクエストエラー:', error);
      japaneseResultTextarea.classList.remove('skeleton'); // Ensure skeleton is removed on error
      if (japaneseResultTextarea.value === '翻訳中...' || japaneseResultTextarea.value === '') {
        japaneseResultTextarea.value = `エラー: ${error.message}`;
        adjustTextareaHeight(japaneseResultTextarea);
      }
    } finally {
      translateButton.disabled = false;
      loader.style.display = 'none';
      japaneseResultTextarea.classList.remove('skeleton'); // Ensure skeleton is removed in finally
    }
  });

  // --- Toast Logic ---
  const showToast = (message) => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  };

  // --- Copy Logic ---
  const copyButton = document.getElementById('copy-button');
  copyButton.addEventListener('click', () => {
    const textToCopy = japaneseResultTextarea.value;
    if (textToCopy && japaneseResultTextarea.placeholder !== textToCopy && !textToCopy.startsWith('エラー:') && textToCopy !== '翻訳するテキストを入力してください。' && textToCopy !== '翻訳中...') {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('コピーしました');
      }).catch(err => {
        console.error('コピーに失敗しました', err);
        showToast('コピーに失敗しました');
      });
    }
  });

  // --- Shortcut Key ---
  englishTextarea.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!translateButton.disabled) {
        translateButton.click();
      }
    }
  });

  // --- Markdown Logic ---
  const markdownToggle = document.getElementById('markdown-toggle');
  let isMarkdownMode = false;

  markdownToggle.addEventListener('click', () => {
    isMarkdownMode = !isMarkdownMode;

    if (isMarkdownMode) {
      markdownToggle.classList.add('active');
      japaneseResultTextarea.style.display = 'none';
      japaneseResultPreview.style.display = 'block';

      // Render current content
      const currentText = japaneseResultTextarea.value;
      if (currentText) {
        japaneseResultPreview.innerHTML = marked.parse(currentText);
      }
    } else {
      markdownToggle.classList.remove('active');
      japaneseResultTextarea.style.display = 'block';
      japaneseResultPreview.style.display = 'none';
      adjustTextareaHeight(japaneseResultTextarea);
    }
  });

  // --- History Logic ---
  const historySidebar = document.getElementById('history-sidebar');
  const historyList = document.getElementById('history-list');
  const historyToggle = document.getElementById('history-toggle');
  const closeHistory = document.getElementById('close-history');
  const clearHistoryBtn = document.getElementById('clear-history');
  const overlay = document.getElementById('overlay');

  const toggleHistory = () => {
    const isOpen = historySidebar.classList.contains('open');
    if (isOpen) {
      historySidebar.classList.remove('open');
      overlay.classList.remove('show');
    } else {
      historySidebar.classList.add('open');
      overlay.classList.add('show');
      renderHistory();
    }
  };

  historyToggle.addEventListener('click', toggleHistory);
  closeHistory.addEventListener('click', toggleHistory);
  overlay.addEventListener('click', toggleHistory);

  const saveHistory = (source, result) => {
    if (!source || !result) return;

    const historyItem = {
      id: Date.now(),
      source: source,
      result: result,
      date: new Date().toLocaleString('ja-JP')
    };

    let history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    history.unshift(historyItem); // 新しいものを先頭に

    // 最大50件まで保持
    if (history.length > 50) {
      history = history.slice(0, 50);
    }

    localStorage.setItem('translationHistory', JSON.stringify(history));
    renderHistory(); // サイドバーが開いている場合に更新
  };

  const renderHistory = () => {
    const history = JSON.parse(localStorage.getItem('translationHistory') || '[]');
    historyList.innerHTML = '';

    if (history.length === 0) {
      historyList.innerHTML = '<div style="padding:1rem; color:#888; text-align:center;">履歴はありません</div>';
      return;
    }

    history.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'history-item';
      itemDiv.innerHTML = `
        <div class="history-date">${item.date}</div>
        <div class="history-source">${escapeHtml(item.source)}</div>
        <div class="history-result">${escapeHtml(item.result)}</div>
      `;

      itemDiv.addEventListener('click', () => {
        englishTextarea.value = item.source;
        japaneseResultTextarea.value = item.result;

        if (isMarkdownMode) {
          japaneseResultPreview.innerHTML = marked.parse(item.result);
        }

        adjustTextareaHeight(englishTextarea);
        adjustTextareaHeight(japaneseResultTextarea);
        toggleHistory(); // 選択したら閉じる
      });

      historyList.appendChild(itemDiv);
    });
  };

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('履歴をすべて削除しますか？')) {
      localStorage.removeItem('translationHistory');
      renderHistory();
    }
  });

  // HTMLエスケープ用関数
  const escapeHtml = (str) => {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (match) => {
      const escape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escape[match];
    });
  };

  // --- Clear Button ---
  const clearButton = document.getElementById('clear-button');
  clearButton.addEventListener('click', () => {
    englishTextarea.value = '';
    japaneseResultTextarea.value = '';
    japaneseResultPreview.innerHTML = '';

    // Reset heights
    adjustTextareaHeight(englishTextarea);
    adjustTextareaHeight(japaneseResultTextarea);

    // Focus back to input
    englishTextarea.focus();
  });

});
