const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { exec } = require('child_process'); // 追加

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

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0,
      },
    });
    const prompt = `あなたは、多様な分野の文章を英語から日本語へ翻訳する、経験豊富なプロの翻訳家です。
以下の指示と入力文に基づき、最高品質の翻訳を生成してください。

# 翻訳の原則
・【最重要】文脈を完全に理解し、単語の逐語訳ではなく、文章全体の意味が自然に伝わるように翻訳してください。
・誤訳や訳抜けがないよう、原文の意図を正確かつ忠実に反映してください。
・日本の読者が読んだ際に、自然で流暢に感じられる日本語を使用してください。文体は丁寧な「です・ます調」で統一してください。
・専門用語や固有名詞は、文脈に最も適した日本語訳を用いるか、一般的に使われるカタカナ表記にしてください。
・原文のフォーマット（改行、箇条書き、マークダウンなど）は、可能な限り維持してください。
・原文が持つニュアンスやトーン（フォーマルさ、感情など）を損なわないようにしてください。

# 禁止事項
・翻訳文以外のテキスト（例：「翻訳結果は以下の通りです。」、「承知しました。」などの前置きや後書き）は一切含めないでください。
・個人的な意見や解釈、原文にない情報を追加しないでください。

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
  // ブラウザを自動的に開く
  exec(`start http://localhost:${port}`, (error) => {
    if (error) {
      console.error(`ブラウザを開けませんでした: ${error}`);
    }
  });
});
