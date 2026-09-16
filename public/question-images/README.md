# 問題画像

問題で使う画像をこのフォルダに置き、`src/worker/questions.ts` の対象問題に次の2項目を追加します。

```ts
imageUrl: "/question-images/example.png",
imageAlt: "画像の内容を説明する短い文章",
```

`imageAlt` は画像を見られない場合や読み上げ機能のための説明です。外部画像を使う場合は、`imageUrl` に `https://` から始まるURLも指定できます。
