# 空想世界データベース Discord Bot

軍事装備・鉄道・空想国家・鉱石為替をスラッシュコマンドで検索できるDiscord Bot（discord.js v14）です。

## コマンド一覧

### `/ships`（艦艇）

- `/ships list type:<艦種>` … 艦種ごとの艦艇一覧を表示
- `/ships info ship:<ID>` … 艦艇1隻の詳細を表示（入力補完あり）

### `/tanks`（陸上兵器）

- `/tanks list type:<車種>` … 車種ごとの戦車一覧を表示
- `/tanks info tank:<ID>` … 車両1両の詳細を表示（入力補完あり）

### `/airplanes`（航空機）

- `/airplanes list type:<機種>` … 機種ごとの航空機一覧を表示
- `/airplanes info plane:<ID>` … 機体1機の詳細を表示（入力補完あり）

### `/railway`（鉄道）

- `/railway lines list type:<種別>` … 種別ごとの路線一覧を表示
- `/railway lines info line:<ID>` … 路線1件の詳細を表示（入力補完あり）
- `/railway cars list type:<種別>` … 種別ごとの車両一覧を表示
- `/railway cars info car:<ID>` … 車両1件の詳細を表示（入力補完あり）
- `/railway companies list type:<種別>` … 種別ごとの鉄道会社一覧を表示
- `/railway companies info company:<ID>` … 鉄道会社1件の詳細を表示（入力補完あり）

現在は構造のみで、データは書き換え用のサンプル1件ずつが入っています（詳細は後述）。`lines/cars/companies`をDiscordの仕様上ひとつの`/railway`コマンドにまとめている点だけ、`ships/tanks/airplanes`と作りが違います（詳しくは「コマンドの階層構造について」を参照）。

### `/nation`（空想国家）

- `/nation info nation:<ID>` … 空想国家1カ国の総合力をダッシュボード形式で表示（入力補完あり）
- `/nation list` … 登録されている国家の一覧を表示
- `/nation search keyword:<キーワード>` … 国名・首都でキーワード検索
- `/nation compare nation1:<ID> nation2:<ID>` … 2カ国の国力を比較表示（入力補完あり）
- `/nation rank stat:<指標>` … 人口・GDP・国防費・兵力・保有戦車/艦艇/航空機のいずれかで国家をランキング表示

### `/rate`（鉱石為替）

- `/rate set ore:<鉱石> value:<数値>` … 【要サーバー管理権限】相場を手動で設定
- `/rate trade ore:<鉱石> amount:<数量> action:<買い/売り>` … 取引を記録し、需給に応じて相場を動かす（全員に公開表示）
- `/rate info list` … 金インゴット1個を基準とした、全鉱石の為替レート一覧を表示
- `/rate info history ore:<鉱石> [points:<件数>]` … 鉱石の相場推移をグラフ画像で表示

### `/help`

- `/help [command:<コマンド名>]` … 利用できる全コマンドの一覧を自動生成して表示。`command`を指定すると、そのコマンドのサブコマンド・パラメータの詳細（型・必須/任意・選択肢・入力補完の有無など）を表示（コマンド追加時もこのファイルの編集は不要）

### `ships info` の表示例

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

ローカルでコードを編集しながら動かす場合は、ファイル保存のたびに自動再起動する

```bash
npm run dev
```

も使えます（`npm run deploy`も一緒に実行してからdevモードで起動したい場合は `npm run bot`）。

Renderなど外部サーバーに接続して常時稼働させる場合も起動コマンドは同じ（`npm start`）です。Bot自体はポートを待ち受ける機能を持たないシンプルな構成にしてあります。

## 軍事装備データ（/ships, /tanks, /airplanes）の追加・編集方法

`data/ships.json`、`data/tanks.json`、`data/airplanes.json` を編集するだけで、Bot再起動後に反映されます。各エントリは以下の形式です。

```jsonc
{
  "yamato": {
    "name": "大和",
    "type": "BB",              // list の絞り込みに使う内部コード（commands/ships.jsのaddChoicesと一致させる。tanks/airplanesも同様）
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
- `type` は各コマンドファイル（`commands/ships.js`・`commands/tanks.js`・`commands/airplanes.js`）の `addChoices` で定義されている値と一致させてください。新しい種別を増やす場合はそこにも追加してください（種別の選択肢を増やす変更なので `npm run deploy` が必要です）。
- `armament` は配列なので、兵装の数だけ自由に増減できます。
- `list`・`info`のみのシンプルな構成です（キーワード検索の`search`は現在ありません）。

## 鉄道データ（/railway）の追加・編集方法

`data/lines.json`（路線）、`data/cars.json`（車両）、`data/companies.json`（鉄道会社）を編集します。それぞれサンプルとして `sample_line` / `sample_car` / `sample_company` が1件ずつ入っているので、書き換えるか削除して使ってください。

```jsonc
// data/companies.json
{
  "sample_company": {
    "name": "サンプル電鉄",
    "type": "PRIVATE",              // list の絞り込みに使う内部コード
    "type_name": "民鉄",             // 種別の日本語表示名
    "founded": "1920年",            // 設立
    "headquarters": "サンプル駅",     // 本社
    "lines_operated": ["sample_line"], // 運営路線のID配列（lines.jsonのキーを指定すると路線名で自動表示）
    "notes": "備考"
  }
}
```

```jsonc
// data/lines.json
{
  "sample_line": {
    "name": "サンプル本線",
    "type": "MAIN",
    "type_name": "本線",
    "company": "sample_company",     // companies.jsonのキーを指定すると会社名で自動表示
    "opened": "1985年",
    "status": "運行中",
    "length_km": "17.4 km",
    "stations_count": "10駅",
    "notes": "備考"
  }
}
```

```jsonc
// data/cars.json
{
  "sample_car": {
    "name": "サンプル1000系",
    "type": "COMMUTER",
    "type_name": "通勤形",
    "operator": "sample_company",    // companies.jsonのキーを指定すると会社名で自動表示
    "introduced": "1990年",
    "status": "運用中",
    "max_speed": "120 km/h",
    "capacity": "140名/両",
    "notes": "備考"
  }
}
```

- `company` / `operator` / `lines_operated` に他ファイルのキーを入れておくと、詳細表示のときに自動的に名前へ変換されます（`/nation`の`allies`と同じ仕組みです）。
- `type`の選択肢を増やす場合は `commands/railway.js` の `GROUPS.<lines|cars|companies>.typeChoices` に追加し、`npm run deploy` を実行してください。
- フィールド構成（表示される項目）自体を変えたい場合は `utils/railway.js` の `CATEGORY_CONFIGS` を編集してください。

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
├── package.json
├── .env.example
├── commands/
│   ├── ships.js             # /ships コマンド
│   ├── tanks.js             # /tanks コマンド
│   ├── airplanes.js         # /airplanes コマンド
│   ├── railway.js           # /railway コマンド（lines/cars/companiesグループ）
│   ├── nation.js             # /nation コマンド（空想国家ダッシュボード）
│   ├── help.js               # /help コマンド
│   └── rate.js                 # /rate コマンド（鉱石市場・為替）
├── data/
│   ├── ships.json
│   ├── tanks.json
│   ├── airplanes.json
│   ├── lines.json             # 路線データ（サンプル1件）
│   ├── cars.json              # 車両データ（サンプル1件）
│   ├── companies.json         # 鉄道会社データ（サンプル1件）
│   ├── nations.json           # 空想国家データ
│   ├── ores.json               # 鉱石の設定（表示名・初期値・流動性）
│   └── market-state.json       # 実行時に自動生成される現在の相場・履歴（編集不要）
└── utils/
    ├── military.js        # ships/tanks/airplanes 共通のロジック・Embed生成
    ├── railway.js          # lines/cars/companies 共通のロジック・Embed生成
    ├── nations.js          # nation 用のロジック・Embed生成
    ├── market.js            # 鉱石市場のデータ管理ロジック
    └── marketDisplay.js     # 鉱石市場のEmbed・グラフURL生成
```

## コマンドの階層構造について

`ships`・`tanks`・`airplanes`はそれぞれ独立したトップレベルコマンドです（`/ships list`・`/ships info`のように直接サブコマンドを持つシンプルな構造）。

`railway`だけは`lines`・`cars`・`companies`という3つのカテゴリを1つの`/railway`コマンドの中にサブコマンドグループとしてまとめています。これはDiscordのスラッシュコマンドが「コマンド → サブコマンドグループ → サブコマンド」の3階層までしか対応していないためで、`lines`・`cars`・`companies`を`ships`のように独立コマンド化することもできますが、今の形（`/railway lines info`など）のままにしています。分割したい場合は、`commands/railway.js`の`GROUPS.lines`の部分を`commands/ships.js`と同じ構造にコピーすれば独立コマンド化できます。

## 新しいコマンドを追加した後の注意

コマンドの「構造」（新しいコマンド・サブコマンド・オプション）を追加・変更した場合は、Botを再起動するだけでなく

```bash
npm run deploy
```

を一度実行してDiscordにコマンドを登録し直す必要があります。データ（`*.json`の中身）を編集するだけなら`deploy`は不要です。

## 鉱石市場（/rate）の仕組み

### レートの考え方

各鉱石は「pt（抽象的な基準値）」という共通の物差しで価値を持ちます。`/rate info list`では、この物差しをもとに「金インゴット1個が他の鉱石何個分に相当するか」を自動計算して表示します（

```
金の価値(pt) ÷ 各鉱石の価値(pt)
```

）。鉱石の組み合わせごとにレートを個別管理する必要はなく、新しい鉱石を1つ追加するだけで金との交換レートが自動的に使えるようになります。

### 価格が動く2つの要因

1. **`/rate trade`による需給変動**：取引量が多いほど、また`ores.json`の`liquidity`（流動性）が小さい鉱石ほど、価格が大きく動きます。1回の取引での変動幅は±20%が上限です。
2. **`/rate set`による手動設定**：サーバー管理権限を持つ人が直接値を上書きできます。イベントやマイクラ内の大量取引が実際に発生したときの帳尻合わせなどに使えます。

放置しているだけで自動的に相場が変動する機能はありません。`/rate trade`または`/rate set`を実行したときだけ相場が動きます。

### データの追加・編集方法

鉱石そのものの定義は `data/ores.json` を編集します。

```jsonc
{
  "diamond": {
    "name": "ダイヤモンド",       // 表示名
    "emoji": "💎",               // 表示に使う絵文字
    "initial_value": 100,        // 初回起動時の初期値(pt)
    "liquidity": 50              // 流動性。小さいほど同じ取引量での値動きが大きくなる
  }
}
```

- キー（例: `diamond`）がコマンドで使うIDになります。
- 新しい鉱石を追加したら、Bot再起動時に自動的に初期値で相場が作成されます（`npm run deploy`は不要）。
- `data/market-state.json` は**現在の相場・履歴を保存する実行時データ**です。手動で編集する想定のファイルではなく、初回起動時に自動生成されます。相場をリセットしたい場合はこのファイルを削除して再起動してください。

### 今の実装でできないこと（拡張したい場合）

- プレイヤーごとの所持数・残高管理（今は「取引が発生した」という申告に基づき市場価格を動かすだけで、個人の資産は管理していません）
- マイクラサーバー側との自動連携（プラグインのログや実績を検知して自動で`/rate trade`相当の処理を行うには、別途サーバー側の仕組みと連携する実装が必要です）

必要になったら追加できるので、気になったら教えてください。

## 今後の拡張アイデア

- `/railway`のデータを実際の路線・車両・鉄道会社で埋める
- 装備同士の比較コマンド（例: `/ships compare ship1:<ID> ship2:<ID>`）
- データベース（SQLite等）への移行で、ユーザーからの登録・編集コマンドに対応
- 画像URLをdataに追加し、Embedにサムネイルを表示
