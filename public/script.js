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
});
