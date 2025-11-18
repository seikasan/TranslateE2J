document.addEventListener('DOMContentLoaded', () => {
  const englishTextarea = document.getElementById('english-text');
  const japaneseResultTextarea = document.getElementById('japanese-result');
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

    if (!englishText) {
      japaneseResultTextarea.value = '翻訳するテキストを入力してください。';
      adjustTextareaHeight(japaneseResultTextarea);
      return;
    }

    translateButton.disabled = true;
    loader.style.display = 'block';
    japaneseResultTextarea.value = '翻訳中...';
    adjustTextareaHeight(japaneseResultTextarea);

    try {
      const response = await fetch('/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: englishText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `サーバーエラーが発生しました (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      japaneseResultTextarea.value = '';
      adjustTextareaHeight(japaneseResultTextarea); // 空にした後も高さをリセット

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        japaneseResultTextarea.value += chunk;
        adjustTextareaHeight(japaneseResultTextarea); // チャンクを受け取るたびに高さを調整
      }

    } catch (error) {
      console.error('翻訳リクエストエラー:', error);
      if (japaneseResultTextarea.value === '翻訳中...' || japaneseResultTextarea.value === '') {
          japaneseResultTextarea.value = `エラー: ${error.message}`;
          adjustTextareaHeight(japaneseResultTextarea);
      }
    } finally {
      translateButton.disabled = false;
      loader.style.display = 'none';
    }
  });

  // --- Copy Logic ---
  const copyButton = document.getElementById('copy-button');
  copyButton.addEventListener('click', () => {
    const textToCopy = japaneseResultTextarea.value;
    if (textToCopy && japaneseResultTextarea.placeholder !== textToCopy && !textToCopy.startsWith('エラー:') && textToCopy !== '翻訳するテキストを入力してください。' && textToCopy !== '翻訳中...') {
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyButton.textContent;
        copyButton.textContent = 'コピー完了';
        copyButton.classList.add('copied');
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('コピーに失敗しました', err);
        const originalText = copyButton.textContent;
        copyButton.textContent = '失敗';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 2000);
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
});
