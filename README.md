# skill-lint

`textlint-rule-preset-skill-lint` は、Agent Skill の instruction に特有の局所的な静的リスクを検出する textlint preset です。一般的な日本語校正や文書全体の意味推論は行いません。

## 導入

Git tag または commit に固定して GitHub dependency として導入します。

```json
{
  "devDependencies": {
    "textlint": "15.8.x",
    "textlint-rule-preset-skill-lint": "github:akitanabe/skill-lint#<tag-or-commit>"
  }
}
```

`.textlintrc.json` では preset を有効にします。

```json
{
  "rules": {
    "preset-skill-lint": true
  }
}
```

## Rules

| Rule | 検出対象 |
| --- | --- |
| `historical-defense-instruction` | 過去・削除・旧名の状態に明示的に依存する恒久的な防御 instruction |
| `nested-normative-instruction` | 条件スコープ内に入れ子になった規範的・手続的判断 |
| `excessive-conditional-branches` | 同じ instruction block に集中した独立 condition / exception / fallback |
| `overloaded-instruction` | 1文に詰め込まれた独立 Action predicate |

同じ problem locus が複数条件を満たす場合は、表の上から優先して1件だけ報告します。上位 rule を無効にしても下位 taxonomy へ格下げしない `no-fallback` 契約です。rule は preset 設定で個別に無効化できます。

```json
{
  "rules": {
    "preset-skill-lint": {
      "overloaded-instruction": false
    }
  }
}
```

## 対象と境界

- basename が `SKILL.md` の Markdown だけを解析します。
- Paragraph と ListItem を局所 block として扱い、別 heading、別 Paragraph、別 ListItem を結合しません。
- YAML frontmatter、heading、fenced code、inline code、HTML comment、table は診断根拠から除外します。
- historical word や negative instruction が単独であるだけでは報告しません。現在の safety、syntax、responsibility、accepted / rejected boundary を直接表す negative constraint は有効です。
- fixer、public threshold option、独自 CLI、一般日本語校正、LLM による文書全体推論は提供しない `report-only` preset です。

textlint の既定 `severity` は error のため、violation は通常 exit 1 になります。consumer が host 標準設定で warning / info に変更した場合の exit policy は textlint host の責務です。`--fix` を実行しても入力は変更しません。

## 互換範囲

- Node.js: `20.x || 22.x || 24.x`
- textlint: `15.8.x`

この範囲外と、依存 major や Markdown AST shape の変更は互換性保証の対象外です。npm registry への公開は対象外です。

## 開発時の検証

```sh
npm ci
npm run verify
```

`verify` は strict typecheck、unit / integration / corpus tests、build、package contents check を実行します。CI も Node 20 / 22 / 24 で同じ lockfile と entrypoint を使います。

## corpus の更新

固定 corpus は `tests/fixtures/corpus/` にあり、test runtime は外部 repository や plugin cache を参照しません。更新時は source revision または version を決め、snapshot と SHA-256 を差し替え、actual finding を source context と rule 定義に照らして裁定します。false positive を期待値へ無条件追加せず、必要なら synthetic regression fixture と最小の heuristic narrowing を先に行います。

deterministic heuristic は precision-first であり、暗黙の instruction、長距離 dependency、未収録表現の false negative は残り得ます。
