# 兵器データベース Discord Bot

艦艇・戦車・航空機のスペックをスラッシュコマンドで検索できるDiscord Bot（discord.js v14）です。

## コマンド一覧

- `/ships list type:<艦種>` … 艦種ごとの艦艇一覧を表示（簡易情報）
- `/ships info ship:<ID>` … 艦艇1隻の詳細を整形テキストで表示（入力補完あり）
- `/ships search keyword:<キーワード>` … 名前・艦級・愛称で検索

- `/tanks list type:<車種>` … 車種ごとの戦車一覧を表示（簡易情報）
- `/tanks info tank:<ID>` … 車両1機の詳細を整形テキストで表示（入力補完あり）
- `/tanks search keyword:<キーワード>` … 名前・型式・愛称で検索

- `/aircraft list type:<機種>` … 機種ごとの航空機一覧を表示（簡易情報）
- `/aircraft info plane:<ID>` … 機体1機の詳細を整形テキストで表示（入力補完あり）
- `/aircraft search keyword:<キーワード>` … 名前・型式・愛称で検索

- `/nation info nation:<ID>` … 空想国家1カ国の総合力をダッシュボード形式で表示（入力補完あり）
- `/nation list` … 登録されている国家の一覧を表示
- `/nation search keyword:<キーワード>` … 国名・首都でキーワード検索
- `/nation compare nation1:<ID> nation2:<ID>` … 2カ国の国力を比較表示（入力補完あり）
- `/nation rank stat:<指標>` … 人口・GDP・国防費・兵力・保有戦車/艦艇/航空機のいずれかで国家をランキング表示

- `/help [command:<コマンド名>]` … 利用できる全コマンドの一覧を自動生成して表示。`command`を指定すると、そのコマンドのサブコマンド・パラメータの詳細（型・必須/任意・選択肢・入力補完の有無など）を表示（コマンド追加時もこのファイルの編集は不要）

- `/rate set ore:<鉱石> value:<数値>` … 【要サーバー管理権限】相場を手動で設定
- `/rate trade ore:<鉱石> amount:<数量> action:<買い/売り>` … 取引を記録し、需給に応じて相場を動かす（全員に公開表示）
- `/rate show list` … 金インゴット1個を基準とした、全鉱石の為替レート一覧を表示
- `/rate show history ore:<鉱石> [points:<件数>]` … 鉱石の相場推移をグラフ画像で表示

### `info` の表示例

```
━━━━━━━━━━━━━━━━━━
大和
━━━━━━━━━━━━━━━━━━
【基本情報】
艦級　　　：大和型
艦種　　　：戦艦(BB)
建造国　　：日本
運用国　　：日本海軍
建造所　　：呉海軍工廠
就役　　　：1941年12月16日
退役　　　：1945年4月7日
状態　　　：沈没
愛称　　　：ホテル大和
【諸元】
排水量　　：72,809 t
全長　　　：263 m
全幅　　　：38.9 m
馬力　　　：150,000 hp
速力　　　：27 kt
航続距離　：7,200 nmi
乗員　　　：3,332名
【兵装】
・46cm三連装砲×3
・15.5cm三連装砲×4
・12.7cm連装高角砲×12
・25mm三連装機銃×52
・零式水上偵察機×7
【備考】
坊ノ岬沖海戦で沈没。
```

## セットアップ手順

### 1. Node.jsをインストール

Node.js 18以上を推奨します。

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. Discord Botを作成してトークンを取得

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」でアプリケーションを作成
3. 左メニューの「Bot」→「Reset Token」でトークンを取得
4. 「OAuth2」→「URL Generator」で `bot` と `applications.commands` にチェックを入れ、生成されたURLからBotをサーバーに招待

### 4. 環境変数を設定

`.env.example` をコピーして `.env` を作成し、値を書き換えます。

```bash
cp .env.example .env
```

```
DISCORD_TOKEN=（Botのトークン）
CLIENT_ID=（アプリケーションID）
GUILD_ID=（開発用サーバーのID。指定するとコマンドが即時反映されます）
```

GUILD_IDを空にするとグローバル登録になりますが、反映まで最大1時間ほどかかります。開発中はGUILD_IDを指定することを強く推奨します。

### 5. スラッシュコマンドを登録

```bash
npm run deploy
```

### 6. Botを起動

```bash
npm start
```

## データの追加・編集方法

`data/ships.json`、`data/tanks.json`、`data/aircraft.json` を編集するだけで、Bot再起動後に反映されます。各エントリは以下の形式です。

```jsonc
{
  "yamato": {
    "name": "大和",
    "type": "BB",              // /list の絞り込みに使う内部コード（各commands/*.jsのaddChoicesと一致させる）
    "type_name": "戦艦",        // 艦種/車種/機種の日本語表示名
    "class": "大和型",           // 艦級・車級・機級
    "country_built": "日本",     // 建造国・製造国
    "country_operator": "日本海軍", // 運用国
    "builder": "呉海軍工廠",      // 建造所・製造所
    "commissioned": "1941年12月16日",
    "decommissioned": "1945年4月7日",
    "status": "沈没",
    "nickname": "ホテル大和",      // 無い場合は "特になし" 等を入れる
    "weight": "72,809 t",        // 排水量・重量
    "length": "263 m",
    "width": "38.9 m",
    "power": "150,000 hp",
    "speed": "27 kt",
    "range": "7,200 nmi",
    "crew": "3,332名",
    "armament": [                // 兵装は配列で自由記述
      "46cm三連装砲×3",
      "15.5cm三連装砲×4"
    ],
    "notes": "坊ノ岬沖海戦で沈没。"
  }
}
```

- キー（例: `yamato`）が `/ships info` などで使うIDになります。半角英数字推奨です。
- `type` は各コマンドファイル（`commands/ships.js` など）の `addChoices` で定義されている値と一致させてください。新しい種別を増やす場合は `addChoices` にも追加してください。
- `armament` は配列なので、兵装の数だけ自由に増減できます。

## 空想国家データ（/nation）の追加・編集方法

`data/nations.json` を編集します。サンプルとして `sample_a` / `sample_b` が入っているので、書き換えるか削除して使ってください。

```jsonc
{
  "sample_a": {
    "name": "サンプル王国",           // 国名
    "capital": "首都サンプル",         // 首都
    "government": "立憲君主制",        // 政体
    "founded": "1850年",             // 建国年
    "population": "3,200万人",        // 人口
    "area": "180,000 km²",           // 国土面積
    "gdp": "4,500億ドル",             // GDP
    "military_budget": "180億ドル",    // 国防費
    "active_personnel": "150,000名",  // 現役兵力
    "reserve_personnel": "80,000名",  // 予備役
    "tanks_count": "600両",          // 保有戦車数
    "ships_count": "120隻",          // 保有艦艇数
    "aircraft_count": "450機",        // 保有航空機数
    "has_nuclear": false,            // 核兵器保有の有無（true/false）
    "allies": ["sample_b"],          // 同盟国のID配列（他エントリのキーを指定すると国名で自動表示）
    "rivals": [],                    // 敵対国のID配列（現状は表示未使用、将来の拡張用）
    "notes": "海洋国家であり、艦艇戦力の増強に力を入れている。"
  }
}
```

- キー（例: `sample_a`）が `/nation info` などで使うIDになります。
- `allies` に他エントリのキーを入れておくと、ダッシュボード上で自動的に国名（例:「サンプル共和国」）に変換されて表示されます。
- 数値項目（人口・GDP・兵力数など）は表示用の文字列としてそのまま扱っているので、単位を含めて自由な書式で入力できます（例: `"3,200万人"`）。

## フォルダ構成

```
military-bot/
├── index.js              # Bot本体（起動・イベント処理）
├── deploy-commands.js     # スラッシュコマンド登録スクリプト
├── scheduler.js           # 鉱石市場の定期変動スケジューラー
├── package.json
├── .env.example
├── commands/
│   ├── ships.js
│   ├── tanks.js
│   ├── aircraft.js
│   ├── nation.js           # /nation コマンド（空想国家ダッシュボード）
│   ├── help.js             # /help コマンド
│   └── rate.js               # /rate コマンド（鉱石市場・為替）
├── data/
│   ├── ships.json
│   ├── tanks.json
│   ├── aircraft.json
│   ├── nations.json         # 空想国家データ
│   ├── ores.json             # 鉱石の設定（表示名・初期値・流動性・変動幅）
│   └── market-state.json     # 実行時に自動生成される現在の相場・履歴（編集不要）
└── utils/
    ├── military.js        # ships/tanks/aircraft 共通のロジック・Embed生成
    ├── nations.js         # nation 用のロジック・Embed生成
    ├── market.js           # 鉱石市場のデータ管理ロジック
    └── marketDisplay.js    # 鉱石市場のEmbed・グラフURL生成
```

## 新しいコマンドを追加した後の注意

`/nation` はコマンドの「構造」自体が新規追加なので、Botを再起動するだけでなく

```bash
npm run deploy
```

を一度実行してDiscordにコマンドを登録する必要があります（データ(`nations.json`)の中身を編集するだけなら`deploy`は不要です）。

## 鉱石市場（/rate）の仕組み

### レートの考え方

各鉱石は「pt（抽象的な基準値）」という共通の物差しで価値を持ちます。`/rate show list`では、この物差しをもとに「金インゴット1個が他の鉱石何個分に相当するか」を自動計算して表示します（

```
金の価値(pt) ÷ 各鉱石の価値(pt)
```

）。鉱石の組み合わせごとにレートを個別管理する必要はなく、新しい鉱石を1つ追加するだけで金との交換レートが自動的に使えるようになります。

### 価格が動く3つの要因

1. **定期的なランダム変動**：`.env`の`FLUCTUATION_INTERVAL_MINUTES`で指定した間隔（デフォルト60分）で、各鉱石が`ores.json`の`volatility`（変動幅）の範囲内でランダムに動きます。放置しているだけで相場が変わります。
2. **`/rate trade`による需給変動**：取引量が多いほど、また`ores.json`の`liquidity`（流動性）が小さい鉱石ほど、価格が大きく動きます。1回の取引での変動幅は±20%が上限です。
3. **`/rate set`による手動設定**：サーバー管理権限を持つ人が直接値を上書きできます。イベントやマイクラ内の大量取引が実際に発生したときの帳尻合わせなどに使えます。

### データの追加・編集方法

鉱石そのものの定義は `data/ores.json` を編集します。

```jsonc
{
  "diamond": {
    "name": "ダイヤモンド",       // 表示名
    "emoji": "💎",               // 表示に使う絵文字
    "initial_value": 100,        // 初回起動時の初期値(pt)
    "liquidity": 50,             // 流動性。小さいほど同じ取引量での値動きが大きくなる
    "volatility": 0.05           // 定期変動の最大振れ幅（0.05 = ±5%）
  }
}
```

- キー（例: `diamond`）がコマンドで使うIDになります。
- 新しい鉱石を追加したら、Bot再起動時に自動的に初期値で相場が作成されます（`npm run deploy`は不要）。
- `data/market-state.json` は**現在の相場・履歴を保存する実行時データ**です。手動で編集する想定のファイルではなく、初回起動時に自動生成されます。相場をリセットしたい場合はこのファイルを削除して再起動してください。

### 通知チャンネルの設定（任意）

`.env`の`MARKET_ANNOUNCE_CHANNEL_ID`にチャンネルIDを設定すると、定期変動で3%以上動いた鉱石があったときに自動でそのチャンネルに通知します。設定しなければ通知は行われず、コマンドで照会したときだけ最新の相場が見られます。

### 今の実装でできないこと（拡張したい場合）

- プレイヤーごとの所持数・残高管理（今は「取引が発生した」という申告に基づき市場価格を動かすだけで、個人の資産は管理していません）
- マイクラサーバー側との自動連携（プラグインのログや実績を検知して自動で`/rate trade`相当の処理を行うには、別途サーバー側の仕組みと連携する実装が必要です）

必要になったら追加できるので、気になったら教えてください。

## 今後の拡張アイデア

- `/ships compare ship1:<ID> ship2:<ID>` … 2隻のスペック比較コマンド
- `/ships random type:<艦種>` … ランダム表示コマンド
- データベース（SQLite等）への移行で、ユーザーからの登録・編集コマンドに対応
- 画像URLをdataに追加し、Embedにサムネイルを表示
