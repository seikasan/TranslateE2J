document.addEventListener('DOMContentLoaded', () => {
  const englishTextarea = document.getElementById('english-text');
  const japaneseResultTextarea = document.getElementById('japanese-result');
  const translateButton = document.getElementById('translate-button');
  const loader = document.getElementById('loader');

  translateButton.addEventListener('click', async () => {
    const englishText = englishTextarea.value.trim();

    if (!englishText) {
      japaneseResultTextarea.value = '翻訳するテキストを入力してください。';
      return;
    }

    // 翻訳開始: UIを更新
    translateButton.disabled = true;
    loader.style.display = 'block';
    japaneseResultTextarea.value = '翻訳中...';

    try {
      const response = await fetch('/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: englishText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サーバーエラーが発生しました。');
      }

      const data = await response.json();
      japaneseResultTextarea.value = data.translation;

    } catch (error) {
      console.error('翻訳リクエストエラー:', error);
      japaneseResultTextarea.value = `エラー: ${error.message}`;
    } finally {
      // 翻訳終了: UIを元に戻す
      translateButton.disabled = false;
      loader.style.display = 'none';
    }
  });

  const clearButton = document.getElementById('clear-button');
  const copyButton = document.getElementById('copy-button');

  // クリア機能
  clearButton.addEventListener('click', () => {
    englishTextarea.value = '';
    japaneseResultTextarea.value = '';
  });

  // コピー機能
  copyButton.addEventListener('click', () => {
    const textToCopy = japaneseResultTextarea.value;
    // 結果エリアが空、または初期メッセージの時はコピーしない
    if (textToCopy && japaneseResultTextarea.placeholder !== textToCopy && !textToCopy.startsWith('エラー:') && textToCopy !== '翻訳するテキストを入力してください。' && textToCopy !== '翻訳中...') {
      navigator.clipboard.writeText(textToCopy).then(() => {
        // コピー成功のフィードバック
        const originalText = copyButton.textContent;
        copyButton.textContent = 'コピー完了';
        copyButton.classList.add('copied');
        setTimeout(() => {
          copyButton.textContent = originalText;
          copyButton.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('コピーに失敗しました', err);
        // エラー時のフィードバック
        const originalText = copyButton.textContent;
        copyButton.textContent = '失敗';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 2000);
      });
    }
  });

  // Ctrl+Enter / Cmd+Enterで翻訳を実行
  englishTextarea.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      // デフォルトのEnterキーの動作（改行）をキャンセル
      event.preventDefault();
      // 翻訳ボタンがdisabledでなければクリックイベントを発火
      if (!translateButton.disabled) {
        translateButton.click();
      }
    }
  });
});
