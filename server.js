const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 環境変数の読み込み
dotenv.config();

const app = express();
const port = 3000;

// 静的ファイル (HTML, CSS, JS) の配信
app.use(express.static('public'));
// JSONリクエストボディの解析
app.use(express.json());

// Gemini APIの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// プロンプトテンプレートの読み込み
const promptTemplatePath = path.join(__dirname, 'prompt.md');
const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf-8');

// 翻訳APIエンドポイント
app.post('/translate', async (req, res) => {
  try {
    const { text, model: modelName } = req.body;
    if (!text) {
      return res.status(400).json({ error: '翻訳するテキストがありません。' });
    }

    // デフォルトは gemini-2.5-flash-lite
    const selectedModel = modelName || 'gemini-2.5-flash-lite';

    const model = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        temperature: 0,
      },
    });

    const prompt = promptTemplate.replace('{{TEXT}}', text);

    const result = await model.generateContentStream(prompt);

    // ストリーミングのためにレスポンスヘッダーを設定
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    // ストリームからチャンクを読み取り、クライアントに送信
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }

    // ストリームの終了
    res.end();

  } catch (error) {
    console.error('翻訳エラー:', error);
    res.status(500).json({ error: '翻訳中にエラーが発生しました。' });
  }
});

app.listen(port, () => {
  console.log(`サーバーが http://localhost:${port} で起動しました`);
  // ブラウザを自動的に開く
  exec(`start http://localhost:${port}`, (error) => {
    if (error) {
      console.error(`ブラウザを開けませんでした: ${error}`);
    }
  });
});
