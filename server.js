const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

// 翻訳APIエンドポイント
app.post('/translate', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: '翻訳するテキストがありません。' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `あなたは、英語から日本語への翻訳を専門とするプロの翻訳家です。
以下の制約条件と入力文をもとに、最も自然で高品質な日本語の文章を生成してください。

# 制約条件
・誤訳や訳抜けがないように、正確に翻訳してください。
・日本の文化や慣習に合わせた、自然で流暢な日本語にしてください。
・翻訳結果のみを出力し、他の余計なテキスト（挨拶、説明、言い訳など）は一切含めないでください。
・文体は「です・ます調（敬体）」を使用してください。

# 入力文
${text}
`;

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
});
